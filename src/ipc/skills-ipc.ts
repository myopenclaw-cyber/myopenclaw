import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile, execFileSync } from 'child_process';
import { ipcMain } from 'electron';
import { readGatewayTokenFromConfig } from '../config-store';
import { CONFIG_FILE, OPENCLAW_CONFIG_DIR, DOWNLOADED_RUNTIME_DIR } from '../constants';
import type { GatewayHandle } from '../types';
import { buildConnectParams, handleConnectResponse } from '../device-identity';

function findClawHubCli(): string | null {
  const candidates: string[] = [];

  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileSync(cmd, ['clawhub'], { encoding: 'utf8', timeout: 3000, windowsHide: true }).trim();
    if (result) candidates.push(result.split(/\r?\n/)[0]);
  } catch { /* not in PATH */ }

  const home = os.homedir();
  const nvmDir = path.join(home, '.nvm', 'versions', 'node');
  try {
    if (fs.existsSync(nvmDir)) {
      const versions = fs.readdirSync(nvmDir)
        .filter(v => v.startsWith('v'))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      for (const ver of versions) {
        candidates.push(path.join(nvmDir, ver, 'bin', 'clawhub'));
      }
    }
  } catch { /* ignore */ }

  const binNames = process.platform === 'win32'
    ? ['clawhub.cmd', 'clawhub.exe', 'clawhub']
    : ['clawhub'];

  for (const bin of binNames) {
    candidates.push(path.join(DOWNLOADED_RUNTIME_DIR, 'openclaw-deps', '.bin', bin));
  }

  if (process.platform === 'win32') {
    // Windows npm global bin directories
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    for (const bin of binNames) {
      candidates.push(path.join(appData, 'npm', bin));
    }
    // Also check Program Files node paths
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    for (const bin of binNames) {
      candidates.push(path.join(pf, 'nodejs', bin));
    }
  }

  candidates.push(
    '/usr/local/bin/clawhub',
    '/opt/homebrew/bin/clawhub',
  );

  const seen = new Set<string>();
  for (const p of candidates) {
    const resolved = path.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findNpmCli(): string | null {
  const candidates: string[] = [];

  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileSync(cmd, ['npm'], { encoding: 'utf8', timeout: 3000, windowsHide: true }).trim();
    if (result) candidates.push(result.split(/\r?\n/)[0]);
  } catch { /* not in PATH */ }

  const home = os.homedir();
  const nvmDir = path.join(home, '.nvm', 'versions', 'node');
  try {
    if (fs.existsSync(nvmDir)) {
      const versions = fs.readdirSync(nvmDir)
        .filter(v => v.startsWith('v'))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      for (const ver of versions) {
        candidates.push(path.join(nvmDir, ver, 'bin', process.platform === 'win32' ? 'npm.cmd' : 'npm'));
      }
    }
  } catch { /* ignore */ }

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    candidates.push(path.join(appData, 'npm', 'npm.cmd'));
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    candidates.push(path.join(pf, 'nodejs', 'npm.cmd'));
    candidates.push(path.join(pf, 'nodejs', 'npm'));
  } else {
    candidates.push('/usr/local/bin/npm');
    candidates.push('/opt/homebrew/bin/npm');
  }

  const seen = new Set<string>();
  for (const p of candidates) {
    const resolved = path.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function installClawHubCli(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('[skills] clawhub not found, auto-installing via npm...');
    const npmCmd = findNpmCli();
    if (!npmCmd) {
      reject(new Error('Failed to auto-install clawhub: npm was not found. Install Node.js/npm or install clawhub manually.'));
      return;
    }
    const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(npmCmd);
    execFile(npmCmd, ['install', '-g', 'clawhub'], {
      timeout: 120000,
      encoding: 'utf8',
      shell: useShell ? true : undefined,
      windowsHide: true,
    }, (err, stdout, stderr) => {
      if (err) {
        console.error('[skills] clawhub install failed:', stderr || err.message);
        reject(new Error('Failed to auto-install clawhub: ' + formatSkillServiceError(stderr || stdout || err.message)));
      } else {
        console.log('[skills] clawhub installed successfully');
        const bin = findClawHubCli();
        if (bin) resolve(bin);
        else reject(new Error('clawhub installed but binary not found in PATH'));
      }
    });
  });
}

function runClawHubCli(args: string[]): Promise<string> {
  let bin = findClawHubCli();
  if (!bin) {
    return installClawHubCli().then(installedBin => runClawHubCliWithBin(installedBin, args));
  }
  return runClawHubCliWithBin(bin, args);
}

function runClawHubCliWithBin(bin: string, args: string[]): Promise<string> {
  // On Windows always use shell — `where` may return paths without .cmd extension
  const useShell = process.platform === 'win32';
  return new Promise((resolve, reject) => {
    execFile(bin, args, {
      timeout: 120000,
      encoding: 'utf8',
      shell: useShell ? true : undefined,
      windowsHide: true,
    }, (err, stdout, stderr) => {
      if (err) reject(new Error(formatSkillServiceError(stderr || stdout || err.message)));
      else resolve(stdout);
    });
  });
}

async function gatewayRpc(
  gw: GatewayHandle,
  method: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  const id = crypto.randomUUID();
  const token = readGatewayTokenFromConfig();
  const wsUrl = gw.baseUrl.replace(/^http/, 'ws') + '/ws';

  return new Promise((resolve, reject) => {
    // Use Node's built-in WebSocket (available in Electron / Node 22+).
    // Fallback to the ws package if the global is unavailable.
    let WS: typeof WebSocket;
    try {
      WS = (global as any).WebSocket || require('ws');
    } catch {
      WS = require('ws');
    }

    const socket = new WS(wsUrl, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    } as any);

    const timer = setTimeout(() => {
      try { socket.close(); } catch {}
      reject(new Error(`Gateway RPC timeout for method "${method}"`));
    }, 15000);

    let connected = false;
    let challengeNonce: string | null = null;
    const connectId = crypto.randomUUID();
    const reqMsg = JSON.stringify({ type: 'req', id, method, params });

    // Gateway sends connect.challenge as the first frame; we wait for it.

    socket.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));

        // Handle connect.challenge — extract nonce and send signed connect
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          challengeNonce = msg.payload?.nonce;
          socket.send(JSON.stringify({
            type: 'req',
            id: connectId,
            method: 'connect',
            params: buildConnectParams(token, challengeNonce!),
          }));
          return;
        }

        // Ignore other server events during handshake
        if (msg.type === 'event') return;

        // Wait for connect acknowledgment before sending RPC
        if (!connected) {
          if (msg.type === 'res' && msg.id === connectId && msg.ok) {
            connected = true;
            handleConnectResponse(msg.payload);
            socket.send(reqMsg);
            return;
          }
        }

        if (msg.id !== id) return;
        clearTimeout(timer);
        socket.close();
        if (msg.ok) {
          resolve(msg.payload);
        } else {
          const errMsg = typeof msg.error === 'object' ? msg.error?.message : msg.error;
          reject(new Error(errMsg || `Gateway RPC error for "${method}"`));
        }
      } catch (e) {
        clearTimeout(timer);
        socket.close();
        reject(e);
      }
    };

    socket.onerror = (err: Event) => {
      clearTimeout(timer);
      reject(new Error(`Gateway WebSocket error: ${(err as any).message || String(err)}`));
    };
  });
}

function formatMarketplaceHttpError(resp: Response): string {
  if (resp.status === 429) {
    const retryAfter = resp.headers.get('retry-after');
    return retryAfter
      ? `Skill marketplace is temporarily rate limited. Please try again in ${retryAfter} seconds.`
      : 'Skill marketplace is temporarily rate limited. Please wait a moment and try again.';
  }
  return `HTTP ${resp.status}`;
}

function stripAnsi(value: string): string {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

function formatSkillServiceError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || 'unknown');
  const message = stripAnsi(raw).replace(/\s+/g, ' ').trim();
  const lower = message.toLowerCase();
  if (
    lower.includes('http 429')
    || lower.includes('rate limited')
    || lower.includes('rate limit exceeded')
    || lower.includes('too many requests')
  ) {
    return 'Skill service is temporarily busy. Please wait a moment and try again.';
  }
  return message;
}

function formatMarketplaceError(error: unknown): string {
  const message = formatSkillServiceError(error);
  if (message.includes('HTTP 429')) {
    return 'Skill marketplace is temporarily rate limited. Please wait a moment and try again.';
  }
  return message;
}

export function registerSkillsHandlers(
  getGatewayHandle: () => GatewayHandle | null,
): void {
  ipcMain.handle('skills-list', async () => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: 'Gateway not running', skills: [] };

      const payload = await gatewayRpc(gw, 'skills.status', {}) as any;
      const skills = Array.isArray(payload?.skills) ? payload.skills
        : Array.isArray(payload) ? payload
        : [];

      // Read openclaw.json to get user-enabled skills from skills.entries
      let enabledKeys: Set<string> = new Set();
      try {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        const entries = cfg?.skills?.entries || {};
        for (const [key, val] of Object.entries(entries)) {
          if (val && (val as any).enabled) enabledKeys.add(key);
        }
      } catch { /* config may not exist yet */ }

      // Annotate each skill with 'enabled' based on config entries
      for (const s of skills) {
        (s as any).enabled = enabledKeys.has(s.skillKey);
      }

      return { success: true, skills };
    } catch (e: any) {
      return { success: false, error: e.message, skills: [] };
    }
  });

  ipcMain.handle('skills-toggle', async (_event, payload) => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: 'Gateway not running' };

      const { skillKey, enabled } = payload || {};
      if (!skillKey) return { success: false, error: 'skillKey is required' };

      await gatewayRpc(gw, 'skills.update', { skillKey, enabled: !!enabled });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('skills-install', async (_event, payload) => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: 'Gateway not running' };

      const { name, installId } = payload || {};
      if (!name || !installId) return { success: false, error: 'name and installId are required' };

      await gatewayRpc(gw, 'skills.install', { name, installId, timeoutMs: 60000 });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('skills-install-deps', async (_event, payload) => {
    const { bins } = payload || {};
    if (!Array.isArray(bins) || bins.length === 0) {
      return { success: true, installed: [] };
    }

    // Only allow simple alphanumeric package names to prevent injection
    const safeBins = bins.filter((b: string) => /^[a-zA-Z0-9_-]+$/.test(b));
    if (safeBins.length === 0) {
      return { success: false, error: 'No valid package names' };
    }

    const results: { bin: string; ok: boolean; error?: string }[] = [];
    for (const bin of safeBins) {
      try {
        await new Promise<void>((resolve, reject) => {
          execFile('brew', ['install', bin], { timeout: 120000 }, (err, _stdout, stderr) => {
            if (err) reject(new Error(stderr || err.message));
            else resolve();
          });
        });
        results.push({ bin, ok: true });
      } catch (e: any) {
        results.push({ bin, ok: false, error: e.message });
      }
    }

    const allOk = results.every(r => r.ok);
    return { success: allOk, results };
  });

  // -----------------------------------------------------------------------
  // ClawHub Marketplace
  // -----------------------------------------------------------------------
  const CLAWHUB_API = 'https://clawhub.ai/api/v1';

  ipcMain.handle('marketplace-list', async (_event, payload) => {
    try {
      const { sort, cursor, limit } = payload || {};
      const params = new URLSearchParams();
      params.set('limit', String(limit || 25));
      if (sort) params.set('sort', sort);
      if (cursor) params.set('cursor', cursor);
      const resp = await fetch(`${CLAWHUB_API}/skills?${params}`);
      if (!resp.ok) return { success: false, error: formatMarketplaceHttpError(resp) };
      const data = await resp.json();
      return { success: true, items: data.items || [], nextCursor: data.nextCursor || null };
    } catch (e: any) {
      return { success: false, error: formatMarketplaceError(e) };
    }
  });

  ipcMain.handle('marketplace-search', async (_event, payload) => {
    try {
      const { query, limit } = payload || {};
      if (!query) return { success: false, error: 'query is required' };
      const params = new URLSearchParams({ q: query, limit: String(limit || 15) });
      const resp = await fetch(`${CLAWHUB_API}/search?${params}`);
      if (!resp.ok) return { success: false, error: formatMarketplaceHttpError(resp) };
      const data = await resp.json();
      return { success: true, results: data.results || [] };
    } catch (e: any) {
      return { success: false, error: formatMarketplaceError(e) };
    }
  });

  ipcMain.handle('marketplace-detail', async (_event, payload) => {
    try {
      const { slug } = payload || {};
      if (!slug) return { success: false, error: 'slug is required' };
      const resp = await fetch(`${CLAWHUB_API}/skills/${encodeURIComponent(slug)}`);
      if (!resp.ok) return { success: false, error: formatMarketplaceHttpError(resp) };
      const data = await resp.json();
      return { success: true, ...data };
    } catch (e: any) {
      return { success: false, error: formatMarketplaceError(e) };
    }
  });

  ipcMain.handle('marketplace-install', async (_event, payload) => {
    try {
      const { slug } = payload || {};
      if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) return { success: false, error: 'Invalid slug' };

      await runClawHubCli([
        'install', slug,
        '--workdir', OPENCLAW_CONFIG_DIR,
        '--no-input',
        '--force',
      ]);

      const gw = getGatewayHandle();
      if (gw?.baseUrl) {
        try {
          await gatewayRpc(gw, 'skills.install', { name: slug, installId: slug, timeoutMs: 60000 });
        } catch { /* skill files are on disk; gateway will pick up on restart */ }
        try {
          await gatewayRpc(gw, 'skills.update', { skillKey: slug, enabled: true });
        } catch { /* best effort */ }
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatMarketplaceError(e) };
    }
  });

  ipcMain.handle('marketplace-uninstall', async (_event, payload) => {
    try {
      const { slug } = payload || {};
      if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) return { success: false, error: 'Invalid slug' };

      // Disable in gateway first
      const gw = getGatewayHandle();
      if (gw?.baseUrl) {
        try {
          await gatewayRpc(gw, 'skills.update', { skillKey: slug, enabled: false });
        } catch { /* best effort */ }
      }

      // Try clawhub uninstall — if the skill was not installed via clawhub
      // (e.g. built-in gateway skill), disabling above is sufficient
      try {
        await runClawHubCli([
          'uninstall', slug,
          '--workdir', OPENCLAW_CONFIG_DIR,
          '--no-input',
        ]);
      } catch (clawErr: any) {
        const msg = clawErr.message || '';
        if (msg.includes('Not installed') || msg.includes('not found')) {
          console.log(`[marketplace] ${slug} not a clawhub package, disabled via gateway only`);
        } else {
          throw clawErr;
        }
      }

      // Remove entry from openclaw.json skills.entries so it no longer appears as installed
      try {
        const ocCfg: any = fs.existsSync(CONFIG_FILE)
          ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, ''))
          : {};
        if (ocCfg.skills?.entries?.[slug]) {
          delete ocCfg.skills.entries[slug];
          fs.writeFileSync(CONFIG_FILE, JSON.stringify(ocCfg, null, 2), 'utf8');
          console.log(`[marketplace] Removed ${slug} from skills.entries`);
        }
      } catch { /* best effort */ }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatMarketplaceError(e) };
    }
  });

  ipcMain.handle('skills-configure', async (_event, payload) => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: 'Gateway not running' };

      const { skillKey, apiKey, env } = payload || {};
      if (!skillKey) return { success: false, error: 'skillKey is required' };

      const params: Record<string, unknown> = { skillKey };
      if (apiKey !== undefined) params.apiKey = apiKey;
      if (env !== undefined) params.env = env;

      await gatewayRpc(gw, 'skills.update', params);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}
