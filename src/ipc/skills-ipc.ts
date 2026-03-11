import * as crypto from 'crypto';
import { ipcMain } from 'electron';
import axios from 'axios';
import { readGatewayTokenFromConfig } from '../config-store';
import type { GatewayHandle } from '../types';

async function gatewayRpc(
  gw: GatewayHandle,
  method: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  const id = crypto.randomUUID();
  const token = readGatewayTokenFromConfig();
  const wsUrl = gw.baseUrl.replace(/^http/, 'ws') + '/ws';

  return new Promise((resolve, reject) => {
    // Use Node's built-in WebSocket (available in Electron / Node 22+).
    // Fallback to the ws package if the global is unavailable.
    let WS: typeof WebSocket;
    try {
      WS = (global as any).WebSocket || require('ws');
    } catch {
      WS = require('ws');
    }

    const socket = new WS(wsUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    } as any);

    const timer = setTimeout(() => {
      try { socket.close(); } catch {}
      reject(new Error(`Gateway RPC timeout for method "${method}"`));
    }, 15000);

    let connected = false;
    const reqMsg = JSON.stringify({ type: 'req', id, method, params });

    socket.onopen = () => {
      // Gateway requires a connect handshake before RPC
      socket.send(JSON.stringify({
        type: 'connect',
        role: 'operator',
        scopes: ['operator.admin'],
      }));
    };

    socket.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));

        // Wait for connect acknowledgment before sending RPC
        if (!connected) {
          if (msg.type === 'connected' || msg.type === 'welcome' || (msg.type === 'resp' && msg.ok)) {
            connected = true;
            socket.send(reqMsg);
            return;
          }
        }

        if (msg.id !== id) return;
        clearTimeout(timer);
        socket.close();
        if (msg.ok) {
          resolve(msg.payload);
        } else {
          reject(new Error(msg.error || `Gateway RPC error for "${method}"`));
        }
      } catch (e) {
        clearTimeout(timer);
        socket.close();
        reject(e);
      }
    };

    socket.onerror = (err: Event) => {
      clearTimeout(timer);
      reject(new Error(`Gateway WebSocket error: ${(err as any).message || String(err)}`));
    };
  });
}

export function registerSkillsHandlers(
  getGatewayHandle: () => GatewayHandle | null,
): void {
  ipcMain.handle('skills-list', async () => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: 'Gateway not running', skills: [] };

      const payload = await gatewayRpc(gw, 'skills.status', {}) as any;
      const skills = Array.isArray(payload?.skills) ? payload.skills
        : Array.isArray(payload) ? payload
        : [];
      return { success: true, skills };
    } catch (e: any) {
      return { success: false, error: e.message, skills: [] };
    }
  });

  ipcMain.handle('skills-toggle', async (_event, payload) => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: 'Gateway not running' };

      const { skillKey, enabled } = payload || {};
      if (!skillKey) return { success: false, error: 'skillKey is required' };

      await gatewayRpc(gw, 'skills.update', { skillKey, enabled: !!enabled });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('skills-install', async (_event, payload) => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: 'Gateway not running' };

      const { name, installId } = payload || {};
      if (!name || !installId) return { success: false, error: 'name and installId are required' };

      await gatewayRpc(gw, 'skills.install', { name, installId, timeoutMs: 60000 });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('skills-configure', async (_event, payload) => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: 'Gateway not running' };

      const { skillKey, apiKey, env } = payload || {};
      if (!skillKey) return { success: false, error: 'skillKey is required' };

      const params: Record<string, unknown> = { skillKey };
      if (apiKey !== undefined) params.apiKey = apiKey;
      if (env !== undefined) params.env = env;

      await gatewayRpc(gw, 'skills.update', params);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}
