import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import type { BrowserWindow } from 'electron';
import { buildConnectParams, handleConnectResponse } from './device-identity';
import { reportError } from './log-reporter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RpcRequest {
  type: 'req';
  id: string;
  method: string;
  params: Record<string, unknown>;
}

interface RpcResponse {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string };
}

interface ChatEvent {
  type: 'event';
  event: 'chat';
  payload: ChatPayload;
}

export interface ChatPayload {
  state: 'delta' | 'final' | 'aborted' | 'error';
  runId?: string;
  sessionKey?: string;
  message?: {
    content: ContentItem[];
  };
  error?: string;
  errorMessage?: string;
}

export interface ContentItem {
  type: 'text' | 'thinking' | 'tool_use' | string;
  text?: string;
  thinking?: string;
  name?: string;
  input?: unknown;
}

type StreamCallback = (payload: ChatPayload) => void;

// ---------------------------------------------------------------------------
// WebSocket manager
// ---------------------------------------------------------------------------

export class WsManager {
  private ws: WebSocket | null = null;
  private baseUrl: string = '';
  private token: string = '';
  private pending: Map<string, (err: Error | null) => void> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private streamCallbacks: Set<StreamCallback> = new Set();
  private activeStreamId: string | null = null;
  private activeRunId: string | null = null;
  private activeSessionKey: string | null = null;
  private activeTerminalTimer: NodeJS.Timeout | null = null;
  /** Stable session IDs per agent so conversation context persists across messages. */
  private sessionIds: Map<string, string> = new Map();

  setWindow(win: BrowserWindow): void {
    this.mainWindow = win;
  }

  connect(baseUrl: string, token: string): Promise<void> {
    // Disconnect if connecting to a different URL
    if (this.baseUrl && this.baseUrl !== baseUrl) {
      this.disconnect();
    }

    this.baseUrl = baseUrl;
    this.token = token;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // Convert http://host:port to ws://host:port
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws';

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const connectId = randomUUID();
      let connected = false;

      ws.once('open', () => {
        console.log('[WsManager] WebSocket open, waiting for connect.challenge...');
      });

      ws.once('error', (err) => {
        console.error('[WsManager] WebSocket connection error:', err.message);
        reportError('ws', `connection error: ${err.message}`);
        reject(err);
      });

      ws.on('message', (data: Buffer | string) => {
        const raw = String(data);

        // During handshake, handle challenge-response and connect
        if (!connected) {
          try {
            const msg = JSON.parse(raw);

            // Handle connect.challenge — extract nonce and send signed connect
            if (msg.type === 'event' && msg.event === 'connect.challenge') {
              const challengeNonce = msg.payload?.nonce;
              console.log('[WsManager] Received connect.challenge, sending signed connect...');
              ws.send(JSON.stringify({
                type: 'req',
                id: connectId,
                method: 'connect',
                params: buildConnectParams(token, challengeNonce),
              }));
              return;
            }

            // Ignore other server events during handshake
            if (msg.type === 'event') return;

            if (msg.type === 'res' && msg.id === connectId && msg.ok) {
              console.log('[WsManager] Connected to gateway WebSocket');
              handleConnectResponse(msg.payload);
              connected = true;
              this.ws = ws;
              resolve();
              return;
            }
            if (msg.type === 'res' && msg.id === connectId && !msg.ok) {
              const errMsg = typeof msg.error === 'object' ? msg.error?.message : String(msg.error);
              reject(new Error(`Connect failed: ${errMsg}`));
              ws.close();
              return;
            }
          } catch {
            // ignore parse errors during handshake
          }
          return;
        }

        this._handleMessage(raw);
      });

      ws.on('close', () => {
        console.log('[WsManager] WebSocket closed');
        this.ws = null;
        this.pending.forEach((cb) => cb(new Error('WebSocket closed')));
        this.pending.clear();
      });

      ws.on('error', (err) => {
        console.error('[WsManager] WebSocket error:', err.message);
        reportError('ws', `ws error: ${err.message}`);
      });
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Send a fire-and-forget RPC request and wait for the ack response.
   */
  private _sendRpc(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket not connected'));
      }
      const id = randomUUID();
      const req: RpcRequest = { type: 'req', id, method, params };
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 5000);
      this.pending.set(id, (err) => {
        clearTimeout(timeout);
        if (err) reject(err); else resolve(undefined);
      });
      this.ws.send(JSON.stringify(req), (sendErr) => {
        if (sendErr) {
          this.pending.delete(id);
          clearTimeout(timeout);
          reject(sendErr);
        }
      });
    });
  }

  /**
   * Send a chat message via WebSocket JSON-RPC.
   * Streams delta events to the renderer window.
   * Returns the fully assembled text content when streaming completes.
   */
  async sendChatMessageStreaming(
    baseUrl: string,
    token: string,
    agentId: string,
    message: string,
    model?: string,
  ): Promise<string> {
    if (!this.isConnected()) {
      await this.connect(baseUrl, token);
    }

    const id = randomUUID();
    const sessionKey = `agent:${agentId}:myopenclaw:${this._getSessionId(agentId)}`;

    // Patch session model before sending if user selected a specific model
    if (model) {
      const qualifiedModel = model.includes('/') ? model : `relay/${model}`;
      try {
        await this._sendRpc('sessions.patch', { key: sessionKey, model: qualifiedModel });
      } catch (err) {
        console.warn('[WsManager] sessions.patch model failed, continuing with default:', (err as Error).message);
      }
    }

    this.activeStreamId = id;
    this.activeRunId = null;
    this.activeSessionKey = sessionKey;
    this._clearActiveTerminalTimer();

    // Assembled text and thinking content from all delta events
    let assembledText = '';

    const onPayload: StreamCallback = (payload) => {
      if (payload.state === 'delta' || payload.state === 'final') {
        // Gateway sends full accumulated text in each delta, not incremental chunks.
        // Replace assembledText with the latest full text.
        const fullText = this._extractText(payload.message?.content);
        if (fullText) {
          assembledText = fullText;
        }
      }
    };
    this.streamCallbacks.add(onPayload);

    const req: RpcRequest = {
      type: 'req',
      id,
      method: 'chat.send',
      params: {
        sessionKey,
        message,
        deliver: false,
        idempotencyKey: id,
      },
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const cb = this.pending.get(id);
        if (!cb) return;
        this.pending.delete(id);
        cb(new Error('Chat response timed out'));
      }, 70000);

      // Register completion callback keyed by the request ID
      this.pending.set(id, (err) => {
        this.streamCallbacks.delete(onPayload);
        clearTimeout(timeout);
        if (this.activeStreamId === id) {
          this.activeStreamId = null;
          this.activeRunId = null;
          this.activeSessionKey = null;
          this._clearActiveTerminalTimer();
        }
        if (err) {
          reject(err);
        } else {
          resolve(assembledText || 'Response received.');
        }
      });

      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.pending.delete(id);
        this.streamCallbacks.delete(onPayload);
        clearTimeout(timeout);
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.ws.send(JSON.stringify(req), (sendErr) => {
        if (sendErr) {
          this.pending.delete(id);
          this.streamCallbacks.delete(onPayload);
          clearTimeout(timeout);
          reject(sendErr);
        }
      });
    });
  }

  /** Extract text from a content array (or string). */
  private _extractText(content: unknown): string {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    let text = '';
    for (const item of content) {
      if (typeof item === 'string') { text += item; continue; }
      if (item && typeof item === 'object') {
        if (item.type === 'text' && item.text) text += item.text;
      }
    }
    return text;
  }

  private _clearActiveTerminalTimer(): void {
    if (this.activeTerminalTimer) {
      clearTimeout(this.activeTerminalTimer);
      this.activeTerminalTimer = null;
    }
  }

  private _matchesActivePayload(payload: ChatPayload): boolean {
    if (!this.activeStreamId) return false;

    if (payload.sessionKey && this.activeSessionKey && payload.sessionKey !== this.activeSessionKey) {
      return false;
    }

    if (payload.runId && this.activeRunId && payload.runId !== this.activeRunId) {
      return false;
    }

    if (payload.runId && !this.activeRunId) {
      this.activeRunId = payload.runId;
    }

    if (payload.sessionKey && !this.activeSessionKey) {
      this.activeSessionKey = payload.sessionKey;
    }

    return true;
  }

  private _handleMessage(raw: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.warn('[WsManager] Non-JSON message:', raw.slice(0, 100));
      return;
    }

    console.log('[WsManager] ← msg type=%s event=%s id=%s', msg.type, msg.event ?? '-', msg.id ?? '-');

    if (msg.type === 'res') {
      const resp = msg as unknown as RpcResponse;
      // RPC error response — reject the pending promise
      if (!resp.ok && resp.error) {
        const cb = this.pending.get(resp.id);
        if (cb) {
          this.pending.delete(resp.id);
          cb(new Error(resp.error.message));
        }
        return;
      }

      // Resolve non-streaming RPC calls (e.g. sessions.patch)
      if (resp.ok && resp.id !== this.activeStreamId) {
        const cb = this.pending.get(resp.id);
        if (cb) {
          this.pending.delete(resp.id);
          cb(null);
          return;
        }
      }

      // ok response — check if payload already contains chat content (some
      // gateway versions embed the final answer in the RPC response rather than
      // sending separate chat events).
      if (resp.ok && resp.payload) {
        const p = resp.payload as Record<string, unknown>;
        if (resp.id === this.activeStreamId && typeof p.runId === 'string') {
          this.activeRunId = p.runId;
        }
        const content = (p.message as Record<string, unknown>)?.content ?? p.content ?? p.text;
        const text = this._extractText(content);
        if (text) {
          this._clearActiveTerminalTimer();
          console.log('[WsManager] ok-res contains text (%d chars), forwarding as final', text.length);
          const syntheticPayload: ChatPayload = {
            state: 'final',
            runId: typeof p.runId === 'string' ? p.runId : undefined,
            sessionKey: typeof p.sessionKey === 'string' ? p.sessionKey : this.activeSessionKey ?? undefined,
            message: { content: [{ type: 'text', text }] },
          };
          this.streamCallbacks.forEach((cb) => cb(syntheticPayload));
          this._forwardChatEvent(syntheticPayload);
          if (this.activeStreamId) {
            const cb = this.pending.get(this.activeStreamId);
            if (cb) {
              this.pending.delete(this.activeStreamId);
              cb(null);
            }
            this.activeStreamId = null;
          }
          return;
        }
      }
      // Otherwise wait for final/aborted/error chat event to resolve
      return;
    }

    if (msg.type === 'event' && msg.event === 'chat') {
      const payload = (msg as unknown as ChatEvent).payload;
      console.log('[WsManager] chat event state=%s contentItems=%d',
        payload.state,
        Array.isArray(payload.message?.content) ? payload.message!.content.length : 0,
      );

      // Forward to renderer for UI updates
      this._forwardChatEvent(payload);

      if (!this._matchesActivePayload(payload)) {
        return;
      }

      const text = this._extractText(payload.message?.content);
      if (text || payload.state === 'delta' || payload.state === 'error') {
        this._clearActiveTerminalTimer();
      }

      // Notify local stream callbacks (for assembling text)
      this.streamCallbacks.forEach((cb) => cb(payload));

      // Resolve/reject the pending promise on terminal states
      if (payload.state === 'final' || payload.state === 'aborted' || payload.state === 'error') {
        if (this.activeStreamId) {
          const finalize = () => {
            if (!this.activeStreamId) return;
            const cb = this.pending.get(this.activeStreamId);
            if (cb) {
              this.pending.delete(this.activeStreamId);
              const err = payload.state === 'error' ? new Error(payload.errorMessage || payload.error || 'Stream error') : null;
              if (err) {
                console.error('[WsManager] Chat stream error:', err.message);
                reportError('ws', `stream error: ${err.message}`);
              }
              cb(err);
            }
            this.activeStreamId = null;
            this.activeRunId = null;
            this.activeSessionKey = null;
            this._clearActiveTerminalTimer();
          };

          if (payload.state === 'final' && !text) {
            this._clearActiveTerminalTimer();
            this.activeTerminalTimer = setTimeout(finalize, 400);
            return;
          }

          finalize();
        }
      }
    }
  }

  private _getSessionId(agentId: string): string {
    let sid = this.sessionIds.get(agentId);
    if (!sid) {
      sid = randomUUID();
      this.sessionIds.set(agentId, sid);
    }
    return sid;
  }

  private _forwardChatEvent(payload: ChatPayload): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.webContents.send('chat-stream', payload);
  }
}

// Singleton instance
export const wsManager = new WsManager();
