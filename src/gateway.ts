import * as path from 'path';
import * as fs from 'fs';
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

  await waitForGateway(gatewayBaseUrl);

  updateLoadingStatus('Startup complete. Opening workspace...', 100);
  console.log(`[startGateway] Gateway started successfully on ${gatewayBaseUrl}`);

  return {
    port: gatewayPort,
    baseUrl: gatewayBaseUrl,
    process: gatewayProcess,
    token: readGatewayTokenFromConfig(),
  };
}

export async function waitForGateway(gatewayBaseUrl: string, maxRetries: number = 90): Promise<boolean> {
  console.log(`[waitForGateway] Checking ${gatewayBaseUrl}/health...`);
  for (let i = 0; i < maxRetries; i++) {
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
  throw new Error('Gateway failed to start after 30 attempts. Please check your configuration and try again.');
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
