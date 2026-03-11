import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import {
  loadAppState,
  saveAppState,
  checkPremiumGate,
  consumeQuota,
} from '../config-store';
import { sendViaRelay } from '../messaging';
import { RELAY_BASE_URL } from '../constants';
import { wsManager } from '../ws-manager';
import type { GatewayHandle } from '../types';

export function registerChatHandlers(
  getGatewayHandle: () => GatewayHandle | null,
  getMainWindow: () => BrowserWindow | null,
): void {
  ipcMain.handle('send-message', async (_event, payload) => {
    try {
      const message = typeof payload === 'string' ? payload : payload?.message;
      const agentId = payload?.agentId || 'main';

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

      let content: string;

      // Always prefer gateway when running — it has the full agent pipeline (skills, tools)
      if (gatewayBaseUrl) {
        const win = getMainWindow();
        if (win) wsManager.setWindow(win);
        content = await wsManager.sendChatMessageStreaming(gatewayBaseUrl, gatewayToken, agentId, message);
      } else if (hasRelay) {
        content = await sendViaRelay(relay.baseUrl, relayAuthToken, messages, deviceId);
      } else if (deviceId && (relay.baseUrl || RELAY_BASE_URL)) {
        content = await sendViaRelay(relay.baseUrl || RELAY_BASE_URL, '', messages, deviceId);
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
      return { success: false, error: msg, status };
    }
  });
}
