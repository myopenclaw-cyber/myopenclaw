import * as fs from 'fs';
import * as path from 'path';
import { ipcMain } from 'electron';
import { OPENCLAW_CONFIG_DIR } from '../constants';

const CREDENTIALS_DIR = path.join(OPENCLAW_CONFIG_DIR, 'credentials');

interface PairingRequest {
  id: string;
  code: string;
  createdAt: string;
  lastSeenAt: string;
  meta?: Record<string, string>;
}

interface PairingFile {
  version: number;
  requests: PairingRequest[];
}

interface AllowFromFile {
  version: number;
  allowFrom: string[];
}

function getPairingFilePath(channel: string): string {
  return path.join(CREDENTIALS_DIR, `${channel}-pairing.json`);
}

function getAllowFromFilePath(channel: string, accountId: string): string {
  return path.join(CREDENTIALS_DIR, `${channel}-${accountId}-allowFrom.json`);
}

function readPairingFile(channel: string): PairingFile {
  const filePath = getPairingFilePath(channel);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e: any) {
    console.error(`[pairing-ipc] Failed to read ${filePath}:`, e.message);
  }
  return { version: 1, requests: [] };
}

function writePairingFile(channel: string, data: PairingFile): void {
  const filePath = getPairingFilePath(channel);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function readAllowFromFile(channel: string, accountId: string): AllowFromFile {
  const filePath = getAllowFromFilePath(channel, accountId);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e: any) {
    console.error(`[pairing-ipc] Failed to read ${filePath}:`, e.message);
  }
  return { version: 1, allowFrom: [] };
}

function writeAllowFromFile(channel: string, accountId: string, data: AllowFromFile): void {
  const filePath = getAllowFromFilePath(channel, accountId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export function registerPairingHandlers(): void {
  // List pending pairing requests for a channel
  ipcMain.handle('pairing-list', async (_event, payload) => {
    try {
      const { channel } = payload || {};
      if (!channel) return { success: false, error: 'Missing channel' };

      const data = readPairingFile(channel);
      return { success: true, requests: data.requests };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // List all channels that have pending pairing requests
  ipcMain.handle('pairing-list-all', async () => {
    try {
      if (!fs.existsSync(CREDENTIALS_DIR)) {
        return { success: true, channels: {} };
      }
      const files = fs.readdirSync(CREDENTIALS_DIR);
      const channels: Record<string, PairingRequest[]> = {};

      for (const file of files) {
        const match = file.match(/^(.+)-pairing\.json$/);
        if (!match) continue;
        const channel = match[1];
        const data = readPairingFile(channel);
        if (data.requests.length > 0) {
          channels[channel] = data.requests;
        }
      }

      return { success: true, channels };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Approve a pairing request
  ipcMain.handle('pairing-approve', async (_event, payload) => {
    try {
      const { channel, code } = payload || {};
      if (!channel || !code) return { success: false, error: 'Missing channel or code' };

      const pairingData = readPairingFile(channel);
      const reqIndex = pairingData.requests.findIndex(
        (r) => r.code.toUpperCase() === code.toUpperCase()
      );

      if (reqIndex === -1) {
        return { success: false, error: 'No matching pairing request found' };
      }

      const req = pairingData.requests[reqIndex];
      const accountId = req.meta?.accountId || 'default';

      // Add to allowFrom list
      const allowData = readAllowFromFile(channel, accountId);
      if (!allowData.allowFrom.includes(req.id)) {
        allowData.allowFrom.push(req.id);
      }
      writeAllowFromFile(channel, accountId, allowData);

      // Remove from pending
      pairingData.requests.splice(reqIndex, 1);
      writePairingFile(channel, pairingData);

      console.log(`[pairing-ipc] Approved ${channel} pairing for user ${req.id} (${req.meta?.username || 'unknown'})`);
      return { success: true, userId: req.id, username: req.meta?.username };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Dismiss (reject) a pairing request — just remove from pending
  ipcMain.handle('pairing-dismiss', async (_event, payload) => {
    try {
      const { channel, code } = payload || {};
      if (!channel || !code) return { success: false, error: 'Missing channel or code' };

      const pairingData = readPairingFile(channel);
      const reqIndex = pairingData.requests.findIndex(
        (r) => r.code.toUpperCase() === code.toUpperCase()
      );

      if (reqIndex === -1) {
        return { success: false, error: 'No matching pairing request found' };
      }

      pairingData.requests.splice(reqIndex, 1);
      writePairingFile(channel, pairingData);

      console.log(`[pairing-ipc] Dismissed ${channel} pairing request`);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}
