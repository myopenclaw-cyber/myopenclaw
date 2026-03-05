const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
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

const OPENCLAW_CONFIG_DIR = path.join(os.homedir(), '.openclaw');
const CONFIG_FILE = path.join(OPENCLAW_CONFIG_DIR, 'openclaw.json');
const DEFAULT_PORT = 18800;
const EMBEDDED_CONFIG_FILE = path.join(__dirname, 'resources', '.openclaw-myopenclaw', 'openclaw.json');
const APP_STATE_FILE = path.join(__dirname, 'resources', '.openclaw-myopenclaw', 'app-state.json');
const LOCAL_APP_CONFIG_FILE = path.join(__dirname, 'resources', '.openclaw-myopenclaw', 'local-app-config.json');

function getDefaultAppState() {
  return {
    premiumTier: 'free', // free | premium | pro
    isPremium: false,
    backendUserId: '',
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
    conversations: {}
  };
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

function hasUsableProviderConfig() {
  const cfg = loadEmbeddedConfig();
  const providers = cfg?.models?.providers || {};
  const list = Object.values(providers);
  return list.some(p => (p?.apiKey && String(p.apiKey).trim()) || (p?.baseUrl && String(p.baseUrl).trim() && p?.api));
}

function getUserProviderConfig() {
  const cfg = loadEmbeddedConfig();
  const providers = cfg?.models?.providers || {};
  for (const [providerId, p] of Object.entries(providers)) {
    const apiKey = String(p?.apiKey || '').trim();
    const baseUrl = String(p?.baseUrl || '').trim();
    const modelId = p?.models?.[0]?.id || 'default';
    if (apiKey) {
      return { providerId, baseUrl, apiKey, modelId, api: p?.api || 'openai-completions' };
    }
  }
  return null;
}

function getDefaultLocalAppConfig() {
  return {
    backend: {
      baseUrl: "",
      apiKey: "",
      webhookSecret: ""
    },
    stripe: {
      publishableKey: "pk_test_mock_replace_me",
      secretKey: "sk_test_mock_replace_me",
      webhookSecret: "whsec_mock_replace_me",
      pricePremiumMonthly: "",
      priceProMonthly: "",
      priceProYearly: ""
    },
    auth: {
      jwtSecret: "mock_jwt_secret_replace_me",
      deviceBindSalt: "mock_device_bind_salt_replace_me"
    }
  };
}

function loadLocalAppConfig() {
  try {
    if (!fs.existsSync(LOCAL_APP_CONFIG_FILE)) {
      const def = getDefaultLocalAppConfig();
      fs.mkdirSync(path.dirname(LOCAL_APP_CONFIG_FILE), { recursive: true });
      fs.writeFileSync(LOCAL_APP_CONFIG_FILE, JSON.stringify(def, null, 2), 'utf8');
      return def;
    }
    return { ...getDefaultLocalAppConfig(), ...JSON.parse(fs.readFileSync(LOCAL_APP_CONFIG_FILE, 'utf8')) };
  } catch (e) {
    console.error('[local-app-config] load failed:', e.message);
    return getDefaultLocalAppConfig();
  }
}

function saveLocalAppConfig(cfg) {
  fs.mkdirSync(path.dirname(LOCAL_APP_CONFIG_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_APP_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

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

function loadAgentConversationFromOpenClaw(agentId = 'main', limit = 80) {
  try {
    const sessionsDir = path.join(__dirname, 'resources', '.openclaw-myopenclaw', 'agents', agentId, 'sessions');
    if (!fs.existsSync(sessionsDir)) return [];

    let targetSessionFile = '';
    const sessionsIndex = path.join(sessionsDir, 'sessions.json');
    if (fs.existsSync(sessionsIndex)) {
      const idx = JSON.parse(fs.readFileSync(sessionsIndex, 'utf8').replace(/^\uFEFF/, ''));
      const rows = Object.values(idx || {}).filter(v => v && v.sessionFile);
      rows.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
      if (rows[0]?.sessionFile) targetSessionFile = rows[0].sessionFile;
    }

    if (!targetSessionFile || !fs.existsSync(targetSessionFile)) {
      const files = fs.readdirSync(sessionsDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => ({ f, mtime: fs.statSync(path.join(sessionsDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      if (!files.length) return [];
      targetSessionFile = path.join(sessionsDir, files[0].f);
    }

    const lines = fs.readFileSync(targetSessionFile, 'utf8').split(/\r?\n/).filter(Boolean);
    const conv = [];
    for (const line of lines) {
      let row;
      try { row = JSON.parse(line); } catch { continue; }
      if (row?.type !== 'message' || !row.message) continue;
      const role = row.message.role;
      if (role !== 'user' && role !== 'assistant') continue;
      let text = extractTextFromMessageContent(row.message.content);
      if (!text && row.message.errorMessage) text = row.message.errorMessage;
      if (!text) continue;
      conv.push({ role: role === 'assistant' ? 'assistant' : 'user', content: text, timestamp: row.timestamp || row.message.timestamp || 0 });
    }

    return conv.slice(-Math.max(1, limit));
  } catch (e) {
    console.error('[conversation-load] failed:', e.message);
    return [];
  }
}

async function ensureBackendUser(state) {
  const localCfg = loadLocalAppConfig();
  const baseUrl = (localCfg?.backend?.baseUrl || '').trim();
  if (!baseUrl) throw new Error('Backend baseUrl is empty. Please set backend.baseUrl in local-app-config.json');

  if (state.backendUserId) return { baseUrl, userId: state.backendUserId };

  const resp = await axios.post(`${baseUrl}/v1/users/init`, {
    email: '',
    name: 'MyOpenClaw Local User'
  }, { timeout: 10000 });

  const userId = resp?.data?.user?.id;
  if (!userId) throw new Error('Backend user init failed');
  state.backendUserId = userId;
  saveAppState(state);
  return { baseUrl, userId };
}

async function checkQuotaByBackend(state) {
  const { baseUrl, userId } = await ensureBackendUser(state);
  const resp = await axios.get(`${baseUrl}/v1/quota/${userId}`, { timeout: 10000 });
  const data = resp?.data || {};
  const plan = data.plan || 'free';
  if (plan === 'premium' || plan === 'pro') {
    return { allow: true, plan, mode: 'premium' };
  }
  const freeRemain = Number(data?.remaining?.free ?? 0);
  const apiKeyRemain = Number(data?.remaining?.apiKeyTrial ?? 0);
  if (freeRemain > 0) return { allow: true, plan, mode: 'free' };
  if (apiKeyRemain > 0) return { allow: true, plan, mode: 'apiKeyTrial' };
  return { allow: false, error: 'Quota exhausted. Please upgrade.' };
}

async function consumeQuotaByBackend(state, mode) {
  const { baseUrl, userId } = await ensureBackendUser(state);
  await axios.post(`${baseUrl}/v1/quota/consume`, { userId, mode }, { timeout: 10000 });
}

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

// 查找可用端口
async function findAvailablePort(startPort = DEFAULT_PORT) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available port found');
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
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
      const pct = Math.round((loaded / total) * 100);
      onProgress(Math.max(0, Math.min(100, pct)));
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
    throw new Error('缺少 runtime-manifest.json，simple 版本无法自动下载运行时');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const target = getRuntimeTargetLabel();
  const url = manifest?.[target]?.url;

  if (!url) {
    throw new Error(`runtime-manifest.json 未配置 ${target} 的下载 URL`);
  }

  const zipPath = path.join(os.tmpdir(), `myopenclaw-runtime-${target}.zip`);
  const resourcesDir = path.join(__dirname, 'resources');

  console.log(`[runtime] Downloading runtime for ${target}...`);
  updateLoadingStatus('Downloading openclaw ...', 52);
  await downloadFile(url, zipPath, (p) => {
    const mapped = 52 + Math.round(p * 0.28); // 52 -> 80
    updateLoadingStatus('Downloading openclaw ...', mapped);
  });

  console.log('[runtime] Extracting runtime...');
  updateLoadingStatus('Extracting openclaw runtime...', 84);
  if (process.platform === 'win32') {
    execFileSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path '${zipPath}' -DestinationPath '${resourcesDir}' -Force`
    ], { stdio: 'inherit' });
  } else {
    execFileSync('unzip', ['-o', zipPath, '-d', resourcesDir], { stdio: 'inherit' });
  }

  if (!fs.existsSync(runtimeEntry)) {
    throw new Error('runtime 解压完成但未找到 openclaw.mjs，请检查压缩包目录结构');
  }

  console.log('[runtime] Runtime ready');
  updateLoadingStatus('Launching openclaw gateway...', 88);
}

// 启动内置 Gateway（使用独立配置目录）
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

    // simple 版本：若未内置 runtime，则自动下载并解压到 resources/openclaw-deps
    await ensureEmbeddedRuntime();
    ensureAuthProfilesFromEmbeddedConfig();

    // 使用 gateway.cmd 脚本启动（设置了独立的 OPENCLAW_STATE_DIR）
    const gatewayCmdPath = path.join(__dirname, 'resources', 'gateway.cmd');
    
    console.log(`[startGateway] Gateway script: ${gatewayCmdPath}`);
    
    // 启动 gateway
    updateLoadingStatus('Launching openclaw gateway...', 90);
    gatewayProcess = spawn('cmd.exe', ['/c', gatewayCmdPath, String(gatewayPort)], {
      stdio: 'pipe',
      cwd: path.join(__dirname, 'resources'),
      windowsHide: true  // 隐藏窗口
    });

    gatewayProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log(`[Gateway stdout] ${msg}`);
    });

    gatewayProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      console.error(`[Gateway stderr] ${msg}`);
    });

    gatewayProcess.on('exit', (code, signal) => {
      console.log(`[Gateway] Process exited with code ${code}, signal ${signal}`);
      if (code !== 0) {
        console.error('[Gateway] Unexpected exit!');
      }
    });

    gatewayProcess.on('error', (err) => {
      console.error('[Gateway] Process error:', err);
    });

    // 等待 gateway 启动
    console.log('[startGateway] Waiting for gateway to start...');
    updateLoadingStatus('Checking gateway health...', 94);
    await new Promise(resolve => setTimeout(resolve, 8000));  // 等待 8 秒
    
    // 验证 gateway 是否启动
    await waitForGateway();

    // 启动后做一次最小对话自检（失败不阻断启动，避免 gateway 实际可用却被误判）
    try {
      await smokeTestChat();
    } catch (probeErr) {
      const detail = probeErr?.message || String(probeErr);
      console.warn('[startGateway] Chat probe failed, but gateway is healthy. Continue startup. Detail:', detail);
      global.__MYOPENCLAW_STARTUP_WARNING__ = detail;
    }
    
    updateLoadingStatus('Startup complete. Opening workspace...', 100);
    console.log(`[startGateway] Gateway started successfully on ${gatewayBaseUrl}`);
  } catch (error) {
    console.error('[startGateway] Failed to start gateway:', error);
    throw error;
  }
}

// 等待 Gateway 就绪
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
  throw new Error('Gateway failed to start');
}

async function smokeTestChat() {
  const token = 'myopenclaw_2024_secure_token_a8f3e9d2c1b7f6e5d4c3b2a1';
  console.log('[smokeTestChat] Sending startup probe...');
  try {
    const response = await axios.post(`${gatewayBaseUrl}/v1/chat/completions`, {
      model: 'openclaw:main',
      messages: [{ role: 'user', content: 'ping' }],
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': 'main'
      },
      timeout: 30000
    });

    if (!response?.data?.choices?.[0]?.message?.content) {
      throw new Error('probe returned empty message');
    }

    console.log('[smokeTestChat] OK');
  } catch (error) {
    const detail = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error('[smokeTestChat] FAILED:', detail);
    throw new Error(`Gateway chat probe failed: ${detail}`);
  }
}

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

  // 所有外链都走系统默认浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 检查是否首次启动
  if (!fs.existsSync(CONFIG_FILE)) {
    mainWindow.loadFile('setup.html');
  } else {
    // 显示加载页面
    mainWindow.loadFile('loading.html');
    
    // 启动 Gateway
    startGateway()
      .then(() => {
        // 启动成功，加载聊天界面
        mainWindow.loadFile('index.html');
      })
      .catch(err => {
        console.error('Gateway startup failed:', err);
        global.__MYOPENCLAW_STARTUP_ERROR__ = err?.message || String(err);
        mainWindow.loadFile('error.html');
      });
  }
}

// 保存配置
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
    
    // 配置保存后启动 gateway
    await startGateway();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取 Gateway 信息和 token
ipcMain.handle('get-gateway-info', async () => {
  // 读取 token
  let token = null;
  try {
    const configPath = path.join(__dirname, 'resources', '.openclaw-myopenclaw', 'openclaw.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
      token = config.gateway?.auth?.token;
    }
  } catch (err) {
    console.error('[get-gateway-info] Failed to read token:', err);
  }
  
  return {
    port: gatewayPort,
    baseUrl: gatewayBaseUrl,
    token: token
  };
});

ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-startup-error', async () => {
  return { error: global.__MYOPENCLAW_STARTUP_ERROR__ || '' };
});

ipcMain.handle('get-local-app-config', async () => {
  return { success: true, config: loadLocalAppConfig() };
});

ipcMain.handle('save-local-app-config', async (event, patch) => {
  try {
    const cfg = loadLocalAppConfig();
    const next = {
      ...cfg,
      ...patch,
      backend: { ...(cfg.backend || {}), ...(patch?.backend || {}) },
      stripe: { ...(cfg.stripe || {}), ...(patch?.stripe || {}) },
      auth: { ...(cfg.auth || {}), ...(patch?.auth || {}) }
    };
    saveLocalAppConfig(next);
    return { success: true, config: next };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('create-checkout-session', async (event, plan) => {
  try {
    if (!['premium', 'pro'].includes(plan)) {
      return { success: false, error: 'Invalid plan' };
    }
    const state = loadAppState();
    const { baseUrl, userId } = await ensureBackendUser(state);
    const resp = await axios.post(`${baseUrl}/v1/payments/checkout-session`, { userId, plan }, { timeout: 15000 });
    const checkoutUrl = resp?.data?.checkoutUrl;
    if (!checkoutUrl) return { success: false, error: 'No checkoutUrl returned' };
    await shell.openExternal(checkoutUrl);
    return { success: true, checkoutUrl };
  } catch (e) {
    const msg = e?.response?.data?.error || e.message;
    return { success: false, error: msg };
  }
});

// 发送消息到 main agent
ipcMain.handle('send-message', async (event, payload) => {
  try {
    if (!gatewayBaseUrl) throw new Error('Gateway not started');

    const message = typeof payload === 'string' ? payload : payload?.message;
    const agentId = payload?.agentId || 'main';

    const state = loadAppState();
    const messages = [{ role: 'user', content: message }];

    const userProvider = getUserProviderConfig();
    if (!userProvider) {
      return {
        success: false,
        noApiKeyConfigured: true,
        error: 'OpenClaw depends on an LLM model to provide intelligence. Please configure your API key first.'
      };
    }

    const token = 'myopenclaw_2024_secure_token_a8f3e9d2c1b7f6e5d4c3b2a1';
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

    return {
      success: true,
      response: content,
      state
    };
  } catch (error) {
    const apiDetail = error?.response?.data?.error?.message || error?.response?.data?.message || error?.response?.data?.error;
    const status = error?.response?.status;
    let msg = apiDetail || error.message || 'Unknown error';
    if (status === 500 && /internal error/i.test(msg)) {
      msg = 'Gateway provider error. Please verify API Keys (Base URL / API Key / Model) in API Keys page.';
    }
    return {
      success: false,
      error: msg,
      status
    };
  }
});

ipcMain.handle('get-app-state', async () => {
  const state = loadAppState();
  let gate = { allow: true, mode: 'free' };
  try {
    gate = await checkQuotaByBackend(state);
  } catch (e) {
    gate = { allow: false, error: e.message };
  }
  return { ...state, gate };
});

ipcMain.handle('get-agent-conversation', async (event, agentId = 'main') => {
  const conversation = loadAgentConversationFromOpenClaw(agentId, 120);
  return { success: true, conversation };
});

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
  saveAppState(state);
  return { success: true, state };
});

ipcMain.handle('list-agents', async () => {
  // Single source of truth: OpenClaw built-in main agent only (v1)
  return [{ id: 'main', name: 'Main Agent', channels: [] }];
});

ipcMain.handle('add-agent', async () => {
  return { success: false, error: 'Custom agents are disabled in current version. Uses OpenClaw built-in agent only.' };
});

ipcMain.handle('rename-agent', async () => {
  return { success: false, error: 'Rename is disabled in current version.' };
});

ipcMain.handle('set-agent-channels', async () => {
  return { success: false, error: 'Channel binding by custom agent is disabled in current version.' };
});

ipcMain.handle('delete-agent', async () => {
  return { success: false, error: 'Delete is disabled in current version.' };
});

ipcMain.handle('set-active-agent', async (event, id) => {
  const state = loadAppState();
  state.activeAgentId = 'main';
  saveAppState(state);
  return { success: true, state };
});

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
      baseUrl,
      apiKey,
      api: autoApi,
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // 停止 gateway
  if (gatewayProcess) {
    gatewayProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
