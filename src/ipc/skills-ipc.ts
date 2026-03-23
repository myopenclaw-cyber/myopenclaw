import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile, execFileSync } from 'child_process';
import { ipcMain } from 'electron';
import { readGatewayTokenFromConfig } from '../config-store';
import { CONFIG_FILE, OPENCLAW_CONFIG_DIR, DOWNLOADED_RUNTIME_DIR, GATEWAY_WORKSPACE_DIR } from '../constants';
import type { GatewayHandle } from '../types';
import { buildConnectParams, handleConnectResponse } from '../device-identity';
import { buildNodeEnhancedPath } from '../runtime';

function findBundledClawHubCliScript(): string | null {
  try {
    const packageJsonPath = require.resolve('clawhub/package.json');
    const packageDir = path.dirname(packageJsonPath);
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const binEntry = typeof pkg?.bin === 'string'
      ? pkg.bin
      : typeof pkg?.bin?.clawhub === 'string'
        ? pkg.bin.clawhub
        : typeof pkg?.bin?.clawdhub === 'string'
          ? pkg.bin.clawdhub
          : null;

    if (!binEntry) return null;
    const scriptPath = path.resolve(packageDir, binEntry);
    return fs.existsSync(scriptPath) ? scriptPath : null;
  } catch {
    return null;
  }
}

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

function findBrewCli(): string | null {
  const candidates: string[] = [];

  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileSync(cmd, ['brew'], { encoding: 'utf8', timeout: 3000, windowsHide: true }).trim();
    if (result) candidates.push(result.split(/\r?\n/)[0]);
  } catch { /* not in PATH */ }

  const home = os.homedir();
  candidates.push(
    '/opt/homebrew/bin/brew',
    '/usr/local/bin/brew',
    path.join(home, '.linuxbrew', 'bin', 'brew'),
    path.join(home, 'homebrew', 'bin', 'brew'),
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
  const bundledScript = findBundledClawHubCliScript();
  console.log('[marketplace] clawhub start', JSON.stringify(args));
  if (bundledScript) {
    console.log('[marketplace] clawhub using bundled script', bundledScript);
    return runClawHubCliWithBundledScript(bundledScript, args);
  }

  let bin = findClawHubCli();
  if (!bin) {
    return installClawHubCli().then(installedBin => runClawHubCliWithBin(installedBin, args));
  }
  return runClawHubCliWithBin(bin, args);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function summarizeCommandText(value: unknown): string {
  const text = typeof value === 'string' ? value : String(value || '');
  const normalized = stripAnsi(text).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > 400 ? `${normalized.slice(0, 399)}…` : normalized;
}

function isRateLimitedError(error: unknown): boolean {
  const lower = stripAnsi(error instanceof Error ? error.message : String(error || '')).toLowerCase();
  return lower.includes('rate limit exceeded')
    || lower.includes('rate limited')
    || lower.includes('http 429')
    || lower.includes('too many requests');
}

function parseRetryDelayMs(error: unknown): number | null {
  const message = stripAnsi(error instanceof Error ? error.message : String(error || ''));
  const match = message.match(/retry in\s*([0-9]+(?:\.[0-9]+)?)s/i);
  if (!match) return null;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.max(1000, Math.ceil(seconds * 1000));
}

async function runClawHubCliWithRetry(args: string[], maxRetries = 3): Promise<string> {
  let attempt = 0;
  while (true) {
    try {
      return await runClawHubCli(args);
    } catch (e: any) {
      if (!isRateLimitedError(e) || attempt >= maxRetries) throw e;
      const delayMs = parseRetryDelayMs(e) ?? 1500;
      attempt += 1;
      console.warn(`[marketplace] clawhub rate limited, retrying in ${delayMs}ms (${attempt}/${maxRetries})`);
      await sleep(delayMs);
    }
  }
}

function runClawHubCliWithBundledScript(scriptPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [scriptPath, ...args], {
      timeout: 120000,
      encoding: 'utf8',
      windowsHide: true,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
      },
    }, (err, stdout, stderr) => {
      const stdoutSummary = summarizeCommandText(stdout);
      const stderrSummary = summarizeCommandText(stderr);
      if (stdoutSummary) console.log('[marketplace] clawhub stdout', stdoutSummary);
      if (stderrSummary) console.warn('[marketplace] clawhub stderr', stderrSummary);
      if (err) {
        console.error('[marketplace] clawhub failed', err.message);
        reject(new Error(stderr || stdout || err.message));
      } else {
        console.log('[marketplace] clawhub completed');
        resolve(stdout);
      }
    });
  });
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
      const stdoutSummary = summarizeCommandText(stdout);
      const stderrSummary = summarizeCommandText(stderr);
      if (stdoutSummary) console.log('[marketplace] clawhub stdout', stdoutSummary);
      if (stderrSummary) console.warn('[marketplace] clawhub stderr', stderrSummary);
      if (err) {
        console.error('[marketplace] clawhub failed', err.message);
        reject(new Error(stderr || stdout || err.message));
      } else {
        console.log('[marketplace] clawhub completed');
        resolve(stdout);
      }
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

async function getGatewaySkillsStatus(gw: GatewayHandle): Promise<any[]> {
  const payload = await gatewayRpc(gw, 'skills.status', {}) as any;
  return Array.isArray(payload?.skills) ? payload.skills
    : Array.isArray(payload) ? payload
    : [];
}

async function waitForGatewaySkill(gw: GatewayHandle, skillKey: string, attempts = 6): Promise<any | null> {
  for (let i = 0; i < attempts; i += 1) {
    const skills = await getGatewaySkillsStatus(gw);
    const skill = skills.find((item: any) => item?.skillKey === skillKey || item?.name === skillKey);
    if (skill) return skill;
    if (i < attempts - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return null;
}

async function resolveGatewayInstallTarget(
  gw: GatewayHandle,
  skillKey: string,
  requestedInstallId?: string,
): Promise<{ name: string; installId: string } | null> {
  const skill = await waitForGatewaySkill(gw, skillKey);
  if (!skill) {
    if (requestedInstallId) return { name: skillKey, installId: requestedInstallId };
    throw new Error(`Skill not found: ${skillKey}`);
  }

  const resolvedName = typeof skill?.name === 'string' && skill.name.trim().length > 0
    ? skill.name.trim()
    : typeof skill?.skillKey === 'string' && skill.skillKey.trim().length > 0
      ? skill.skillKey.trim()
      : skillKey;

  if (requestedInstallId) {
    return { name: resolvedName, installId: requestedInstallId };
  }

  const installOpts = Array.isArray(skill?.install) ? skill.install : [];
  const installId = installOpts.find((opt: any) => typeof opt?.id === 'string' && opt.id.trim().length > 0)?.id?.trim();

  if (!installId) return null;
  return { name: resolvedName, installId };
}

async function installGatewaySkill(
  gw: GatewayHandle,
  skillKey: string,
  requestedInstallId?: string,
): Promise<boolean> {
  const target = await resolveGatewayInstallTarget(gw, skillKey, requestedInstallId);
  if (!target) {
    console.log('[marketplace] no gateway installer for skill', skillKey);
    return false;
  }
  console.log('[marketplace] gateway install target', JSON.stringify(target));
  await gatewayRpc(gw, 'skills.install', {
    name: target.name,
    installId: target.installId,
    timeoutMs: 60000,
  });
  return true;
}

function summarizeMissingRequirements(skill: any): string | null {
  const missing = skill?.missing || {};
  const parts: string[] = [];
  if (Array.isArray(missing.bins) && missing.bins.length > 0) parts.push(`bins: ${missing.bins.join(', ')}`);
  if (Array.isArray(missing.env) && missing.env.length > 0) parts.push(`env: ${missing.env.join(', ')}`);
  if (Array.isArray(missing.config) && missing.config.length > 0) parts.push(`config: ${missing.config.join(', ')}`);
  return parts.length > 0 ? parts.join(' | ') : null;
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

function clampMarketplaceLimit(limit: unknown): number {
  const value = typeof limit === 'number' ? limit : Number(limit);
  if (!Number.isFinite(value) || value <= 0) return 25;
  return Math.max(1, Math.min(50, Math.floor(value)));
}

function normalizeMarketplaceSort(sort: unknown): string {
  switch (String(sort || '').trim()) {
    case 'downloads':
      return 'downloads';
    case 'updated':
      return 'newest';
    case 'stars':
      return 'stars';
    case 'installs':
      return 'installs';
    case 'name':
      return 'name';
    case 'newest':
      return 'newest';
    // The desktop UI still exposes "Trending"; the public page no longer does.
    // Fallback to downloads so this tab remains useful instead of failing.
    case 'trending':
      return 'downloads';
    default:
      return 'stars';
  }
}

function normalizeMarketplaceConvexEntry(entry: any): Record<string, unknown> | null {
  const skill = entry?.skill;
  if (!skill || typeof skill.slug !== 'string') return null;

  const latestVersion = entry?.latestVersion && typeof entry.latestVersion === 'object'
    ? {
        version: typeof entry.latestVersion.version === 'string' ? entry.latestVersion.version : '',
        createdAt: Number(entry.latestVersion.createdAt || 0),
        changelog: typeof entry.latestVersion.changelog === 'string' ? entry.latestVersion.changelog : '',
        license: entry.latestVersion.license ?? null,
      }
    : undefined;

  return {
    slug: skill.slug,
    displayName: typeof skill.displayName === 'string' && skill.displayName.trim() ? skill.displayName : skill.slug,
    summary: typeof skill.summary === 'string' ? skill.summary : null,
    tags: skill.tags ?? null,
    stats: skill.stats ?? {},
    createdAt: Number(skill.createdAt || 0),
    updatedAt: Number(skill.updatedAt || 0),
    latestVersion,
  };
}

async function fetchMarketplaceListViaConvex(
  sort: unknown,
  cursor: unknown,
  limit: unknown,
): Promise<{ items: Record<string, unknown>[]; nextCursor: string | null }> {
  const args: Record<string, unknown> = {
    dir: 'desc',
    highlightedOnly: false,
    nonSuspiciousOnly: false,
    numItems: clampMarketplaceLimit(limit),
    sort: normalizeMarketplaceSort(sort),
  };
  if (typeof cursor === 'string' && cursor.trim()) args.cursor = cursor;

  const resp = await fetch('https://wry-manatee-359.convex.cloud/api/query', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: 'skills:listPublicPageV4',
      format: 'convex_encoded_json',
      args: [args],
    }),
  });

  if (!resp.ok) throw new Error(formatMarketplaceHttpError(resp));

  const data = await resp.json();
  const page = Array.isArray(data?.value?.page) ? data.value.page : [];
  const items = page
    .map((entry: any) => normalizeMarketplaceConvexEntry(entry))
    .filter((entry: Record<string, unknown> | null): entry is Record<string, unknown> => Boolean(entry));
  const nextCursor = typeof data?.value?.nextCursor === 'string' ? data.value.nextCursor : null;

  return { items, nextCursor };
}

function normalizeMarketplaceDetailViaConvex(data: any): Record<string, unknown> {
  const value = data?.value ?? {};
  const skill = value?.skill ?? null;
  const latestVersion = value?.latestVersion ?? null;
  const owner = value?.owner ?? null;

  return {
    skill: skill ? {
      slug: typeof skill.slug === 'string' ? skill.slug : '',
      displayName: typeof skill.displayName === 'string' ? skill.displayName : (typeof skill.slug === 'string' ? skill.slug : ''),
      summary: typeof skill.summary === 'string' ? skill.summary : null,
      tags: skill.tags ?? null,
      stats: skill.stats ?? {},
      createdAt: Number(skill.createdAt || 0),
      updatedAt: Number(skill.updatedAt || 0),
    } : null,
    latestVersion: latestVersion ? {
      version: typeof latestVersion.version === 'string' ? latestVersion.version : '',
      createdAt: Number(latestVersion.createdAt || 0),
      changelog: typeof latestVersion.changelog === 'string' ? latestVersion.changelog : '',
      license: latestVersion.license ?? null,
    } : null,
    metadata: {
      os: latestVersion?.parsed?.clawdis?.os ?? null,
      systems: latestVersion?.parsed?.clawdis?.systems ?? null,
    },
    owner: owner ? {
      handle: typeof owner.handle === 'string' ? owner.handle : null,
      userId: typeof owner._id === 'string' ? owner._id : null,
      displayName: typeof owner.displayName === 'string' ? owner.displayName : null,
      image: typeof owner.image === 'string' ? owner.image : null,
    } : null,
    moderation: value?.moderationInfo ?? null,
    canonical: value?.canonical ?? null,
    forkOf: value?.forkOf ?? null,
    pendingReview: Boolean(value?.pendingReview),
    requestedSlug: typeof value?.requestedSlug === 'string' ? value.requestedSlug : null,
    resolvedSlug: typeof value?.resolvedSlug === 'string' ? value.resolvedSlug : null,
  };
}

async function fetchMarketplaceDetailViaConvex(slug: string): Promise<Record<string, unknown>> {
  const resp = await fetch('https://wry-manatee-359.convex.cloud/api/query', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: 'skills:getBySlug',
      format: 'convex_encoded_json',
      args: [{ slug }],
    }),
  });

  if (!resp.ok) throw new Error(formatMarketplaceHttpError(resp));

  const data = await resp.json();
  return normalizeMarketplaceDetailViaConvex(data);
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
      if (!name) return { success: false, error: 'name is required' };

      await installGatewaySkill(gw, String(name), typeof installId === 'string' ? installId : undefined);
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

    const brewCmd = findBrewCli();
    if (!brewCmd) {
      return {
        success: false,
        error: 'Homebrew was not found. Install Homebrew first, then try again.',
        results: safeBins.map((bin: string) => ({ bin, ok: false, error: 'brew not found' })),
      };
    }

    const brewBinDir = path.dirname(brewCmd);
    const envPath = process.env.PATH?.includes(brewBinDir)
      ? buildNodeEnhancedPath()
      : `${brewBinDir}${path.delimiter}${buildNodeEnhancedPath()}`;

    const results: { bin: string; ok: boolean; error?: string }[] = [];
    for (const bin of safeBins) {
      try {
        await new Promise<void>((resolve, reject) => {
          execFile(brewCmd, ['install', bin], {
            timeout: 120000,
            env: {
              ...process.env,
              PATH: envPath,
            },
          }, (err, stdout, stderr) => {
            if (err) reject(new Error(stderr || stdout || err.message));
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
      const data = await fetchMarketplaceListViaConvex(sort, cursor, limit);
      return { success: true, items: data.items, nextCursor: data.nextCursor };
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
      try {
        const data = await fetchMarketplaceDetailViaConvex(slug);
        return { success: true, ...data };
      } catch {
        const resp = await fetch(`${CLAWHUB_API}/skills/${encodeURIComponent(slug)}`);
        if (!resp.ok) return { success: false, error: formatMarketplaceHttpError(resp) };
        const data = await resp.json();
        return { success: true, ...data };
      }
    } catch (e: any) {
      return { success: false, error: formatMarketplaceError(e) };
    }
  });

  ipcMain.handle('marketplace-install', async (_event, payload) => {
    try {
      const { slug } = payload || {};
      if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) return { success: false, error: 'Invalid slug' };
      console.log('[marketplace] install requested', slug);

      await runClawHubCliWithRetry([
        'install', slug,
        '--workdir', GATEWAY_WORKSPACE_DIR,
        '--no-input',
        '--force',
      ]);
      console.log('[marketplace] skill downloaded', slug);

      const gw = getGatewayHandle();
      if (gw?.baseUrl) {
        await installGatewaySkill(gw, slug);
        const gatewaySkill = await waitForGatewaySkill(gw, slug);
        const autoEnable = gatewaySkill?.eligible !== false;
        if (autoEnable) {
          try {
            await gatewayRpc(gw, 'skills.update', { skillKey: slug, enabled: true });
            console.log('[marketplace] skill enabled', slug);
          } catch { /* best effort */ }
        } else {
          console.log('[marketplace] skill downloaded but still blocked', slug, summarizeMissingRequirements(gatewaySkill) || 'unknown reason');
          return {
            success: true,
            enabled: false,
            warning: summarizeMissingRequirements(gatewaySkill) || 'Skill downloaded, but it is still blocked.',
          };
        }
      }

      console.log('[marketplace] install completed', slug);
      return { success: true, enabled: true };
    } catch (e: any) {
      console.error('[marketplace] install failed', e);
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
          '--workdir', GATEWAY_WORKSPACE_DIR,
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
