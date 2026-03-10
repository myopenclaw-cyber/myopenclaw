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

export function findRuntimeDir(): string | null {
  const embeddedDir = path.join(__dirname, 'resources', 'openclaw-deps', 'openclaw', 'dist');
  if (fs.existsSync(path.join(embeddedDir, 'entry.js')) || fs.existsSync(path.join(embeddedDir, 'entry.mjs'))) {
    return path.join(__dirname, 'resources');
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
  const url = manifest?.[target]?.url;

  if (!url) {
    throw new Error(`No runtime download URL configured for platform "${target}". Please download the runtime manually or use the full installer.`);
  }

  const zipPath = path.join(os.tmpdir(), `myopenclaw-runtime-${target}.zip`);

  console.log(`[runtime] Downloading runtime for ${target}...`);
  updateLoadingStatus('Downloading openclaw ...', 52);
  await downloadFile(url, zipPath, (p) => {
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
    const binDir = path.join(DOWNLOADED_RUNTIME_DIR, 'openclaw-deps', '.bin');
    const nodeDir = path.join(DOWNLOADED_RUNTIME_DIR, 'node');
    for (const dir of [binDir, nodeDir]) {
      if (fs.existsSync(dir)) {
        execFileSync('chmod', ['-R', '+x', dir], { stdio: 'inherit' });
        console.log(`[runtime] Fixed permissions: ${dir}`);
      }
    }
  }

  if (!findRuntimeDir()) {
    throw new Error('Runtime extracted but dist/entry.(m)js not found. The runtime package may be incomplete.');
  }

  console.log('[runtime] Runtime ready');
  updateLoadingStatus('Runtime installed', 88);
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
      env: { ...process.env, PATH: buildNodeEnhancedPath() },
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
  const candidates: string[] = [];

  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileSync(cmd, ['openclaw'], { encoding: 'utf8', timeout: 3000 }).trim();
    if (result) candidates.push(result.split(/\r?\n/)[0]);
  } catch { /* not in PATH */ }

  const home = os.homedir();
  candidates.push(
    path.join(home, '.local', 'bin', 'openclaw'),
    '/usr/local/bin/openclaw',
    path.join(home, '.openclaw', 'bin', 'openclaw'),
  );

  const nvmDir = path.join(home, '.nvm', 'versions', 'node');
  try {
    if (fs.existsSync(nvmDir)) {
      const versions = fs.readdirSync(nvmDir)
        .filter(v => v.startsWith('v'))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      for (const ver of versions) {
        candidates.push(path.join(nvmDir, ver, 'bin', 'openclaw'));
      }
    }
  } catch { /* ignore */ }

  // Add candidates with and without Windows extensions
  const binNames = process.platform === 'win32'
    ? ['openclaw.cmd', 'openclaw.exe', 'openclaw']
    : ['openclaw'];

  for (const bin of binNames) {
    candidates.push(path.join(__dirname, 'resources', 'openclaw-deps', '.bin', bin));
    candidates.push(path.join(DOWNLOADED_RUNTIME_DIR, 'openclaw-deps', '.bin', bin));
  }

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    console.log(`[cli] Found candidate: ${p}, verifying...`);
    if (verifyOpenClawCli(p)) {
      console.log(`[cli] Verified openclaw CLI: ${p}`);
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
    const nodePath = execFileSync(cmd, [nodeExe], { encoding: 'utf8', timeout: 3000 }).trim().split(/\r?\n/)[0];
    if (nodePath) {
      const ver = execFileSync(nodePath, ['--version'], { encoding: 'utf8', timeout: 3000 }).trim();
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
  if (!openclawBin || process.platform === 'win32') return;

  try {
    const resolved = fs.realpathSync(openclawBin);
    const standardDirs = ['/usr/local/bin', '/usr/bin', path.join(os.homedir(), '.local', 'bin')];
    const binDir = path.dirname(resolved);

    if (standardDirs.includes(binDir)) {
      console.log('[path] openclaw already in standard PATH:', resolved);
      return;
    }

    // Skip symlinking npm .bin scripts — they use relative paths that break via symlink
    if (binDir.includes('.bin')) {
      console.log('[path] Skipping symlink for npm .bin script:', resolved);
      // Just add the .bin dir to PATH for this process
      if (!process.env.PATH!.includes(binDir)) {
        process.env.PATH = `${binDir}:${process.env.PATH}`;
      }
      return;
    }

    const localBinDir = path.join(os.homedir(), '.local', 'bin');
    const symlinkTarget = path.join(localBinDir, 'openclaw');
    fs.mkdirSync(localBinDir, { recursive: true });

    try { fs.unlinkSync(symlinkTarget); } catch { /* doesn't exist */ }
    fs.symlinkSync(resolved, symlinkTarget);
    fs.chmodSync(symlinkTarget, 0o755);
    console.log(`[path] Created symlink: ${symlinkTarget} -> ${resolved}`);

    const home = os.homedir();
    const exportLine = 'export PATH="$HOME/.local/bin:$PATH"';
    const profiles = ['.zshrc', '.bashrc'].map(f => path.join(home, f));

    for (const profile of profiles) {
      try {
        const content = fs.existsSync(profile) ? fs.readFileSync(profile, 'utf8') : '';
        if (!content.includes('.local/bin')) {
          fs.appendFileSync(profile, `\n# Added by MyOpenClaw\n${exportLine}\n`);
          console.log(`[path] Added ~/.local/bin to ${profile}`);
        }
      } catch (e: any) {
        console.log(`[path] Could not update ${profile}:`, e.message);
      }
    }

    if (!process.env.PATH!.includes(localBinDir)) {
      process.env.PATH = `${localBinDir}:${process.env.PATH}`;
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

    console.log(`[onboard] Running: ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, { stdio: 'pipe', env, ...(cwd ? { cwd } : {}) });

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
