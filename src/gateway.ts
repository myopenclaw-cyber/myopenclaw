import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import axios from 'axios';
import {
  OPENCLAW_CONFIG_DIR,
  CONFIG_FILE,
} from './constants';
import {
  ensureRandomGatewayToken,
  readGatewayTokenFromConfig,
} from './config-store';
import { ensureAuthProfilesFromEmbeddedConfig } from './auth';
import { findAvailablePort, isOpenClawGatewayRunning } from './network';
import { findOpenClawCli, findRuntimeDir, findNodeBinary, buildNodeEnhancedPath } from './runtime';
import type { GatewayHandle, LoadingStatusCallback } from './types';

export async function startGateway(updateLoadingStatus: LoadingStatusCallback): Promise<GatewayHandle> {
  let gatewayPort: number;

  if (await isOpenClawGatewayRunning(18800)) {
    gatewayPort = 18800;
  } else {
    gatewayPort = await findAvailablePort(18800);
  }
  const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;

  console.log(`[startGateway] Starting gateway on port ${gatewayPort}...`);
  updateLoadingStatus('Establishing secure connections...', 48);

  ensureAuthProfilesFromEmbeddedConfig();

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
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(ocCfg, null, 2), 'utf8');
    console.log('[startGateway] Synced gateway token to openclaw.json');
  } catch (e: any) {
    console.error('[startGateway] Failed to sync token to openclaw.json:', e.message);
  }

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

export async function waitForGateway(gatewayBaseUrl: string, maxRetries: number = 30): Promise<boolean> {
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
