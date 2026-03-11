import * as crypto from 'crypto';
import * as http from 'http';
import { ipcMain } from 'electron';
import type { GatewayHandle } from '../types';

// ---------------------------------------------------------------------------
// WebSocket JSON-RPC helper (native ws via dynamic require)
// ---------------------------------------------------------------------------

function wsRpc(
  port: number,
  token: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const reqMsg = JSON.stringify({ type: 'req', id, method, params });
    let ws: any;

    try {
      // Use a simple HTTP upgrade approach instead of the ws package to avoid
      // dependency concerns. Fall back to the bundled ws if available.
      const WebSocket = require('ws'); // eslint-disable-line @typescript-eslint/no-var-requires
      ws = new WebSocket(`ws://127.0.0.1:${port}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      reject(new Error('WebSocket (ws) module not available'));
      return;
    }

    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error(`cron RPC timeout: ${method}`));
    }, 10000);

    ws.on('open', () => {
      ws.send(reqMsg);
    });

    ws.on('message', (data: Buffer | string) => {
      try {
        const msg = JSON.parse(typeof data === 'string' ? data : data.toString('utf8'));
        if (msg.id !== id) return;
        clearTimeout(timer);
        ws.close();
        if (msg.ok) {
          resolve(msg.payload);
        } else {
          reject(new Error(msg.error || `RPC error: ${method}`));
        }
      } catch (e) {
        clearTimeout(timer);
        ws.close();
        reject(e);
      }
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ---------------------------------------------------------------------------
// IPC handler registration
// ---------------------------------------------------------------------------

export function registerCronHandlers(
  getGatewayHandle: () => GatewayHandle | null,
): void {
  function requireGateway(): { port: number; token: string } {
    const gw = getGatewayHandle();
    if (!gw) throw new Error('Gateway is not running');
    return { port: gw.port, token: gw.token };
  }

  ipcMain.handle('cron-list', async () => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.list', {});
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-add', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.add', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-update', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.update', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-remove', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.remove', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-run', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.run', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-runs', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.runs', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
