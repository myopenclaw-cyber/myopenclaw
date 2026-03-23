import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile, execFileSync } from 'child_process';
import { ipcMain } from 'electron';
import { readGatewayTokenFromConfig } from '../config-store';
import { CONFIG_FILE, MANAGED_TOOLS_DIR, OPENCLAW_CONFIG_DIR, DOWNLOADED_RUNTIME_DIR, GATEWAY_WORKSPACE_DIR } from '../constants';
import type { GatewayHandle } from '../types';
import { buildConnectParams, handleConnectResponse } from '../device-identity';
import { buildNodeEnhancedPath, downloadFile } from '../runtime';

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
    const result = execFileSync(cmd, ['clawhub'], {
      encoding: 'utf8',
      timeout: 3000,
      windowsHide: true,
      env: {
        ...process.env,
        PATH: buildNodeEnhancedPath(),
      },
    }).trim();
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

function hasCommandOnHost(command: string): boolean {
  try {
    if (process.platform === 'win32') {
      if (command === 'go' && fs.existsSync(getManagedGoCliPath())) return true;
      if (command === 'uv' && fs.existsSync(getManagedUvCliPath())) return true;
    }
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileSync(cmd, [command], {
      encoding: 'utf8',
      timeout: 3000,
      windowsHide: true,
      env: {
        ...process.env,
        PATH: buildNodeEnhancedPath(),
      },
    }).trim();
    return Boolean(result);
  } catch {
    return false;
  }
}

function findNpmCli(): string | null {
  const candidates: string[] = [];

  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileSync(cmd, ['npm'], {
      encoding: 'utf8',
      timeout: 3000,
      windowsHide: true,
      env: {
        ...process.env,
        PATH: buildNodeEnhancedPath(),
      },
    }).trim();
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
    candidates.push(path.join(__dirname, 'resources', 'node', 'npm.cmd'));
    candidates.push(path.join(DOWNLOADED_RUNTIME_DIR, 'node', 'npm.cmd'));
    candidates.push(path.join(MANAGED_TOOLS_DIR, 'node', 'npm.cmd'));
  } else {
    candidates.push('/usr/local/bin/npm');
    candidates.push('/opt/homebrew/bin/npm');
    candidates.push(path.join(home, 'homebrew', 'bin', 'npm'));
    candidates.push(path.join(DOWNLOADED_RUNTIME_DIR, 'node', 'npm'));
    candidates.push(path.join(__dirname, 'resources', 'node', 'npm'));
    candidates.push(path.join(MANAGED_TOOLS_DIR, 'node', 'bin', 'npm'));
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

function findBestInstallOption(installOpts: any[]): any | null {
  if (!Array.isArray(installOpts) || installOpts.length === 0) return null;

  const priority = process.platform === 'win32'
    ? ['node', 'uv', 'go', 'download']
    : ['brew', 'node', 'uv', 'go', 'download'];

  for (const k of priority) {
    const match = installOpts.find((opt: any) => opt?.kind === k);
    if (match) return match;
  }
  return installOpts[0];
}

function getInstallPrereqMessage(installOpts: any[]): string | null {
  const preferred = findBestInstallOption(installOpts);
  const kind = typeof preferred?.kind === 'string' ? preferred.kind : '';
  const label = typeof preferred?.label === 'string' ? preferred.label.trim() : '';

  if (!kind) return null;

  if (process.platform === 'win32') {
    if (kind === 'go' || kind === 'uv' || kind === 'node') return null;
    return null;
  }

  if (kind === 'brew' && !findBrewCli()) {
    if (process.platform === 'darwin') return null;
    return `Automatic setup for ${label || 'this skill'} needs Homebrew. Install Homebrew from https://brew.sh or install the package manually on the gateway host.`;
  }

  if (kind === 'node' && !findNpmCli()) {
    if (process.platform === 'darwin') return null;
    return `Automatic setup for ${label || 'this skill'} needs Node.js/npm on the gateway host. Install Node.js and try again.`;
  }

  if (kind === 'uv' && !hasCommandOnHost('uv') && !findBrewCli()) {
    if (process.platform === 'darwin') return null;
    return `Automatic setup for ${label || 'this skill'} needs uv. Install uv manually, or install Homebrew first so the gateway can install uv for you.`;
  }

  if (kind === 'go' && !hasCommandOnHost('go') && !findBrewCli()) {
    if (process.platform === 'darwin') return null;
    return `Automatic setup for ${label || 'this skill'} needs Go on the gateway host. Install Go manually and try again.`;
  }

  return null;
}

function getUnsupportedInstallMessage(installOpts: any[]): string | null {
  const preferred = findBestInstallOption(installOpts);
  const kind = typeof preferred?.kind === 'string' ? preferred.kind : '';
  const label = typeof preferred?.label === 'string' ? preferred.label.trim() : '';

  if (!kind) return null;

  if (process.platform === 'win32') {
    const supportedKinds = new Set(['node', 'go', 'uv', 'download']);
    if (!supportedKinds.has(kind)) {
      return `Automatic setup for ${label || 'this skill'} is not available on Windows in MyOpenClaw. Install the dependency manually on the gateway host first.`;
    }
  }

  return null;
}

function execFileAsync(cmd: string, args: string[], opts: any = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, {
      encoding: 'utf8',
      windowsHide: true,
      ...opts,
    }, (err, stdout, stderr) => {
      const stdoutText = typeof stdout === 'string' ? stdout : stdout?.toString('utf8') || '';
      const stderrText = typeof stderr === 'string' ? stderr : stderr?.toString('utf8') || '';
      if (err) {
        reject(new Error(stderrText || stdoutText || err.message));
        return;
      }
      resolve(stdoutText);
    });
  });
}

function getManagedNpmCliPath(): string {
  return path.join(MANAGED_TOOLS_DIR, 'node', process.platform === 'win32' ? 'npm.cmd' : 'bin/npm');
}

function getManagedGoCliPath(): string {
  return path.join(MANAGED_TOOLS_DIR, 'go', 'bin', 'go.exe');
}

function getManagedUvCliPath(): string {
  return path.join(MANAGED_TOOLS_DIR, 'uv', 'uv.exe');
}

function findFileRecursive(baseDir: string, targetFile: string, maxDepth = 6): string | null {
  if (!fs.existsSync(baseDir)) return null;

  const queue: Array<{ dir: string; depth: number }> = [{ dir: baseDir, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current.dir, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === targetFile.toLowerCase()) {
        return fullPath;
      }
      if (entry.isDirectory() && current.depth < maxDepth) {
        queue.push({ dir: fullPath, depth: current.depth + 1 });
      }
    }
  }

  return null;
}

async function extractZipArchive(zipPath: string, targetDir: string): Promise<void> {
  fs.mkdirSync(targetDir, { recursive: true });
  await execFileAsync('tar', ['-xf', zipPath, '-C', targetDir], {
    env: {
      ...process.env,
      PATH: buildNodeEnhancedPath(),
    },
  });
}

async function resolveLatestGoDownloadUrl(): Promise<string> {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  const response = await fetch('https://go.dev/dl/?mode=json');
  if (!response.ok) {
    throw new Error(`Failed to query latest Go release (HTTP ${response.status})`);
  }

  const releases = await response.json() as Array<{
    stable?: boolean;
    files?: Array<{
      os?: string;
      arch?: string;
      kind?: string;
      filename?: string;
    }>;
  }>;
  for (const release of releases) {
    if (release?.stable === false) continue;
    const files = Array.isArray(release?.files) ? release.files : [];
    const match = files.find((file) =>
      file?.os === 'windows'
      && file?.arch === arch
      && file?.kind === 'archive'
      && typeof file?.filename === 'string'
      && file.filename.endsWith('.zip'));
    if (match && typeof match.filename === 'string') {
      return `https://go.dev/dl/${match.filename}`;
    }
  }

  throw new Error(`Could not find a Go zip archive for Windows ${arch}`);
}

function getLatestUvDownloadUrl(): string {
  const arch = process.arch === 'arm64' ? 'aarch64-pc-windows-msvc' : 'x86_64-pc-windows-msvc';
  return `https://github.com/astral-sh/uv/releases/latest/download/uv-${arch}.zip`;
}

async function ensureManagedNode(): Promise<string> {
  const npmCli = getManagedNpmCliPath();
  if (fs.existsSync(npmCli)) return npmCli;

  fs.mkdirSync(MANAGED_TOOLS_DIR, { recursive: true });
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const platform = process.platform === 'win32' ? 'win' : 'darwin';
  const ext = process.platform === 'win32' ? 'zip' : 'tar.gz';
  const archivePath = path.join(os.tmpdir(), `myopenclaw-node-${arch}.${ext}`);
  const installRoot = path.join(MANAGED_TOOLS_DIR, 'node');

  try {
    const resp = await fetch('https://nodejs.org/dist/index.json');
    if (!resp.ok) throw new Error(`Failed to query Node.js releases (HTTP ${resp.status})`);
    const releases = await resp.json() as Array<{ version?: string; lts?: string | false }>;
    const lts = releases.find(r => r.lts);
    const version = lts?.version || 'v22.14.0';
    const url = `https://nodejs.org/dist/${version}/node-${version}-${platform}-${arch}.${ext}`;

    await downloadFile(url, archivePath);
    fs.rmSync(installRoot, { recursive: true, force: true });
    fs.mkdirSync(installRoot, { recursive: true });

    if (ext === 'zip') {
      await extractZipArchive(archivePath, installRoot);
      // Windows zip extracts into a nested dir (e.g. node-v22.14.0-win-x64/)
      // Promote contents up to installRoot
      const entries = fs.readdirSync(installRoot);
      if (entries.length === 1) {
        const nested = path.join(installRoot, entries[0]);
        if (fs.statSync(nested).isDirectory()) {
          for (const item of fs.readdirSync(nested)) {
            fs.renameSync(path.join(nested, item), path.join(installRoot, item));
          }
          fs.rmSync(nested, { recursive: true });
        }
      }
    } else {
      await execFileAsync('/usr/bin/tar', [
        'xzf', archivePath, '--strip-components=1', '-C', installRoot,
      ]);
    }

    const npmTarget = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    if (!findFileRecursive(installRoot, npmTarget, 3)) {
      throw new Error('Node.js download completed, but npm was not found in the extracted archive.');
    }
  } finally {
    try { fs.unlinkSync(archivePath); } catch {}
  }

  if (!fs.existsSync(npmCli)) {
    throw new Error('Node.js download completed, but npm was not found in the managed tools directory.');
  }

  return npmCli;
}

async function ensureManagedWindowsGo(): Promise<string> {
  const goCli = getManagedGoCliPath();
  if (fs.existsSync(goCli)) return goCli;

  fs.mkdirSync(MANAGED_TOOLS_DIR, { recursive: true });
  const zipPath = path.join(os.tmpdir(), `myopenclaw-go-${process.arch}.zip`);
  const installRoot = path.join(MANAGED_TOOLS_DIR, 'go');

  try {
    const downloadUrl = await resolveLatestGoDownloadUrl();
    await downloadFile(downloadUrl, zipPath);
    fs.rmSync(installRoot, { recursive: true, force: true });
    await extractZipArchive(zipPath, MANAGED_TOOLS_DIR);
  } finally {
    try { fs.unlinkSync(zipPath); } catch {}
  }

  if (!fs.existsSync(goCli)) {
    throw new Error('Go download completed, but go.exe was not found in the managed tools directory.');
  }

  return goCli;
}

async function ensureManagedWindowsUv(): Promise<string> {
  const uvCli = getManagedUvCliPath();
  if (fs.existsSync(uvCli)) return uvCli;

  fs.mkdirSync(MANAGED_TOOLS_DIR, { recursive: true });
  const zipPath = path.join(os.tmpdir(), `myopenclaw-uv-${process.arch}.zip`);
  const installRoot = path.join(MANAGED_TOOLS_DIR, 'uv');

  try {
    await downloadFile(getLatestUvDownloadUrl(), zipPath);
    fs.rmSync(installRoot, { recursive: true, force: true });
    fs.mkdirSync(installRoot, { recursive: true });
    await extractZipArchive(zipPath, installRoot);

    const extractedUv = findFileRecursive(installRoot, 'uv.exe');
    if (!extractedUv) {
      throw new Error('uv download completed, but uv.exe was not found in the extracted archive.');
    }
    if (path.resolve(extractedUv) !== path.resolve(uvCli)) {
      fs.copyFileSync(extractedUv, uvCli);
    }

    const extractedUvx = findFileRecursive(installRoot, 'uvx.exe');
    if (extractedUvx) {
      const uvxCli = path.join(installRoot, 'uvx.exe');
      if (path.resolve(extractedUvx) !== path.resolve(uvxCli)) {
        fs.copyFileSync(extractedUvx, uvxCli);
      }
    }
  } finally {
    try { fs.unlinkSync(zipPath); } catch {}
  }

  if (!fs.existsSync(uvCli)) {
    throw new Error('uv download completed, but uv.exe was not found in the managed tools directory.');
  }

  return uvCli;
}

async function ensureMacosHomebrew(): Promise<string> {
  const brewCli = findBrewCli();
  if (brewCli) return brewCli;

  // Install Homebrew via tarball to ~/homebrew (no sudo, no Xcode CLT required)
  const homebrewDir = path.join(os.homedir(), 'homebrew');
  const tarballPath = path.join(os.tmpdir(), 'myopenclaw-homebrew.tar.gz');

  try {
    fs.mkdirSync(homebrewDir, { recursive: true });
    await downloadFile('https://github.com/Homebrew/brew/tarball/master', tarballPath);
    await execFileAsync('/usr/bin/tar', [
      'xzf', tarballPath,
      '--strip-components=1',
      '-C', homebrewDir,
    ]);
  } catch (e: any) {
    throw new Error(`Failed to install Homebrew automatically: ${e.message}`);
  } finally {
    try { fs.unlinkSync(tarballPath); } catch {}
  }

  const installedBrew = findBrewCli();
  if (!installedBrew) {
    throw new Error('Homebrew install completed, but brew was not found on the gateway host.');
  }

  return installedBrew;
}

function hasMacosCommandLineTools(): boolean {
  try {
    execFileSync('/usr/bin/xcode-select', ['-p'], { encoding: 'utf8', timeout: 3000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function ensureMacosCommandLineTools(): Promise<void> {
  if (hasMacosCommandLineTools()) return;
  try {
    await execFileAsync('/usr/bin/xcode-select', ['--install']);
  } catch { /* dialog may already be showing */ }
  // Wait up to 10 minutes for user to complete CLT install
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 5000));
    if (hasMacosCommandLineTools()) return;
  }
  throw new Error('Xcode Command Line Tools are required but were not installed. Please run "xcode-select --install" and try again.');
}

async function ensureSkillInstallPrereq(installSpec: any): Promise<void> {
  if (!installSpec || typeof installSpec !== 'object') return;
  const kind = typeof installSpec.kind === 'string' ? installSpec.kind : '';

  if (process.platform === 'darwin') {
    if (['brew', 'uv', 'go'].includes(kind) && !findBrewCli()) {
      await ensureMacosHomebrew();
    }
    if (kind === 'node' && !findNpmCli()) {
      if (!findBrewCli()) await ensureMacosHomebrew();
      await ensureMacosCommandLineTools();
      const brewCmd = findBrewCli();
      if (brewCmd) {
        await execFileAsync(brewCmd, ['install', 'node'], {
          timeout: 300000,
          env: { ...process.env, PATH: buildNodeEnhancedPath() },
        });
      }
    }
    if (['brew', 'uv', 'go'].includes(kind)) {
      await ensureMacosCommandLineTools();
    }
    return;
  }

  if (process.platform !== 'win32') return;

  if (kind === 'go' && !hasCommandOnHost('go')) {
    await ensureManagedWindowsGo();
    return;
  }

  if (kind === 'uv' && !hasCommandOnHost('uv')) {
    await ensureManagedWindowsUv();
    return;
  }

  if (kind === 'node' && !findNpmCli()) {
    await ensureManagedNode();
  }
}

function findBrewCli(): string | null {
  const candidates: string[] = [];

  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileSync(cmd, ['brew'], {
      encoding: 'utf8',
      timeout: 3000,
      windowsHide: true,
      env: {
        ...process.env,
        PATH: buildNodeEnhancedPath(),
      },
    }).trim();
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
): Promise<{ name: string; installId: string; installSpec: any | null } | null> {
  const skill = await waitForGatewaySkill(gw, skillKey);
  if (!skill) {
    if (requestedInstallId) return { name: skillKey, installId: requestedInstallId, installSpec: null };
    throw new Error(`Skill not found: ${skillKey}`);
  }

  const resolvedName = typeof skill?.name === 'string' && skill.name.trim().length > 0
    ? skill.name.trim()
    : typeof skill?.skillKey === 'string' && skill.skillKey.trim().length > 0
      ? skill.skillKey.trim()
      : skillKey;

  const installOpts = Array.isArray(skill?.install) ? skill.install : [];
  const installSpec = requestedInstallId
    ? installOpts.find((opt: any) => typeof opt?.id === 'string' && opt.id.trim() === requestedInstallId) || null
    : findBestInstallOption(installOpts);

  if (requestedInstallId) {
    return { name: resolvedName, installId: requestedInstallId, installSpec };
  }

  const installId = typeof installSpec?.id === 'string' ? installSpec.id.trim() : '';

  if (!installId) return null;
  return { name: resolvedName, installId, installSpec };
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
  await ensureSkillInstallPrereq(target.installSpec);
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
        const installOpts = Array.isArray((s as any).install) ? (s as any).install : [];
        (s as any).installUnsupportedMessage = getUnsupportedInstallMessage(installOpts);
        (s as any).installPrereqMessage = getInstallPrereqMessage(installOpts);
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
