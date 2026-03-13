import * as crypto from 'crypto';
import { execSync } from 'child_process';
import axios from 'axios';
import { RELAY_BASE_URL } from './constants';
import { loadAppState, saveAppState } from './config-store';

function getMachineId(): string | null {
  try {
    if (process.platform === 'darwin') {
      const output = execSync(
        'ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID',
        { encoding: 'utf8', timeout: 5000 }
      );
      const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      return match?.[1] || null;
    }
    if (process.platform === 'win32') {
      const output = execSync('wmic csproduct get uuid', {
        encoding: 'utf8',
        timeout: 5000,
      });
      const lines = output.trim().split('\n');
      const uuid = lines[1]?.trim();
      return uuid && uuid !== '' ? uuid : null;
    }
    return null;
  } catch {
    return null;
  }
}

function deriveDeviceId(machineId: string): string {
  const hash = crypto.createHash('sha256').update(`myopenclaw:${machineId}`).digest('hex');
  // Format as UUID v5-style: xxxxxxxx-xxxx-5xxx-8xxx-xxxxxxxxxxxx
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '5' + hash.slice(13, 16),
    '8' + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
}

export function ensureDeviceId(): string {
  const state = loadAppState();
  if (!state.deviceId) {
    const machineId = getMachineId();
    if (machineId) {
      state.deviceId = deriveDeviceId(machineId);
      console.log('[device-id] Derived device ID from machine hardware');
    } else {
      state.deviceId = crypto.randomUUID();
      console.log('[device-id] Generated random device ID (hardware ID unavailable)');
    }
    saveAppState(state);
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
