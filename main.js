const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');
const axios = require('axios');
const { spawn, execFileSync } = require('child_process');

// Disable GPU if running in a VM (prevents white screen in virtual machines)
const isVM = (() => {
  try {
    if (process.platform === 'darwin') {
      const model = execFileSync('sysctl', ['-n', 'machdep.cpu.brand_string'], { encoding: 'utf8', timeout: 2000 }).trim();
      return /virtual|Apple Virtual/i.test(model);
    }
    const cpuModel = os.cpus()?.[0]?.model || '';
    return /virtual|QEMU|KVM|VirtualBox|VMware/i.test(cpuModel);
  } catch { return false; }
})();
if (isVM) {
  app.commandLine.appendSwitch('disable-gpu');
  console.log('[gpu] Disabled GPU acceleration (VM detected)');
}

// Suppress EPIPE errors on stdout/stderr (harmless when piped)
process.stdout?.on('error', () => {});
process.stderr?.on('error', () => {});

let mainWindow;
let gatewayPort = null;
let gatewayBaseUrl = null;
let gatewayProcess = null;

// ---------------------------------------------------------------------------
// Config paths
// ---------------------------------------------------------------------------
const OPENCLAW_CONFIG_DIR = path.join(os.homedir(), '.openclaw');
const CONFIG_FILE = path.join(OPENCLAW_CONFIG_DIR, 'openclaw.json');
const DEFAULT_PORT = 18800;
const EMBEDDED_CONFIG_FILE = path.join(OPENCLAW_CONFIG_DIR, 'embedded-config.json');
const APP_STATE_FILE = path.join(OPENCLAW_CONFIG_DIR, 'app-state.json');
const AUTH_PROFILES_DIR = path.join(OPENCLAW_CONFIG_DIR, 'agents', 'main', 'agent');
const AUTH_PROFILES_FILE = path.join(AUTH_PROFILES_DIR, 'auth-profiles.json');
const DOWNLOADED_RUNTIME_DIR = path.join(OPENCLAW_CONFIG_DIR, 'runtime');

// ---------------------------------------------------------------------------
// Gateway token helpers
// ---------------------------------------------------------------------------
function readGatewayTokenFromConfig() {
  try {
    if (!fs.existsSync(EMBEDDED_CONFIG_FILE)) return '';
    const config = JSON.parse(fs.readFileSync(EMBEDDED_CONFIG_FILE, 'utf8').replace(/^\uFEFF/, ''));
    return String(config?.gateway?.auth?.token || '').trim();
  } catch {
    return '';
  }
}

function ensureRandomGatewayToken() {
  const cfg = loadEmbeddedConfig();
  cfg.gateway = cfg.gateway || {};
  cfg.gateway.auth = cfg.gateway.auth || {};
  if (!cfg.gateway.auth.token || cfg.gateway.auth.token === 'myopenclaw_2024_secure_token_a8f3e9d2c1b7f6e5d4c3b2a1') {
    cfg.gateway.auth.token = crypto.randomUUID();
    cfg.gateway.auth.mode = 'token';
  }
  cfg.gateway.http = cfg.gateway.http || {};
  cfg.gateway.http.endpoints = cfg.gateway.http.endpoints || {};
  cfg.gateway.http.endpoints.chatCompletions = { enabled: true };
  saveEmbeddedConfig(cfg);
  return cfg.gateway.auth.token;
}

function buildDashboardUrl(baseUrl) {
  const token = readGatewayTokenFromConfig();
  const u = new URL(baseUrl || gatewayBaseUrl || `http://127.0.0.1:${DEFAULT_PORT}`);
  if (token) {
    u.searchParams.set('gatewayToken', token);
    u.searchParams.set('token', token);
    u.searchParams.set('x-api-key', token);
  }
  return u.toString();
}

// ---------------------------------------------------------------------------
// Loading screen helpers
// ---------------------------------------------------------------------------
function updateLoadingStatus(message, percent) {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const safeMsg = String(message || '').replace(/`/g, '\\`').replace(/\\/g, '\\\\');
    const safePct = Number(percent || 0);
    mainWindow.webContents.executeJavaScript(`window.__REAL_LOADING_DRIVEN__=true; if (window.setLoadingState) { window.setLoadingState(\`${safeMsg}\`, ${safePct}); }`, true).catch(() => {});
  } catch {}
}

function setRuntimeDownloadNeeded(needed) {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.executeJavaScript(`if (window.setRuntimeDownloadNeeded) { window.setRuntimeDownloadNeeded(${needed ? 'true' : 'false'}); }`, true).catch(() => {});
  } catch {}
}

// ---------------------------------------------------------------------------
// App state - merged: relay (Worktree A) + plan/planExpiresAt (Worktree B)
// ---------------------------------------------------------------------------
function getDefaultAppState() {
  return {
    premiumTier: 'free', // free | premium | pro
    isPremium: false,
    plan: 'free',
    planExpiresAt: null,
    freeQuotaUsed: 0,
    userApiKey: '',
    userApiKeyQuotaUsed: 0,
    activeAgentId: 'main',
    agents: [
      {
        id: 'main',
        name: 'Main Agent',
        channels: []
      }
    ],
    conversations: {},
    relay: { baseUrl: '', authToken: '' },
    deviceId: ''
  };
}

function getPlanFeatures(plan) {
  const features = {
    free: { maxAgents: 1, canUseRelay: false, modelTier: 'basic' },
    premium: { maxAgents: 5, canUseRelay: true, modelTier: 'sonnet' },
    pro: { maxAgents: -1, canUseRelay: true, modelTier: 'opus' }
  };
  return features[plan] || features.free;
}

function loadAppState() {
  try {
    if (!fs.existsSync(APP_STATE_FILE)) {
      saveAppState(getDefaultAppState());
      return getDefaultAppState();
    }
    const state = { ...getDefaultAppState(), ...JSON.parse(fs.readFileSync(APP_STATE_FILE, 'utf8')) };
    if (!state.premiumTier) state.premiumTier = state.isPremium ? 'premium' : 'free';
    state.isPremium = state.premiumTier !== 'free';
    // Sync plan with premiumTier for backward compatibility
    if (!state.plan || state.plan === 'free') state.plan = state.premiumTier;
    return state;
  } catch (error) {
    console.error('[app-state] load failed, using default:', error.message);
    return getDefaultAppState();
  }
}

function saveAppState(state) {
  const dir = path.dirname(APP_STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(APP_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Device ID helpers
// ---------------------------------------------------------------------------
function ensureDeviceId() {
  const state = loadAppState();
  if (!state.deviceId) {
    state.deviceId = crypto.randomUUID();
    saveAppState(state);
    console.log('[device-id] Generated new device ID:', state.deviceId);
  } else {
    console.log('[device-id] Loaded existing device ID:', state.deviceId);
  }
  return state.deviceId;
}

async function registerDevice(deviceId) {
  try {
    const state = loadAppState();
    const relay = state.relay || {};
    if (!relay.baseUrl) {
      console.log('[device-registration] No relay baseUrl configured, skipping registration');
      return;
    }
    await axios.post(`${relay.baseUrl}/v1/devices`, {
      deviceId,
      platform: process.platform,
      appVersion: app.getVersion()
    }, { timeout: 8000 });
    console.log('[device-registration] Device registered successfully');
  } catch (err) {
    console.log('[device-registration] Registration failed (non-fatal):', err.message);
  }
}

// ---------------------------------------------------------------------------
// Premium / quota helpers
// ---------------------------------------------------------------------------
function checkPremiumGate(state) {
  if (state.premiumTier === 'premium' || state.premiumTier === 'pro') {
    return { allow: true, tier: state.premiumTier };
  }
  if (state.freeQuotaUsed < 10) {
    return { allow: true, tier: 'free' };
  }
  if (!state.userApiKey) {
    return { allow: false, reason: 'free_exhausted', message: 'Free quota reached. Add your API key or upgrade to Premium.' };
  }
  if (state.userApiKeyQuotaUsed < 300) {
    return { allow: true, tier: 'user_api_key' };
  }
  return { allow: false, reason: 'key_quota_exhausted', message: 'API key trial quota reached (300). Upgrade to Premium to continue.' };
}

function consumeQuota(state, tier) {
  if (tier === 'free') state.freeQuotaUsed += 1;
  if (tier === 'user_api_key') state.userApiKeyQuotaUsed += 1;
}

// ---------------------------------------------------------------------------
// Embedded OpenClaw config
// ---------------------------------------------------------------------------
function loadEmbeddedConfig() {
  try {
    if (!fs.existsSync(EMBEDDED_CONFIG_FILE)) return {};
    const raw = fs.readFileSync(EMBEDDED_CONFIG_FILE, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch (e) {
    console.error('[embedded-config] load failed:', e.message);
    return {};
  }
}

function saveEmbeddedConfig(config) {
  const dir = path.dirname(EMBEDDED_CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(EMBEDDED_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function getUserProviderConfig() {
  const cfg = loadEmbeddedConfig();
  const providers = cfg?.models?.providers || {};
  for (const [providerId, p] of Object.entries(providers)) {
    const apiKey = String(p?.apiKey || '').trim();
    if (apiKey) {
      return { providerId, baseUrl: String(p?.baseUrl || '').trim(), apiKey, modelId: p?.models?.[0]?.id || 'default', api: p?.api || 'openai-completions' };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Auth profile sync
// ---------------------------------------------------------------------------
function syncAuthProfileForProvider(providerId, apiKey, api = '') {
  try {
    const key = String(apiKey || '').trim();
    if (!providerId || !key) return;
    fs.mkdirSync(AUTH_PROFILES_DIR, { recursive: true });
    let auth = { version: 1, profiles: {}, lastGood: {}, usageStats: {} };
    if (fs.existsSync(AUTH_PROFILES_FILE)) {
      auth = JSON.parse(fs.readFileSync(AUTH_PROFILES_FILE, 'utf8').replace(/^\uFEFF/, ''));
      auth.version = auth.version || 1;
      auth.profiles = auth.profiles || {};
      auth.lastGood = auth.lastGood || {};
      auth.usageStats = auth.usageStats || {};
    }
    const bind = (pid) => {
      const profileId = `${pid}:default`;
      auth.profiles[profileId] = { type: 'api_key', provider: pid, key };
      auth.lastGood[pid] = profileId;
    };
    bind(providerId);
    if (String(api).trim() === 'anthropic-messages') bind('anthropic');
    fs.writeFileSync(AUTH_PROFILES_FILE, JSON.stringify(auth, null, 2), 'utf8');
  } catch (e) {
    console.error('[auth-profile-sync] failed:', e.message);
  }
}

function ensureAuthProfilesFromEmbeddedConfig() {
  try {
    const cfg = loadEmbeddedConfig();
    const providers = cfg?.models?.providers || {};
    for (const [providerId, p] of Object.entries(providers)) {
      const key = String(p?.apiKey || '').trim();
      if (!key) continue;
      syncAuthProfileForProvider(providerId, key, p?.api || '');
      break;
    }
  } catch (e) {
    console.error('[auth-profile-sync-bootstrap] failed:', e.message);
  }
}

// ---------------------------------------------------------------------------
// Conversation loading
// ---------------------------------------------------------------------------
function extractTextFromMessageContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts = [];
  for (const c of content) {
    if (!c) continue;
    if (typeof c === 'string') parts.push(c);
    else if (c.type === 'text' && c.text) parts.push(String(c.text));
  }
  return parts.join('\n').trim();
}

function normalizeConversationText(role, text) {
  let t = String(text || '').trim();
  if (!t) return t;
  if (role === 'user') {
    const marker = '[Current message - respond to this]';
    const idx = t.lastIndexOf(marker);
    if (idx >= 0) t = t.slice(idx + marker.length).trim();
    t = t.replace(/^\s*User\s*:\s*/i, '').trim();
  }
  t = t.replace(/^\s*\[Chat messages since your last reply - for context\][\s\S]*?\[Current message - respond to this\]\s*/i, '');
  t = t.replace(/^\s*User\s*:\s*/i, '').trim();
  return t;
}

function loadAgentConversationFromOpenClaw(agentId = 'main', limit = 80) {
  try {
    const sessionsDir = path.join(__dirname, 'resources', '.openclaw-myopenclaw', 'agents', agentId, 'sessions');
    if (!fs.existsSync(sessionsDir)) return [];

    let sessionFiles = [];
    const sessionsIndex = path.join(sessionsDir, 'sessions.json');
    if (fs.existsSync(sessionsIndex)) {
      const idx = JSON.parse(fs.readFileSync(sessionsIndex, 'utf8').replace(/^\uFEFF/, ''));
      const rows = Object.values(idx || {}).filter(v => v && v.sessionFile);
      rows.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
      sessionFiles = rows.map(r => r.sessionFile).filter(f => f && fs.existsSync(f));
    }

    if (!sessionFiles.length) {
      sessionFiles = fs.readdirSync(sessionsDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => ({ full: path.join(sessionsDir, f), mtime: fs.statSync(path.join(sessionsDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)
        .map(x => x.full);
    }

    const conv = [];
    for (const file of sessionFiles) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        let row;
        try { row = JSON.parse(line); } catch { continue; }
        if (row?.type !== 'message' || !row.message) continue;
        const role = row.message.role;
        if (role !== 'user' && role !== 'assistant') continue;
        let text = extractTextFromMessageContent(row.message.content);
        if (!text && row.message.errorMessage) text = row.message.errorMessage;
        if (!text) continue;
        const uiRole = role === 'assistant' ? 'assistant' : 'user';
        text = normalizeConversationText(uiRole, text);
        if (!text) continue;
        conv.push({ role: uiRole, content: text, timestamp: row.timestamp || row.message.timestamp || 0 });
      }
      if (conv.length >= limit * 2) break;
    }

    conv.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
    return conv.slice(-Math.max(1, limit));
  } catch (e) {
    console.error('[conversation-load] failed:', e.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Port & network helpers
// ---------------------------------------------------------------------------
async function findAvailablePort(startPort = DEFAULT_PORT) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error('No available port found');
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(port, '127.0.0.1');
  });
}

async function isOpenClawGatewayRunning(port) {
  try {
    const resp = await axios.get(`http://127.0.0.1:${port}/health`, { timeout: 1200 });
    const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data || '');
    return body.includes('OpenClaw Control') || body.includes('openclaw-app');
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Runtime download & extraction
// ---------------------------------------------------------------------------
function getRuntimeTargetLabel() {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return process.arch === 'arm64' ? 'mac_silicon' : 'mac_intel';
  return 'linux';
}

async function downloadFile(url, outputPath, onProgress) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({ method: 'get', url, responseType: 'stream', timeout: 0 });
  const total = Number(response.headers['content-length'] || 0);
  let loaded = 0;
  response.data.on('data', (chunk) => {
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

// Check for runtime in both embedded (asar) and downloaded (~/.openclaw/runtime/) locations
function findRuntimeDir() {
  // 1. Check embedded (full build, inside asar)
  const embeddedDir = path.join(__dirname, 'resources', 'openclaw-deps', 'openclaw', 'dist');
  if (fs.existsSync(path.join(embeddedDir, 'entry.js')) || fs.existsSync(path.join(embeddedDir, 'entry.mjs'))) {
    return path.join(__dirname, 'resources');
  }
  // 2. Check downloaded runtime (~/.openclaw/runtime/)
  const dlDir = path.join(DOWNLOADED_RUNTIME_DIR, 'openclaw-deps', 'openclaw', 'dist');
  if (fs.existsSync(path.join(dlDir, 'entry.js')) || fs.existsSync(path.join(dlDir, 'entry.mjs'))) {
    return DOWNLOADED_RUNTIME_DIR;
  }
  return null;
}

async function ensureEmbeddedRuntime() {
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
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${DOWNLOADED_RUNTIME_DIR}' -Force`], { stdio: 'inherit' });
  } else {
    execFileSync('unzip', ['-o', zipPath, '-d', DOWNLOADED_RUNTIME_DIR], { stdio: 'inherit' });
  }

  if (!findRuntimeDir()) {
    throw new Error('Runtime extracted but dist/entry.(m)js not found. The runtime package may be incomplete.');
  }

  console.log('[runtime] Runtime ready');
  updateLoadingStatus('Runtime installed', 88);
}

// ---------------------------------------------------------------------------
// Gateway startup (cross-platform)
// ---------------------------------------------------------------------------
async function startGateway() {
  try {
    global.__MYOPENCLAW_STARTUP_WARNING__ = '';
    if (await isOpenClawGatewayRunning(18800)) {
      gatewayPort = 18800;
    } else {
      gatewayPort = await findAvailablePort(18800);
    }
    gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;

    console.log(`[startGateway] Starting gateway on port ${gatewayPort}...`);
    updateLoadingStatus('Establishing secure connections...', 48);

    setRuntimeDownloadNeeded(!findRuntimeDir());

    await ensureEmbeddedRuntime();
    ensureAuthProfilesFromEmbeddedConfig();

    // Generate random gateway token on each startup
    ensureRandomGatewayToken();

    updateLoadingStatus('Launching openclaw gateway...', 90);

    // Find runtime location and launch gateway
    const runtimeDir = findRuntimeDir() || path.join(__dirname, 'resources');
    const entryMjs = path.join(runtimeDir, 'openclaw-deps', 'openclaw', 'openclaw.mjs');
    const entryJs = path.join(runtimeDir, 'openclaw-deps', 'openclaw', 'dist', 'entry.js');
    const entryFile = fs.existsSync(entryMjs) ? entryMjs : entryJs;
    const stateDir = path.join(runtimeDir, '.openclaw-myopenclaw');
    fs.mkdirSync(stateDir, { recursive: true });

    const gatewayEnv = {
      ...process.env,
      OPENCLAW_STATE_DIR: stateDir,
      OPENCLAW_CONFIG_PATH: path.join(stateDir, 'openclaw.json'),
      OPENCLAW_GATEWAY_PORT: String(gatewayPort),
      OPENCLAW_SERVICE_MARKER: 'myopenclaw',
      OPENCLAW_SERVICE_KIND: 'gateway',
    };

    console.log(`[startGateway] Launching: node ${entryFile} gateway run --port ${gatewayPort}`);
    // Use system node (not Electron's bundled node) — openclaw requires Node >= 22.12
    const nodeCmd = process.platform === 'win32' ? 'node.exe' : 'node';
    gatewayProcess = spawn(nodeCmd, [entryFile, 'gateway', 'run', '--port', String(gatewayPort), '--allow-unconfigured'], {
      stdio: 'pipe', cwd: runtimeDir, env: gatewayEnv,
      ...(process.platform === 'win32' ? { windowsHide: true } : {})
    });

    gatewayProcess.stdout.on('data', (data) => console.log(`[Gateway stdout] ${data}`));
    gatewayProcess.stderr.on('data', (data) => console.error(`[Gateway stderr] ${data}`));
    gatewayProcess.on('exit', (code, signal) => {
      console.log(`[Gateway] Process exited with code ${code}, signal ${signal}`);
      if (code !== 0) console.error('[Gateway] Unexpected exit!');
    });
    gatewayProcess.on('error', (err) => console.error('[Gateway] Process error:', err));

    console.log('[startGateway] Waiting for gateway to start...');
    updateLoadingStatus('Checking gateway health...', 94);
    await new Promise(resolve => setTimeout(resolve, 8000));

    await waitForGateway();

    updateLoadingStatus('Startup complete. Opening workspace...', 100);
    console.log(`[startGateway] Gateway started successfully on ${gatewayBaseUrl}`);
  } catch (error) {
    console.error('[startGateway] Failed to start gateway:', error);
    throw error;
  }
}

async function waitForGateway(maxRetries = 30) {
  console.log(`[waitForGateway] Checking ${gatewayBaseUrl}/health...`);
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`[waitForGateway] Attempt ${i + 1}/${maxRetries}...`);
      const response = await axios.get(`${gatewayBaseUrl}/health`, { timeout: 2000 });
      console.log(`[waitForGateway] Success! Response:`, response.data);
      return true;
    } catch (error) {
      console.log(`[waitForGateway] Attempt ${i + 1} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  console.error('[waitForGateway] Max retries reached, gateway failed to start');
  throw new Error('Gateway failed to start after 30 attempts. Please check your configuration and try again.');
}

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------
function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const target = /^https?:\/\/127\.0\.0\.1:\d+\/?$/i.test(String(url || '')) ? buildDashboardUrl(url) : url;
    shell.openExternal(target);
    return { action: 'deny' };
  });

  // Log renderer crashes and errors to terminal for debugging
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[renderer] process gone:', details.reason, details.exitCode);
  });
  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[renderer] did-fail-load:', code, desc);
  });

  // Always show loading screen first for runtime download progress
  mainWindow.loadFile('loading.html');

  (async () => {
    try {
      // Step 1: Ensure runtime is downloaded (shows progress on loading.html)
      if (!findRuntimeDir()) {
        await ensureEmbeddedRuntime();
      }
      // Step 2: Start gateway only if config exists
      if (fs.existsSync(CONFIG_FILE)) {
        await startGateway();
      } else {
        console.log('[startup] No gateway config, skipping gateway start (relay-only mode)');
      }
    } catch (err) {
      console.error('[startup] Error:', err.message);
      global.__MYOPENCLAW_STARTUP_ERROR__ = err?.message || String(err);
    }
    // Step 3: Always load main UI
    mainWindow.loadFile('index.html');
  })();
}

// ---------------------------------------------------------------------------
// Relay helpers (from Worktree A)
// ---------------------------------------------------------------------------
async function checkRelayHealth(baseUrl, token) {
  const response = await axios.get(`${baseUrl}/health`, {
    headers: { 'Authorization': `Bearer ${token}` },
    timeout: 8000
  });
  return response.data;
}

// Send message via local gateway (BYOK path)
async function sendViaGateway(messages) {
  if (!gatewayBaseUrl) {
    throw new Error('Gateway not started');
  }
  const token = readGatewayTokenFromConfig();
  const response = await axios.post(`${gatewayBaseUrl}/v1/chat/completions`, {
    model: 'openclaw:main',
    messages,
    stream: false
  }, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-openclaw-agent-id': 'main'
    },
    timeout: 60000
  });
  return response?.data?.choices?.[0]?.message?.content || 'No response from OpenClaw.';
}

// Send message via cloud relay
async function sendViaRelay(relayBaseUrl, relayAuthToken, messages, deviceId) {
  const headers = {
    'Authorization': `Bearer ${relayAuthToken}`,
    'Content-Type': 'application/json'
  };
  if (deviceId) {
    headers['X-Device-Id'] = deviceId;
  }
  const response = await axios.post(`${relayBaseUrl}/v1/chat/completions`, {
    model: 'openclaw:main',
    messages
  }, {
    headers,
    timeout: 60000
  });
  return response?.data?.choices?.[0]?.message?.content || 'No response from relay.';
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

// Setup wizard - save initial config
ipcMain.handle('save-config', async (event, config) => {
  try {
    if (!fs.existsSync(OPENCLAW_CONFIG_DIR)) {
      fs.mkdirSync(OPENCLAW_CONFIG_DIR, { recursive: true });
    }
    const openclawConfig = {
      models: {
        default: config.provider === 'openai' ? 'openai/gpt-4' : 'anthropic/claude-3-5-sonnet-20241022'
      },
      litellm: {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl || undefined
      }
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(openclawConfig, null, 2));
    await startGateway();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Gateway info
ipcMain.handle('get-gateway-info', async () => {
  return { port: gatewayPort, baseUrl: gatewayBaseUrl, token: readGatewayTokenFromConfig() };
});

ipcMain.handle('open-gateway-dashboard', async () => {
  try {
    if (!gatewayBaseUrl && !gatewayPort) {
      return { success: false, error: 'Gateway is not running. Please configure a local gateway first.' };
    }
    const url = buildDashboardUrl(gatewayBaseUrl || `http://127.0.0.1:${gatewayPort || DEFAULT_PORT}`);
    await shell.openExternal(url);
    return { success: true, url };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-external', async (event, url) => {
  try { await shell.openExternal(url); return { success: true }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('get-startup-error', async () => {
  return { error: global.__MYOPENCLAW_STARTUP_ERROR__ || '' };
});

// Chat - send message with dual-path routing + plan awareness
ipcMain.handle('send-message', async (event, payload) => {
  try {
    const message = typeof payload === 'string' ? payload : payload?.message;
    const agentId = payload?.agentId || 'main';

    const state = loadAppState();
    const gate = checkPremiumGate(state);
    if (!gate.allow) {
      return {
        success: false,
        premiumRequired: true,
        reason: gate.reason,
        error: gate.message,
        state
      };
    }

    // Per-agent conversation context (app-level isolation)
    state.conversations = state.conversations || {};
    const conv = state.conversations[agentId] || [];
    const messages = [...conv, { role: 'user', content: message }].slice(-20);

    // Routing: BYOK takes priority, then relay (if plan allows), then gateway fallback
    const embeddedCfg = loadEmbeddedConfig();
    const hasLocalProvider = !!(embeddedCfg?.models?.providers && Object.keys(embeddedCfg.models.providers).length > 0);
    const relay = state.relay || {};
    const relayAuthToken = relay.accessToken || relay.authToken;
    const hasRelay = !!(relay.baseUrl && relayAuthToken);
    const plan = state.plan || state.premiumTier || 'free';
    const planFeatures = getPlanFeatures(plan);
    const relayAllowedByPlan = planFeatures.canUseRelay;
    const deviceId = state.deviceId || '';

    let content;
    if (hasLocalProvider && gatewayBaseUrl) {
      // BYOK path: user has configured their own API key
      content = await sendViaGateway(messages);
    } else if (hasRelay && relayAllowedByPlan) {
      // Relay path: user has relay configured and plan permits it
      content = await sendViaRelay(relay.baseUrl, relayAuthToken, messages, deviceId);
    } else if (hasRelay && !relayAllowedByPlan) {
      // Relay configured but plan does not permit it
      return {
        success: false,
        premiumRequired: true,
        reason: 'relay_not_allowed',
        error: 'Cloud Relay requires a Premium or Pro plan. Please upgrade or configure a direct API key.',
        state
      };
    } else if (gatewayBaseUrl) {
      // Fallback: try gateway without explicit BYOK (may fail if no provider configured)
      const userProvider = getUserProviderConfig();
      if (!userProvider) {
        return {
          success: false,
          noApiKeyConfigured: true,
          error: 'OpenClaw depends on an LLM model to provide intelligence. Please configure your API key or a relay service.'
        };
      }
      content = await sendViaGateway(messages);
    } else {
      throw new Error('No AI provider configured. Add an API key or configure a relay service.');
    }

    state.conversations[agentId] = [...messages, { role: 'assistant', content }].slice(-20);
    consumeQuota(state, gate.tier);
    saveAppState(state);

    return { success: true, response: content, state };
  } catch (error) {
    const apiDetail = error?.response?.data?.error?.message || error?.response?.data?.message || error?.response?.data?.error;
    const status = error?.response?.status;
    let msg = apiDetail || error.message || 'Unknown error';
    if (status === 500 && /internal error/i.test(msg)) {
      msg = 'Gateway provider error. Please verify API Keys (Base URL / API Key / Model) in API Keys page.';
    }
    return { success: false, error: msg, status };
  }
});

// App state
ipcMain.handle('get-app-state', async () => {
  const state = loadAppState();
  const gate = checkPremiumGate(state);
  return { ...state, gate };
});

ipcMain.handle('get-agent-conversation', async (event, agentId = 'main') => {
  const conversation = loadAgentConversationFromOpenClaw(agentId, 120);
  return { success: true, conversation };
});

// Premium / subscription handlers
ipcMain.handle('set-user-api-key', async (event, apiKey) => {
  const state = loadAppState();
  state.userApiKey = (apiKey || '').trim();
  state.userApiKeyQuotaUsed = 0;
  saveAppState(state);
  return { success: true, state };
});

ipcMain.handle('set-premium-status', async (event, isPremium) => {
  const state = loadAppState();
  state.premiumTier = isPremium ? 'premium' : 'free';
  state.isPremium = state.premiumTier !== 'free';
  state.plan = state.premiumTier;
  saveAppState(state);
  return { success: true, state };
});

ipcMain.handle('set-premium-tier', async (event, tier) => {
  const state = loadAppState();
  if (!['free', 'premium', 'pro'].includes(tier)) {
    return { success: false, error: 'Invalid tier' };
  }
  state.premiumTier = tier;
  state.isPremium = tier !== 'free';
  state.plan = tier;
  saveAppState(state);
  return { success: true, state };
});

// Subscription handlers (from Worktree B)
ipcMain.handle('get-subscription-status', async () => {
  const state = loadAppState();
  const plan = state.plan || state.premiumTier || 'free';
  const features = getPlanFeatures(plan);
  return { plan, planExpiresAt: state.planExpiresAt || null, features };
});

ipcMain.handle('create-checkout-session', async (event, data) => {
  const { plan } = data || {};
  if (!['free', 'premium', 'pro'].includes(plan)) {
    return { success: false, error: 'Invalid plan' };
  }
  const state = loadAppState();
  state.plan = plan;
  state.planExpiresAt = null;
  state.premiumTier = plan;
  state.isPremium = plan !== 'free';
  saveAppState(state);
  return { success: true, mock: true };
});

ipcMain.handle('activate-subscription', async (event, data) => {
  const { plan, expiresAt } = data || {};
  if (!['free', 'premium', 'pro'].includes(plan)) {
    return { success: false, error: 'Invalid plan' };
  }
  const state = loadAppState();
  state.plan = plan;
  state.planExpiresAt = expiresAt || null;
  state.premiumTier = plan;
  state.isPremium = plan !== 'free';
  saveAppState(state);
  return { success: true };
});

// Agent CRUD handlers (merged from A + B)
ipcMain.handle('list-agents', async () => {
  const state = loadAppState();
  return state.agents;
});

ipcMain.handle('add-agent', async (event, data) => {
  const state = loadAppState();
  const plan = state.plan || state.premiumTier || 'free';
  const features = getPlanFeatures(plan);
  const totalAgents = state.agents.length;

  if (features.maxAgents !== -1 && totalAgents >= features.maxAgents) {
    return { error: 'upgrade_required', message: 'Upgrade to add more agents' };
  }

  const name = (typeof data === 'string' ? data : data?.name) || `Agent ${state.agents.length + 1}`;
  const newAgent = { id: crypto.randomUUID(), name, channels: [] };
  state.agents.push(newAgent);
  saveAppState(state);
  return newAgent;
});

ipcMain.handle('rename-agent', async (event, payload) => {
  const state = loadAppState();
  const agentId = payload.agentId || payload.id;
  if (agentId === 'main') return { success: false, error: 'Cannot rename main agent' };
  const agent = state.agents.find(a => a.id === agentId);
  if (!agent) return { success: false, error: 'Agent not found' };
  agent.name = payload.name || agent.name;
  saveAppState(state);
  return { success: true, agents: state.agents };
});

ipcMain.handle('set-agent-channels', async (event, payload) => {
  const state = loadAppState();
  const agent = state.agents.find(a => a.id === payload.id);
  if (!agent) return { success: false, error: 'Agent not found' };
  agent.channels = Array.isArray(payload.channels) ? payload.channels : [];
  saveAppState(state);
  return { success: true, agents: state.agents };
});

ipcMain.handle('delete-agent', async (event, agentId) => {
  const state = loadAppState();
  if (agentId === 'main') return { success: false, error: 'Main agent cannot be deleted' };
  const index = state.agents.findIndex(a => a.id === agentId);
  if (index < 0) return { success: false, error: 'Agent not found' };
  state.agents.splice(index, 1);
  if (state.activeAgentId === agentId) state.activeAgentId = 'main';
  if (state.conversations) delete state.conversations[agentId];
  saveAppState(state);
  return { success: true, agents: state.agents, state };
});

ipcMain.handle('set-active-agent', async (event, id) => {
  const state = loadAppState();
  if (!state.agents.find(a => a.id === id)) return { success: false, error: 'Agent not found' };
  state.activeAgentId = id;
  saveAppState(state);
  return { success: true, state };
});

// Provider config CRUD
ipcMain.handle('save-provider-config', async (event, payload) => {
  try {
    const { providerId = 'default', baseUrl = '', apiKey = '', api = '', modelId = 'default' } = payload || {};
    const cleanProviderId = String(providerId || '').trim();
    const cleanModelId = String(modelId || '').trim();
    const autoApi = String(api || '').trim() || 'openai-completions';
    if (!cleanProviderId) return { success: false, error: 'Provider Name is required' };
    if (!cleanModelId) return { success: false, error: 'Model Name is required' };
    if (!String(apiKey || '').trim()) return { success: false, error: 'API Key is required' };

    const cfg = loadEmbeddedConfig();
    cfg.models = cfg.models || {};
    cfg.models.mode = cfg.models.mode || 'merge';
    cfg.models.providers = cfg.models.providers || {};

    cfg.models.providers[cleanProviderId] = {
      ...(cfg.models.providers[cleanProviderId] || {}),
      baseUrl, apiKey, api: autoApi,
      models: [{ id: cleanModelId, name: cleanModelId }]
    };

    cfg.agents = cfg.agents || {};
    cfg.agents.defaults = cfg.agents.defaults || {};
    cfg.agents.defaults.model = cfg.agents.defaults.model || {};
    cfg.agents.defaults.model.primary = `${cleanProviderId}/${cleanModelId}`;
    if (cfg.agents.defaults.model.fallback !== undefined) delete cfg.agents.defaults.model.fallback;

    saveEmbeddedConfig(cfg);
    syncAuthProfileForProvider(cleanProviderId, apiKey, autoApi);
    return { success: true, apiResolved: autoApi, modelResolved: `${cleanProviderId}/${cleanModelId}` };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-provider-config', async () => {
  try {
    const cfg = loadEmbeddedConfig();
    const providers = cfg?.models?.providers || {};
    const entries = Object.entries(providers);
    if (!entries.length) return { success: true, configured: false };
    const [providerId, p] = entries[0];
    return {
      success: true,
      configured: !!String(p?.apiKey || '').trim(),
      provider: {
        providerId,
        modelId: p?.models?.[0]?.id || 'default',
        api: p?.api || 'openai-completions',
        baseUrl: p?.baseUrl || '',
        apiKey: p?.apiKey || ''
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-provider-config', async (event, providerId) => {
  try {
    const cfg = loadEmbeddedConfig();
    cfg.models = cfg.models || {};
    cfg.models.providers = cfg.models.providers || {};
    const id = String(providerId || '').trim();
    if (id && cfg.models.providers[id]) delete cfg.models.providers[id];
    cfg.agents = cfg.agents || {};
    cfg.agents.defaults = cfg.agents.defaults || {};
    cfg.agents.defaults.model = cfg.agents.defaults.model || {};
    cfg.agents.defaults.model.primary = 'openclaw:main';
    if (cfg.agents.defaults.model.fallback !== undefined) delete cfg.agents.defaults.model.fallback;
    saveEmbeddedConfig(cfg);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('reset-model-config', async () => {
  try {
    const cfg = loadEmbeddedConfig();
    cfg.models = { mode: 'merge', providers: {} };
    cfg.agents = cfg.agents || {};
    cfg.agents.defaults = cfg.agents.defaults || {};
    if (cfg.agents.defaults.model !== undefined) delete cfg.agents.defaults.model;
    saveEmbeddedConfig(cfg);

    fs.mkdirSync(AUTH_PROFILES_DIR, { recursive: true });
    fs.writeFileSync(AUTH_PROFILES_FILE, JSON.stringify({ version: 1, profiles: {}, lastGood: {}, usageStats: {} }, null, 2), 'utf8');

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Relay config handlers (from Worktree A)
ipcMain.handle('save-relay-config', async (event, config) => {
  try {
    const { baseUrl = '', authToken = '' } = config || {};
    const state = loadAppState();
    state.relay = { ...(state.relay || {}), baseUrl: baseUrl.trim(), authToken: authToken.trim() };
    saveAppState(state);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-relay-config', async () => {
  try {
    const state = loadAppState();
    return { success: true, relay: state.relay || { baseUrl: '', authToken: '' } };
  } catch (e) {
    return { success: false, error: e.message, relay: { baseUrl: '', authToken: '' } };
  }
});

ipcMain.handle('test-relay-connection', async () => {
  try {
    const state = loadAppState();
    const relay = state.relay || {};
    const authToken = relay.accessToken || relay.authToken;
    if (!relay.baseUrl || !authToken) {
      return { success: false, error: 'Relay URL and auth token are required.' };
    }
    await checkRelayHealth(relay.baseUrl, authToken);
    return { success: true };
  } catch (e) {
    const detail = e?.response?.data ? JSON.stringify(e.response.data) : e.message;
    return { success: false, error: detail };
  }
});

// Device ID handler
ipcMain.handle('get-device-id', async () => {
  const state = loadAppState();
  return { success: true, deviceId: state.deviceId || '' };
});

// Quota check handler
ipcMain.handle('check-quota', async () => {
  const state = loadAppState();
  const relay = state.relay || {};
  const deviceId = state.deviceId;

  if (!relay.baseUrl || !deviceId) {
    return { success: false, error: 'not_configured' };
  }

  try {
    const authToken = relay.accessToken || relay.authToken;
    const headers = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const response = await axios.get(`${relay.baseUrl}/v1/devices/${deviceId}/usage`, { headers, timeout: 8000 });
    return response.data;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Open login in system browser
ipcMain.handle('open-login', async () => {
  try {
    const state = loadAppState();
    const deviceId = state.deviceId || '';
    const homepageUrl = 'https://myopenclaws.app';
    const loginUrl = `${homepageUrl}/login.html?deviceId=${deviceId}&redirect=myopenclaw`;
    await shell.openExternal(loginUrl);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Save relay JWT auth tokens
ipcMain.handle('save-relay-auth', async (event, { accessToken, refreshToken }) => {
  try {
    const state = loadAppState();
    state.relay = state.relay || {};
    state.relay.accessToken = accessToken || '';
    state.relay.refreshToken = refreshToken || '';
    saveAppState(state);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Channel config handler
ipcMain.handle('save-agent-channel-config', async (event, payload) => {
  try {
    const { agentId, channelType, configJson } = payload || {};
    const parsed = configJson ? JSON.parse(configJson) : {};
    const cfg = loadEmbeddedConfig();
    cfg.channels = cfg.channels || {};
    cfg.channels[channelType] = cfg.channels[channelType] || { enabled: true, accounts: {} };
    cfg.channels[channelType].enabled = true;
    cfg.channels[channelType].accounts = cfg.channels[channelType].accounts || {};
    cfg.channels[channelType].accounts[agentId || 'default'] = parsed;
    saveEmbeddedConfig(cfg);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ---------------------------------------------------------------------------
// Deep link protocol: myopenclaw://
// ---------------------------------------------------------------------------
const PROTOCOL = 'myopenclaw';

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

function handleDeepLink(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${PROTOCOL}:`) return;

    if (parsed.hostname === 'auth' || parsed.pathname === '//auth' || parsed.pathname === '/auth') {
      const accessToken = parsed.searchParams.get('accessToken');
      const refreshToken = parsed.searchParams.get('refreshToken');
      const email = parsed.searchParams.get('email');

      if (accessToken) {
        const state = loadAppState();
        state.relay = state.relay || {};
        state.relay.accessToken = accessToken;
        if (refreshToken) state.relay.refreshToken = refreshToken;
        if (email) state.relay.userEmail = email;
        saveAppState(state);
        console.log('[DeepLink] Auth tokens saved from web login');

        // Notify renderer to refresh UI
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.executeJavaScript(`
            if (typeof loadRelayConfig === 'function') loadRelayConfig();
            if (typeof loadDeviceInfo === 'function') loadDeviceInfo();
            if (typeof refreshQuota === 'function') refreshQuota();
          `).catch(() => {});
          mainWindow.show();
          mainWindow.focus();
        }
      }
    }
  } catch (err) {
    console.error('[DeepLink] Failed to handle URL:', err.message);
  }
}

// macOS: open-url event fires when app is already running or launched via URL
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Windows/Linux: single instance lock + deep link via argv
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    // The deep link URL is the last argument
    const deepLinkUrl = argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (deepLinkUrl) handleDeepLink(deepLinkUrl);

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  const deviceId = ensureDeviceId();
  registerDevice(deviceId); // fire-and-forget
  createWindow();

  // macOS: handle deep link that launched the app
  const launchUrl = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
  if (launchUrl) handleDeepLink(launchUrl);
});

app.on('window-all-closed', () => {
  if (gatewayProcess) gatewayProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
