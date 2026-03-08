const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');
const axios = require('axios');
const { spawn, execFileSync } = require('child_process');

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
const EMBEDDED_CONFIG_FILE = path.join(__dirname, 'resources', '.openclaw-myopenclaw', 'openclaw.json');
const APP_STATE_FILE = path.join(__dirname, 'resources', '.openclaw-myopenclaw', 'app-state.json');

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
// App state (simplified - BYOK only, no premium/quota)
// ---------------------------------------------------------------------------
function getDefaultAppState() {
  return {
    activeAgentId: 'main',
    conversations: {}
  };
}

function loadAppState() {
  try {
    if (!fs.existsSync(APP_STATE_FILE)) {
      saveAppState(getDefaultAppState());
      return getDefaultAppState();
    }
    return { ...getDefaultAppState(), ...JSON.parse(fs.readFileSync(APP_STATE_FILE, 'utf8')) };
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
    const authFile = path.join(__dirname, 'resources', '.openclaw-myopenclaw', 'agents', 'main', 'agent', 'auth-profiles.json');
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    let auth = { version: 1, profiles: {}, lastGood: {}, usageStats: {} };
    if (fs.existsSync(authFile)) {
      auth = JSON.parse(fs.readFileSync(authFile, 'utf8').replace(/^\uFEFF/, ''));
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
    fs.writeFileSync(authFile, JSON.stringify(auth, null, 2), 'utf8');
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

async function ensureEmbeddedRuntime() {
  const runtimeEntry = path.join(__dirname, 'resources', 'openclaw-deps', 'openclaw', 'openclaw.mjs');
  if (fs.existsSync(runtimeEntry)) {
    console.log('[runtime] Embedded runtime found');
    updateLoadingStatus('Launching openclaw gateway...', 72);
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
  const resourcesDir = path.join(__dirname, 'resources');

  console.log(`[runtime] Downloading runtime for ${target}...`);
  updateLoadingStatus('Downloading openclaw ...', 52);
  await downloadFile(url, zipPath, (p) => {
    updateLoadingStatus('Downloading openclaw ...', 52 + Math.round(p * 0.28));
  });

  console.log('[runtime] Extracting runtime...');
  updateLoadingStatus('Extracting openclaw runtime...', 84);
  if (process.platform === 'win32') {
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${resourcesDir}' -Force`], { stdio: 'inherit' });
  } else {
    execFileSync('unzip', ['-o', zipPath, '-d', resourcesDir], { stdio: 'inherit' });
  }

  if (!fs.existsSync(runtimeEntry)) {
    throw new Error('Runtime extracted but openclaw.mjs not found. Please check the archive structure.');
  }

  console.log('[runtime] Runtime ready');
  updateLoadingStatus('Launching openclaw gateway...', 88);
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

    const runtimeEntry = path.join(__dirname, 'resources', 'openclaw-deps', 'openclaw', 'openclaw.mjs');
    setRuntimeDownloadNeeded(!fs.existsSync(runtimeEntry));

    await ensureEmbeddedRuntime();
    ensureAuthProfilesFromEmbeddedConfig();

    // Generate random gateway token on each startup
    ensureRandomGatewayToken();

    updateLoadingStatus('Launching openclaw gateway...', 90);

    // Platform-specific gateway launch
    const resourcesDir = path.join(__dirname, 'resources');
    if (process.platform === 'win32') {
      const gatewayCmdPath = path.join(resourcesDir, 'gateway.cmd');
      gatewayProcess = spawn('cmd.exe', ['/c', gatewayCmdPath, String(gatewayPort)], {
        stdio: 'pipe', cwd: resourcesDir, windowsHide: true
      });
    } else {
      const gatewayShPath = path.join(resourcesDir, 'gateway.sh');
      gatewayProcess = spawn('bash', [gatewayShPath, String(gatewayPort)], {
        stdio: 'pipe', cwd: resourcesDir
      });
    }

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

  if (!fs.existsSync(CONFIG_FILE)) {
    mainWindow.loadFile('setup.html');
  } else {
    mainWindow.loadFile('loading.html');
    startGateway()
      .then(() => mainWindow.loadFile('index.html'))
      .catch(err => {
        console.error('Gateway startup failed:', err);
        global.__MYOPENCLAW_STARTUP_ERROR__ = err?.message || String(err);
        mainWindow.loadFile('error.html');
      });
  }
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

// Chat - send message to main agent
ipcMain.handle('send-message', async (event, payload) => {
  try {
    if (!gatewayBaseUrl) throw new Error('Gateway not started');

    const message = typeof payload === 'string' ? payload : payload?.message;

    const history = loadAgentConversationFromOpenClaw('main', 20)
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .map(m => ({ role: m.role, content: m.content }));
    const messages = [...history, { role: 'user', content: message }].slice(-24);

    const userProvider = getUserProviderConfig();
    if (!userProvider) {
      return {
        success: false,
        noApiKeyConfigured: true,
        error: 'OpenClaw depends on an LLM model to provide intelligence. Please configure your API key first.'
      };
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

    const content = response?.data?.choices?.[0]?.message?.content || 'No response from OpenClaw.';
    return { success: true, response: content };
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

// App state (simplified)
ipcMain.handle('get-app-state', async () => {
  return loadAppState();
});

ipcMain.handle('get-agent-conversation', async (event, agentId = 'main') => {
  const conversation = loadAgentConversationFromOpenClaw(agentId, 120);
  return { success: true, conversation };
});

// Agent listing (single agent only)
ipcMain.handle('list-agents', async () => {
  return [{ id: 'main', name: 'Main Agent', channels: [] }];
});

ipcMain.handle('set-active-agent', async (event, id) => {
  const state = loadAppState();
  state.activeAgentId = 'main';
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

    const existingKeys = Object.keys(cfg.models.providers || {});
    const isNew = !cfg.models.providers[cleanProviderId];
    if (isNew && existingKeys.length > 0) {
      return { success: false, error: 'Only one provider is supported in current version. Please edit or delete existing one first.' };
    }

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

    const authFile = path.join(__dirname, 'resources', '.openclaw-myopenclaw', 'agents', 'main', 'agent', 'auth-profiles.json');
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ version: 1, profiles: {}, lastGood: {}, usageStats: {} }, null, 2), 'utf8');

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (gatewayProcess) gatewayProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
