import * as path from 'path';
import * as os from 'os';
import { app, BrowserWindow } from 'electron';
import { execFileSync } from 'child_process';
import { PROTOCOL, RELAY_BASE_URL } from './constants';
import { loadAppState, saveAppState } from './config-store';
import { ensureDeviceId, registerDevice } from './device';
import { handleDeepLink } from './deep-link';
import { createWindow, getMainWindow, killGateway, registerAllIpcHandlers } from './window';

// ---------------------------------------------------------------------------
// VM detection — disable GPU to prevent white screen in virtual machines
// ---------------------------------------------------------------------------
const isVM = (() => {
  try {
    if (process.platform === 'darwin') {
      const model = execFileSync('sysctl', ['-n', 'machdep.cpu.brand_string'], { encoding: 'utf8', timeout: 2000 }).trim();
      return /virtual|Apple Virtual/i.test(model);
    }
    const cpuModel = os.cpus()?.[0]?.model || '';
    return /virtual|QEMU|KVM|VirtualBox|VMware/i.test(cpuModel);
  } catch { return false; }
})();
if (isVM) {
  app.commandLine.appendSwitch('disable-gpu');
  console.log('[gpu] Disabled GPU acceleration (VM detected)');
}

// Suppress EPIPE errors on stdout/stderr (harmless when piped)
process.stdout?.on('error', () => {});
process.stderr?.on('error', () => {});

// ---------------------------------------------------------------------------
// Deep link protocol registration
// ---------------------------------------------------------------------------
if ((process as any).defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// macOS: open-url event fires when app is already running or launched via URL
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url, getMainWindow);
});

// ---------------------------------------------------------------------------
// Single instance lock + deep link via argv (Windows/Linux)
// ---------------------------------------------------------------------------
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const deepLinkUrl = argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (deepLinkUrl) handleDeepLink(deepLinkUrl, getMainWindow);

    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // ---------------------------------------------------------------------------
  // Register all IPC handlers before app ready
  // ---------------------------------------------------------------------------
  registerAllIpcHandlers();

  // ---------------------------------------------------------------------------
  // App lifecycle
  // ---------------------------------------------------------------------------
  app.whenReady().then(() => {
    console.log('[app] ready');
    const deviceId = ensureDeviceId();
    registerDevice(deviceId, app.getVersion()); // fire-and-forget

    // Auto-set relay baseUrl so users don't need to configure it
    const state = loadAppState();
    if (!state.relay.baseUrl) {
      state.relay.baseUrl = RELAY_BASE_URL;
      saveAppState(state);
    }
    console.log('[app] creating window...');
    createWindow();

    // macOS: handle deep link that launched the app
    const launchUrl = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (launchUrl) handleDeepLink(launchUrl, getMainWindow);
  });

  app.on('window-all-closed', () => {
    killGateway();
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
