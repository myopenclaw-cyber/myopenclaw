import * as path from 'path';
import * as os from 'os';
import { app } from 'electron';
import { PROTOCOL, RELAY_BASE_URL } from './constants';
import { loadAppState, saveAppState } from './config-store';
import { ensureDeviceId, registerDevice } from './device';
import { handleDeepLink } from './deep-link';
import { createWindow, getMainWindow, isQuitInProgress, prepareAppQuit, registerAllIpcHandlers, showMainWindow } from './window';
import { initFileLogger } from './logger';
import { startPerfMonitor } from './perf-monitor';
import { initializeAutoUpdater, scheduleAutoUpdateCheck } from './updater';

// ---------------------------------------------------------------------------
// File logger — write all console output to ~/.myopenclaw/myopenclaw.log
// ---------------------------------------------------------------------------
initFileLogger();

// ---------------------------------------------------------------------------
// VM detection — disable GPU to prevent white screen in virtual machines
// Uses os.cpus() on all platforms to avoid spawning a subprocess at startup.
// ---------------------------------------------------------------------------
const isVM = (() => {
  try {
    const cpuModel = os.cpus()?.[0]?.model || '';
    return /virtual|Apple Virtual|QEMU|KVM|VirtualBox|VMware/i.test(cpuModel);
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
let exitRequested = false;

function requestAppExit(reason: string): void {
  if (exitRequested) return;
  exitRequested = true;
  console.log(`[app] Exit requested (${reason})`);

  void prepareAppQuit(reason)
    .catch((err: any) => {
      console.error('[app] Quit cleanup failed:', err?.message || err);
    })
    .finally(() => {
      app.exit(0);
    });
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const deepLinkUrl = argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (deepLinkUrl) handleDeepLink(deepLinkUrl, getMainWindow);
    showMainWindow();
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
    startPerfMonitor();
    console.log('[app] creating window...');
    createWindow();
    initializeAutoUpdater({
      getMainWindow,
      beforeInstall: () => prepareAppQuit('update-install'),
      updateChannel: state.updateChannel || 'stable',
    });
    scheduleAutoUpdateCheck();

    // macOS: handle deep link that launched the app
    const launchUrl = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (launchUrl) handleDeepLink(launchUrl, getMainWindow);
  });

  app.on('window-all-closed', () => {
    if (process.platform === 'linux') {
      requestAppExit('window-all-closed');
    }
  });

  app.on('before-quit', (event) => {
    if (exitRequested || isQuitInProgress()) return;
    event.preventDefault();
    requestAppExit('before-quit');
  });

  app.on('activate', () => {
    showMainWindow();
  });
}
