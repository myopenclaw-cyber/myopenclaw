import { ipcMain, shell } from 'electron';
import { DEFAULT_PORT } from '../constants';
import { readGatewayTokenFromConfig, buildDashboardUrl } from '../config-store';
import type { GatewayHandle } from '../types';

export function registerGatewayHandlers(
  getGatewayHandle: () => GatewayHandle | null,
): void {
  ipcMain.handle('get-gateway-info', async () => {
    const gw = getGatewayHandle();
    return {
      port: gw?.port ?? null,
      baseUrl: gw?.baseUrl ?? null,
      token: readGatewayTokenFromConfig(),
    };
  });

  ipcMain.handle('open-gateway-dashboard', async () => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl && !gw?.port) {
        return { success: false, error: 'Gateway is not running. Please configure a local gateway first.' };
      }
      const url = buildDashboardUrl(
        gw?.baseUrl || `http://127.0.0.1:${gw?.port || DEFAULT_PORT}`,
        gw?.baseUrl,
      );
      await shell.openExternal(url);
      return { success: true, url };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('open-external', async (_event, url: string) => {
    try { await shell.openExternal(url); return { success: true }; }
    catch (error: any) { return { success: false, error: error.message }; }
  });

  ipcMain.handle('get-startup-error', async () => {
    return { error: (global as any).__MYOPENCLAW_STARTUP_ERROR__ || '' };
  });
}
