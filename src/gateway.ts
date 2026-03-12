import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import { spawn, execSync, execFileSync } from 'child_process';
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
  // Kill only our own leftover gateway (identified by OPENCLAW_SERVICE_MARKER=myopenclaw)
  // Never touch system-installed openclaw gateways
  try {
    if (process.platform === 'win32') {
      execSync('wmic process where "CommandLine like \'%OPENCLAW_SERVICE_MARKER=myopenclaw%\' and name like \'%node%\'" call terminate', { timeout: 5000, stdio: 'pipe' });
    } else {
      execSync("ps -eo pid,command | grep 'OPENCLAW_SERVICE_MARKER=myopenclaw' | grep -v grep | awk '{print $1}' | xargs kill -9 2>/dev/null", { timeout: 5000, stdio: 'pipe' });
    }
  } catch { /* no leftover process — fine */ }

  // Stop any existing gateway holding a lock (e.g. leftover from crash or previous session)
  stopExistingGateway();

  const gatewayPort = await findAvailablePort(DEFAULT_PORT);
  const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;

  console.log(`[startGateway] Starting gateway on port ${gatewayPort}...`);
  updateLoadingStatus('Establishing secure connections...', 48);

  ensureAuthProfilesFromEmbeddedConfig();
  ensureGatewayProviderOrRelay();

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
  tryDoctorFix();

  updateLoadingStatus('Launching openclaw gateway...', 90);

  // Kill any process holding our lock and remove the lock file right before spawn
  forceCleanGatewayLock();

  // Diagnostic: dump lock directory state before gateway spawn
  try {
    const lockFile = resolveGatewayLockFile();
    const lockDir = path.dirname(lockFile);
    console.log(`[lock-diag] Expected lock file: ${lockFile}`);
    console.log(`[lock-diag] CONFIG_FILE resolved: ${path.resolve(CONFIG_FILE)}`);
    console.log(`[lock-diag] Lock dir exists: ${fs.existsSync(lockDir)}`);
    if (fs.existsSync(lockDir)) {
      const files = fs.readdirSync(lockDir);
      console.log(`[lock-diag] Lock dir contents (${files.length}): ${files.join(', ')}`);
      for (const f of files) {
        try {
          const content = fs.readFileSync(path.join(lockDir, f), 'utf8');
          console.log(`[lock-diag] ${f}: ${content.slice(0, 200)}`);
        } catch { /* locked file */ }
      }
    }
    console.log(`[lock-diag] Lock file exists: ${fs.existsSync(lockFile)}`);
  } catch (e: any) {
    console.log(`[lock-diag] Error: ${e.message}`);
  }

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
  await new Promise(resolve => setTimeout(resolve, 5000));

  if (gatewayExited) {
    throw new Error(`Gateway process exited immediately with code ${gatewayExitCode}. Check logs above for details.`);
  }

  await waitForGateway(gatewayBaseUrl, 90, () => gatewayExited);

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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  console.error('[waitForGateway] Max retries reached, gateway failed to start');
  throw new Error('Gateway failed to start after max retries. Please check your configuration and try again.');
}

function stopExistingGateway(): void {
  try {
    const cli = findOpenClawCli();
    if (!cli) return;
    const env = {
      ...process.env,
      PATH: buildNodeEnhancedPath(),
      OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
      OPENCLAW_CONFIG_PATH: CONFIG_FILE,
    };
    const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cli);
    execFileSync(cli, ['gateway', 'stop'], {
      encoding: 'utf8', timeout: 10000, stdio: 'pipe', env, shell: useShell,
      ...(process.platform === 'win32' ? { windowsHide: true } : {}),
    });
    console.log('[startGateway] Stopped existing gateway via CLI');
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
            execSync(`taskkill /F /PID ${pid}`, { timeout: 5000, stdio: 'pipe' });
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

function tryDoctorFix(): void {
  try {
    const cli = findOpenClawCli();
    if (!cli) return;

    const env = { ...process.env, PATH: buildNodeEnhancedPath(), OPENCLAW_CONFIG_PATH: CONFIG_FILE };
    const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cli);

    const output = execFileSync(cli, ['doctor', '--fix'], {
      encoding: 'utf8', timeout: 15000, stdio: 'pipe', env, shell: useShell,
      ...(process.platform === 'win32' ? { windowsHide: true } : {}),
    });
    if (output.includes('fix') || output.includes('removed') || output.includes('Unrecognized')) {
      console.log('[doctor] Auto-fixed config:', output.trim());
    }
  } catch (err: any) {
    // doctor --fix is best-effort; if CLI not available, try node fallback
    try {
      const runtimeDir = findRuntimeDir();
      if (!runtimeDir) return;
      const entryMjs = path.join(runtimeDir, 'openclaw-deps', 'openclaw', 'openclaw.mjs');
      const entryJs = path.join(runtimeDir, 'openclaw-deps', 'openclaw', 'dist', 'entry.js');
      const entryFile = fs.existsSync(entryMjs) ? entryMjs : entryJs;
      const nodeBin = findNodeBinary();
      const env = { ...process.env, PATH: buildNodeEnhancedPath(), OPENCLAW_CONFIG_PATH: CONFIG_FILE };

      const output = execFileSync(nodeBin, [entryFile, 'doctor', '--fix'], {
        encoding: 'utf8', timeout: 15000, stdio: 'pipe', env, cwd: runtimeDir,
      });
      if (output.includes('fix') || output.includes('removed') || output.includes('Unrecognized')) {
        console.log('[doctor] Auto-fixed config via node fallback:', output.trim());
      }
    } catch {
      console.log('[doctor] Could not run doctor --fix:', err.message);
    }
  }
}
