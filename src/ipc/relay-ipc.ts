import { ipcMain, shell } from 'electron';
import axios from 'axios';
import { RELAY_BASE_URL } from '../constants';
import { loadAppState, saveAppState, getDefaultAppState } from '../config-store';
import { checkRelayHealth } from '../messaging';
import { ensureGatewayProviderOrRelay, refreshJwtIfNeeded } from '../auth';
import { logDnsDiagnostics } from '../network-diagnostics';

export function registerRelayHandlers(): void {
  ipcMain.handle('save-relay-config', async (_event, config: { baseUrl?: string; authToken?: string }) => {
    try {
      const { baseUrl = '', authToken = '' } = config || {};
      const state = loadAppState();
      state.relay = { ...state.relay, baseUrl: baseUrl.trim(), authToken: authToken.trim() };
      saveAppState(state);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-relay-config', async () => {
    try {
      const state = loadAppState();
      return { success: true, relay: state.relay };
    } catch (e: any) {
      const defaultRelay = getDefaultAppState().relay;
      return { success: false, error: e.message, relay: defaultRelay };
    }
  });

  ipcMain.handle('test-relay-connection', async () => {
    try {
      const state = loadAppState();
      const baseUrl = state.relay?.baseUrl || RELAY_BASE_URL;

      // Auto-refresh JWT if expired
      const freshJwt = await refreshJwtIfNeeded(baseUrl);
      // Re-read state if refresh failed — tokens may have been cleared
      const currentState = freshJwt ? state : loadAppState();
      const authToken = freshJwt || currentState.relay?.accessToken || currentState.relay?.authToken;
      const deviceId = state.deviceId || '';

      // Guest users: test via /health (public endpoint) + /v1/usage (validates deviceId)
      if (!authToken && deviceId) {
        await checkRelayHealth(baseUrl, '');
        return { success: true, guest: true };
      }

      if (!authToken) {
        return { success: false, error: 'Auth token is required. Please log in first.' };
      }

      await checkRelayHealth(baseUrl, authToken);
      return { success: true };
    } catch (e: any) {
      const detail = e?.response?.data ? JSON.stringify(e.response.data) : e.message;
      return { success: false, error: detail };
    }
  });

  ipcMain.handle('open-login', async () => {
    try {
      const state = loadAppState();
      const deviceId = state.deviceId || '';
      const homepageUrl = 'https://myopenclaws.app';
      const loginUrl = `${homepageUrl}/login?deviceId=${deviceId}&redirect=myopenclaw`;
      await shell.openExternal(loginUrl);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-relay-auth', async (_event, { accessToken, refreshToken }: { accessToken?: string; refreshToken?: string }) => {
    try {
      const state = loadAppState();
      state.relay.accessToken = accessToken || '';
      state.relay.refreshToken = refreshToken || '';
      saveAppState(state);
      // Refresh gateway auth config to use new JWT
      await ensureGatewayProviderOrRelay();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-models', async () => {
    try {
      const state = loadAppState();
      const baseUrl = (state.relay?.baseUrl || RELAY_BASE_URL).replace(/\/+$/, '');
      const headers: Record<string, string> = {};
      const jwt = state.relay?.accessToken || state.relay?.authToken;
      if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
      if (state.deviceId) headers['X-Device-Id'] = state.deviceId;

      const requestUrl = `${baseUrl}/v1/models`;
      const res = await axios.get(requestUrl, { headers, timeout: 10000 });
      const models = res.data?.data || [];
      return { success: true, models };
    } catch (e: any) {
      await logDnsDiagnostics('relay-models-ipc', e, `${(loadAppState().relay?.baseUrl || RELAY_BASE_URL).replace(/\/+$/, '')}/v1/models`);
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || e.message;
      return { success: false, error: msg, models: [] };
    }
  });

  ipcMain.handle('logout', async () => {
    try {
      const state = loadAppState();
      state.relay.accessToken = '';
      state.relay.refreshToken = '';
      state.relay.userEmail = '';
      saveAppState(state);
      // Refresh gateway auth config to revert to device token
      await ensureGatewayProviderOrRelay();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}
