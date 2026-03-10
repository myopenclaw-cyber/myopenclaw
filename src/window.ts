import * as path from 'path';
import * as fs from 'fs';
import { BrowserWindow, Menu, shell } from 'electron';
import { CONFIG_FILE, RELAY_BASE_URL } from './constants';
import { buildDashboardUrl, loadAppState, saveAppState } from './config-store';
import { findOpenClawCli, findRuntimeDir, ensureEmbeddedRuntime, runOpenClawInstallScript, ensureOpenClawInPath, runOpenClawOnboard } from './runtime';
import { startGateway } from './gateway';
import { registerGatewayHandlers } from './ipc/gateway-ipc';
import { registerChatHandlers } from './ipc/chat-ipc';
import { registerAppStateHandlers } from './ipc/app-state-ipc';
import { registerSubscriptionHandlers } from './ipc/subscription-ipc';
import { registerAgentHandlers } from './ipc/agent-ipc';
import { registerProviderHandlers } from './ipc/provider-ipc';
import { registerRelayHandlers } from './ipc/relay-ipc';
import { registerDeviceHandlers } from './ipc/device-ipc';
import { registerChannelHandlers } from './ipc/channel-ipc';
import type { GatewayHandle, LoadingStatusCallback } from './types';

// ---------------------------------------------------------------------------
// Global state — the only mutable state holders in the app
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null;
let gatewayHandle: GatewayHandle | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getGatewayHandle(): GatewayHandle | null {
  return gatewayHandle;
}

export function killGateway(): void {
  if (gatewayHandle?.process) {
    gatewayHandle.process.kill();
  }
}

// ---------------------------------------------------------------------------
// Loading screen helpers
// ---------------------------------------------------------------------------

const updateLoadingStatus: LoadingStatusCallback = (message, percent) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const safeMsg = String(message || '').replace(/`/g, '\\`').replace(/\\/g, '\\\\');
    const safePct = Number(percent || 0);
    mainWindow.webContents.executeJavaScript(
      `window.__REAL_LOADING_DRIVEN__=true; if (window.setLoadingState) { window.setLoadingState(\`${safeMsg}\`, ${safePct}); }`,
      true,
    ).catch(() => {});
  } catch {}
};

function setRuntimeDownloadNeeded(needed: boolean): void {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.executeJavaScript(
      `if (window.setRuntimeDownloadNeeded) { window.setRuntimeDownloadNeeded(${needed ? 'true' : 'false'}); }`,
      true,
    ).catch(() => {});
  } catch {}
}

// ---------------------------------------------------------------------------
// IPC registration
// ---------------------------------------------------------------------------

export function registerAllIpcHandlers(): void {
  const getGW = () => gatewayHandle;

  const onStartGateway = async () => {
    gatewayHandle = await startGateway(updateLoadingStatus);
  };

  registerGatewayHandlers(getGW);
  registerChatHandlers(getGW);
  registerAppStateHandlers();
  registerSubscriptionHandlers();
  registerAgentHandlers();
  registerProviderHandlers(getGW, onStartGateway);
  registerRelayHandlers();
  registerDeviceHandlers();
  registerChannelHandlers();
}

// ---------------------------------------------------------------------------
// Window creation & startup flow
// ---------------------------------------------------------------------------

export function createWindow(): void {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const gw = gatewayHandle;
    const target = /^https?:\/\/127\.0\.0\.1:\d+\/?$/i.test(String(url || ''))
      ? buildDashboardUrl(url, gw?.baseUrl)
      : url;
    shell.openExternal(target);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[renderer] process gone:', details.reason, details.exitCode);
  });
  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[renderer] did-fail-load:', code, desc);
  });

  mainWindow.loadFile('loading.html');

  (async () => {
    try {
      // E2E / CI mode: skip runtime download and gateway, load UI directly
      if (process.env.MYOPENCLAW_E2E === '1') {
        console.log('[startup] E2E mode: skipping runtime download and gateway start');
        mainWindow!.loadFile('index.html');
        return;
      }

      console.log('[startup] Begin startup flow...');

      let openclawBin = findOpenClawCli();
      console.log('[startup] findOpenClawCli =', openclawBin || '(not found)');
      console.log('[startup] findRuntimeDir =', findRuntimeDir() || '(not found)');

      if (!openclawBin && !findRuntimeDir()) {
        console.log('[startup] No openclaw found, running install script...');
        updateLoadingStatus('Installing OpenClaw (first-time setup)...', 20);
        try {
          await runOpenClawInstallScript(updateLoadingStatus);
          openclawBin = findOpenClawCli();
        } catch (installErr: any) {
          console.error('[startup] Install script failed:', installErr.message);
        }

        if (!openclawBin && !findRuntimeDir()) {
          console.log('[startup] Downloading runtime as fallback...');
          updateLoadingStatus('Downloading OpenClaw runtime...', 50);
          await ensureEmbeddedRuntime(updateLoadingStatus);
          openclawBin = findOpenClawCli();
        }
      }

      if (openclawBin) {
        ensureOpenClawInPath(openclawBin);
      }

      if (!fs.existsSync(CONFIG_FILE)) {
        const binForOnboard = openclawBin || findOpenClawCli();
        if (binForOnboard) {
          updateLoadingStatus('Running first-time setup...', 80);
          console.log('[startup] No config found, running openclaw onboard...');
          await runOpenClawOnboard(binForOnboard);
        } else {
          console.log('[startup] No openclaw CLI available for onboard, skipping');
        }
      }

      if (fs.existsSync(CONFIG_FILE)) {
        gatewayHandle = await startGateway(updateLoadingStatus);
      } else {
        console.log('[startup] No gateway config after onboard, relay-only mode');
      }
    } catch (err: any) {
      console.error('[startup] Error:', err.message);
      (global as any).__MYOPENCLAW_STARTUP_ERROR__ = err?.message || String(err);
    }
    mainWindow!.loadFile('index.html');
  })();
}
