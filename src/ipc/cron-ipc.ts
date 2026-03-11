import * as crypto from 'crypto';
import axios from 'axios';
import { ipcMain } from 'electron';
import type { GatewayHandle } from '../types';
import { buildConnectParams, handleConnectResponse } from '../device-identity';

// ---------------------------------------------------------------------------
// WebSocket JSON-RPC helper (native ws via dynamic require)
// ---------------------------------------------------------------------------

function wsRpc(
  port: number,
  token: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const reqMsg = JSON.stringify({ type: 'req', id, method, params });
    let ws: any;

    try {
      // Use a simple HTTP upgrade approach instead of the ws package to avoid
      // dependency concerns. Fall back to the bundled ws if available.
      const WebSocket = require('ws'); // eslint-disable-line @typescript-eslint/no-var-requires
      ws = new WebSocket(`ws://127.0.0.1:${port}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      reject(new Error('WebSocket (ws) module not available'));
      return;
    }

    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error(`cron RPC timeout: ${method}`));
    }, 10000);

    let connected = false;
    let challengeNonce: string | null = null;
    const connectId = crypto.randomUUID();

    // Gateway sends connect.challenge as the first frame; we wait for it
    // before sending our signed connect request.

    ws.on('message', (data: Buffer | string) => {
      try {
        const msg = JSON.parse(typeof data === 'string' ? data : data.toString('utf8'));

        // Handle connect.challenge — extract nonce and send signed connect
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          challengeNonce = msg.payload?.nonce;
          ws.send(JSON.stringify({
            type: 'req',
            id: connectId,
            method: 'connect',
            params: buildConnectParams(token, challengeNonce!),
          }));
          return;
        }

        // Ignore other server events during handshake
        if (msg.type === 'event') return;

        // Wait for connect acknowledgment before sending RPC
        if (!connected) {
          if (msg.type === 'res' && msg.id === connectId && msg.ok) {
            connected = true;
            handleConnectResponse(msg.payload);
            ws.send(reqMsg);
            return;
          }
        }

        if (msg.id !== id) return;
        clearTimeout(timer);
        ws.close();
        if (msg.ok) {
          resolve(msg.payload);
        } else {
          const errMsg = typeof msg.error === 'object' ? msg.error?.message : msg.error;
          reject(new Error(errMsg || `RPC error: ${method}`));
        }
      } catch (e) {
        clearTimeout(timer);
        ws.close();
        reject(e);
      }
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ---------------------------------------------------------------------------
// IPC handler registration
// ---------------------------------------------------------------------------

export function registerCronHandlers(
  getGatewayHandle: () => GatewayHandle | null,
): void {
  function requireGateway(): { port: number; token: string } {
    const gw = getGatewayHandle();
    if (!gw) throw new Error('Gateway is not running');
    return { port: gw.port, token: gw.token };
  }

  ipcMain.handle('cron-list', async () => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.list', {});
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-add', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.add', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-update', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.update', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-remove', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.remove', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-run', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.run', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-runs', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.runs', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-generate', async (_event, params: { description: string }) => {
    try {
      const { port, token } = requireGateway();
      const systemPrompt = [
        'You are a cron job configuration assistant.',
        'Parse the user\'s natural language description into a structured cron job config.',
        'Return ONLY valid JSON (no markdown fences, no explanation) with this structure:',
        '{',
        '  "name": "short-kebab-case-name",',
        '  "schedule": {',
        '    "kind": "cron" | "every" | "at",',
        '    "expr": "cron expression (only when kind=cron, e.g. 0 9 * * *)",',
        '    "tz": "optional timezone like Asia/Shanghai (only when kind=cron)",',
        '    "everyMs": 60000 (only when kind=every, milliseconds)',
        '    "at": "2026-03-15T09:00:00Z (only when kind=at, ISO timestamp)"',
        '  },',
        '  "message": "the prompt message to send to the agent when the job runs"',
        '}',
      ].join('\n');

      const response = await axios.post(`http://127.0.0.1:${port}/v1/chat/completions`, {
        model: 'openclaw:main',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: params.description },
        ],
        stream: false,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const content = response?.data?.choices?.[0]?.message?.content || '';
      if (!content) {
        return { success: false, error: 'AI returned empty response' };
      }
      const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      if (!cleaned.startsWith('{')) {
        return { success: false, error: content };
      }
      const config = JSON.parse(cleaned);
      return { success: true, config };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
