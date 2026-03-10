import { ipcMain, shell } from 'electron';
import { RELAY_BASE_URL } from '../constants';
import { loadAppState, saveAppState, getDefaultAppState } from '../config-store';
import { checkRelayHealth } from '../messaging';

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
      const relay = state.relay;
      const authToken = relay.accessToken || relay.authToken;
      const baseUrl = relay.baseUrl || RELAY_BASE_URL;
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
      const loginUrl = `${homepageUrl}/login.html?deviceId=${deviceId}&redirect=myopenclaw`;
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
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('logout', async () => {
    try {
      const state = loadAppState();
      state.relay.accessToken = '';
      state.relay.refreshToken = '';
      state.relay.userEmail = '';
      saveAppState(state);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}
