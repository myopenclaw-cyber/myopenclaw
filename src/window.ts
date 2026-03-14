import * as path from 'path';
import * as fs from 'fs';
import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron';
import { CONFIG_FILE, RELAY_BASE_URL } from './constants';
import { buildDashboardUrl, loadAppState, saveAppState } from './config-store';
import { findOpenClawCli, findRuntimeDir, findNodeBinary, ensureEmbeddedRuntime, ensureOpenClawInPath, runOpenClawOnboard, clearCliCache } from './runtime';
import { startGateway, stopGatewayGracefully, stopGatewayImmediately } from './gateway';
import { registerGatewayHandlers } from './ipc/gateway-ipc';
import { registerChatHandlers } from './ipc/chat-ipc';
import { registerAppStateHandlers } from './ipc/app-state-ipc';
import { registerSubscriptionHandlers } from './ipc/subscription-ipc';
import { registerAgentHandlers } from './ipc/agent-ipc';
import { registerProviderHandlers } from './ipc/provider-ipc';
import { registerRelayHandlers } from './ipc/relay-ipc';
import { registerDeviceHandlers } from './ipc/device-ipc';
import { registerChannelHandlers } from './ipc/channel-ipc';
import { registerSkillsHandlers } from './ipc/skills-ipc';
import { registerCronHandlers } from './ipc/cron-ipc';
import { registerPairingHandlers } from './ipc/pairing-ipc';
import type { GatewayHandle, LoadingStatusCallback } from './types';

// ---------------------------------------------------------------------------
// Global state — the only mutable state holders in the app
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null;
let gatewayHandle: GatewayHandle | null = null;
let tray: Tray | null = null;
let isAppQuitting = false;
let quitCleanupPromise: Promise<void> | null = null;
let didShowTrayHint = false;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getGatewayHandle(): GatewayHandle | null {
  return gatewayHandle;
}

export function killGateway(): void {
  stopGatewayImmediately(gatewayHandle?.process ?? null);
  gatewayHandle = null;
}

export function isQuitInProgress(): boolean {
  return isAppQuitting;
}

export async function prepareAppQuit(reason: string = 'user-request'): Promise<void> {
  if (quitCleanupPromise) return quitCleanupPromise;

  isAppQuitting = true;
  console.log(`[app] Preparing quit (${reason})`);
  destroyTray();

  quitCleanupPromise = (async () => {
    try {
      await stopGatewayGracefully(gatewayHandle?.process ?? null);
    } catch (err: any) {
      console.warn('[app] Graceful gateway shutdown failed, forcing stop:', err?.message || err);
      killGateway();
      return;
    } finally {
      gatewayHandle = null;
    }
  })().finally(() => {
    quitCleanupPromise = null;
  });

  await quitCleanupPromise;
}

function resolveAssetPath(...segments: string[]): string {
  return path.join(app.getAppPath(), ...segments);
}

function buildTrayIcon() {
  const iconPath = resolveAssetPath('build', 'assets', 'logo-openclaw.png');
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    console.warn('[tray] Failed to load tray icon:', iconPath);
    return null;
  }
  if (process.platform === 'win32') {
    return icon.resize({ width: 16, height: 16 });
  }
  return icon;
}

function destroyTray(): void {
  if (!tray) return;
  try {
    tray.destroy();
  } catch {}
  tray = null;
}

function ensureTray(): Tray | null {
  if (process.platform !== 'win32') return null;
  if (tray) return tray;

  const icon = buildTrayIcon();
  if (!icon) return null;

  tray = new Tray(icon);
  tray.setToolTip('MyOpenClaw');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open MyOpenClaw', click: () => showMainWindow() },
    { type: 'separator' },
    { label: 'Quit MyOpenClaw', click: () => app.quit() },
  ]));
  tray.on('click', () => showMainWindow());
  tray.on('double-click', () => showMainWindow());
  return tray;
}

function showTrayHintOnce(): void {
  if (process.platform !== 'win32' || didShowTrayHint || !tray) return;
  didShowTrayHint = true;
  try {
    tray.displayBalloon({
      title: 'MyOpenClaw is still running',
      content: 'The window was hidden to the system tray. Use the tray icon or Quit from the tray menu to fully exit.',
    });
  } catch {}
}

function hideMainWindowToBackground(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.hide();
  showTrayHintOnce();
}

function bindWindowLifecycle(window: BrowserWindow): void {
  if (process.platform === 'win32') {
    window.on('close', (event) => {
      if (isAppQuitting) return;
      event.preventDefault();
      hideMainWindowToBackground();
    });

    const handleSystemSessionEnd = () => {
      if (isAppQuitting) return;
      isAppQuitting = true;
      destroyTray();
      killGateway();
    };

    window.on('query-session-end', handleSystemSessionEnd);
    window.on('session-end', handleSystemSessionEnd);
  }

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });
}

export function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
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
  registerChatHandlers(getGW, () => mainWindow);
  registerAppStateHandlers();
  registerSubscriptionHandlers();
  registerAgentHandlers();
  registerProviderHandlers(getGW, onStartGateway);
  registerRelayHandlers();
  registerDeviceHandlers();
  registerChannelHandlers();
  registerSkillsHandlers(getGW);
  registerCronHandlers(getGW);
  registerPairingHandlers();
}

// ---------------------------------------------------------------------------
// Window creation & startup flow
// ---------------------------------------------------------------------------

export function createWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    showMainWindow();
    return;
  }

  Menu.setApplicationMenu(null);
  ensureTray();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
    },
  });
  bindWindowLifecycle(mainWindow);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const gw = gatewayHandle;
    const target = /^https?:\/\/127\.0\.0\.1:\d+\/?$/i.test(String(url || ''))
      ? buildDashboardUrl(url, gw?.baseUrl)
      : url;
    shell.openExternal(target);
    return { action: 'deny' };
  });

  // mainWindow.webContents.on('before-input-event', (_e, input) => {
  //   if (!mainWindow || mainWindow.isDestroyed()) return;
  //   if (input.type !== 'keyDown') return;
  //   const meta = input.meta; // macOS Cmd
  //   if (meta && input.key === 'r') {
  //     mainWindow.webContents.reload();
  //   } else if (meta && input.shift && input.key === 'i') {
  //     if (mainWindow.webContents.isDevToolsOpened()) {
  //       mainWindow.webContents.closeDevTools();
  //     } else {
  //       mainWindow.webContents.openDevTools();
  //     }
  //   }
  // });

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
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadFile('index.html');
        return;
      }

      // Fast reopen: if gateway is still alive (macOS close-window-without-quit),
      // skip the entire startup flow and go straight to the main UI.
      if (gatewayHandle?.process && !gatewayHandle.process.killed) {
        console.log('[startup] Gateway still alive (PID=%d), skipping startup flow', gatewayHandle.process.pid);
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadFile('index.html');
        return;
      }

      console.log('[startup] Begin startup flow...');

      let openclawBin = findOpenClawCli();
      console.log('[startup] findOpenClawCli =', openclawBin || '(not found)');
      console.log('[startup] findRuntimeDir =', findRuntimeDir() || '(not found)');

      if (!openclawBin && !findRuntimeDir()) {
        console.log('[startup] No openclaw or runtime found, downloading runtime...');
        updateLoadingStatus('Downloading OpenClaw runtime...', 30);
        await ensureEmbeddedRuntime(updateLoadingStatus);
        clearCliCache(); // invalidate cache after new runtime download
        openclawBin = findOpenClawCli();
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
        } else if (findRuntimeDir()) {
          // No CLI but runtime exists — run onboard via node entry point
          try {
            updateLoadingStatus('Running first-time setup...', 80);
            console.log('[startup] No CLI found, running onboard via node entry point...');
            const runtimeDir = findRuntimeDir()!;
            const nodeBin = findNodeBinary();
            const entryMjs = path.join(runtimeDir, 'openclaw-deps', 'openclaw', 'openclaw.mjs');
            const entryJs = path.join(runtimeDir, 'openclaw-deps', 'openclaw', 'dist', 'entry.js');
            const entryFile = fs.existsSync(entryMjs) ? entryMjs : entryJs;
            await runOpenClawOnboard(nodeBin, [entryFile], runtimeDir);
          } catch (onboardErr: any) {
            console.error('[startup] Onboard via node failed:', onboardErr.message);
          }
        } else {
          console.log('[startup] No openclaw CLI or runtime available for onboard, skipping');
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
      // Show error on loading screen before switching to main UI
      updateLoadingStatus(`Setup error: ${err?.message || 'Unknown error'}`, 0);
      await new Promise(r => setTimeout(r, 3000)); // let user read the error
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadFile('index.html');
    }
  })();
}
