import * as crypto from 'crypto';
import axios from 'axios';
import { RELAY_BASE_URL } from './constants';
import { loadAppState, saveAppState } from './config-store';

export function ensureDeviceId(): string {
  const state = loadAppState();
  if (!state.deviceId) {
    state.deviceId = crypto.randomUUID();
    saveAppState(state);
    console.log('[device-id] Generated new device ID:', state.deviceId);
  } else {
    console.log('[device-id] Loaded existing device ID:', state.deviceId);
  }
  return state.deviceId;
}

export async function registerDevice(deviceId: string, appVersion: string): Promise<void> {
  try {
    const response = await axios.post(`${RELAY_BASE_URL}/v1/devices`, {
      deviceId,
      platform: process.platform,
      appVersion,
    }, { timeout: 20000 });
    console.log('[device-registration] Device registered successfully');

    // Save signed device token for gateway relay auth
    const deviceToken = response.data?.deviceToken;
    if (deviceToken) {
      const state = loadAppState();
      state.deviceToken = deviceToken;
      saveAppState(state);
      console.log('[device-registration] Saved signed device token');
    }
  } catch (err: any) {
    console.log('[device-registration] Registration failed (non-fatal):', err.message);
  }
}
