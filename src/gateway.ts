import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import { spawn, execSync, execFile, execFileSync } from 'child_process';
import axios from 'axios';
import {
  OPENCLAW_CONFIG_DIR,
  CONFIG_FILE,
  DEFAULT_PORT,
} from './constants';
import {
  ensureRandomGatewayToken,
  readGatewayTokenFromConfig,
  loadEmbeddedConfig,
} from './config-store';
import { ensureAuthProfilesFromEmbeddedConfig, ensureGatewayProviderOrRelay } from './auth';
import { findAvailablePort, isOpenClawGatewayRunning } from './network';
import { findOpenClawCli, findRuntimeDir, findNodeBinary, buildNodeEnhancedPath } from './runtime';
import type { GatewayHandle, LoadingStatusCallback } from './types';

export async function startGateway(updateLoadingStatus: LoadingStatusCallback): Promise<GatewayHandle> {
  // Kill our own leftover gateway — match by .myopenclaw path in command line
  try {
    if (process.platform === 'win32') {
      // Use PowerShell via execFile (async) to avoid blocking main thread
      await new Promise<void>((resolve) => {
        execFile('powershell.exe', [
          '-NoProfile', '-Command',
          "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*myopenclaw*' -and $_.CommandLine -like '*gateway*' } | ForEach-Object { Write-Host \"Killing PID $($_.ProcessId): $($_.CommandLine.Substring(0, [Math]::Min(80, $_.CommandLine.Length)))\"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
        ], { encoding: 'utf8', timeout: 15000, windowsHide: true }, (err, stdout) => {
          const killed = (stdout as string || '').trim();
          if (killed) console.log('[startGateway] Killed leftover processes:', killed);
          resolve();
        });
      });
    } else {
      execSync("ps -eo pid,command | grep 'myopenclaw' | grep 'gateway' | grep -v grep | awk '{print $1}' | xargs kill -9 2>/dev/null", { timeout: 5000, stdio: 'pipe' });
    }
  } catch (e: any) {
    console.log('[startGateway] Process cleanup:', e.message?.slice(0, 100));
  }
  // Give Windows time to release file handles after process termination
  if (process.platform === 'win32') {
    const lf = resolveGatewayLockFile();
    for (let waited = 0; waited < 3000; waited += 300) {
      try { if (!fs.existsSync(lf) || fs.readFileSync(lf, 'utf8')) break; } catch { /* still locked */ }
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // Stop any existing gateway holding a lock (e.g. leftover from crash or previous session)
  await stopExistingGateway();

  const gatewayPort = await findAvailablePort(DEFAULT_PORT);
  const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;

  console.log(`[startGateway] Starting gateway on port ${gatewayPort}...`);
  updateLoadingStatus('Establishing secure connections...', 48);

  ensureAuthProfilesFromEmbeddedConfig();
  await ensureGatewayProviderOrRelay();

  const gatewayToken = ensureRandomGatewayToken();

  // Sync the token into openclaw.json so the gateway process reads the same token
  try {
    const ocCfg: any = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, ''))
      : {};
    ocCfg.gateway = ocCfg.gateway || {};
    ocCfg.gateway.auth = ocCfg.gateway.auth || {};
    ocCfg.gateway.auth.token = gatewayToken;
    ocCfg.gateway.auth.mode = 'token';

    // Sync channels from embedded-config.json into openclaw.json
    const embeddedCfg = loadEmbeddedConfig();
    if (embeddedCfg.channels && Object.keys(embeddedCfg.channels).length > 0) {
      ocCfg.channels = { ...(ocCfg.channels || {}), ...embeddedCfg.channels };
      console.log('[startGateway] Synced channels to openclaw.json:', Object.keys(embeddedCfg.channels).join(', '));
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(ocCfg, null, 2), 'utf8');
    console.log('[startGateway] Synced gateway token to openclaw.json');
  } catch (e: any) {
    console.error('[startGateway] Failed to sync token to openclaw.json:', e.message);
  }

  // Auto-fix invalid config keys before starting gateway
  await tryDoctorFix();

  updateLoadingStatus('Launching openclaw gateway...', 90);

  // Kill any process holding our lock and remove the lock file right before spawn
  forceCleanGatewayLock();

  const gatewayEnv = {
    ...process.env,
    PATH: buildNodeEnhancedPath(),
    OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
    OPENCLAW_CONFIG_PATH: CONFIG_FILE,
    OPENCLAW_GATEWAY_PORT: String(gatewayPort),
    OPENCLAW_SERVICE_MARKER: 'myopenclaw',
    OPENCLAW_SERVICE_KIND: 'gateway',
  };

  let gatewayProcess;
  const openclawBin = findOpenClawCli();
  if (openclawBin) {
    console.log(`[startGateway] Using openclaw CLI: ${openclawBin}`);
    const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(openclawBin);
    gatewayProcess = spawn(openclawBin, ['gateway', 'run', '--port', String(gatewayPort), '--allow-unconfigured'], {
      stdio: 'pipe', env: gatewayEnv,
      shell: useShell,
      windowsHide: true,
    });
  } else {
    const runtimeDir = findRuntimeDir() || path.join(__dirname, 'resources');
    const entryMjs = path.join(runtimeDir, 'openclaw-deps', 'openclaw', 'openclaw.mjs');
    const entryJs = path.join(runtimeDir, 'openclaw-deps', 'openclaw', 'dist', 'entry.js');
    const entryFile = fs.existsSync(entryMjs) ? entryMjs : entryJs;
    const nodeBin = findNodeBinary();
    console.log(`[startGateway] Fallback: ${nodeBin} ${entryFile} gateway run --port ${gatewayPort}`);
    gatewayProcess = spawn(nodeBin, [entryFile, 'gateway', 'run', '--port', String(gatewayPort), '--allow-unconfigured'], {
      stdio: 'pipe', cwd: runtimeDir, env: gatewayEnv,
      ...(process.platform === 'win32' ? { windowsHide: true } : {}),
    });
  }

  let gatewayExited = false;
  let gatewayExitCode: number | null = null;
  gatewayProcess.stdout.on('data', (data: Buffer) => console.log(`[Gateway stdout] ${data}`));
  gatewayProcess.stderr.on('data', (data: Buffer) => console.error(`[Gateway stderr] ${data}`));
  gatewayProcess.on('exit', (code, signal) => {
    gatewayExited = true;
    gatewayExitCode = code;
    console.log(`[Gateway] Process exited with code ${code}, signal ${signal}`);
    if (code !== 0) console.error('[Gateway] Unexpected exit!');
  });
  gatewayProcess.on('error', (err) => console.error('[Gateway] Process error:', err));

  console.log('[startGateway] Waiting for gateway to start...');
  updateLoadingStatus('Checking gateway health...', 94);

  // Give the process a brief moment to crash-exit before polling
  await new Promise(resolve => setTimeout(resolve, 500));

  if (gatewayExited) {
    throw new Error(`Gateway process exited immediately with code ${gatewayExitCode}. Check logs above for details.`);
  }

  await waitForGateway(gatewayBaseUrl, 60, () => gatewayExited);

  updateLoadingStatus('Startup complete. Opening workspace...', 100);
  console.log(`[startGateway] Gateway started successfully on ${gatewayBaseUrl}`);

  return {
    port: gatewayPort,
    baseUrl: gatewayBaseUrl,
    process: gatewayProcess,
    token: readGatewayTokenFromConfig(),
  };
}

export async function waitForGateway(
  gatewayBaseUrl: string,
  maxRetries: number = 90,
  hasProcessExited?: () => boolean,
): Promise<boolean> {
  console.log(`[waitForGateway] Checking ${gatewayBaseUrl}/health...`);
  for (let i = 0; i < maxRetries; i++) {
    if (hasProcessExited?.()) {
      console.error('[waitForGateway] Gateway process exited, aborting health checks');
      throw new Error('Gateway process exited unexpectedly. Check logs above for details.');
    }
    try {
      console.log(`[waitForGateway] Attempt ${i + 1}/${maxRetries}...`);
      const response = await axios.get(`${gatewayBaseUrl}/health`, { timeout: 2000 });
      console.log(`[waitForGateway] Success! Response:`, response.data);
      return true;
    } catch (error: any) {
      console.log(`[waitForGateway] Attempt ${i + 1} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  console.error('[waitForGateway] Max retries reached, gateway failed to start');
  throw new Error('Gateway failed to start after max retries. Please check your configuration and try again.');
}

async function stopExistingGateway(): Promise<void> {
  const cli = findOpenClawCli();
  if (!cli) return;
  try {
    const env = {
      ...process.env,
      PATH: buildNodeEnhancedPath(),
      OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
      OPENCLAW_CONFIG_PATH: CONFIG_FILE,
    };
    const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cli);
    await new Promise<void>((resolve) => {
      execFile(cli, ['gateway', 'stop'], {
        encoding: 'utf8', timeout: 10000, stdio: 'pipe', env, shell: useShell,
        ...(process.platform === 'win32' ? { windowsHide: true } : {}),
      } as any, (err) => {
        if (!err) console.log('[startGateway] Stopped existing gateway via CLI');
        resolve();
      });
    });
  } catch {
    // No gateway running or stop failed — fine
  }
}

/** Resolve the gateway lock file path scoped to our CONFIG_FILE. */
function resolveGatewayLockFile(): string {
  const hash = crypto.createHash('sha256').update(path.resolve(CONFIG_FILE)).digest('hex').slice(0, 8);
  const uid = process.getuid?.();
  const lockDir = path.join(os.tmpdir(), uid != null ? `openclaw-${uid}` : 'openclaw');
  return path.join(lockDir, `gateway.${hash}.lock`);
}

/**
 * Kill the process holding our gateway lock, then remove the lock file.
 * The lock file is JSON: { pid, createdAt, configPath }
 */
function forceCleanGatewayLock(): void {
  try {
    const lockFile = resolveGatewayLockFile();
    if (!fs.existsSync(lockFile)) return;

    // Read lock to get PID
    try {
      const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      const pid = lock?.pid;
      if (pid && typeof pid === 'number') {
        console.log(`[startGateway] Lock held by PID ${pid}, force-killing...`);
        try {
          if (process.platform === 'win32') {
            execSync(`taskkill /F /PID ${pid}`, { timeout: 5000, stdio: 'pipe', windowsHide: true });
          } else {
            process.kill(pid, 'SIGKILL');
          }
          console.log(`[startGateway] Killed PID ${pid}`);
        } catch {
          console.log(`[startGateway] PID ${pid} already dead or inaccessible`);
        }
      }
    } catch {
      // Lock file unreadable — just delete it
    }

    fs.unlinkSync(lockFile);
    console.log(`[startGateway] Removed lock file: ${lockFile}`);
  } catch (e: any) {
    console.log('[startGateway] Lock cleanup failed:', e.message);
  }
}

async function tryDoctorFix(): Promise<void> {
  const runDoctor = (cmd: string, args: string[], opts: any): Promise<void> => {
    return new Promise((resolve) => {
      execFile(cmd, args, { encoding: 'utf8', timeout: 15000, stdio: 'pipe', ...opts } as any, (err, stdout) => {
        const output = String(stdout || '');
        if (!err && (output.includes('fix') || output.includes('removed') || output.includes('Unrecognized'))) {
          console.log('[doctor] Auto-fixed config:', output.trim());
        }
        resolve();
      });
    });
  };

  const cli = findOpenClawCli();
  if (cli) {
    const env = { ...process.env, PATH: buildNodeEnhancedPath(), OPENCLAW_CONFIG_PATH: CONFIG_FILE };
    const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cli);
    await runDoctor(cli, ['doctor', '--fix'], {
      env, shell: useShell,
      ...(process.platform === 'win32' ? { windowsHide: true } : {}),
    });
    return;
  }

  // Fallback: run via node entry point
  const runtimeDir = findRuntimeDir();
  if (!runtimeDir) return;
  const entryMjs = path.join(runtimeDir, 'openclaw-deps', 'openclaw', 'openclaw.mjs');
  const entryJs = path.join(runtimeDir, 'openclaw-deps', 'openclaw', 'dist', 'entry.js');
  const entryFile = fs.existsSync(entryMjs) ? entryMjs : entryJs;
  const nodeBin = findNodeBinary();
  const env = { ...process.env, PATH: buildNodeEnhancedPath(), OPENCLAW_CONFIG_PATH: CONFIG_FILE };
  await runDoctor(nodeBin, [entryFile, 'doctor', '--fix'], { env, cwd: runtimeDir, windowsHide: true });
}
