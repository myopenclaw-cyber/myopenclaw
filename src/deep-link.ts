import axios from 'axios';
import type { BrowserWindow } from 'electron';
import { RELAY_BASE_URL, PROTOCOL } from './constants';
import { loadAppState, saveAppState } from './config-store';

export function handleDeepLink(
  url: string,
  getMainWindow: () => BrowserWindow | null,
): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${PROTOCOL}:`) return;

    if (parsed.hostname === 'auth' || parsed.pathname === '//auth' || parsed.pathname === '/auth') {
      const accessToken = parsed.searchParams.get('accessToken');
      const refreshToken = parsed.searchParams.get('refreshToken');
      const email = parsed.searchParams.get('email');

      if (accessToken) {
        const state = loadAppState();
        state.relay.baseUrl = RELAY_BASE_URL;
        state.relay.accessToken = accessToken;
        state.relay.refreshToken = refreshToken || '';
        state.relay.userEmail = email || '';
        saveAppState(state);
        console.log('[DeepLink] Auth tokens saved from web login');

        const deviceId = state.deviceId;
        if (deviceId) {
          axios.post(`${RELAY_BASE_URL}/v1/devices/${encodeURIComponent(deviceId)}/link`, {}, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            timeout: 8000,
          }).then(() => {
            console.log('[DeepLink] Device linked to user account');
          }).catch((err) => {
            console.log('[DeepLink] Device link failed (non-fatal):', err.message);
          });
        }

        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.executeJavaScript(`
            if (typeof loadRelayConfig === 'function') loadRelayConfig();
            if (typeof loadDeviceInfo === 'function') loadDeviceInfo();
            if (typeof refreshQuota === 'function') refreshQuota();
            if (typeof refreshState === 'function') refreshState();
          `).catch(() => {});
          mainWindow.show();
          mainWindow.focus();
        }
      }
    }
  } catch (err: any) {
    console.error('[DeepLink] Failed to handle URL:', err.message);
  }
}
