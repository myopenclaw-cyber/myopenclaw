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

export function getRuntimeTargetLabel(): string {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return process.arch === 'arm64' ? 'mac_silicon' : 'mac_intel';
  return 'linux';
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
    const embeddedDir = path.join(embeddedBase, 'openclaw-deps', 'openclaw', 'dist');
    if (fs.existsSync(path.join(embeddedDir, 'entry.js')) || fs.existsSync(path.join(embeddedDir, 'entry.mjs'))) {
      return embeddedBase;
    }
  }
  const dlDir = path.join(DOWNLOADED_RUNTIME_DIR, 'openclaw-deps', 'openclaw', 'dist');
  if (fs.existsSync(path.join(dlDir, 'entry.js')) || fs.existsSync(path.join(dlDir, 'entry.mjs'))) {
    return DOWNLOADED_RUNTIME_DIR;
  }
  return null;
}

export async function ensureEmbeddedRuntime(updateLoadingStatus: LoadingStatusCallback): Promise<void> {
  if (findRuntimeDir()) {
    console.log('[runtime] Runtime found');
    updateLoadingStatus('Runtime ready', 72);
    return;
  }

  const manifestPath = path.join(__dirname, 'resources', 'runtime-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Missing runtime-manifest.json. Cannot download runtime automatically.');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const target = getRuntimeTargetLabel();
  const urls: string[] = manifest?.[target]?.urls || (manifest?.[target]?.url ? [manifest[target].url] : []);

  if (!urls.length) {
    throw new Error(`No runtime download URL configured for platform "${target}". Please download the runtime manually or use the full installer.`);
  }

  const zipPath = path.join(os.tmpdir(), `myopenclaw-runtime-${target}.zip`);

  console.log(`[runtime] Downloading runtime for ${target}...`);
  updateLoadingStatus('Downloading openclaw ...', 52);
  await downloadWithFallback(urls, zipPath, (p) => {
    updateLoadingStatus(`Downloading openclaw ... ${p}%`, 52 + Math.round(p * 0.28));
  });

  console.log('[runtime] Extracting runtime...');
  updateLoadingStatus('Extracting openclaw runtime...', 84);
  fs.mkdirSync(DOWNLOADED_RUNTIME_DIR, { recursive: true });
  if (process.platform === 'win32') {
    execFileSync('tar', ['-xf', zipPath, '-C', DOWNLOADED_RUNTIME_DIR], { stdio: 'pipe', windowsHide: true });
  } else {
    execFileSync('unzip', ['-o', zipPath, '-d', DOWNLOADED_RUNTIME_DIR], { stdio: 'inherit' });
    // Fix permissions on extracted binaries (unzip may strip execute bits)
    // Also remove macOS quarantine attributes that block execution
    const binDir = path.join(DOWNLOADED_RUNTIME_DIR, 'openclaw-deps', '.bin');
    const nodeDir = path.join(DOWNLOADED_RUNTIME_DIR, 'node');
    for (const dir of [binDir, nodeDir]) {
      if (fs.existsSync(dir)) {
        execFileSync('chmod', ['-R', '+x', dir], { stdio: 'inherit' });
        try { execFileSync('xattr', ['-rd', 'com.apple.quarantine', dir], { stdio: 'pipe' }); } catch { /* ok */ }
        try { execFileSync('xattr', ['-rd', 'com.apple.provenance', dir], { stdio: 'pipe' }); } catch { /* ok */ }
        console.log(`[runtime] Fixed permissions: ${dir}`);
      }
    }
  }

  if (!findRuntimeDir()) {
    throw new Error('Runtime extracted but dist/entry.(m)js not found. The runtime package may be incomplete.');
  }

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
  const nodeExe = process.platform === 'win32' ? 'node.exe' : 'node';
  const nodeDirs = [
    path.join(__dirname, 'resources', 'node'),
    path.join(DOWNLOADED_RUNTIME_DIR, 'node'),
  ];
  const extra = nodeDirs.filter(d => fs.existsSync(path.join(d, nodeExe)));
  return extra.length > 0 ? `${extra.join(path.delimiter)}${path.delimiter}${process.env.PATH}` : process.env.PATH!;
}

export function verifyOpenClawCli(binPath: string): boolean {
  try {
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
    return true;
  } catch (e: any) {
    console.log(`[cli] Verification failed for ${binPath}:`, e.message);
    return false;
  }
}

export function findOpenClawCli(): string | null {
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
    ownCandidates.push(path.join(DOWNLOADED_RUNTIME_DIR, 'openclaw-deps', '.bin', bin));
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
      return p;
    }
  }

  return null;
}

export function findNodeBinary(): string {
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
    path.join(DOWNLOADED_RUNTIME_DIR, 'node', nodeExe),
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
