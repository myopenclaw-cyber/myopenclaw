import { ipcMain, dialog, clipboard, nativeImage } from 'electron';
import type { BrowserWindow } from 'electron';
import { readFileSync } from 'fs';
import {
  loadAppState,
  saveAppState,
  checkPremiumGate,
  consumeQuota,
} from '../config-store';
import { sendViaRelay } from '../messaging';
import { RELAY_BASE_URL } from '../constants';
import { wsManager } from '../ws-manager';
import { refreshJwtIfNeeded, ensureGatewayProviderOrRelay } from '../auth';
import { findLatestAssistantReplyAfterUserMessage, loadAgentConversationFromOpenClaw } from '../conversation';
import { reportError } from '../log-reporter';
import type { GatewayHandle } from '../types';

async function recoverGatewayReplyFromTranscript(agentId: string, userMessage: string): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const conversation = loadAgentConversationFromOpenClaw(agentId, 120);
    const recovered = findLatestAssistantReplyAfterUserMessage(conversation, userMessage);
    if (recovered) {
      return recovered;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(1000, 200 * (attempt + 1))));
  }
  return '';
}

export function registerChatHandlers(
  getGatewayHandle: () => GatewayHandle | null,
  getMainWindow: () => BrowserWindow | null,
): void {
  ipcMain.handle('copy-rich', (_event, payload: { text: string; imagePaths: string[] }) => {
    const { text, imagePaths } = payload;
    if (!imagePaths.length) {
      clipboard.writeText(text);
      return true;
    }
    // Build HTML with embedded base64 images + text
    let html = '';
    const lines = text.split('\n');
    for (const line of lines) {
      const imgMatch = line.match(/\/([\w./\-]+\.(?:png|jpg|jpeg|gif|webp|svg))/i);
      if (imgMatch) {
        const fullPath = '/' + imgMatch[1];
        const matched = imagePaths.find(p => p === fullPath || fullPath.endsWith(p.split('/').pop()!));
        if (matched) {
          try {
            const buf = readFileSync(matched);
            const ext = matched.split('.').pop()?.toLowerCase() || 'png';
            const mime = ext === 'jpg' ? 'jpeg' : ext;
            const b64 = buf.toString('base64');
            html += `<p>${line.replace(/`/g, '')}</p><img src="data:image/${mime};base64,${b64}" style="max-width:600px"><br>`;
            continue;
          } catch { /* skip */ }
        }
      }
      html += `<p>${line}</p>`;
    }
    // Write image as native image for apps that prefer image format
    try {
      const img = nativeImage.createFromPath(imagePaths[0]);
      clipboard.write({
        text,
        html,
        image: img,
      });
    } catch {
      clipboard.write({ text, html });
    }
    return true;
  });

  ipcMain.handle('pick-file', async () => {
    const opts = { properties: ['openFile' as const, 'multiSelections' as const] };
    const win = getMainWindow();
    const result = win
      ? await dialog.showOpenDialog(win, opts)
      : await dialog.showOpenDialog(opts);
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle('send-message', async (_event, payload) => {
    let message = '';
    let agentId = 'main';
    let model = '';
    try {
      message = typeof payload === 'string' ? payload : payload?.message;
      agentId = payload?.agentId || 'main';
      model = payload?.model || '';

      const state = loadAppState();
      const gate = checkPremiumGate(state);
      if (!gate.allow) {
        return {
          success: false,
          premiumRequired: gate.premiumRequired ?? false,
          loginRequired: gate.loginRequired ?? false,
          reason: gate.reason,
          error: gate.message,
          state,
        };
      }

      state.conversations = state.conversations || {};
      const conv = state.conversations[agentId] || [];
      const messages = [...conv, { role: 'user' as const, content: message }].slice(-20);

      const relay = state.relay;
      const relayAuthToken = relay.accessToken || relay.authToken;
      const hasRelay = !!(relay.baseUrl && relayAuthToken);
      const deviceId = state.deviceId || '';
      const gw = getGatewayHandle();
      const gatewayBaseUrl = gw?.baseUrl || null;
      const gatewayToken = gw?.token || '';

      // Auto-refresh JWT and update gateway auth profile if token was refreshed
      const freshJwt = await refreshJwtIfNeeded();
      if (freshJwt && freshJwt !== relayAuthToken) {
        await ensureGatewayProviderOrRelay();
      }

      let content: string;

      // Prefer gateway when running — it has the full agent pipeline (skills, tools)
      // Gateway's provider is configured to route to relay for model capability
      if (gatewayBaseUrl) {
        const win = getMainWindow();
        if (win) wsManager.setWindow(win);
        try {
          content = await wsManager.sendChatMessageStreaming(gatewayBaseUrl, gatewayToken, agentId, message, model);
        } catch (streamError) {
          const recovered = await recoverGatewayReplyFromTranscript(agentId, message);
          if (recovered) {
            content = recovered;
          } else {
            throw streamError;
          }
        }
        if (!content || content === 'Response received.') {
          const recovered = await recoverGatewayReplyFromTranscript(agentId, message);
          if (recovered) {
            content = recovered;
          }
        }
      } else if (hasRelay) {
        content = await sendViaRelay(relay.baseUrl, relayAuthToken, messages, deviceId, model);
      } else if (deviceId && (relay.baseUrl || RELAY_BASE_URL)) {
        content = await sendViaRelay(relay.baseUrl || RELAY_BASE_URL, '', messages, deviceId, model);
      } else {
        throw new Error('No AI provider configured. Please login to use Cloud Relay.');
      }

      state.conversations[agentId] = [...messages, { role: 'assistant' as const, content }].slice(-20);
      consumeQuota(state, gate.tier);
      saveAppState(state);

      return { success: true, response: content, state };
    } catch (error: any) {
      const apiDetail = error?.response?.data?.error?.message || error?.response?.data?.message || error?.response?.data?.error;
      const status = error?.response?.status;
      let msg = apiDetail || error.message || 'Unknown error';
      if (status === 500 && /internal error/i.test(msg)) {
        msg = 'Gateway provider error. Please verify API Keys (Base URL / API Key / Model) in API Keys page.';
      }
      console.error('[chat] send-message failed:', JSON.stringify({
        status,
        msg,
        url: error?.config?.url,
        responseData: error?.response?.data,
        stack: error.stack?.split('\n').slice(0, 3).join(' | '),
      }));
      reportError('chat', msg, { status, model: payload?.model, agentId: payload?.agentId, stack: error.stack?.split('\n').slice(0, 3) });
      return { success: false, error: `${status ? status + ' ' : ''}${msg}`, status };
    }
  });
}
