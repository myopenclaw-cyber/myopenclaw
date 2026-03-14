import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import axios from 'axios';
import { spawn, execFileSync } from 'child_process';
import {
  OPENCLAW_CONFIG_DIR,
  CONFIG_FILE,
  DEFAULT_PORT,
  DOWNLOADED_RUNTIME_DIR,
  MIN_NODE_MAJOR_VERSION,
} from './constants';
import type { LoadingStatusCallback } from './types';

// ---------------------------------------------------------------------------
// Async spawn wrapper — avoids blocking the Electron main thread and
// lets us suppress large stdout streams from archive tools during startup.
// ---------------------------------------------------------------------------
function execFileAsync(cmd: string, args: string[], opts: any = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: 'pipe',
      ...opts,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    proc.on('error', reject);
    proc.on('close', (code, signal) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      const detail = stderr.trim() || stdout.trim() || `signal ${signal ?? 'unknown'}`;
      reject(new Error(`Command failed: ${cmd} ${args.join(' ')} (${detail})`));
    });
  });
}

// ---------------------------------------------------------------------------
// CLI cache — avoid spawning `openclaw --version` multiple times per startup
// ---------------------------------------------------------------------------
let _cachedCli: string | null | undefined; // undefined = not yet resolved

// Mtime-based verification cache — avoids spawning `openclaw --version` if binary is unchanged
let _verifiedBins = new Map<string, number>(); // path → mtimeMs
let _repairedRuntimeDirs = new Set<string>();
const DOWNLOADED_RUNTIME_STAMP_FILE = path.join(DOWNLOADED_RUNTIME_DIR, '.runtime-info.json');

type RuntimeTargetConfig = {
  version?: string;
  urls?: string[];
  url?: string;
};

type RuntimeManifest = Record<string, RuntimeTargetConfig>;

type DownloadedRuntimeStamp = {
  target: string;
  cacheKey: string;
};

export function clearCliCache(): void {
  _cachedCli = undefined;
  _verifiedBins.clear();
}

export function getRuntimeTargetLabel(): string {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return process.arch === 'arm64' ? 'mac_silicon' : 'mac_intel';
  return 'linux';
}

function readBundledRuntimeManifest(): RuntimeManifest | null {
  const manifestPath = path.join(__dirname, 'resources', 'runtime-manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e: any) {
    console.log(`[runtime] Failed to read runtime-manifest.json: ${e.message}`);
    return null;
  }
}

function getRuntimeTargetConfig(
  manifest: RuntimeManifest | null,
  target: string = getRuntimeTargetLabel(),
): RuntimeTargetConfig | null {
  const config = manifest?.[target];
  return config && typeof config === 'object' ? config : null;
}

function getRuntimeUrls(config: RuntimeTargetConfig | null): string[] {
  if (!config) return [];
  return Array.isArray(config.urls) ? config.urls : (config.url ? [config.url] : []);
}

function getRuntimeCacheKey(config: RuntimeTargetConfig | null): string {
  if (!config) return 'none';
  const version = typeof config.version === 'string' ? config.version.trim() : '';
  if (version) return `version:${version}`;
  return `urls:${getRuntimeUrls(config).join('|')}`;
}

function readDownloadedRuntimeStamp(): DownloadedRuntimeStamp | null {
  if (!fs.existsSync(DOWNLOADED_RUNTIME_STAMP_FILE)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(DOWNLOADED_RUNTIME_STAMP_FILE, 'utf8'));
    if (typeof raw?.target === 'string' && typeof raw?.cacheKey === 'string') {
      return { target: raw.target, cacheKey: raw.cacheKey };
    }
  } catch { /* ignore invalid stamp */ }
  return null;
}

function writeDownloadedRuntimeStamp(target: string, cacheKey: string): void {
  fs.mkdirSync(DOWNLOADED_RUNTIME_DIR, { recursive: true });
  fs.writeFileSync(
    DOWNLOADED_RUNTIME_STAMP_FILE,
    JSON.stringify({ target, cacheKey }, null, 2),
    'utf8',
  );
}

function isDownloadedRuntimeCurrent(
  config: RuntimeTargetConfig | null,
  target: string = getRuntimeTargetLabel(),
): boolean {
  if (!config) return true;
  const stamp = readDownloadedRuntimeStamp();
  if (!stamp) return false;
  return stamp.target === target && stamp.cacheKey === getRuntimeCacheKey(config);
}

function shouldUseDownloadedRuntime(): boolean {
  const manifest = readBundledRuntimeManifest();
  const config = getRuntimeTargetConfig(manifest);
  return isDownloadedRuntimeCurrent(config);
}

function clearDownloadedRuntime(): void {
  try {
    fs.rmSync(DOWNLOADED_RUNTIME_DIR, { recursive: true, force: true });
  } catch (e: any) {
    console.log(`[runtime] Failed to clear stale runtime cache: ${e.message}`);
  }
  _repairedRuntimeDirs.delete(path.resolve(DOWNLOADED_RUNTIME_DIR));
  clearCliCache();
}

function runtimeEntryExists(baseDir: string): boolean {
  const distDir = path.join(baseDir, 'openclaw-deps', 'openclaw', 'dist');
  return fs.existsSync(path.join(distDir, 'entry.js')) || fs.existsSync(path.join(distDir, 'entry.mjs'));
}

function repairRuntimePermissions(baseDir: string): void {
  if (process.platform === 'win32') return;

  const resolvedBase = path.resolve(baseDir);
  if (_repairedRuntimeDirs.has(resolvedBase)) return;

  const targets = [
    path.join(resolvedBase, 'openclaw-deps', '.bin'),
    path.join(resolvedBase, 'node'),
  ];

  for (const dir of targets) {
    if (!fs.existsSync(dir)) continue;
    try {
      execFileSync('chmod', ['-R', '+x', dir], { stdio: 'pipe' });
      console.log(`[runtime] Repaired permissions: ${dir}`);
    } catch (e: any) {
      console.log(`[runtime] Permission repair skipped for ${dir}: ${e.message}`);
    }
    try { execFileSync('xattr', ['-rd', 'com.apple.quarantine', dir], { stdio: 'pipe' }); } catch { /* ok */ }
    try { execFileSync('xattr', ['-rd', 'com.apple.provenance', dir], { stdio: 'pipe' }); } catch { /* ok */ }
  }

  _repairedRuntimeDirs.add(resolvedBase);
}

function repairKnownRuntimePermissions(): void {
  repairRuntimePermissions(path.join(__dirname, 'resources'));
  repairRuntimePermissions(DOWNLOADED_RUNTIME_DIR);
}

export async function downloadFile(url: string, outputPath: string, onProgress?: (percent: number) => void): Promise<void> {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({ method: 'get', url, responseType: 'stream', timeout: 0, maxRedirects: 10 });
  const total = Number(response.headers['content-length'] || 0);
  let loaded = 0;
  response.data.on('data', (chunk: Buffer) => {
    loaded += chunk.length;
    if (total > 0 && typeof onProgress === 'function') {
      onProgress(Math.max(0, Math.min(100, Math.round((loaded / total) * 100))));
    }
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function downloadWithFallback(urls: string[], outputPath: string, onProgress?: (percent: number) => void): Promise<void> {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const label = i === 0 ? 'CDN' : `mirror ${i}`;
    try {
      console.log(`[runtime] Trying ${label}: ${url}`);
      await downloadFile(url, outputPath, onProgress);
      console.log(`[runtime] Download succeeded from ${label}`);
      return;
    } catch (err: any) {
      console.error(`[runtime] Download failed from ${label}: ${err.message}`);
      try { fs.unlinkSync(outputPath); } catch {}
      if (i === urls.length - 1) {
        throw new Error(`All download sources failed. Last error: ${err.message}`);
      }
      console.log(`[runtime] Falling back to next source...`);
    }
  }
}

export function findRuntimeDir(): string | null {
  // Skip asar-packed resources — files inside .asar cannot be spawned
  const embeddedBase = path.join(__dirname, 'resources');
  if (!embeddedBase.includes('.asar')) {
    if (runtimeEntryExists(embeddedBase)) {
      repairRuntimePermissions(embeddedBase);
      return embeddedBase;
    }
  }
  if (runtimeEntryExists(DOWNLOADED_RUNTIME_DIR)) {
    if (!shouldUseDownloadedRuntime()) {
      console.log('[runtime] Cached downloaded runtime is stale; waiting for refresh');
      return null;
    }
    repairRuntimePermissions(DOWNLOADED_RUNTIME_DIR);
    return DOWNLOADED_RUNTIME_DIR;
  }
  return null;
}

export async function ensureEmbeddedRuntime(updateLoadingStatus: LoadingStatusCallback): Promise<void> {
  const manifest = readBundledRuntimeManifest();
  const target = getRuntimeTargetLabel();
  const config = getRuntimeTargetConfig(manifest, target);
  const urls = getRuntimeUrls(config);

  if (findRuntimeDir()) {
    console.log('[runtime] Runtime found');
    updateLoadingStatus('Runtime ready', 72);
    return;
  }

  if (!manifest) {
    throw new Error('Missing runtime-manifest.json. Cannot download runtime automatically.');
  }

  if (!urls.length) {
    throw new Error(`No runtime download URL configured for platform "${target}". Please download the runtime manually or use the full installer.`);
  }

  const zipPath = path.join(os.tmpdir(), `myopenclaw-runtime-${target}.zip`);

  if (fs.existsSync(DOWNLOADED_RUNTIME_DIR)) {
    console.log('[runtime] Clearing stale downloaded runtime before refresh...');
    clearDownloadedRuntime();
  }

  console.log(`[runtime] Downloading runtime for ${target}...`);
  updateLoadingStatus('Downloading openclaw ...', 52);
  await downloadWithFallback(urls, zipPath, (p) => {
    updateLoadingStatus(`Downloading openclaw ... ${p}%`, 52 + Math.round(p * 0.28));
  });

  console.log('[runtime] Extracting runtime...');
  updateLoadingStatus('Extracting openclaw runtime...', 84);
  fs.mkdirSync(DOWNLOADED_RUNTIME_DIR, { recursive: true });
  if (process.platform === 'win32') {
    await execFileAsync('tar', ['-xf', zipPath, '-C', DOWNLOADED_RUNTIME_DIR], { stdio: 'ignore', windowsHide: true });
  } else {
    await execFileAsync('unzip', ['-oq', zipPath, '-d', DOWNLOADED_RUNTIME_DIR], { stdio: 'ignore' });
    repairRuntimePermissions(DOWNLOADED_RUNTIME_DIR);
  }

  if (!runtimeEntryExists(DOWNLOADED_RUNTIME_DIR)) {
    throw new Error('Runtime extracted but dist/entry.(m)js not found. The runtime package may be incomplete.');
  }

  writeDownloadedRuntimeStamp(target, getRuntimeCacheKey(config));

  if (process.platform === 'win32') {
    addWindowsFirewallRule(path.join(DOWNLOADED_RUNTIME_DIR, 'node', 'node.exe'));
  }

  console.log('[runtime] Runtime ready');
  updateLoadingStatus('Runtime installed', 88);
}

function addWindowsFirewallRule(nodeExePath: string): void {
  if (!fs.existsSync(nodeExePath)) return;
  try {
    execFileSync('netsh', [
      'advfirewall', 'firewall', 'add', 'rule',
      'name=MyOpenClaw Runtime Node',
      'dir=in', 'action=allow',
      `program=${nodeExePath}`,
      'enable=yes', 'profile=any',
    ], { stdio: 'pipe', timeout: 5000, windowsHide: true });
    console.log('[firewall] Added firewall rule for node.exe');
  } catch {
    console.log('[firewall] Could not add firewall rule (needs admin privileges)');
  }
}

export function buildNodeEnhancedPath(): string {
  repairKnownRuntimePermissions();
  const nodeExe = process.platform === 'win32' ? 'node.exe' : 'node';
  const nodeDirs = [
    path.join(__dirname, 'resources', 'node'),
    ...(shouldUseDownloadedRuntime() ? [path.join(DOWNLOADED_RUNTIME_DIR, 'node')] : []),
  ];
  const extra = nodeDirs.filter(d => fs.existsSync(path.join(d, nodeExe)));
  return extra.length > 0 ? `${extra.join(path.delimiter)}${path.delimiter}${process.env.PATH}` : process.env.PATH!;
}

export function verifyOpenClawCli(binPath: string): boolean {
  try {
    // Fast path: if binary mtime hasn't changed since last successful verify, skip spawn
    const stat = fs.statSync(binPath);
    const prevMtime = _verifiedBins.get(binPath);
    if (prevMtime !== undefined && stat.mtimeMs === prevMtime) {
      return true;
    }

    const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(binPath);
    execFileSync(binPath, ['--version'], {
      encoding: 'utf8',
      timeout: 10000,
      stdio: 'pipe',
      env: {
        ...process.env,
        PATH: buildNodeEnhancedPath(),
        OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
        OPENCLAW_CONFIG_PATH: CONFIG_FILE,
      },
      shell: useShell,
      windowsHide: true,
    });
    _verifiedBins.set(binPath, stat.mtimeMs);
    return true;
  } catch (e: any) {
    console.log(`[cli] Verification failed for ${binPath}:`, e.message);
    return false;
  }
}

export function findOpenClawCli(): string | null {
  if (_cachedCli !== undefined) return _cachedCli;
  repairKnownRuntimePermissions();

  // --- Priority 1: MyOpenClaw's own embedded/downloaded runtime ---
  // This ensures full isolation from any global OpenClaw installation.
  const binNames = process.platform === 'win32'
    ? ['openclaw.cmd', 'openclaw.exe', 'openclaw']
    : ['openclaw'];

  const ownCandidates: string[] = [];
  for (const bin of binNames) {
    const embeddedBin = path.join(__dirname, 'resources', 'openclaw-deps', '.bin', bin);
    if (!embeddedBin.includes('.asar')) {
      ownCandidates.push(embeddedBin);
    }
    if (shouldUseDownloadedRuntime()) {
      ownCandidates.push(path.join(DOWNLOADED_RUNTIME_DIR, 'openclaw-deps', '.bin', bin));
    }
  }

  const seen = new Set<string>();
  for (const p of ownCandidates) {
    const resolved = path.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (!fs.existsSync(p)) continue;
    console.log(`[cli] Found own runtime: ${p}, verifying...`);
    if (verifyOpenClawCli(p)) {
      console.log(`[cli] Verified own openclaw CLI: ${p}`);
      _cachedCli = p;
      return p;
    }
  }

  // --- Priority 2: System-wide CLI (fallback for dev / full-installer) ---
  const systemCandidates: string[] = [];

  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileSync(cmd, ['openclaw'], { encoding: 'utf8', timeout: 3000, windowsHide: true }).trim();
    if (result) systemCandidates.push(result.split(/\r?\n/)[0]);
  } catch { /* not in PATH */ }

  const home = os.homedir();
  systemCandidates.push(
    path.join(home, '.local', 'bin', 'openclaw'),
    '/usr/local/bin/openclaw',
  );

  const nvmDir = path.join(home, '.nvm', 'versions', 'node');
  try {
    if (fs.existsSync(nvmDir)) {
      const versions = fs.readdirSync(nvmDir)
        .filter(v => v.startsWith('v'))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      for (const ver of versions) {
        systemCandidates.push(path.join(nvmDir, ver, 'bin', 'openclaw'));
      }
    }
  } catch { /* ignore */ }

  for (const p of systemCandidates) {
    const resolved = path.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (!fs.existsSync(p)) continue;
    console.log(`[cli] Found system candidate: ${p}, verifying...`);
    if (verifyOpenClawCli(p)) {
      console.log(`[cli] Using system openclaw CLI: ${p}`);
      _cachedCli = p;
      return p;
    }
  }

  _cachedCli = null;
  return null;
}

export function findNodeBinary(): string {
  repairKnownRuntimePermissions();
  const nodeExe = process.platform === 'win32' ? 'node.exe' : 'node';

  // 1. System node with sufficient version
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const nodePath = execFileSync(cmd, [nodeExe], { encoding: 'utf8', timeout: 3000, windowsHide: true }).trim().split(/\r?\n/)[0];
    if (nodePath) {
      const ver = execFileSync(nodePath, ['--version'], { encoding: 'utf8', timeout: 3000, windowsHide: true }).trim();
      const major = parseInt(ver.replace('v', '').split('.')[0], 10);
      if (major >= MIN_NODE_MAJOR_VERSION) {
        console.log(`[node] Using system node: ${nodePath} (${ver})`);
        return nodePath;
      }
      console.log(`[node] System node too old: ${ver} (need >= ${MIN_NODE_MAJOR_VERSION})`);
    }
  } catch { /* not in PATH */ }

  // 2. Runtime bundled node
  const candidates = [
    path.join(__dirname, 'resources', 'node', nodeExe),
    ...(shouldUseDownloadedRuntime() ? [path.join(DOWNLOADED_RUNTIME_DIR, 'node', nodeExe)] : []),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(`[node] Using bundled node: ${p}`);
      return p;
    }
  }

  throw new Error(`No suitable Node.js found (>= ${MIN_NODE_MAJOR_VERSION}). Please install Node.js or use the full version of MyOpenClaw.`);
}

export function ensureOpenClawInPath(openclawBin: string): void {
  if (!openclawBin) return;

  // Only add to THIS process's PATH — never modify global PATH, symlinks,
  // or shell profiles.  MyOpenClaw must not affect the global OpenClaw install.
  try {
    const binDir = path.dirname(fs.realpathSync(openclawBin));
    if (!process.env.PATH!.includes(binDir)) {
      const sep = process.platform === 'win32' ? ';' : ':';
      process.env.PATH = `${binDir}${sep}${process.env.PATH}`;
      console.log(`[path] Added to process PATH: ${binDir}`);
    }
  } catch (e: any) {
    console.error('[path] ensureOpenClawInPath failed:', e.message);
  }
}

export function runOpenClawOnboard(cmd: string, prependArgs: string[] = [], cwd?: string): Promise<string> {
  return new Promise((resolve, _reject) => {
    const args = [
      ...prependArgs,
      'onboard',
      '--non-interactive', '--accept-risk',
      '--skip-channels', '--skip-daemon', '--skip-health', '--skip-skills', '--skip-ui',
      '--auth-choice', 'skip',
      '--gateway-port', String(DEFAULT_PORT),
    ];

    const env = {
      ...process.env,
      PATH: buildNodeEnhancedPath(),
      OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
      OPENCLAW_CONFIG_PATH: CONFIG_FILE,
    };

    const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cmd);
    console.log(`[onboard] Running: ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, { stdio: 'pipe', env, shell: useShell, windowsHide: true, ...(cwd ? { cwd } : {}) });

    let output = '';
    proc.stdout.on('data', (d: Buffer) => { output += d; console.log(`[onboard] ${d}`); });
    proc.stderr.on('data', (d: Buffer) => { output += d; console.error(`[onboard] ${d}`); });
    proc.on('close', (code) => {
      if (code === 0) {
        console.log('[onboard] Setup complete');
        resolve(output);
      } else {
        console.error(`[onboard] Exited with code ${code}`);
        resolve(output);
      }
    });
    proc.on('error', (err) => {
      console.error('[onboard] Error:', err.message);
      resolve('');
    });
  });
}
