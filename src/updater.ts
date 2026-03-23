import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { UpdateChannel } from './types';

const GITHUB_OWNER = 'myopenclaw-cyber';
const GITHUB_REPO = 'myopenclaw';

type UpdaterInitOptions = {
  beforeInstall: () => Promise<void>;
  getMainWindow: () => BrowserWindow | null;
  updateChannel?: UpdateChannel;
};

type CheckForUpdatesOptions = {
  manual?: boolean;
};

let initialized = false;
let activeCheckPromise: Promise<void> | null = null;
let manualCheckInProgress = false;
let manualDownloadInProgress = false;
let installPromptOpen = false;
let lastPromptedVersion: string | null = null;
let beforeInstallHook: (() => Promise<void>) | null = null;
let getMainWindowHook: (() => BrowserWindow | null) | null = null;

function getDialogWindow(): BrowserWindow | undefined {
  const window = getMainWindowHook?.() ?? null;
  if (!window || window.isDestroyed() || !window.isVisible()) return undefined;
  return window;
}

async function showInfo(title: string, message: string): Promise<void> {
  const window = getDialogWindow();
  if (window) {
    await dialog.showMessageBox(window, {
      type: 'info',
      title,
      message,
      buttons: ['OK'],
    });
    return;
  }

  await dialog.showMessageBox({
    type: 'info',
    title,
    message,
    buttons: ['OK'],
  });
}

async function showError(title: string, message: string): Promise<void> {
  const window = getDialogWindow();
  if (window) {
    await dialog.showMessageBox(window, {
      type: 'error',
      title,
      message,
      buttons: ['OK'],
    });
    return;
  }

  await dialog.showMessageBox({
    type: 'error',
    title,
    message,
    buttons: ['OK'],
  });
}

async function promptToInstall(version: string): Promise<void> {
  const options = {
    type: 'info' as const,
    title: 'Update Ready',
    message: `Version ${version} has been downloaded.`,
    detail: 'Restart MyOpenClaw now to install the update.',
    buttons: ['Restart and Install', 'Later'],
    defaultId: 0,
    cancelId: 1,
  };

  const window = getDialogWindow();
  const result = window
    ? await dialog.showMessageBox(window, options)
    : await dialog.showMessageBox(options);

  if (result.response !== 0) return;

  if (!beforeInstallHook) {
    throw new Error('Auto updater install hook is not initialized');
  }

  await beforeInstallHook();
  autoUpdater.quitAndInstall(false, true);
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

export function initializeAutoUpdater(options: UpdaterInitOptions): void {
  if (initialized) return;

  initialized = true;
  beforeInstallHook = options.beforeInstall;
  getMainWindowHook = options.getMainWindow;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = options.updateChannel === 'beta';
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[updater] Update available: ${info.version}`);
    manualDownloadInProgress = manualCheckInProgress;

    if (manualCheckInProgress) {
      void showInfo(
        'Update Available',
        `Version ${info.version} is available and is downloading in the background.`,
      );
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[updater] No update available');

    if (manualCheckInProgress) {
      void showInfo(
        "You're Up to Date",
        `You're already running the latest version (${app.getVersion()}).`,
      );
    }
  });

  autoUpdater.on('error', (error) => {
    const message = formatErrorMessage(error);
    console.error('[updater] Update error:', message);

    if (manualCheckInProgress || manualDownloadInProgress) {
      void showError('Update Failed', message);
    }

    manualDownloadInProgress = false;
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[updater] Update downloaded: ${info.version}`);
    manualDownloadInProgress = false;

    if (installPromptOpen || lastPromptedVersion === info.version) return;

    installPromptOpen = true;
    void promptToInstall(info.version)
      .then(() => {
        lastPromptedVersion = info.version;
      })
      .catch((error) => {
        console.error('[updater] Failed to prompt for install:', formatErrorMessage(error));
      })
      .finally(() => {
        installPromptOpen = false;
      });
  });
}

export async function checkForAppUpdates(options: CheckForUpdatesOptions = {}): Promise<void> {
  const { manual = false } = options;

  if (process.env.MYOPENCLAW_E2E === '1') return;

  if (!initialized) {
    if (manual) {
      await showInfo('Updates Unavailable', 'The updater is still initializing. Please try again in a moment.');
    }
    return;
  }

  if (!app.isPackaged) {
    if (manual) {
      await showInfo('Updates Unavailable', 'Update checks are only available in packaged builds.');
    }
    return;
  }

  if (activeCheckPromise) {
    if (manual) {
      await showInfo('Checking for Updates', 'An update check is already in progress.');
    }
    return activeCheckPromise;
  }

  manualCheckInProgress = manual;

  if (autoUpdater.allowPrerelease) {
    await applyBetaFeedUrl();
  }

  activeCheckPromise = autoUpdater.checkForUpdates()
    .then(() => undefined)
    .catch((error) => {
      console.error('[updater] checkForUpdates failed:', formatErrorMessage(error));
    })
    .finally(() => {
      manualCheckInProgress = false;
      activeCheckPromise = null;
    });

  return activeCheckPromise;
}

async function applyBetaFeedUrl(): Promise<void> {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      { headers: { Accept: 'application/vnd.github+json' } },
    );
    if (!resp.ok) return;
    const releases = await resp.json() as Array<{
      prerelease?: boolean;
      draft?: boolean;
      tag_name?: string;
    }>;
    const latest = releases.find(r => r.prerelease && !r.draft);
    if (!latest?.tag_name) return;
    const url = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${latest.tag_name}/`;
    autoUpdater.setFeedURL({ provider: 'generic', url });
    console.log(`[updater] Beta feed URL set to ${url}`);
  } catch (e) {
    console.warn('[updater] Failed to resolve beta feed URL, falling back to default', e);
  }
}

export function setUpdateChannel(channel: UpdateChannel): void {
  autoUpdater.allowPrerelease = channel === 'beta';
  if (channel !== 'beta') {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
    } as any);
  }
  console.log(`[updater] Update channel set to: ${channel}`);
}

export function scheduleAutoUpdateCheck(delayMs: number = 10_000): void {
  if (!initialized || !app.isPackaged || process.env.MYOPENCLAW_E2E === '1') return;

  const timer = setTimeout(() => {
    void checkForAppUpdates();
  }, delayMs);

  timer.unref?.();
}
