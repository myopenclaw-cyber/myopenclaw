import { ipcMain } from 'electron';
import {
  loadAppState,
  saveAppState,
  checkPremiumGate,
  consumeQuota,
  loadEmbeddedConfig,
  getUserProviderConfig,
} from '../config-store';
import { sendViaGateway, sendViaRelay } from '../messaging';
import { RELAY_BASE_URL } from '../constants';
import type { GatewayHandle } from '../types';

export function registerChatHandlers(
  getGatewayHandle: () => GatewayHandle | null,
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

      const embeddedCfg = loadEmbeddedConfig();
      const hasLocalProvider = !!(embeddedCfg?.models?.providers && Object.keys(embeddedCfg.models.providers).length > 0);
      const relay = state.relay;
      const relayAuthToken = relay.accessToken || relay.authToken;
      const hasRelay = !!(relay.baseUrl && relayAuthToken);
      const deviceId = state.deviceId || '';
      const gw = getGatewayHandle();
      const gatewayBaseUrl = gw?.baseUrl || null;

      let content: string;
      if (hasLocalProvider && gatewayBaseUrl) {
        content = await sendViaGateway(gatewayBaseUrl, messages);
      } else if (hasRelay) {
        content = await sendViaRelay(relay.baseUrl, relayAuthToken, messages, deviceId);
      } else if (deviceId && (relay.baseUrl || RELAY_BASE_URL)) {
        // Anonymous: send via relay with device ID only (no auth token)
        content = await sendViaRelay(relay.baseUrl || RELAY_BASE_URL, '', messages, deviceId);
      } else if (gatewayBaseUrl) {
        const userProvider = getUserProviderConfig();
        if (!userProvider) {
          return {
            success: false,
            noApiKeyConfigured: true,
            error: 'OpenClaw depends on an LLM model to provide intelligence. Please configure your API key or a relay service.',
          };
        }
        content = await sendViaGateway(gatewayBaseUrl, messages);
      } else {
        throw new Error('No AI provider configured. Add an API key or configure a relay service.');
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
