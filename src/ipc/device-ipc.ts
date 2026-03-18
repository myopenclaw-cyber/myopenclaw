import { ipcMain } from 'electron';
import axios from 'axios';
import { RELAY_BASE_URL } from '../constants';
import { loadAppState } from '../config-store';
import { logDnsDiagnostics } from '../network-diagnostics';

export function registerDeviceHandlers(): void {
  ipcMain.handle('get-device-id', async () => {
    const state = loadAppState();
    return { success: true, deviceId: state.deviceId || '' };
  });

  ipcMain.handle('check-quota', async () => {
    const state = loadAppState();
    const relay = state.relay;
    const deviceId = state.deviceId;

    const baseUrl = (relay.baseUrl || RELAY_BASE_URL).replace(/\/+$/, '');
    const authToken = relay.accessToken || relay.authToken;
    if (!authToken && !deviceId) {
      return { success: false, error: 'not_configured' };
    }

    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      if (deviceId) headers['X-Device-Id'] = deviceId;
      const requestUrl = `${baseUrl}/v1/usage`;
      const response = await axios.get(requestUrl, { headers, timeout: 20000 });
      return response.data;
    } catch (err: any) {
      await logDnsDiagnostics('device-quota-check', err, `${baseUrl}/v1/usage`);
      return { success: false, error: err.message };
    }
  });
}
