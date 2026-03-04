const { app, BrowserWindow, ipcMain, shell } = require('electron');
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

const OPENCLAW_CONFIG_DIR = path.join(os.homedir(), '.openclaw');
const CONFIG_FILE = path.join(OPENCLAW_CONFIG_DIR, 'openclaw.json');
const DEFAULT_PORT = 18800;
const EMBEDDED_CONFIG_FILE = path.join(__dirname, 'resources', '.openclaw-myopenclaw', 'openclaw.json');
const APP_STATE_FILE = path.join(__dirname, 'resources', '.openclaw-myopenclaw', 'app-state.json');

function getDefaultAppState() {
  return {
    premiumTier: 'free', // free | premium | pro
    isPremium: false,
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
    return JSON.parse(fs.readFileSync(EMBEDDED_CONFIG_FILE, 'utf8'));
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

async function downloadFile(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({ method: 'get', url, responseType: 'stream', timeout: 0 });
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
  await downloadFile(url, zipPath);

  console.log('[runtime] Extracting runtime...');
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
}

// 启动内置 Gateway（使用独立配置目录）
async function startGateway() {
  try {
    if (await isOpenClawGatewayRunning(18800)) {
      gatewayPort = 18800;
    } else {
      gatewayPort = await findAvailablePort(18800);
    }
    gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;
    
    console.log(`[startGateway] Starting gateway on port ${gatewayPort}...`);

    // simple 版本：若未内置 runtime，则自动下载并解压到 resources/openclaw-deps
    await ensureEmbeddedRuntime();

    // 使用 gateway.cmd 脚本启动（设置了独立的 OPENCLAW_STATE_DIR）
    const gatewayCmdPath = path.join(__dirname, 'resources', 'gateway.cmd');
    
    console.log(`[startGateway] Gateway script: ${gatewayCmdPath}`);
    
    // 启动 gateway
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
    await new Promise(resolve => setTimeout(resolve, 8000));  // 等待 8 秒
    
    // 验证 gateway 是否启动
    await waitForGateway();

    // 启动后做一次最小对话自检，避免前端首次发送才报错
    await smokeTestChat();
    
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
        // 即使失败也显示界面，让用户看到错误
        mainWindow.loadFile('index.html');
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
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
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

// 发送消息到 main agent
ipcMain.handle('send-message', async (event, payload) => {
  try {
    if (!gatewayBaseUrl) {
      throw new Error('Gateway not started');
    }

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

    // 使用固定的 token（与 gateway.cmd 中的一致）
    const token = 'myopenclaw_2024_secure_token_a8f3e9d2c1b7f6e5d4c3b2a1';

    // Per-agent conversation context (app-level isolation)
    state.conversations = state.conversations || {};
    const conv = state.conversations[agentId] || [];
    const messages = [...conv, { role: 'user', content: message }].slice(-20);

    // 通过 OpenAI 兼容端点发送消息（统一走 main，按会话上下文隔离不同 agent）
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

    const content = response?.data?.choices?.[0]?.message?.content || 'Received';
    state.conversations[agentId] = [...messages, { role: 'assistant', content }].slice(-20);

    consumeQuota(state, gate.tier);
    saveAppState(state);

    return {
      success: true,
      response: content,
      state
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('get-app-state', async () => {
  const state = loadAppState();
  const gate = checkPremiumGate(state);
  return { ...state, gate };
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
  const state = loadAppState();
  return state.agents;
});

ipcMain.handle('add-agent', async (event, name) => {
  const state = loadAppState();
  const totalAgents = state.agents.length;

  if (state.premiumTier === 'free' && totalAgents >= 1) {
    return { success: false, premiumRequired: true, error: 'Free plan supports 1 agent. Upgrade to Premium for up to 5.' };
  }
  if (state.premiumTier === 'premium' && totalAgents >= 5) {
    return { success: false, premiumRequired: true, error: 'Premium supports up to 5 agents. Upgrade to Pro for unlimited agents.' };
  }

  const id = `agent-${Date.now()}`;
  state.agents.push({ id, name: name || `Agent ${state.agents.length + 1}`, channels: [] });
  saveAppState(state);
  return { success: true, agents: state.agents };
});

ipcMain.handle('rename-agent', async (event, payload) => {
  const state = loadAppState();
  const agent = state.agents.find(a => a.id === payload.id);
  if (!agent) return { success: false, error: 'Agent 不存在' };
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

ipcMain.handle('delete-agent', async (event, id) => {
  const state = loadAppState();
  if (id === 'main') return { success: false, error: 'Main agent cannot be deleted' };
  const index = state.agents.findIndex(a => a.id === id);
  if (index < 0) return { success: false, error: 'Agent not found' };
  state.agents.splice(index, 1);
  if (state.activeAgentId === id) state.activeAgentId = 'main';
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

ipcMain.handle('save-provider-config', async (event, payload) => {
  try {
    const { providerId = 'custom', baseUrl = '', apiKey = '', api = 'openai-completions', modelId = '' } = payload || {};
    const cfg = loadEmbeddedConfig();
    cfg.models = cfg.models || {};
    cfg.models.mode = cfg.models.mode || 'merge';
    cfg.models.providers = cfg.models.providers || {};
    cfg.models.providers[providerId] = {
      ...(cfg.models.providers[providerId] || {}),
      baseUrl,
      apiKey,
      api,
      models: modelId ? [{ id: modelId, name: modelId }] : (cfg.models.providers[providerId]?.models || [])
    };
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
