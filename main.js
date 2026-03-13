"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main.ts
var path13 = __toESM(require("path"));
var os5 = __toESM(require("os"));
var import_electron14 = require("electron");

// src/constants.ts
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var MYOPENCLAW_DATA_DIR = path.join(os.homedir(), ".myopenclaw");
var OPENCLAW_CONFIG_DIR = path.join(MYOPENCLAW_DATA_DIR, "openclaw");
var CONFIG_FILE = path.join(OPENCLAW_CONFIG_DIR, "openclaw.json");
var DEFAULT_PORT = 18800;
var EMBEDDED_CONFIG_FILE = path.join(MYOPENCLAW_DATA_DIR, "embedded-config.json");
var APP_STATE_FILE = path.join(MYOPENCLAW_DATA_DIR, "app-state.json");
var AUTH_PROFILES_DIR = path.join(OPENCLAW_CONFIG_DIR, "agents", "main", "agent");
var AUTH_PROFILES_FILE = path.join(AUTH_PROFILES_DIR, "auth-profiles.json");
var DOWNLOADED_RUNTIME_DIR = path.join(MYOPENCLAW_DATA_DIR, "runtime");
var RELAY_BASE_URL = "https://myopenclaw-relay-service-production.up.railway.app";
var PROTOCOL = "myopenclaw";
var MIN_NODE_MAJOR_VERSION = 22;

// src/config-store.ts
var crypto = __toESM(require("crypto"));
var path2 = __toESM(require("path"));
var fs = __toESM(require("fs"));
function readGatewayTokenFromConfig() {
  try {
    if (!fs.existsSync(EMBEDDED_CONFIG_FILE)) return "";
    const config = JSON.parse(fs.readFileSync(EMBEDDED_CONFIG_FILE, "utf8").replace(/^\uFEFF/, ""));
    return String(config?.gateway?.auth?.token || "").trim();
  } catch {
    return "";
  }
}
function ensureRandomGatewayToken() {
  const cfg = loadEmbeddedConfig();
  cfg.gateway = cfg.gateway || {};
  cfg.gateway.auth = cfg.gateway.auth || {};
  if (!cfg.gateway.auth.token || cfg.gateway.auth.token === "myopenclaw_2024_secure_token_a8f3e9d2c1b7f6e5d4c3b2a1") {
    cfg.gateway.auth.token = crypto.randomUUID();
    cfg.gateway.auth.mode = "token";
  }
  cfg.gateway.http = cfg.gateway.http || {};
  cfg.gateway.http.endpoints = cfg.gateway.http.endpoints || {};
  cfg.gateway.http.endpoints.chatCompletions = { enabled: true };
  saveEmbeddedConfig(cfg);
  return cfg.gateway.auth.token;
}
function buildDashboardUrl(baseUrl, gatewayBaseUrl) {
  const token = readGatewayTokenFromConfig();
  const u = new URL(baseUrl || gatewayBaseUrl || `http://127.0.0.1:${DEFAULT_PORT}`);
  if (token) {
    u.searchParams.set("gatewayToken", token);
    u.searchParams.set("token", token);
    u.searchParams.set("x-api-key", token);
  }
  return u.toString();
}
function getDefaultAppState() {
  return {
    premiumTier: "free",
    isPremium: false,
    plan: "free",
    planExpiresAt: null,
    freeQuotaUsed: 0,
    userApiKey: "",
    userApiKeyQuotaUsed: 0,
    activeAgentId: "main",
    agents: [
      {
        id: "main",
        name: "Main Agent",
        channels: []
      }
    ],
    conversations: {},
    relay: { baseUrl: "", authToken: "", accessToken: "", refreshToken: "", userEmail: "" },
    deviceId: "",
    deviceToken: ""
  };
}
function getPlanFeatures(plan) {
  const features = {
    free: { maxAgents: 1, canUseRelay: true, modelTier: "basic" },
    plus: { maxAgents: 3, canUseRelay: true, modelTier: "major" },
    premium: { maxAgents: 3, canUseRelay: true, modelTier: "major" },
    // legacy alias
    pro: { maxAgents: 10, canUseRelay: true, modelTier: "latest" }
  };
  return features[plan] || features.free;
}
function loadAppState() {
  try {
    if (!fs.existsSync(APP_STATE_FILE)) {
      saveAppState(getDefaultAppState());
      return getDefaultAppState();
    }
    const state = { ...getDefaultAppState(), ...JSON.parse(fs.readFileSync(APP_STATE_FILE, "utf8")) };
    if (!state.premiumTier) state.premiumTier = state.isPremium ? "premium" : "free";
    state.isPremium = state.premiumTier !== "free";
    if (!state.plan || state.plan === "free") state.plan = state.premiumTier;
    return state;
  } catch (error) {
    console.error("[app-state] load failed, using default:", error.message);
    return getDefaultAppState();
  }
}
function saveAppState(state) {
  const dir = path2.dirname(APP_STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(APP_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}
function checkPremiumGate(state) {
  if (state.premiumTier === "premium" || state.premiumTier === "pro") {
    return { allow: true, tier: state.premiumTier };
  }
  const relay = state.relay || { baseUrl: "", authToken: "", accessToken: "", refreshToken: "", userEmail: "" };
  const hasRelay = !!(relay.accessToken || relay.authToken);
  if (hasRelay) {
    return { allow: true, tier: "free" };
  }
  if (state.userApiKey) {
    return { allow: true, tier: "user_api_key" };
  }
  if (state.deviceId) {
    return { allow: true, tier: "anonymous" };
  }
  return {
    allow: false,
    reason: "login_required",
    message: "You've used your free credits. Sign in to continue chatting.",
    loginRequired: true
  };
}
function consumeQuota(state, tier) {
  if (tier === "free" || tier === "anonymous") state.freeQuotaUsed += 1;
  if (tier === "user_api_key") state.userApiKeyQuotaUsed += 1;
}
function loadEmbeddedConfig() {
  try {
    if (!fs.existsSync(EMBEDDED_CONFIG_FILE)) return {};
    const raw = fs.readFileSync(EMBEDDED_CONFIG_FILE, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (e) {
    console.error("[embedded-config] load failed:", e.message);
    return {};
  }
}
function saveEmbeddedConfig(config) {
  const dir = path2.dirname(EMBEDDED_CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(EMBEDDED_CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}
function getUserProviderConfig() {
  const cfg = loadEmbeddedConfig();
  const providers = cfg?.models?.providers || {};
  for (const [providerId, p] of Object.entries(providers)) {
    const apiKey = String(p?.apiKey || "").trim();
    if (apiKey) {
      return {
        providerId,
        baseUrl: String(p?.baseUrl || "").trim(),
        apiKey,
        modelId: p?.models?.[0]?.id || "default",
        api: p?.api || "openai-completions"
      };
    }
  }
  return null;
}

// src/device.ts
var crypto2 = __toESM(require("crypto"));
var import_axios = __toESM(require("axios"));
function ensureDeviceId() {
  const state = loadAppState();
  if (!state.deviceId) {
    state.deviceId = crypto2.randomUUID();
    saveAppState(state);
    console.log("[device-id] Generated new device ID:", state.deviceId);
  } else {
    console.log("[device-id] Loaded existing device ID:", state.deviceId);
  }
  return state.deviceId;
}
async function registerDevice(deviceId, appVersion) {
  try {
    const response = await import_axios.default.post(`${RELAY_BASE_URL}/v1/devices`, {
      deviceId,
      platform: process.platform,
      appVersion
    }, { timeout: 2e4 });
    console.log("[device-registration] Device registered successfully");
    const deviceToken = response.data?.deviceToken;
    if (deviceToken) {
      const state = loadAppState();
      state.deviceToken = deviceToken;
      saveAppState(state);
      console.log("[device-registration] Saved signed device token");
    }
  } catch (err) {
    console.log("[device-registration] Registration failed (non-fatal):", err.message);
  }
}

// src/deep-link.ts
var import_axios3 = __toESM(require("axios"));

// src/auth.ts
var fs2 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var import_axios2 = __toESM(require("axios"));
function syncAuthProfileForProvider(providerId, apiKey, api = "") {
  try {
    const key = String(apiKey || "").trim();
    if (!providerId || !key) return;
    fs2.mkdirSync(AUTH_PROFILES_DIR, { recursive: true });
    let auth = { version: 1, profiles: {}, lastGood: {}, usageStats: {} };
    if (fs2.existsSync(AUTH_PROFILES_FILE)) {
      auth = JSON.parse(fs2.readFileSync(AUTH_PROFILES_FILE, "utf8").replace(/^\uFEFF/, ""));
      auth.version = auth.version || 1;
      auth.profiles = auth.profiles || {};
      auth.lastGood = auth.lastGood || {};
      auth.usageStats = auth.usageStats || {};
    }
    const bind = (pid) => {
      const profileId = `${pid}:default`;
      auth.profiles[profileId] = { type: "api_key", provider: pid, key };
      auth.lastGood[pid] = profileId;
    };
    bind(providerId);
    if (String(api).trim() === "anthropic-messages") bind("anthropic");
    const newContent = JSON.stringify(auth, null, 2);
    const oldContent = fs2.existsSync(AUTH_PROFILES_FILE) ? fs2.readFileSync(AUTH_PROFILES_FILE, "utf8") : "";
    if (newContent !== oldContent) {
      fs2.writeFileSync(AUTH_PROFILES_FILE, newContent, "utf8");
    }
  } catch (e) {
    console.error("[auth-profile-sync] failed:", e.message);
  }
}
function ensureAuthProfilesFromEmbeddedConfig() {
  try {
    const cfg = loadEmbeddedConfig();
    const providers = cfg?.models?.providers || {};
    for (const [providerId, p] of Object.entries(providers)) {
      const key = String(p?.apiKey || "").trim();
      if (!key) continue;
      syncAuthProfileForProvider(providerId, key, p?.api || "");
      break;
    }
  } catch (e) {
    console.error("[auth-profile-sync-bootstrap] failed:", e.message);
  }
}
function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
async function refreshJwtIfNeeded(relayBaseUrl) {
  const state = loadAppState();
  const base = relayBaseUrl || state.relay?.baseUrl || RELAY_BASE_URL;
  const jwt = state.relay?.accessToken || "";
  if (!jwt) return "";
  const payload = decodeJwtPayload(jwt);
  if (!payload?.exp) return jwt;
  const nowSec = Math.floor(Date.now() / 1e3);
  const FIVE_MIN = 5 * 60;
  if (payload.exp > nowSec + FIVE_MIN) return jwt;
  const refreshToken = state.relay?.refreshToken || "";
  if (!refreshToken) {
    console.log("[auth] JWT expired and no refreshToken available");
    return "";
  }
  try {
    const url = base.replace(/\/+$/, "") + "/v1/auth/refresh";
    const res = await import_axios2.default.post(url, { refreshToken }, { timeout: 15e3 });
    const tokens = res.data?.tokens;
    if (!tokens?.accessToken) throw new Error("No accessToken in refresh response");
    state.relay.accessToken = tokens.accessToken;
    state.relay.refreshToken = tokens.refreshToken || refreshToken;
    saveAppState(state);
    console.log("[auth] JWT refreshed successfully");
    return tokens.accessToken;
  } catch (e) {
    const status = e?.response?.status;
    const detail = e?.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.error(`[auth] JWT refresh failed: ${status || ""} ${detail}`);
    return "";
  }
}
async function ensureGatewayProviderOrRelay() {
  try {
    const userProvider = getUserProviderConfig();
    if (userProvider) return;
    const state = loadAppState();
    const rawRelayUrl = state.relay?.baseUrl || RELAY_BASE_URL;
    const relayUrl = rawRelayUrl.replace(/\/+$/, "") + "/v1";
    const deviceToken = state.deviceToken || "";
    const deviceId = state.deviceId || "";
    const jwt = await refreshJwtIfNeeded(rawRelayUrl);
    if (!relayUrl || !jwt && !deviceToken && !deviceId) return;
    const relayApiKey = jwt || deviceToken || `device:${deviceId}`;
    const authType = jwt ? "jwt" : deviceToken ? "deviceToken" : "deviceId";
    console.log(`[auth] Using ${authType} for relay auth (key length: ${relayApiKey.length})`);
    const RELAY_PROVIDER = "relay";
    syncAuthProfileForProvider(RELAY_PROVIDER, relayApiKey);
    const headers = {};
    if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
    if (deviceId) headers["X-Device-Id"] = deviceId;
    const existingCfg = fs2.existsSync(CONFIG_FILE) ? JSON.parse(fs2.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
    const cachedModels = existingCfg?.models?.providers?.relay?.models;
    let relayModels = [];
    if (cachedModels?.length) {
      console.log("[auth] Using cached relay models, refreshing in background");
      relayModels = cachedModels.map((m) => ({ id: m.id, name: m.name || m.id, available: true }));
      import_axios2.default.get(`${relayUrl}/models`, { headers, timeout: 1e4 }).then((res) => {
        const fresh = res.data?.data || [];
        if (fresh.length) {
          console.log("[auth] Background relay models refresh complete:", fresh.length, "models");
        }
      }).catch(() => {
      });
    } else {
      try {
        const res = await import_axios2.default.get(`${relayUrl}/models`, { headers, timeout: 1e4 });
        relayModels = res.data?.data || [];
      } catch (e) {
        console.log("[auth] Failed to fetch relay models, using fallback:", e.message);
      }
    }
    const gatewayModels = relayModels.length ? relayModels.map((m) => ({ id: m.id, name: m.name || m.id, contextWindow: 18e4, maxTokens: 8192 })) : [{ id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 18e4, maxTokens: 8192 }];
    const firstAvailable = relayModels.find((m) => m.available !== false);
    const defaultModel = firstAvailable?.id || gatewayModels[0].id;
    const ocCfg = fs2.existsSync(CONFIG_FILE) ? JSON.parse(fs2.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
    ocCfg.models = ocCfg.models || {};
    ocCfg.models.mode = ocCfg.models.mode || "merge";
    ocCfg.models.providers = ocCfg.models.providers || {};
    const oldAnthropic = ocCfg.models.providers["anthropic"];
    if (oldAnthropic?.baseUrl?.includes("myopenclaw-relay-service")) {
      delete ocCfg.models.providers["anthropic"];
    }
    ocCfg.models.providers[RELAY_PROVIDER] = {
      ...ocCfg.models.providers[RELAY_PROVIDER] || {},
      baseUrl: relayUrl,
      api: "openai-completions",
      models: gatewayModels
    };
    ocCfg.agents = ocCfg.agents || {};
    ocCfg.agents.defaults = ocCfg.agents.defaults || {};
    ocCfg.agents.defaults.model = {
      ...ocCfg.agents.defaults.model || {},
      primary: `${RELAY_PROVIDER}/${defaultModel}`
    };
    const workspaceDir = path3.join(OPENCLAW_CONFIG_DIR, "workspace");
    fs2.mkdirSync(path3.join(workspaceDir, ".openclaw"), { recursive: true });
    ocCfg.agents.defaults.workspace = workspaceDir;
    ocCfg.gateway = ocCfg.gateway || {};
    ocCfg.gateway.http = ocCfg.gateway.http || {};
    ocCfg.gateway.http.endpoints = ocCfg.gateway.http.endpoints || {};
    ocCfg.gateway.http.endpoints.chatCompletions = { enabled: true };
    if (ocCfg.tools?.profile) {
      delete ocCfg.tools.profile;
    }
    const newContent = JSON.stringify(ocCfg, null, 2);
    const oldContent = fs2.existsSync(CONFIG_FILE) ? fs2.readFileSync(CONFIG_FILE, "utf8") : "";
    if (newContent !== oldContent) {
      fs2.writeFileSync(CONFIG_FILE, newContent, "utf8");
      console.log("[auth] Configured relay provider fallback:", relayUrl);
    }
  } catch (e) {
    console.error("[auth] ensureGatewayProviderOrRelay failed:", e.message);
  }
}

// src/deep-link.ts
function handleDeepLink(url, getMainWindow2) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${PROTOCOL}:`) return;
    if (parsed.hostname === "auth" || parsed.pathname === "//auth" || parsed.pathname === "/auth") {
      const accessToken = parsed.searchParams.get("accessToken");
      const refreshToken = parsed.searchParams.get("refreshToken");
      const email = parsed.searchParams.get("email");
      if (accessToken) {
        const state = loadAppState();
        state.relay.baseUrl = RELAY_BASE_URL;
        state.relay.accessToken = accessToken;
        state.relay.refreshToken = refreshToken || "";
        state.relay.userEmail = email || "";
        saveAppState(state);
        console.log("[DeepLink] Auth tokens saved from web login");
        ensureGatewayProviderOrRelay().catch((err) => {
          console.log("[DeepLink] Gateway auth refresh failed (non-fatal):", err.message);
        });
        const deviceId = state.deviceId;
        if (deviceId) {
          import_axios3.default.post(`${RELAY_BASE_URL}/v1/devices/${encodeURIComponent(deviceId)}/link`, {}, {
            headers: { "Authorization": `Bearer ${accessToken}` },
            timeout: 2e4
          }).then(() => {
            console.log("[DeepLink] Device linked to user account");
          }).catch((err) => {
            console.log("[DeepLink] Device link failed (non-fatal):", err.message);
          });
        }
        const mainWindow2 = getMainWindow2();
        if (mainWindow2 && !mainWindow2.isDestroyed()) {
          mainWindow2.webContents.executeJavaScript(`
            (async () => {
              if (typeof refreshState === 'function') await refreshState();
              if (typeof loadRelayConfig === 'function') loadRelayConfig();
              if (typeof loadDeviceInfo === 'function') loadDeviceInfo();
              if (typeof refreshQuota === 'function') refreshQuota();
              if (typeof fetchModels === 'function') fetchModels();
            })();
          `).catch(() => {
          });
          mainWindow2.show();
          mainWindow2.focus();
        }
      }
    }
  } catch (err) {
    console.error("[DeepLink] Failed to handle URL:", err.message);
  }
}

// src/window.ts
var path12 = __toESM(require("path"));
var fs12 = __toESM(require("fs"));
var import_electron13 = require("electron");

// src/runtime.ts
var path4 = __toESM(require("path"));
var fs3 = __toESM(require("fs"));
var os2 = __toESM(require("os"));
var import_axios4 = __toESM(require("axios"));
var import_child_process = require("child_process");
function execFileAsync(cmd, args, opts = {}) {
  return new Promise((resolve5, reject) => {
    (0, import_child_process.execFile)(cmd, args, { encoding: "utf8", ...opts }, (err, stdout) => {
      if (err) return reject(err);
      resolve5(String(stdout || ""));
    });
  });
}
var _cachedCli;
var _verifiedBins = /* @__PURE__ */ new Map();
function clearCliCache() {
  _cachedCli = void 0;
  _verifiedBins.clear();
}
function getRuntimeTargetLabel() {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return process.arch === "arm64" ? "mac_silicon" : "mac_intel";
  return "linux";
}
async function downloadFile(url, outputPath, onProgress) {
  const writer = fs3.createWriteStream(outputPath);
  const response = await (0, import_axios4.default)({ method: "get", url, responseType: "stream", timeout: 0, maxRedirects: 10 });
  const total = Number(response.headers["content-length"] || 0);
  let loaded = 0;
  response.data.on("data", (chunk) => {
    loaded += chunk.length;
    if (total > 0 && typeof onProgress === "function") {
      onProgress(Math.max(0, Math.min(100, Math.round(loaded / total * 100))));
    }
  });
  response.data.pipe(writer);
  return new Promise((resolve5, reject) => {
    writer.on("finish", resolve5);
    writer.on("error", reject);
  });
}
async function downloadWithFallback(urls, outputPath, onProgress) {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const label = i === 0 ? "CDN" : `mirror ${i}`;
    try {
      console.log(`[runtime] Trying ${label}: ${url}`);
      await downloadFile(url, outputPath, onProgress);
      console.log(`[runtime] Download succeeded from ${label}`);
      return;
    } catch (err) {
      console.error(`[runtime] Download failed from ${label}: ${err.message}`);
      try {
        fs3.unlinkSync(outputPath);
      } catch {
      }
      if (i === urls.length - 1) {
        throw new Error(`All download sources failed. Last error: ${err.message}`);
      }
      console.log(`[runtime] Falling back to next source...`);
    }
  }
}
function findRuntimeDir() {
  const embeddedBase = path4.join(__dirname, "resources");
  if (!embeddedBase.includes(".asar")) {
    const embeddedDir = path4.join(embeddedBase, "openclaw-deps", "openclaw", "dist");
    if (fs3.existsSync(path4.join(embeddedDir, "entry.js")) || fs3.existsSync(path4.join(embeddedDir, "entry.mjs"))) {
      return embeddedBase;
    }
  }
  const dlDir = path4.join(DOWNLOADED_RUNTIME_DIR, "openclaw-deps", "openclaw", "dist");
  if (fs3.existsSync(path4.join(dlDir, "entry.js")) || fs3.existsSync(path4.join(dlDir, "entry.mjs"))) {
    return DOWNLOADED_RUNTIME_DIR;
  }
  return null;
}
async function ensureEmbeddedRuntime(updateLoadingStatus2) {
  if (findRuntimeDir()) {
    console.log("[runtime] Runtime found");
    updateLoadingStatus2("Runtime ready", 72);
    return;
  }
  const manifestPath = path4.join(__dirname, "resources", "runtime-manifest.json");
  if (!fs3.existsSync(manifestPath)) {
    throw new Error("Missing runtime-manifest.json. Cannot download runtime automatically.");
  }
  const manifest = JSON.parse(fs3.readFileSync(manifestPath, "utf8"));
  const target = getRuntimeTargetLabel();
  const urls = manifest?.[target]?.urls || (manifest?.[target]?.url ? [manifest[target].url] : []);
  if (!urls.length) {
    throw new Error(`No runtime download URL configured for platform "${target}". Please download the runtime manually or use the full installer.`);
  }
  const zipPath = path4.join(os2.tmpdir(), `myopenclaw-runtime-${target}.zip`);
  console.log(`[runtime] Downloading runtime for ${target}...`);
  updateLoadingStatus2("Downloading openclaw ...", 52);
  await downloadWithFallback(urls, zipPath, (p) => {
    updateLoadingStatus2(`Downloading openclaw ... ${p}%`, 52 + Math.round(p * 0.28));
  });
  console.log("[runtime] Extracting runtime...");
  updateLoadingStatus2("Extracting openclaw runtime...", 84);
  fs3.mkdirSync(DOWNLOADED_RUNTIME_DIR, { recursive: true });
  if (process.platform === "win32") {
    await execFileAsync("tar", ["-xf", zipPath, "-C", DOWNLOADED_RUNTIME_DIR], { stdio: "pipe", windowsHide: true });
  } else {
    await execFileAsync("unzip", ["-o", zipPath, "-d", DOWNLOADED_RUNTIME_DIR], { stdio: "pipe" });
    const binDir = path4.join(DOWNLOADED_RUNTIME_DIR, "openclaw-deps", ".bin");
    const nodeDir = path4.join(DOWNLOADED_RUNTIME_DIR, "node");
    for (const dir of [binDir, nodeDir]) {
      if (fs3.existsSync(dir)) {
        await execFileAsync("chmod", ["-R", "+x", dir], { stdio: "pipe" });
        try {
          await execFileAsync("xattr", ["-rd", "com.apple.quarantine", dir], { stdio: "pipe" });
        } catch {
        }
        try {
          await execFileAsync("xattr", ["-rd", "com.apple.provenance", dir], { stdio: "pipe" });
        } catch {
        }
        console.log(`[runtime] Fixed permissions: ${dir}`);
      }
    }
  }
  if (!findRuntimeDir()) {
    throw new Error("Runtime extracted but dist/entry.(m)js not found. The runtime package may be incomplete.");
  }
  if (process.platform === "win32") {
    addWindowsFirewallRule(path4.join(DOWNLOADED_RUNTIME_DIR, "node", "node.exe"));
  }
  console.log("[runtime] Runtime ready");
  updateLoadingStatus2("Runtime installed", 88);
}
function addWindowsFirewallRule(nodeExePath) {
  if (!fs3.existsSync(nodeExePath)) return;
  try {
    (0, import_child_process.execFileSync)("netsh", [
      "advfirewall",
      "firewall",
      "add",
      "rule",
      "name=MyOpenClaw Runtime Node",
      "dir=in",
      "action=allow",
      `program=${nodeExePath}`,
      "enable=yes",
      "profile=any"
    ], { stdio: "pipe", timeout: 5e3, windowsHide: true });
    console.log("[firewall] Added firewall rule for node.exe");
  } catch {
    console.log("[firewall] Could not add firewall rule (needs admin privileges)");
  }
}
function buildNodeEnhancedPath() {
  const nodeExe = process.platform === "win32" ? "node.exe" : "node";
  const nodeDirs = [
    path4.join(__dirname, "resources", "node"),
    path4.join(DOWNLOADED_RUNTIME_DIR, "node")
  ];
  const extra = nodeDirs.filter((d) => fs3.existsSync(path4.join(d, nodeExe)));
  return extra.length > 0 ? `${extra.join(path4.delimiter)}${path4.delimiter}${process.env.PATH}` : process.env.PATH;
}
function verifyOpenClawCli(binPath) {
  try {
    const stat = fs3.statSync(binPath);
    const prevMtime = _verifiedBins.get(binPath);
    if (prevMtime !== void 0 && stat.mtimeMs === prevMtime) {
      return true;
    }
    const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(binPath);
    (0, import_child_process.execFileSync)(binPath, ["--version"], {
      encoding: "utf8",
      timeout: 1e4,
      stdio: "pipe",
      env: {
        ...process.env,
        PATH: buildNodeEnhancedPath(),
        OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
        OPENCLAW_CONFIG_PATH: CONFIG_FILE
      },
      shell: useShell,
      windowsHide: true
    });
    _verifiedBins.set(binPath, stat.mtimeMs);
    return true;
  } catch (e) {
    console.log(`[cli] Verification failed for ${binPath}:`, e.message);
    return false;
  }
}
function findOpenClawCli() {
  if (_cachedCli !== void 0) return _cachedCli;
  const binNames = process.platform === "win32" ? ["openclaw.cmd", "openclaw.exe", "openclaw"] : ["openclaw"];
  const ownCandidates = [];
  for (const bin of binNames) {
    const embeddedBin = path4.join(__dirname, "resources", "openclaw-deps", ".bin", bin);
    if (!embeddedBin.includes(".asar")) {
      ownCandidates.push(embeddedBin);
    }
    ownCandidates.push(path4.join(DOWNLOADED_RUNTIME_DIR, "openclaw-deps", ".bin", bin));
  }
  const seen = /* @__PURE__ */ new Set();
  for (const p of ownCandidates) {
    const resolved = path4.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (!fs3.existsSync(p)) continue;
    console.log(`[cli] Found own runtime: ${p}, verifying...`);
    if (verifyOpenClawCli(p)) {
      console.log(`[cli] Verified own openclaw CLI: ${p}`);
      _cachedCli = p;
      return p;
    }
  }
  const systemCandidates = [];
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = (0, import_child_process.execFileSync)(cmd, ["openclaw"], { encoding: "utf8", timeout: 3e3, windowsHide: true }).trim();
    if (result) systemCandidates.push(result.split(/\r?\n/)[0]);
  } catch {
  }
  const home = os2.homedir();
  systemCandidates.push(
    path4.join(home, ".local", "bin", "openclaw"),
    "/usr/local/bin/openclaw"
  );
  const nvmDir = path4.join(home, ".nvm", "versions", "node");
  try {
    if (fs3.existsSync(nvmDir)) {
      const versions = fs3.readdirSync(nvmDir).filter((v) => v.startsWith("v")).sort((a, b) => b.localeCompare(a, void 0, { numeric: true }));
      for (const ver of versions) {
        systemCandidates.push(path4.join(nvmDir, ver, "bin", "openclaw"));
      }
    }
  } catch {
  }
  for (const p of systemCandidates) {
    const resolved = path4.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (!fs3.existsSync(p)) continue;
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
function findNodeBinary() {
  const nodeExe = process.platform === "win32" ? "node.exe" : "node";
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const nodePath = (0, import_child_process.execFileSync)(cmd, [nodeExe], { encoding: "utf8", timeout: 3e3, windowsHide: true }).trim().split(/\r?\n/)[0];
    if (nodePath) {
      const ver = (0, import_child_process.execFileSync)(nodePath, ["--version"], { encoding: "utf8", timeout: 3e3, windowsHide: true }).trim();
      const major = parseInt(ver.replace("v", "").split(".")[0], 10);
      if (major >= MIN_NODE_MAJOR_VERSION) {
        console.log(`[node] Using system node: ${nodePath} (${ver})`);
        return nodePath;
      }
      console.log(`[node] System node too old: ${ver} (need >= ${MIN_NODE_MAJOR_VERSION})`);
    }
  } catch {
  }
  const candidates = [
    path4.join(__dirname, "resources", "node", nodeExe),
    path4.join(DOWNLOADED_RUNTIME_DIR, "node", nodeExe)
  ];
  for (const p of candidates) {
    if (fs3.existsSync(p)) {
      console.log(`[node] Using bundled node: ${p}`);
      return p;
    }
  }
  throw new Error(`No suitable Node.js found (>= ${MIN_NODE_MAJOR_VERSION}). Please install Node.js or use the full version of MyOpenClaw.`);
}
function ensureOpenClawInPath(openclawBin) {
  if (!openclawBin) return;
  try {
    const binDir = path4.dirname(fs3.realpathSync(openclawBin));
    if (!process.env.PATH.includes(binDir)) {
      const sep = process.platform === "win32" ? ";" : ":";
      process.env.PATH = `${binDir}${sep}${process.env.PATH}`;
      console.log(`[path] Added to process PATH: ${binDir}`);
    }
  } catch (e) {
    console.error("[path] ensureOpenClawInPath failed:", e.message);
  }
}
function runOpenClawOnboard(cmd, prependArgs = [], cwd) {
  return new Promise((resolve5, _reject) => {
    const args = [
      ...prependArgs,
      "onboard",
      "--non-interactive",
      "--accept-risk",
      "--skip-channels",
      "--skip-daemon",
      "--skip-health",
      "--skip-skills",
      "--skip-ui",
      "--auth-choice",
      "skip",
      "--gateway-port",
      String(DEFAULT_PORT)
    ];
    const env = {
      ...process.env,
      PATH: buildNodeEnhancedPath(),
      OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
      OPENCLAW_CONFIG_PATH: CONFIG_FILE
    };
    const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(cmd);
    console.log(`[onboard] Running: ${cmd} ${args.join(" ")}`);
    const proc = (0, import_child_process.spawn)(cmd, args, { stdio: "pipe", env, shell: useShell, windowsHide: true, ...cwd ? { cwd } : {} });
    let output = "";
    proc.stdout.on("data", (d) => {
      output += d;
      console.log(`[onboard] ${d}`);
    });
    proc.stderr.on("data", (d) => {
      output += d;
      console.error(`[onboard] ${d}`);
    });
    proc.on("close", (code) => {
      if (code === 0) {
        console.log("[onboard] Setup complete");
        resolve5(output);
      } else {
        console.error(`[onboard] Exited with code ${code}`);
        resolve5(output);
      }
    });
    proc.on("error", (err) => {
      console.error("[onboard] Error:", err.message);
      resolve5("");
    });
  });
}

// src/gateway.ts
var path5 = __toESM(require("path"));
var fs4 = __toESM(require("fs"));
var os3 = __toESM(require("os"));
var crypto3 = __toESM(require("crypto"));
var import_child_process2 = require("child_process");
var import_axios6 = __toESM(require("axios"));

// src/network.ts
var net = __toESM(require("net"));
var import_axios5 = __toESM(require("axios"));
async function findAvailablePort(startPort = DEFAULT_PORT) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error("No available port found");
}
function isPortAvailable(port) {
  return new Promise((resolve5) => {
    const server = net.createServer();
    server.once("error", () => resolve5(false));
    server.once("listening", () => {
      server.close();
      resolve5(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

// src/perf-monitor.ts
var SAMPLE_INTERVAL = 1e4;
var WARN_CPU_PCT = 80;
var WARN_MEM_MB = 512;
var _timer = null;
var _prevCpu = process.cpuUsage();
var _prevTime = Date.now();
var _gatewayProc = null;
function sample() {
  const now = Date.now();
  const elapsed = (now - _prevTime) * 1e3;
  if (elapsed <= 0) return;
  const cpu = process.cpuUsage(_prevCpu);
  _prevCpu = process.cpuUsage();
  _prevTime = now;
  const cpuPct = (cpu.user + cpu.system) / elapsed * 100;
  const mem = process.memoryUsage();
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  let gwInfo = "";
  if (_gatewayProc?.pid && !_gatewayProc.killed) {
    gwInfo = ` | gateway PID=${_gatewayProc.pid}`;
  }
  const line = `[perf] cpu=${cpuPct.toFixed(1)}% rss=${rssMB}MB heap=${heapMB}/${heapTotalMB}MB${gwInfo}`;
  if (cpuPct > WARN_CPU_PCT || rssMB > WARN_MEM_MB) {
    console.warn(line);
    if (cpuPct > WARN_CPU_PCT) {
      console.warn(`[perf] HIGH CPU: ${cpuPct.toFixed(1)}% (threshold: ${WARN_CPU_PCT}%)`);
    }
    if (rssMB > WARN_MEM_MB) {
      console.warn(`[perf] HIGH MEMORY: ${rssMB}MB RSS (threshold: ${WARN_MEM_MB}MB)`);
    }
  } else {
    console.log(line);
  }
}
function startPerfMonitor(gatewayProcess) {
  if (_timer) return;
  if (gatewayProcess) _gatewayProc = gatewayProcess;
  _prevCpu = process.cpuUsage();
  _prevTime = Date.now();
  _timer = setInterval(sample, SAMPLE_INTERVAL);
  if (_timer.unref) _timer.unref();
  console.log(`[perf] Monitor started (interval=${SAMPLE_INTERVAL / 1e3}s, cpu_warn=${WARN_CPU_PCT}%, mem_warn=${WARN_MEM_MB}MB)`);
}
function updateGatewayProcess(proc) {
  _gatewayProc = proc;
}

// src/gateway.ts
async function startGateway(updateLoadingStatus2) {
  try {
    if (process.platform === "win32") {
      await new Promise((resolve5) => {
        (0, import_child_process2.execFile)("powershell.exe", [
          "-NoProfile",
          "-Command",
          `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*myopenclaw*' -and $_.CommandLine -like '*gateway*' } | ForEach-Object { Write-Host "Killing PID $($_.ProcessId): $($_.CommandLine.Substring(0, [Math]::Min(80, $_.CommandLine.Length)))"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
        ], { encoding: "utf8", timeout: 15e3, windowsHide: true }, (err, stdout) => {
          const killed = (stdout || "").trim();
          if (killed) console.log("[startGateway] Killed leftover processes:", killed);
          resolve5();
        });
      });
    } else {
      (0, import_child_process2.execSync)("ps -eo pid,command | grep 'myopenclaw' | grep 'gateway' | grep -v grep | awk '{print $1}' | xargs kill -9 2>/dev/null", { timeout: 5e3, stdio: "pipe" });
    }
  } catch (e) {
    console.log("[startGateway] Process cleanup:", e.message?.slice(0, 100));
  }
  if (process.platform === "win32") {
    const lf = resolveGatewayLockFile();
    for (let waited = 0; waited < 3e3; waited += 300) {
      try {
        if (!fs4.existsSync(lf) || fs4.readFileSync(lf, "utf8")) break;
      } catch {
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  await stopExistingGateway();
  const gatewayPort = await findAvailablePort(DEFAULT_PORT);
  const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;
  console.log(`[startGateway] Starting gateway on port ${gatewayPort}...`);
  updateLoadingStatus2("Establishing secure connections...", 48);
  ensureAuthProfilesFromEmbeddedConfig();
  await ensureGatewayProviderOrRelay();
  const gatewayToken = ensureRandomGatewayToken();
  try {
    const ocCfg = fs4.existsSync(CONFIG_FILE) ? JSON.parse(fs4.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
    ocCfg.gateway = ocCfg.gateway || {};
    ocCfg.gateway.auth = ocCfg.gateway.auth || {};
    ocCfg.gateway.auth.token = gatewayToken;
    ocCfg.gateway.auth.mode = "token";
    const embeddedCfg = loadEmbeddedConfig();
    if (embeddedCfg.channels && Object.keys(embeddedCfg.channels).length > 0) {
      ocCfg.channels = { ...ocCfg.channels || {}, ...embeddedCfg.channels };
      console.log("[startGateway] Synced channels to openclaw.json:", Object.keys(embeddedCfg.channels).join(", "));
    }
    fs4.writeFileSync(CONFIG_FILE, JSON.stringify(ocCfg, null, 2), "utf8");
    console.log("[startGateway] Synced gateway token to openclaw.json");
  } catch (e) {
    console.error("[startGateway] Failed to sync token to openclaw.json:", e.message);
  }
  updateLoadingStatus2("Launching openclaw gateway...", 90);
  forceCleanGatewayLock();
  const gatewayEnv = {
    ...process.env,
    PATH: buildNodeEnhancedPath(),
    OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
    OPENCLAW_CONFIG_PATH: CONFIG_FILE,
    OPENCLAW_GATEWAY_PORT: String(gatewayPort),
    OPENCLAW_SERVICE_MARKER: "myopenclaw",
    OPENCLAW_SERVICE_KIND: "gateway"
  };
  let gatewayProcess;
  const openclawBin = findOpenClawCli();
  if (openclawBin) {
    console.log(`[startGateway] Using openclaw CLI: ${openclawBin}`);
    const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(openclawBin);
    gatewayProcess = (0, import_child_process2.spawn)(openclawBin, ["gateway", "run", "--port", String(gatewayPort), "--allow-unconfigured"], {
      stdio: "pipe",
      env: gatewayEnv,
      shell: useShell,
      windowsHide: true
    });
  } else {
    const runtimeDir = findRuntimeDir() || path5.join(__dirname, "resources");
    const entryMjs = path5.join(runtimeDir, "openclaw-deps", "openclaw", "openclaw.mjs");
    const entryJs = path5.join(runtimeDir, "openclaw-deps", "openclaw", "dist", "entry.js");
    const entryFile = fs4.existsSync(entryMjs) ? entryMjs : entryJs;
    const nodeBin = findNodeBinary();
    console.log(`[startGateway] Fallback: ${nodeBin} ${entryFile} gateway run --port ${gatewayPort}`);
    gatewayProcess = (0, import_child_process2.spawn)(nodeBin, [entryFile, "gateway", "run", "--port", String(gatewayPort), "--allow-unconfigured"], {
      stdio: "pipe",
      cwd: runtimeDir,
      env: gatewayEnv,
      ...process.platform === "win32" ? { windowsHide: true } : {}
    });
  }
  let gatewayExited = false;
  let gatewayExitCode = null;
  gatewayProcess.stdout.on("data", (data) => console.log(`[Gateway stdout] ${data}`));
  gatewayProcess.stderr.on("data", (data) => console.error(`[Gateway stderr] ${data}`));
  gatewayProcess.on("exit", (code, signal) => {
    gatewayExited = true;
    gatewayExitCode = code;
    console.log(`[Gateway] Process exited with code ${code}, signal ${signal}`);
    if (code !== 0) console.error("[Gateway] Unexpected exit!");
  });
  gatewayProcess.on("error", (err) => console.error("[Gateway] Process error:", err));
  updateGatewayProcess(gatewayProcess);
  console.log("[startGateway] Waiting for gateway to start...");
  updateLoadingStatus2("Checking gateway health...", 94);
  await new Promise((resolve5) => setTimeout(resolve5, 500));
  if (gatewayExited) {
    throw new Error(`Gateway process exited immediately with code ${gatewayExitCode}. Check logs above for details.`);
  }
  await waitForGateway(gatewayBaseUrl, 60, () => gatewayExited);
  updateLoadingStatus2("Startup complete. Opening workspace...", 100);
  console.log(`[startGateway] Gateway started successfully on ${gatewayBaseUrl}`);
  tryDoctorFix().catch(() => {
  });
  return {
    port: gatewayPort,
    baseUrl: gatewayBaseUrl,
    process: gatewayProcess,
    token: readGatewayTokenFromConfig()
  };
}
async function waitForGateway(gatewayBaseUrl, maxRetries = 90, hasProcessExited) {
  console.log(`[waitForGateway] Checking ${gatewayBaseUrl}/health...`);
  for (let i = 0; i < maxRetries; i++) {
    if (hasProcessExited?.()) {
      console.error("[waitForGateway] Gateway process exited, aborting health checks");
      throw new Error("Gateway process exited unexpectedly. Check logs above for details.");
    }
    try {
      console.log(`[waitForGateway] Attempt ${i + 1}/${maxRetries}...`);
      const response = await import_axios6.default.get(`${gatewayBaseUrl}/health`, { timeout: 2e3 });
      console.log(`[waitForGateway] Success! Response:`, response.data);
      return true;
    } catch (error) {
      console.log(`[waitForGateway] Attempt ${i + 1} failed:`, error.message);
      await new Promise((resolve5) => setTimeout(resolve5, 300));
    }
  }
  console.error("[waitForGateway] Max retries reached, gateway failed to start");
  throw new Error("Gateway failed to start after max retries. Please check your configuration and try again.");
}
async function stopExistingGateway() {
  const lockFile = resolveGatewayLockFile();
  if (!fs4.existsSync(lockFile)) {
    console.log("[startGateway] No gateway lock file, skipping stop");
    return;
  }
  const cli = findOpenClawCli();
  if (!cli) return;
  try {
    const env = {
      ...process.env,
      PATH: buildNodeEnhancedPath(),
      OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
      OPENCLAW_CONFIG_PATH: CONFIG_FILE
    };
    const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(cli);
    await new Promise((resolve5) => {
      (0, import_child_process2.execFile)(cli, ["gateway", "stop"], {
        encoding: "utf8",
        timeout: 1e4,
        stdio: "pipe",
        env,
        shell: useShell,
        ...process.platform === "win32" ? { windowsHide: true } : {}
      }, (err) => {
        if (!err) console.log("[startGateway] Stopped existing gateway via CLI");
        resolve5();
      });
    });
  } catch {
  }
}
function resolveGatewayLockFile() {
  const hash = crypto3.createHash("sha256").update(path5.resolve(CONFIG_FILE)).digest("hex").slice(0, 8);
  const uid = process.getuid?.();
  const lockDir = path5.join(os3.tmpdir(), uid != null ? `openclaw-${uid}` : "openclaw");
  return path5.join(lockDir, `gateway.${hash}.lock`);
}
function forceCleanGatewayLock() {
  try {
    const lockFile = resolveGatewayLockFile();
    if (!fs4.existsSync(lockFile)) return;
    try {
      const lock = JSON.parse(fs4.readFileSync(lockFile, "utf8"));
      const pid = lock?.pid;
      if (pid && typeof pid === "number") {
        console.log(`[startGateway] Lock held by PID ${pid}, force-killing...`);
        try {
          if (process.platform === "win32") {
            (0, import_child_process2.execSync)(`taskkill /F /PID ${pid}`, { timeout: 5e3, stdio: "pipe", windowsHide: true });
          } else {
            process.kill(pid, "SIGKILL");
          }
          console.log(`[startGateway] Killed PID ${pid}`);
        } catch {
          console.log(`[startGateway] PID ${pid} already dead or inaccessible`);
        }
      }
    } catch {
    }
    fs4.unlinkSync(lockFile);
    console.log(`[startGateway] Removed lock file: ${lockFile}`);
  } catch (e) {
    console.log("[startGateway] Lock cleanup failed:", e.message);
  }
}
async function tryDoctorFix() {
  const runDoctor = (cmd, args, opts) => {
    return new Promise((resolve5) => {
      (0, import_child_process2.execFile)(cmd, args, { encoding: "utf8", timeout: 15e3, stdio: "pipe", ...opts }, (err, stdout) => {
        const output = String(stdout || "");
        if (!err && (output.includes("fix") || output.includes("removed") || output.includes("Unrecognized"))) {
          console.log("[doctor] Auto-fixed config:", output.trim());
        }
        resolve5();
      });
    });
  };
  const cli = findOpenClawCli();
  if (cli) {
    const env2 = { ...process.env, PATH: buildNodeEnhancedPath(), OPENCLAW_CONFIG_PATH: CONFIG_FILE };
    const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(cli);
    await runDoctor(cli, ["doctor", "--fix"], {
      env: env2,
      shell: useShell,
      ...process.platform === "win32" ? { windowsHide: true } : {}
    });
    return;
  }
  const runtimeDir = findRuntimeDir();
  if (!runtimeDir) return;
  const entryMjs = path5.join(runtimeDir, "openclaw-deps", "openclaw", "openclaw.mjs");
  const entryJs = path5.join(runtimeDir, "openclaw-deps", "openclaw", "dist", "entry.js");
  const entryFile = fs4.existsSync(entryMjs) ? entryMjs : entryJs;
  const nodeBin = findNodeBinary();
  const env = { ...process.env, PATH: buildNodeEnhancedPath(), OPENCLAW_CONFIG_PATH: CONFIG_FILE };
  await runDoctor(nodeBin, [entryFile, "doctor", "--fix"], { env, cwd: runtimeDir, windowsHide: true });
}

// src/ipc/gateway-ipc.ts
var import_electron = require("electron");
function registerGatewayHandlers(getGatewayHandle) {
  import_electron.ipcMain.handle("get-gateway-info", async () => {
    const gw = getGatewayHandle();
    return {
      port: gw?.port ?? null,
      baseUrl: gw?.baseUrl ?? null,
      token: readGatewayTokenFromConfig()
    };
  });
  import_electron.ipcMain.handle("open-gateway-dashboard", async () => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl && !gw?.port) {
        return { success: false, error: "Gateway is not running. Please configure a local gateway first." };
      }
      const url = buildDashboardUrl(
        gw?.baseUrl || `http://127.0.0.1:${gw?.port || DEFAULT_PORT}`,
        gw?.baseUrl
      );
      await import_electron.shell.openExternal(url);
      return { success: true, url };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron.ipcMain.handle("open-external", async (_event, url) => {
    try {
      await import_electron.shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron.ipcMain.handle("get-startup-error", async () => {
    return { error: global.__MYOPENCLAW_STARTUP_ERROR__ || "" };
  });
}

// src/ipc/chat-ipc.ts
var import_electron2 = require("electron");
var import_fs = require("fs");

// src/messaging.ts
var import_axios7 = __toESM(require("axios"));
async function checkRelayHealth(baseUrl, token) {
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await import_axios7.default.get(`${baseUrl}/health`, {
    headers,
    timeout: 2e4
  });
  return response.data;
}
async function sendViaRelay(relayBaseUrl, relayAuthToken, messages, deviceId, model) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (relayAuthToken) {
    headers["Authorization"] = `Bearer ${relayAuthToken}`;
  }
  if (deviceId) {
    headers["X-Device-Id"] = deviceId;
  }
  const response = await import_axios7.default.post(`${relayBaseUrl}/v1/chat/completions`, {
    model: model || "openclaw:main",
    messages
  }, {
    headers,
    timeout: 6e4
  });
  return response?.data?.choices?.[0]?.message?.content || "No response from relay.";
}

// src/ws-manager.ts
var import_ws = require("ws");
var import_crypto = require("crypto");

// src/device-identity.ts
var crypto4 = __toESM(require("crypto"));
var fs5 = __toESM(require("fs"));
var path6 = __toESM(require("path"));
var IDENTITY_DIR = path6.join(OPENCLAW_CONFIG_DIR, "identity");
var KEYPAIR_FILE = path6.join(IDENTITY_DIR, "device.json");
var DEVICE_AUTH_FILE = path6.join(IDENTITY_DIR, "device-auth.json");
function ensureIdentityDir() {
  fs5.mkdirSync(IDENTITY_DIR, { recursive: true });
}
function loadKeypair() {
  try {
    if (fs5.existsSync(KEYPAIR_FILE)) {
      const data = JSON.parse(fs5.readFileSync(KEYPAIR_FILE, "utf8"));
      if (data.publicKey && data.privateKey) return data;
    }
  } catch (e) {
    console.warn("[device-identity] Failed to load keypair:", e.message);
  }
  return null;
}
function ensureKeypair() {
  const existing = loadKeypair();
  if (existing) return existing;
  ensureIdentityDir();
  const { publicKey, privateKey } = crypto4.generateKeyPairSync("ed25519");
  const stored = {
    publicKey: publicKey.export({ type: "spki", format: "pem" }),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" })
  };
  fs5.writeFileSync(KEYPAIR_FILE, JSON.stringify(stored, null, 2), "utf8");
  fs5.chmodSync(KEYPAIR_FILE, 384);
  console.log("[device-identity] Generated new Ed25519 keypair");
  return stored;
}
function getRawPublicKey(pem) {
  const keyObj = crypto4.createPublicKey(pem);
  const spki = keyObj.export({ type: "spki", format: "der" });
  return Buffer.from(spki).subarray(12);
}
function deriveDeviceId(rawPubKey) {
  return crypto4.createHash("sha256").update(rawPubKey).digest("hex");
}
function saveDeviceAuthToken(token) {
  ensureIdentityDir();
  fs5.writeFileSync(
    DEVICE_AUTH_FILE,
    JSON.stringify({ deviceToken: token }, null, 2),
    "utf8"
  );
  fs5.chmodSync(DEVICE_AUTH_FILE, 384);
  console.log("[device-identity] Saved device auth token");
}
var CLIENT_ID = "cli";
var CLIENT_MODE = "cli";
var ROLE = "operator";
var SCOPES = [
  "operator.admin",
  "operator.approvals",
  "operator.pairing",
  "operator.read",
  "operator.write"
];
function buildConnectParams(gatewayToken, challengeNonce) {
  const kp = ensureKeypair();
  const rawPub = getRawPublicKey(kp.publicKey);
  const deviceId = deriveDeviceId(rawPub);
  const signedAt = Date.now();
  const scopesCsv = [...SCOPES].sort().join(",");
  const tokenStr = gatewayToken || "";
  const payload = `v2|${deviceId}|${CLIENT_ID}|${CLIENT_MODE}|${ROLE}|${scopesCsv}|${signedAt}|${tokenStr}|${challengeNonce}`;
  const privateKey = crypto4.createPrivateKey(kp.privateKey);
  const signature = crypto4.sign(null, Buffer.from(payload, "utf8"), privateKey);
  return {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: CLIENT_ID,
      version: "1.0.0",
      platform: process.platform,
      mode: CLIENT_MODE
    },
    caps: [],
    role: ROLE,
    scopes: SCOPES,
    device: {
      id: deviceId,
      publicKey: rawPub.toString("base64url"),
      signature: signature.toString("base64url"),
      signedAt,
      nonce: challengeNonce
    },
    auth: {
      token: gatewayToken
    }
  };
}
function handleConnectResponse(payload) {
  try {
    const p = payload;
    const auth = p?.auth;
    if (auth?.deviceToken && typeof auth.deviceToken === "string") {
      saveDeviceAuthToken(auth.deviceToken);
    }
  } catch {
  }
}

// src/ws-manager.ts
var WsManager = class {
  constructor() {
    this.ws = null;
    this.baseUrl = "";
    this.token = "";
    this.pending = /* @__PURE__ */ new Map();
    this.mainWindow = null;
    this.streamCallbacks = /* @__PURE__ */ new Set();
    this.activeStreamId = null;
    /** Stable session IDs per agent so conversation context persists across messages. */
    this.sessionIds = /* @__PURE__ */ new Map();
  }
  setWindow(win) {
    this.mainWindow = win;
  }
  connect(baseUrl, token) {
    if (this.baseUrl && this.baseUrl !== baseUrl) {
      this.disconnect();
    }
    this.baseUrl = baseUrl;
    this.token = token;
    if (this.ws && this.ws.readyState === import_ws.WebSocket.OPEN) {
      return Promise.resolve();
    }
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";
    return new Promise((resolve5, reject) => {
      const ws = new import_ws.WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const connectId = (0, import_crypto.randomUUID)();
      let connected = false;
      ws.once("open", () => {
        console.log("[WsManager] WebSocket open, waiting for connect.challenge...");
      });
      ws.once("error", (err) => {
        console.error("[WsManager] WebSocket connection error:", err.message);
        reject(err);
      });
      ws.on("message", (data) => {
        const raw = String(data);
        if (!connected) {
          try {
            const msg = JSON.parse(raw);
            if (msg.type === "event" && msg.event === "connect.challenge") {
              const challengeNonce = msg.payload?.nonce;
              console.log("[WsManager] Received connect.challenge, sending signed connect...");
              ws.send(JSON.stringify({
                type: "req",
                id: connectId,
                method: "connect",
                params: buildConnectParams(token, challengeNonce)
              }));
              return;
            }
            if (msg.type === "event") return;
            if (msg.type === "res" && msg.id === connectId && msg.ok) {
              console.log("[WsManager] Connected to gateway WebSocket");
              handleConnectResponse(msg.payload);
              connected = true;
              this.ws = ws;
              resolve5();
              return;
            }
            if (msg.type === "res" && msg.id === connectId && !msg.ok) {
              const errMsg = typeof msg.error === "object" ? msg.error?.message : String(msg.error);
              reject(new Error(`Connect failed: ${errMsg}`));
              ws.close();
              return;
            }
          } catch {
          }
          return;
        }
        this._handleMessage(raw);
      });
      ws.on("close", () => {
        console.log("[WsManager] WebSocket closed");
        this.ws = null;
        this.pending.forEach((cb) => cb(new Error("WebSocket closed")));
        this.pending.clear();
      });
      ws.on("error", (err) => {
        console.error("[WsManager] WebSocket error:", err.message);
      });
    });
  }
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  isConnected() {
    return this.ws !== null && this.ws.readyState === import_ws.WebSocket.OPEN;
  }
  /**
   * Send a chat message via WebSocket JSON-RPC.
   * Streams delta events to the renderer window.
   * Returns the fully assembled text content when streaming completes.
   */
  async sendChatMessageStreaming(baseUrl, token, agentId, message, model) {
    if (!this.isConnected()) {
      await this.connect(baseUrl, token);
    }
    const id = (0, import_crypto.randomUUID)();
    this.activeStreamId = id;
    let assembledText = "";
    const onPayload = (payload) => {
      if (payload.state === "delta" || payload.state === "final") {
        const items = payload.message?.content || [];
        let fullText = "";
        for (const item of items) {
          if (item.type === "text" && item.text) {
            fullText += item.text;
          }
        }
        if (fullText) {
          assembledText = fullText;
        }
      }
    };
    this.streamCallbacks.add(onPayload);
    const req = {
      type: "req",
      id,
      method: "chat.send",
      params: {
        sessionKey: `agent:${agentId}:myopenclaw:${this._getSessionId(agentId)}`,
        message,
        deliver: false,
        idempotencyKey: id,
        ...model ? { model } : {}
      }
    };
    return new Promise((resolve5, reject) => {
      this.pending.set(id, (err) => {
        this.streamCallbacks.delete(onPayload);
        if (err) {
          reject(err);
        } else {
          resolve5(assembledText || "Response received.");
        }
      });
      if (!this.ws || this.ws.readyState !== import_ws.WebSocket.OPEN) {
        this.pending.delete(id);
        this.streamCallbacks.delete(onPayload);
        reject(new Error("WebSocket not connected"));
        return;
      }
      this.ws.send(JSON.stringify(req), (sendErr) => {
        if (sendErr) {
          this.pending.delete(id);
          this.streamCallbacks.delete(onPayload);
          reject(sendErr);
        }
      });
    });
  }
  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.warn("[WsManager] Non-JSON message:", raw.slice(0, 100));
      return;
    }
    if (msg.type === "res") {
      const resp = msg;
      if (!resp.ok && resp.error) {
        const cb = this.pending.get(resp.id);
        if (cb) {
          this.pending.delete(resp.id);
          cb(new Error(resp.error.message));
        }
      }
      return;
    }
    if (msg.type === "event" && msg.event === "chat") {
      const payload = msg.payload;
      this.streamCallbacks.forEach((cb) => cb(payload));
      this._forwardChatEvent(payload);
      if (payload.state === "final" || payload.state === "aborted" || payload.state === "error") {
        if (this.activeStreamId) {
          const cb = this.pending.get(this.activeStreamId);
          if (cb) {
            this.pending.delete(this.activeStreamId);
            const err = payload.state === "error" ? new Error(payload.errorMessage || payload.error || "Stream error") : null;
            if (err) console.error("[WsManager] Chat stream error:", err.message);
            cb(err);
          }
          this.activeStreamId = null;
        }
      }
    }
  }
  _getSessionId(agentId) {
    let sid = this.sessionIds.get(agentId);
    if (!sid) {
      sid = (0, import_crypto.randomUUID)();
      this.sessionIds.set(agentId, sid);
    }
    return sid;
  }
  _forwardChatEvent(payload) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.webContents.send("chat-stream", payload);
  }
};
var wsManager = new WsManager();

// src/ipc/chat-ipc.ts
function registerChatHandlers(getGatewayHandle, getMainWindow2) {
  import_electron2.ipcMain.handle("copy-rich", (_event, payload) => {
    const { text, imagePaths } = payload;
    if (!imagePaths.length) {
      import_electron2.clipboard.writeText(text);
      return true;
    }
    let html = "";
    const lines = text.split("\n");
    for (const line of lines) {
      const imgMatch = line.match(/\/([\w./\-]+\.(?:png|jpg|jpeg|gif|webp|svg))/i);
      if (imgMatch) {
        const fullPath = "/" + imgMatch[1];
        const matched = imagePaths.find((p) => p === fullPath || fullPath.endsWith(p.split("/").pop()));
        if (matched) {
          try {
            const buf = (0, import_fs.readFileSync)(matched);
            const ext = matched.split(".").pop()?.toLowerCase() || "png";
            const mime = ext === "jpg" ? "jpeg" : ext;
            const b64 = buf.toString("base64");
            html += `<p>${line.replace(/`/g, "")}</p><img src="data:image/${mime};base64,${b64}" style="max-width:600px"><br>`;
            continue;
          } catch {
          }
        }
      }
      html += `<p>${line}</p>`;
    }
    try {
      const img = import_electron2.nativeImage.createFromPath(imagePaths[0]);
      import_electron2.clipboard.write({
        text,
        html,
        image: img
      });
    } catch {
      import_electron2.clipboard.write({ text, html });
    }
    return true;
  });
  import_electron2.ipcMain.handle("pick-file", async () => {
    const opts = { properties: ["openFile", "multiSelections"] };
    const win = getMainWindow2();
    const result = win ? await import_electron2.dialog.showOpenDialog(win, opts) : await import_electron2.dialog.showOpenDialog(opts);
    if (result.canceled) return [];
    return result.filePaths;
  });
  import_electron2.ipcMain.handle("send-message", async (_event, payload) => {
    try {
      const message = typeof payload === "string" ? payload : payload?.message;
      const agentId = payload?.agentId || "main";
      const model = payload?.model || "";
      const state = loadAppState();
      const gate = checkPremiumGate(state);
      if (!gate.allow) {
        return {
          success: false,
          premiumRequired: gate.premiumRequired ?? false,
          loginRequired: gate.loginRequired ?? false,
          reason: gate.reason,
          error: gate.message,
          state
        };
      }
      state.conversations = state.conversations || {};
      const conv = state.conversations[agentId] || [];
      const messages = [...conv, { role: "user", content: message }].slice(-20);
      const relay = state.relay;
      const relayAuthToken = relay.accessToken || relay.authToken;
      const hasRelay = !!(relay.baseUrl && relayAuthToken);
      const deviceId = state.deviceId || "";
      const gw = getGatewayHandle();
      const gatewayBaseUrl = gw?.baseUrl || null;
      const gatewayToken = gw?.token || "";
      const freshJwt = await refreshJwtIfNeeded();
      if (freshJwt && freshJwt !== relayAuthToken) {
        await ensureGatewayProviderOrRelay();
      }
      let content;
      if (gatewayBaseUrl) {
        const win = getMainWindow2();
        if (win) wsManager.setWindow(win);
        content = await wsManager.sendChatMessageStreaming(gatewayBaseUrl, gatewayToken, agentId, message);
      } else if (hasRelay) {
        content = await sendViaRelay(relay.baseUrl, relayAuthToken, messages, deviceId, model);
      } else if (deviceId && (relay.baseUrl || RELAY_BASE_URL)) {
        content = await sendViaRelay(relay.baseUrl || RELAY_BASE_URL, "", messages, deviceId, model);
      } else {
        throw new Error("No AI provider configured. Please login to use Cloud Relay.");
      }
      state.conversations[agentId] = [...messages, { role: "assistant", content }].slice(-20);
      consumeQuota(state, gate.tier);
      saveAppState(state);
      return { success: true, response: content, state };
    } catch (error) {
      const apiDetail = error?.response?.data?.error?.message || error?.response?.data?.message || error?.response?.data?.error;
      const status = error?.response?.status;
      let msg = apiDetail || error.message || "Unknown error";
      if (status === 500 && /internal error/i.test(msg)) {
        msg = "Gateway provider error. Please verify API Keys (Base URL / API Key / Model) in API Keys page.";
      }
      console.error("[chat] send-message failed:", JSON.stringify({
        status,
        msg,
        url: error?.config?.url,
        responseData: error?.response?.data,
        stack: error.stack?.split("\n").slice(0, 3).join(" | ")
      }));
      return { success: false, error: `${status ? status + " " : ""}${msg}`, status };
    }
  });
}

// src/ipc/app-state-ipc.ts
var import_electron3 = require("electron");

// src/conversation.ts
var path7 = __toESM(require("path"));
var fs6 = __toESM(require("fs"));
function extractTextFromMessageContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const c of content) {
    if (!c) continue;
    if (typeof c === "string") parts.push(c);
    else if (c.type === "text" && c.text) parts.push(String(c.text));
  }
  return parts.join("\n").trim();
}
function normalizeConversationText(role, text) {
  let t = String(text || "").trim();
  if (!t) return t;
  if (role === "user") {
    const marker = "[Current message - respond to this]";
    const idx = t.lastIndexOf(marker);
    if (idx >= 0) t = t.slice(idx + marker.length).trim();
    t = t.replace(/^\s*User\s*:\s*/i, "").trim();
  }
  t = t.replace(/^\s*\[Chat messages since your last reply - for context\][\s\S]*?\[Current message - respond to this\]\s*/i, "");
  t = t.replace(/^\s*User\s*:\s*/i, "").trim();
  return t;
}
function loadAgentConversationFromOpenClaw(agentId = "main", limit = 80) {
  try {
    const sessionsDir = path7.join(__dirname, "resources", ".openclaw-myopenclaw", "agents", agentId, "sessions");
    if (!fs6.existsSync(sessionsDir)) return [];
    let sessionFiles = [];
    const sessionsIndex = path7.join(sessionsDir, "sessions.json");
    if (fs6.existsSync(sessionsIndex)) {
      const idx = JSON.parse(fs6.readFileSync(sessionsIndex, "utf8").replace(/^\uFEFF/, ""));
      const rows = Object.values(idx || {}).filter((v) => v && v.sessionFile);
      rows.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
      sessionFiles = rows.map((r) => r.sessionFile).filter((f) => f && fs6.existsSync(f));
    }
    if (!sessionFiles.length) {
      sessionFiles = fs6.readdirSync(sessionsDir).filter((f) => f.endsWith(".jsonl")).map((f) => ({ full: path7.join(sessionsDir, f), mtime: fs6.statSync(path7.join(sessionsDir, f)).mtimeMs })).sort((a, b) => b.mtime - a.mtime).map((x) => x.full);
    }
    const conv = [];
    for (const file of sessionFiles) {
      const lines = fs6.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        let row;
        try {
          row = JSON.parse(line);
        } catch {
          continue;
        }
        if (row?.type !== "message" || !row.message) continue;
        const role = row.message.role;
        if (role !== "user" && role !== "assistant") continue;
        let text = extractTextFromMessageContent(row.message.content);
        if (!text && row.message.errorMessage) text = row.message.errorMessage;
        if (!text) continue;
        const uiRole = role === "assistant" ? "assistant" : "user";
        text = normalizeConversationText(uiRole, text);
        if (!text) continue;
        conv.push({ role: uiRole, content: text, timestamp: row.timestamp || row.message.timestamp || 0 });
      }
      if (conv.length >= limit * 2) break;
    }
    conv.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
    return conv.slice(-Math.max(1, limit));
  } catch (e) {
    console.error("[conversation-load] failed:", e.message);
    return [];
  }
}

// src/logger.ts
var fs7 = __toESM(require("fs"));
var path8 = __toESM(require("path"));
var LOG_FILE = path8.join(MYOPENCLAW_DATA_DIR, "myopenclaw.log");
var MAX_LOG_SIZE = 2 * 1024 * 1024;
var logStream = null;
function ensureLogStream() {
  if (logStream) return logStream;
  fs7.mkdirSync(MYOPENCLAW_DATA_DIR, { recursive: true });
  try {
    const stats = fs7.statSync(LOG_FILE);
    if (stats.size > MAX_LOG_SIZE) {
      const prev = LOG_FILE + ".prev";
      try {
        fs7.unlinkSync(prev);
      } catch {
      }
      fs7.renameSync(LOG_FILE, prev);
    }
  } catch {
  }
  logStream = fs7.createWriteStream(LOG_FILE, { flags: "a" });
  return logStream;
}
function formatLine(level, msg) {
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  return `${ts} [${level}] ${msg}
`;
}
function initFileLogger() {
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;
  console.log = (...args) => {
    origLog(...args);
    const msg = args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
    ensureLogStream().write(formatLine("INFO", msg));
  };
  console.error = (...args) => {
    origError(...args);
    const msg = args.map((a) => typeof a === "string" ? a : a instanceof Error ? a.stack || a.message : JSON.stringify(a)).join(" ");
    ensureLogStream().write(formatLine("ERROR", msg));
  };
  console.warn = (...args) => {
    origWarn(...args);
    const msg = args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
    ensureLogStream().write(formatLine("WARN", msg));
  };
  console.log(`[logger] Logging to ${LOG_FILE}`);
}
function getLogFilePath() {
  return LOG_FILE;
}

// src/ipc/app-state-ipc.ts
function registerAppStateHandlers() {
  import_electron3.ipcMain.handle("get-app-state", async () => {
    const state = loadAppState();
    const gate = checkPremiumGate(state);
    return { ...state, gate };
  });
  import_electron3.ipcMain.handle("get-agent-conversation", async (_event, agentId = "main") => {
    const conversation = loadAgentConversationFromOpenClaw(agentId, 120);
    return { success: true, conversation };
  });
  import_electron3.ipcMain.handle("get-app-version", () => {
    return import_electron3.app.getVersion();
  });
  import_electron3.ipcMain.handle("open-log-file", async () => {
    const logPath = getLogFilePath();
    await import_electron3.shell.openPath(logPath);
    return { success: true, path: logPath };
  });
}

// src/ipc/subscription-ipc.ts
var import_electron4 = require("electron");
function registerSubscriptionHandlers() {
  import_electron4.ipcMain.handle("set-user-api-key", async (_event, apiKey) => {
    const state = loadAppState();
    state.userApiKey = (apiKey || "").trim();
    state.userApiKeyQuotaUsed = 0;
    saveAppState(state);
    return { success: true, state };
  });
  import_electron4.ipcMain.handle("set-premium-status", async (_event, isPremium) => {
    const state = loadAppState();
    state.premiumTier = isPremium ? "premium" : "free";
    state.isPremium = state.premiumTier !== "free";
    state.plan = state.premiumTier;
    saveAppState(state);
    return { success: true, state };
  });
  import_electron4.ipcMain.handle("set-premium-tier", async (_event, tier) => {
    const state = loadAppState();
    if (!["free", "premium", "pro"].includes(tier)) {
      return { success: false, error: "Invalid tier" };
    }
    state.premiumTier = tier;
    state.isPremium = tier !== "free";
    state.plan = tier;
    saveAppState(state);
    return { success: true, state };
  });
  import_electron4.ipcMain.handle("get-subscription-status", async () => {
    const state = loadAppState();
    const plan = state.plan || state.premiumTier || "free";
    const features = getPlanFeatures(plan);
    return { plan, planExpiresAt: state.planExpiresAt || null, features };
  });
  import_electron4.ipcMain.handle("create-checkout-session", async (_event, data) => {
    const { plan } = data || {};
    if (!plan || !["free", "premium", "pro"].includes(plan)) {
      return { success: false, error: "Invalid plan" };
    }
    const state = loadAppState();
    state.plan = plan;
    state.planExpiresAt = null;
    state.premiumTier = plan;
    state.isPremium = plan !== "free";
    saveAppState(state);
    return { success: true, mock: true };
  });
  import_electron4.ipcMain.handle("activate-subscription", async (_event, data) => {
    const { plan, expiresAt } = data || {};
    if (!plan || !["free", "premium", "pro"].includes(plan)) {
      return { success: false, error: "Invalid plan" };
    }
    const state = loadAppState();
    state.plan = plan;
    state.planExpiresAt = expiresAt || null;
    state.premiumTier = plan;
    state.isPremium = plan !== "free";
    saveAppState(state);
    return { success: true };
  });
}

// src/ipc/agent-ipc.ts
var crypto5 = __toESM(require("crypto"));
var import_electron5 = require("electron");
function registerAgentHandlers() {
  import_electron5.ipcMain.handle("list-agents", async () => {
    const state = loadAppState();
    return state.agents;
  });
  import_electron5.ipcMain.handle("add-agent", async (_event, data) => {
    const state = loadAppState();
    const plan = state.plan || state.premiumTier || "free";
    const features = getPlanFeatures(plan);
    const totalAgents = state.agents.length;
    if (features.maxAgents !== -1 && totalAgents >= features.maxAgents) {
      return { error: "upgrade_required", message: "Upgrade to add more agents" };
    }
    const name = (typeof data === "string" ? data : data?.name) || `Agent ${state.agents.length + 1}`;
    const newAgent = { id: crypto5.randomUUID(), name, channels: [] };
    state.agents.push(newAgent);
    saveAppState(state);
    return newAgent;
  });
  import_electron5.ipcMain.handle("rename-agent", async (_event, payload) => {
    const state = loadAppState();
    const agentId = payload.agentId || payload.id;
    if (agentId === "main") return { success: false, error: "Cannot rename main agent" };
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: "Agent not found" };
    agent.name = payload.name || agent.name;
    saveAppState(state);
    return { success: true, agents: state.agents };
  });
  import_electron5.ipcMain.handle("set-agent-channels", async (_event, payload) => {
    const state = loadAppState();
    const agent = state.agents.find((a) => a.id === payload.id);
    if (!agent) return { success: false, error: "Agent not found" };
    agent.channels = Array.isArray(payload.channels) ? payload.channels : [];
    saveAppState(state);
    return { success: true, agents: state.agents };
  });
  import_electron5.ipcMain.handle("delete-agent", async (_event, agentId) => {
    const state = loadAppState();
    if (agentId === "main") return { success: false, error: "Main agent cannot be deleted" };
    const index = state.agents.findIndex((a) => a.id === agentId);
    if (index < 0) return { success: false, error: "Agent not found" };
    state.agents.splice(index, 1);
    if (state.activeAgentId === agentId) state.activeAgentId = "main";
    if (state.conversations) delete state.conversations[agentId];
    saveAppState(state);
    return { success: true, agents: state.agents, state };
  });
  import_electron5.ipcMain.handle("set-active-agent", async (_event, id) => {
    const state = loadAppState();
    if (!state.agents.find((a) => a.id === id)) return { success: false, error: "Agent not found" };
    state.activeAgentId = id;
    saveAppState(state);
    return { success: true, state };
  });
}

// src/ipc/provider-ipc.ts
var fs8 = __toESM(require("fs"));
var import_electron6 = require("electron");
function registerProviderHandlers(getGatewayHandle, onStartGateway) {
  import_electron6.ipcMain.handle("save-provider-config", async (_event, payload) => {
    try {
      const { providerId = "default", baseUrl = "", apiKey = "", api = "", modelId = "default" } = payload || {};
      const cleanProviderId = String(providerId || "").trim();
      const cleanModelId = String(modelId || "").trim();
      const autoApi = String(api || "").trim() || "openai-completions";
      if (!cleanProviderId) return { success: false, error: "Provider Name is required" };
      if (!cleanModelId) return { success: false, error: "Model Name is required" };
      if (!String(apiKey || "").trim()) return { success: false, error: "API Key is required" };
      const cfg = loadEmbeddedConfig();
      cfg.models = cfg.models || {};
      cfg.models.mode = cfg.models.mode || "merge";
      cfg.models.providers = cfg.models.providers || {};
      cfg.models.providers[cleanProviderId] = {
        ...cfg.models.providers[cleanProviderId] || {},
        baseUrl,
        apiKey,
        api: autoApi,
        models: [{ id: cleanModelId, name: cleanModelId }]
      };
      cfg.agents = cfg.agents || {};
      cfg.agents.defaults = cfg.agents.defaults || {};
      cfg.agents.defaults.model = cfg.agents.defaults.model || {};
      cfg.agents.defaults.model.primary = `${cleanProviderId}/${cleanModelId}`;
      if (cfg.agents.defaults.model.fallback !== void 0) delete cfg.agents.defaults.model.fallback;
      saveEmbeddedConfig(cfg);
      syncAuthProfileForProvider(cleanProviderId, apiKey, autoApi);
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) {
        try {
          if (!fs8.existsSync(CONFIG_FILE)) {
            fs8.mkdirSync(OPENCLAW_CONFIG_DIR, { recursive: true });
            const gatewayConfig = {
              gateway: { auth: { mode: "token" }, http: { endpoints: { chatCompletions: { enabled: true } } } },
              models: {
                mode: "merge",
                providers: {
                  [cleanProviderId]: {
                    baseUrl: baseUrl || void 0,
                    apiKey,
                    api: autoApi,
                    models: [{ id: cleanModelId, name: cleanModelId }]
                  }
                }
              }
            };
            fs8.writeFileSync(CONFIG_FILE, JSON.stringify(gatewayConfig, null, 2));
            console.log("[save-provider] Created gateway config, starting gateway...");
          }
          await onStartGateway();
        } catch (gwErr) {
          console.error("[save-provider] Gateway start failed:", gwErr.message);
        }
      }
      return { success: true, apiResolved: autoApi, modelResolved: `${cleanProviderId}/${cleanModelId}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron6.ipcMain.handle("get-provider-config", async () => {
    try {
      const cfg = loadEmbeddedConfig();
      const providers = cfg?.models?.providers || {};
      const entries = Object.entries(providers);
      if (entries.length) {
        const [providerId, p] = entries[0];
        if (String(p?.apiKey || "").trim()) {
          return {
            success: true,
            configured: true,
            provider: {
              providerId,
              modelId: p?.models?.[0]?.id || "default",
              api: p?.api || "openai-completions",
              baseUrl: p?.baseUrl || "",
              apiKey: p?.apiKey || ""
            }
          };
        }
      }
      const state = loadAppState();
      const hasRelay = !!(state.deviceToken || state.deviceId);
      return { success: true, configured: hasRelay };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron6.ipcMain.handle("delete-provider-config", async (_event, providerId) => {
    try {
      const cfg = loadEmbeddedConfig();
      cfg.models = cfg.models || {};
      cfg.models.providers = cfg.models.providers || {};
      const id = String(providerId || "").trim();
      if (id && cfg.models.providers[id]) delete cfg.models.providers[id];
      cfg.agents = cfg.agents || {};
      cfg.agents.defaults = cfg.agents.defaults || {};
      cfg.agents.defaults.model = cfg.agents.defaults.model || {};
      cfg.agents.defaults.model.primary = "openclaw:main";
      if (cfg.agents.defaults.model.fallback !== void 0) delete cfg.agents.defaults.model.fallback;
      saveEmbeddedConfig(cfg);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron6.ipcMain.handle("reset-model-config", async () => {
    try {
      const cfg = loadEmbeddedConfig();
      cfg.models = { mode: "merge", providers: {} };
      cfg.agents = cfg.agents || {};
      cfg.agents.defaults = cfg.agents.defaults || {};
      if (cfg.agents.defaults.model !== void 0) delete cfg.agents.defaults.model;
      saveEmbeddedConfig(cfg);
      fs8.mkdirSync(AUTH_PROFILES_DIR, { recursive: true });
      fs8.writeFileSync(AUTH_PROFILES_FILE, JSON.stringify({ version: 1, profiles: {}, lastGood: {}, usageStats: {} }, null, 2), "utf8");
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron6.ipcMain.handle("save-config", async (_event, config) => {
    try {
      if (!fs8.existsSync(OPENCLAW_CONFIG_DIR)) {
        fs8.mkdirSync(OPENCLAW_CONFIG_DIR, { recursive: true });
      }
      const providerId = config.provider === "openai" ? "openai" : "anthropic";
      const modelId = config.provider === "openai" ? "gpt-4" : "claude-3-5-sonnet-20241022";
      const openclawConfig = {
        gateway: { auth: { mode: "token" }, http: { endpoints: { chatCompletions: { enabled: true } } } },
        models: {
          mode: "merge",
          providers: {
            [providerId]: {
              apiKey: config.apiKey,
              baseUrl: config.baseUrl || void 0,
              api: "openai-completions",
              models: [{ id: modelId, name: modelId }]
            }
          }
        }
      };
      fs8.writeFileSync(CONFIG_FILE, JSON.stringify(openclawConfig, null, 2));
      await onStartGateway();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// src/ipc/relay-ipc.ts
var import_electron7 = require("electron");
var import_axios8 = __toESM(require("axios"));
function registerRelayHandlers() {
  import_electron7.ipcMain.handle("save-relay-config", async (_event, config) => {
    try {
      const { baseUrl = "", authToken = "" } = config || {};
      const state = loadAppState();
      state.relay = { ...state.relay, baseUrl: baseUrl.trim(), authToken: authToken.trim() };
      saveAppState(state);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("get-relay-config", async () => {
    try {
      const state = loadAppState();
      return { success: true, relay: state.relay };
    } catch (e) {
      const defaultRelay = getDefaultAppState().relay;
      return { success: false, error: e.message, relay: defaultRelay };
    }
  });
  import_electron7.ipcMain.handle("test-relay-connection", async () => {
    try {
      const state = loadAppState();
      const baseUrl = state.relay?.baseUrl || RELAY_BASE_URL;
      const freshJwt = await refreshJwtIfNeeded(baseUrl);
      const authToken = freshJwt || state.relay?.accessToken || state.relay?.authToken;
      const deviceId = state.deviceId || "";
      if (!authToken && deviceId) {
        await checkRelayHealth(baseUrl, "");
        return { success: true, guest: true };
      }
      if (!authToken) {
        return { success: false, error: "Auth token is required. Please log in first." };
      }
      await checkRelayHealth(baseUrl, authToken);
      return { success: true };
    } catch (e) {
      const detail = e?.response?.data ? JSON.stringify(e.response.data) : e.message;
      return { success: false, error: detail };
    }
  });
  import_electron7.ipcMain.handle("open-login", async () => {
    try {
      const state = loadAppState();
      const deviceId = state.deviceId || "";
      const homepageUrl = "https://myopenclaws.app";
      const loginUrl = `${homepageUrl}/login?deviceId=${deviceId}&redirect=myopenclaw`;
      await import_electron7.shell.openExternal(loginUrl);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron7.ipcMain.handle("save-relay-auth", async (_event, { accessToken, refreshToken }) => {
    try {
      const state = loadAppState();
      state.relay.accessToken = accessToken || "";
      state.relay.refreshToken = refreshToken || "";
      saveAppState(state);
      await ensureGatewayProviderOrRelay();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("get-models", async () => {
    try {
      const state = loadAppState();
      const baseUrl = (state.relay?.baseUrl || RELAY_BASE_URL).replace(/\/+$/, "");
      const headers = {};
      const jwt = state.relay?.accessToken || state.relay?.authToken;
      if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
      if (state.deviceId) headers["X-Device-Id"] = state.deviceId;
      const res = await import_axios8.default.get(`${baseUrl}/v1/models`, { headers, timeout: 1e4 });
      const models = res.data?.data || [];
      return { success: true, models };
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || e.message;
      return { success: false, error: msg, models: [] };
    }
  });
  import_electron7.ipcMain.handle("logout", async () => {
    try {
      const state = loadAppState();
      state.relay.accessToken = "";
      state.relay.refreshToken = "";
      state.relay.userEmail = "";
      saveAppState(state);
      await ensureGatewayProviderOrRelay();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

// src/ipc/device-ipc.ts
var import_electron8 = require("electron");
var import_axios9 = __toESM(require("axios"));
function registerDeviceHandlers() {
  import_electron8.ipcMain.handle("get-device-id", async () => {
    const state = loadAppState();
    return { success: true, deviceId: state.deviceId || "" };
  });
  import_electron8.ipcMain.handle("check-quota", async () => {
    const state = loadAppState();
    const relay = state.relay;
    const deviceId = state.deviceId;
    const baseUrl = (relay.baseUrl || RELAY_BASE_URL).replace(/\/+$/, "");
    const authToken = relay.accessToken || relay.authToken;
    if (!authToken && !deviceId) {
      return { success: false, error: "not_configured" };
    }
    try {
      const headers = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      if (deviceId) headers["X-Device-Id"] = deviceId;
      const response = await import_axios9.default.get(`${baseUrl}/v1/usage`, { headers, timeout: 2e4 });
      return response.data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// src/ipc/channel-ipc.ts
var fs9 = __toESM(require("fs"));
var path9 = __toESM(require("path"));
var import_electron9 = require("electron");
var import_axios10 = __toESM(require("axios"));
function maskToken(token) {
  if (!token || token.length <= 12) return "****";
  const prefix = token.slice(0, 10);
  const suffix = token.slice(-10);
  return prefix + "****" + suffix;
}
var botNameCache = /* @__PURE__ */ new Map();
async function fetchTelegramBotName(botToken) {
  const cacheKey = botToken.slice(-10);
  const cached = botNameCache.get(cacheKey);
  if (cached !== void 0) return cached;
  try {
    const res = await import_axios10.default.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 5e3 });
    const name = res.data?.result?.username || "";
    botNameCache.set(cacheKey, name);
    return name;
  } catch {
    botNameCache.set(cacheKey, "");
    return "";
  }
}
function syncChannelsToGatewayConfig(channels) {
  try {
    const ocCfg = fs9.existsSync(CONFIG_FILE) ? JSON.parse(fs9.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
    ocCfg.channels = { ...ocCfg.channels || {}, ...channels };
    fs9.writeFileSync(CONFIG_FILE, JSON.stringify(ocCfg, null, 2), "utf8");
    console.log("[channel-ipc] Synced channels to openclaw.json");
  } catch (e) {
    console.error("[channel-ipc] Failed to sync channels:", e.message);
  }
}
function registerChannelHandlers() {
  import_electron9.ipcMain.handle("save-agent-channel-config", async (_event, payload) => {
    try {
      const { agentId, channelType, configJson } = payload || {};
      const parsed = configJson ? JSON.parse(configJson) : {};
      const cfg = loadEmbeddedConfig();
      cfg.channels = cfg.channels || {};
      cfg.channels[channelType] = cfg.channels[channelType] || { enabled: true, accounts: {} };
      cfg.channels[channelType].enabled = true;
      cfg.channels[channelType].accounts = cfg.channels[channelType].accounts || {};
      cfg.channels[channelType].accounts[agentId || "default"] = parsed;
      saveEmbeddedConfig(cfg);
      syncChannelsToGatewayConfig(cfg.channels);
      await ensureGatewayProviderOrRelay();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron9.ipcMain.handle("get-channel-status", async () => {
    try {
      const cfg = loadEmbeddedConfig();
      const channels = {};
      const cfgChannels = cfg.channels || {};
      const credDir = path9.join(OPENCLAW_CONFIG_DIR, "credentials");
      for (const [channelType, channelCfg] of Object.entries(cfgChannels)) {
        const ch = channelCfg;
        if (!ch.accounts || !Object.keys(ch.accounts).length) continue;
        const accounts = {};
        const pairedUsers = {};
        for (const [accountId, accountCfg] of Object.entries(ch.accounts)) {
          const masked = { ...accountCfg || {} };
          for (const key of ["botToken", "token", "apiKey"]) {
            if (typeof masked[key] === "string" && masked[key].length > 0) {
              masked[`_raw_${key}`] = masked[key];
              masked[key] = maskToken(masked[key]);
            }
          }
          if (channelType === "telegram" && accountCfg?.botToken) {
            const botName = await fetchTelegramBotName(accountCfg.botToken);
            if (botName) masked._botName = botName;
          }
          accounts[accountId] = masked;
          const allowFile = path9.join(credDir, `${channelType}-${accountId}-allowFrom.json`);
          try {
            if (fs9.existsSync(allowFile)) {
              const data = JSON.parse(fs9.readFileSync(allowFile, "utf8"));
              pairedUsers[accountId] = (data.allowFrom || []).map((id) => ({ id }));
            }
          } catch {
          }
        }
        channels[channelType] = {
          enabled: ch.enabled !== false,
          accounts,
          pairedUsers
        };
      }
      return { success: true, channels };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

// src/ipc/skills-ipc.ts
var crypto6 = __toESM(require("crypto"));
var fs10 = __toESM(require("fs"));
var os4 = __toESM(require("os"));
var path10 = __toESM(require("path"));
var import_child_process3 = require("child_process");
var import_electron10 = require("electron");
function findClawHubCli() {
  const candidates = [];
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = (0, import_child_process3.execFileSync)(cmd, ["clawhub"], { encoding: "utf8", timeout: 3e3, windowsHide: true }).trim();
    if (result) candidates.push(result.split(/\r?\n/)[0]);
  } catch {
  }
  const home = os4.homedir();
  const nvmDir = path10.join(home, ".nvm", "versions", "node");
  try {
    if (fs10.existsSync(nvmDir)) {
      const versions = fs10.readdirSync(nvmDir).filter((v) => v.startsWith("v")).sort((a, b) => b.localeCompare(a, void 0, { numeric: true }));
      for (const ver of versions) {
        candidates.push(path10.join(nvmDir, ver, "bin", "clawhub"));
      }
    }
  } catch {
  }
  const binNames = process.platform === "win32" ? ["clawhub.cmd", "clawhub.exe", "clawhub"] : ["clawhub"];
  for (const bin of binNames) {
    candidates.push(path10.join(DOWNLOADED_RUNTIME_DIR, "openclaw-deps", ".bin", bin));
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path10.join(home, "AppData", "Roaming");
    for (const bin of binNames) {
      candidates.push(path10.join(appData, "npm", bin));
    }
    const pf = process.env.ProgramFiles || "C:\\Program Files";
    for (const bin of binNames) {
      candidates.push(path10.join(pf, "nodejs", bin));
    }
  }
  candidates.push(
    "/usr/local/bin/clawhub",
    "/opt/homebrew/bin/clawhub"
  );
  const seen = /* @__PURE__ */ new Set();
  for (const p of candidates) {
    const resolved = path10.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (fs10.existsSync(p)) return p;
  }
  return null;
}
function installClawHubCli() {
  return new Promise((resolve5, reject) => {
    console.log("[skills] clawhub not found, auto-installing via npm...");
    const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
    (0, import_child_process3.execFile)(npmCmd, ["install", "-g", "clawhub"], {
      timeout: 12e4,
      encoding: "utf8",
      shell: process.platform === "win32",
      windowsHide: true
    }, (err, stdout, stderr) => {
      if (err) {
        console.error("[skills] clawhub install failed:", stderr || err.message);
        reject(new Error("Failed to auto-install clawhub: " + (stderr || err.message)));
      } else {
        console.log("[skills] clawhub installed successfully");
        const bin = findClawHubCli();
        if (bin) resolve5(bin);
        else reject(new Error("clawhub installed but binary not found in PATH"));
      }
    });
  });
}
function runClawHubCli(args) {
  let bin = findClawHubCli();
  if (!bin) {
    return installClawHubCli().then((installedBin) => runClawHubCliWithBin(installedBin, args));
  }
  return runClawHubCliWithBin(bin, args);
}
function runClawHubCliWithBin(bin, args) {
  const useShell = process.platform === "win32";
  return new Promise((resolve5, reject) => {
    (0, import_child_process3.execFile)(bin, args, {
      timeout: 12e4,
      encoding: "utf8",
      shell: useShell ? true : void 0,
      windowsHide: true
    }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || stdout || err.message));
      else resolve5(stdout);
    });
  });
}
async function gatewayRpc(gw, method, params = {}) {
  const id = crypto6.randomUUID();
  const token = readGatewayTokenFromConfig();
  const wsUrl = gw.baseUrl.replace(/^http/, "ws") + "/ws";
  return new Promise((resolve5, reject) => {
    let WS;
    try {
      WS = global.WebSocket || require("ws");
    } catch {
      WS = require("ws");
    }
    const socket = new WS(wsUrl, {
      headers: {
        ...token ? { Authorization: `Bearer ${token}` } : {}
      }
    });
    const timer = setTimeout(() => {
      try {
        socket.close();
      } catch {
      }
      reject(new Error(`Gateway RPC timeout for method "${method}"`));
    }, 15e3);
    let connected = false;
    let challengeNonce = null;
    const connectId = crypto6.randomUUID();
    const reqMsg = JSON.stringify({ type: "req", id, method, params });
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
        if (msg.type === "event" && msg.event === "connect.challenge") {
          challengeNonce = msg.payload?.nonce;
          socket.send(JSON.stringify({
            type: "req",
            id: connectId,
            method: "connect",
            params: buildConnectParams(token, challengeNonce)
          }));
          return;
        }
        if (msg.type === "event") return;
        if (!connected) {
          if (msg.type === "res" && msg.id === connectId && msg.ok) {
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
          resolve5(msg.payload);
        } else {
          const errMsg = typeof msg.error === "object" ? msg.error?.message : msg.error;
          reject(new Error(errMsg || `Gateway RPC error for "${method}"`));
        }
      } catch (e) {
        clearTimeout(timer);
        socket.close();
        reject(e);
      }
    };
    socket.onerror = (err) => {
      clearTimeout(timer);
      reject(new Error(`Gateway WebSocket error: ${err.message || String(err)}`));
    };
  });
}
function registerSkillsHandlers(getGatewayHandle) {
  import_electron10.ipcMain.handle("skills-list", async () => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: "Gateway not running", skills: [] };
      const payload = await gatewayRpc(gw, "skills.status", {});
      const skills = Array.isArray(payload?.skills) ? payload.skills : Array.isArray(payload) ? payload : [];
      let enabledKeys = /* @__PURE__ */ new Set();
      try {
        const cfg = JSON.parse(fs10.readFileSync(CONFIG_FILE, "utf8"));
        const entries = cfg?.skills?.entries || {};
        for (const [key, val] of Object.entries(entries)) {
          if (val && val.enabled) enabledKeys.add(key);
        }
      } catch {
      }
      for (const s of skills) {
        s.enabled = enabledKeys.has(s.skillKey);
      }
      return { success: true, skills };
    } catch (e) {
      return { success: false, error: e.message, skills: [] };
    }
  });
  import_electron10.ipcMain.handle("skills-toggle", async (_event, payload) => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: "Gateway not running" };
      const { skillKey, enabled } = payload || {};
      if (!skillKey) return { success: false, error: "skillKey is required" };
      await gatewayRpc(gw, "skills.update", { skillKey, enabled: !!enabled });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron10.ipcMain.handle("skills-install", async (_event, payload) => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: "Gateway not running" };
      const { name, installId } = payload || {};
      if (!name || !installId) return { success: false, error: "name and installId are required" };
      await gatewayRpc(gw, "skills.install", { name, installId, timeoutMs: 6e4 });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron10.ipcMain.handle("skills-install-deps", async (_event, payload) => {
    const { bins } = payload || {};
    if (!Array.isArray(bins) || bins.length === 0) {
      return { success: true, installed: [] };
    }
    const safeBins = bins.filter((b) => /^[a-zA-Z0-9_-]+$/.test(b));
    if (safeBins.length === 0) {
      return { success: false, error: "No valid package names" };
    }
    const results = [];
    for (const bin of safeBins) {
      try {
        await new Promise((resolve5, reject) => {
          (0, import_child_process3.execFile)("brew", ["install", bin], { timeout: 12e4 }, (err, _stdout, stderr) => {
            if (err) reject(new Error(stderr || err.message));
            else resolve5();
          });
        });
        results.push({ bin, ok: true });
      } catch (e) {
        results.push({ bin, ok: false, error: e.message });
      }
    }
    const allOk = results.every((r) => r.ok);
    return { success: allOk, results };
  });
  const CLAWHUB_API = "https://clawhub.ai/api/v1";
  import_electron10.ipcMain.handle("marketplace-list", async (_event, payload) => {
    try {
      const { sort, cursor, limit } = payload || {};
      const params = new URLSearchParams();
      params.set("limit", String(limit || 25));
      if (sort) params.set("sort", sort);
      if (cursor) params.set("cursor", cursor);
      const resp = await fetch(`${CLAWHUB_API}/skills?${params}`);
      if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` };
      const data = await resp.json();
      return { success: true, items: data.items || [], nextCursor: data.nextCursor || null };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron10.ipcMain.handle("marketplace-search", async (_event, payload) => {
    try {
      const { query, limit } = payload || {};
      if (!query) return { success: false, error: "query is required" };
      const params = new URLSearchParams({ q: query, limit: String(limit || 15) });
      const resp = await fetch(`${CLAWHUB_API}/search?${params}`);
      if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` };
      const data = await resp.json();
      return { success: true, results: data.results || [] };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron10.ipcMain.handle("marketplace-detail", async (_event, payload) => {
    try {
      const { slug } = payload || {};
      if (!slug) return { success: false, error: "slug is required" };
      const resp = await fetch(`${CLAWHUB_API}/skills/${encodeURIComponent(slug)}`);
      if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` };
      const data = await resp.json();
      return { success: true, ...data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron10.ipcMain.handle("marketplace-install", async (_event, payload) => {
    try {
      const { slug } = payload || {};
      if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) return { success: false, error: "Invalid slug" };
      await runClawHubCli([
        "install",
        slug,
        "--workdir",
        OPENCLAW_CONFIG_DIR,
        "--no-input",
        "--force"
      ]);
      const gw = getGatewayHandle();
      if (gw?.baseUrl) {
        try {
          await gatewayRpc(gw, "skills.install", { name: slug, installId: slug, timeoutMs: 6e4 });
        } catch {
        }
        try {
          await gatewayRpc(gw, "skills.update", { skillKey: slug, enabled: true });
        } catch {
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron10.ipcMain.handle("marketplace-uninstall", async (_event, payload) => {
    try {
      const { slug } = payload || {};
      if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) return { success: false, error: "Invalid slug" };
      const gw = getGatewayHandle();
      if (gw?.baseUrl) {
        try {
          await gatewayRpc(gw, "skills.update", { skillKey: slug, enabled: false });
        } catch {
        }
      }
      try {
        await runClawHubCli([
          "uninstall",
          slug,
          "--workdir",
          OPENCLAW_CONFIG_DIR,
          "--no-input"
        ]);
      } catch (clawErr) {
        const msg = clawErr.message || "";
        if (msg.includes("Not installed") || msg.includes("not found")) {
          console.log(`[marketplace] ${slug} not a clawhub package, disabled via gateway only`);
        } else {
          throw clawErr;
        }
      }
      try {
        const ocCfg = fs10.existsSync(CONFIG_FILE) ? JSON.parse(fs10.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
        if (ocCfg.skills?.entries?.[slug]) {
          delete ocCfg.skills.entries[slug];
          fs10.writeFileSync(CONFIG_FILE, JSON.stringify(ocCfg, null, 2), "utf8");
          console.log(`[marketplace] Removed ${slug} from skills.entries`);
        }
      } catch {
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron10.ipcMain.handle("skills-configure", async (_event, payload) => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: "Gateway not running" };
      const { skillKey, apiKey, env } = payload || {};
      if (!skillKey) return { success: false, error: "skillKey is required" };
      const params = { skillKey };
      if (apiKey !== void 0) params.apiKey = apiKey;
      if (env !== void 0) params.env = env;
      await gatewayRpc(gw, "skills.update", params);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

// src/ipc/cron-ipc.ts
var crypto7 = __toESM(require("crypto"));
var import_axios11 = __toESM(require("axios"));
var import_electron11 = require("electron");
function wsRpc(port, token, method, params = {}) {
  return new Promise((resolve5, reject) => {
    const id = crypto7.randomUUID();
    const reqMsg = JSON.stringify({ type: "req", id, method, params });
    let ws;
    try {
      const WebSocket2 = require("ws");
      ws = new WebSocket2(`ws://127.0.0.1:${port}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch {
      reject(new Error("WebSocket (ws) module not available"));
      return;
    }
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
      }
      reject(new Error(`cron RPC timeout: ${method}`));
    }, 1e4);
    let connected = false;
    let challengeNonce = null;
    const connectId = crypto7.randomUUID();
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(typeof data === "string" ? data : data.toString("utf8"));
        if (msg.type === "event" && msg.event === "connect.challenge") {
          challengeNonce = msg.payload?.nonce;
          ws.send(JSON.stringify({
            type: "req",
            id: connectId,
            method: "connect",
            params: buildConnectParams(token, challengeNonce)
          }));
          return;
        }
        if (msg.type === "event") return;
        if (!connected) {
          if (msg.type === "res" && msg.id === connectId && msg.ok) {
            connected = true;
            handleConnectResponse(msg.payload);
            ws.send(reqMsg);
            return;
          }
        }
        if (msg.id !== id) return;
        clearTimeout(timer);
        ws.close();
        if (msg.ok) {
          resolve5(msg.payload);
        } else {
          const errMsg = typeof msg.error === "object" ? msg.error?.message : msg.error;
          reject(new Error(errMsg || `RPC error: ${method}`));
        }
      } catch (e) {
        clearTimeout(timer);
        ws.close();
        reject(e);
      }
    });
    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
function registerCronHandlers(getGatewayHandle) {
  function requireGateway() {
    const gw = getGatewayHandle();
    if (!gw) throw new Error("Gateway is not running");
    return { port: gw.port, token: gw.token };
  }
  import_electron11.ipcMain.handle("cron-list", async () => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, "cron.list", {});
      return { success: true, ...payload };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron11.ipcMain.handle("cron-add", async (_event, params) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, "cron.add", params);
      return { success: true, ...payload };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron11.ipcMain.handle("cron-update", async (_event, params) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, "cron.update", params);
      return { success: true, ...payload };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron11.ipcMain.handle("cron-remove", async (_event, params) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, "cron.remove", params);
      return { success: true, ...payload };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron11.ipcMain.handle("cron-run", async (_event, params) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, "cron.run", params);
      return { success: true, ...payload };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron11.ipcMain.handle("cron-runs", async (_event, params) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, "cron.runs", params);
      return { success: true, ...payload };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron11.ipcMain.handle("cron-generate", async (_event, params) => {
    try {
      const { port, token } = requireGateway();
      const systemPrompt = [
        "You are a cron job configuration assistant.",
        "Parse the user's natural language description into a structured cron job config.",
        "Return ONLY valid JSON (no markdown fences, no explanation) with this structure:",
        "{",
        '  "name": "short-kebab-case-name",',
        '  "schedule": {',
        '    "kind": "cron" | "every" | "at",',
        '    "expr": "cron expression (only when kind=cron, e.g. 0 9 * * *)",',
        '    "tz": "optional timezone like Asia/Shanghai (only when kind=cron)",',
        '    "everyMs": 60000 (only when kind=every, milliseconds)',
        '    "at": "2026-03-15T09:00:00Z (only when kind=at, ISO timestamp)"',
        "  },",
        '  "message": "the prompt message to send to the agent when the job runs"',
        "}"
      ].join("\n");
      const response = await import_axios11.default.post(`http://127.0.0.1:${port}/v1/chat/completions`, {
        model: "openclaw:main",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.description }
        ],
        stream: false
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 3e4
      });
      const content = response?.data?.choices?.[0]?.message?.content || "";
      if (!content) {
        return { success: false, error: "AI returned empty response" };
      }
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      if (!cleaned.startsWith("{")) {
        return { success: false, error: content };
      }
      const config = JSON.parse(cleaned);
      return { success: true, config };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// src/ipc/pairing-ipc.ts
var fs11 = __toESM(require("fs"));
var path11 = __toESM(require("path"));
var import_electron12 = require("electron");
var CREDENTIALS_DIR = path11.join(OPENCLAW_CONFIG_DIR, "credentials");
function getPairingFilePath(channel) {
  return path11.join(CREDENTIALS_DIR, `${channel}-pairing.json`);
}
function getAllowFromFilePath(channel, accountId) {
  return path11.join(CREDENTIALS_DIR, `${channel}-${accountId}-allowFrom.json`);
}
function readPairingFile(channel) {
  const filePath = getPairingFilePath(channel);
  try {
    if (fs11.existsSync(filePath)) {
      return JSON.parse(fs11.readFileSync(filePath, "utf8"));
    }
  } catch (e) {
    console.error(`[pairing-ipc] Failed to read ${filePath}:`, e.message);
  }
  return { version: 1, requests: [] };
}
function writePairingFile(channel, data) {
  const filePath = getPairingFilePath(channel);
  fs11.mkdirSync(path11.dirname(filePath), { recursive: true });
  fs11.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}
function readAllowFromFile(channel, accountId) {
  const filePath = getAllowFromFilePath(channel, accountId);
  try {
    if (fs11.existsSync(filePath)) {
      return JSON.parse(fs11.readFileSync(filePath, "utf8"));
    }
  } catch (e) {
    console.error(`[pairing-ipc] Failed to read ${filePath}:`, e.message);
  }
  return { version: 1, allowFrom: [] };
}
function writeAllowFromFile(channel, accountId, data) {
  const filePath = getAllowFromFilePath(channel, accountId);
  fs11.mkdirSync(path11.dirname(filePath), { recursive: true });
  fs11.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}
function registerPairingHandlers() {
  import_electron12.ipcMain.handle("pairing-list", async (_event, payload) => {
    try {
      const { channel } = payload || {};
      if (!channel) return { success: false, error: "Missing channel" };
      const data = readPairingFile(channel);
      return { success: true, requests: data.requests };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("pairing-list-all", async () => {
    try {
      if (!fs11.existsSync(CREDENTIALS_DIR)) {
        return { success: true, channels: {} };
      }
      const files = fs11.readdirSync(CREDENTIALS_DIR);
      const channels = {};
      for (const file of files) {
        const match = file.match(/^(.+)-pairing\.json$/);
        if (!match) continue;
        const channel = match[1];
        const data = readPairingFile(channel);
        if (data.requests.length > 0) {
          channels[channel] = data.requests;
        }
      }
      return { success: true, channels };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("pairing-approve", async (_event, payload) => {
    try {
      const { channel, code } = payload || {};
      if (!channel || !code) return { success: false, error: "Missing channel or code" };
      const pairingData = readPairingFile(channel);
      const reqIndex = pairingData.requests.findIndex(
        (r) => r.code.toUpperCase() === code.toUpperCase()
      );
      if (reqIndex === -1) {
        return { success: false, error: "No matching pairing request found" };
      }
      const req = pairingData.requests[reqIndex];
      const accountId = req.meta?.accountId || "default";
      const allowData = readAllowFromFile(channel, accountId);
      if (!allowData.allowFrom.includes(req.id)) {
        allowData.allowFrom.push(req.id);
      }
      writeAllowFromFile(channel, accountId, allowData);
      pairingData.requests.splice(reqIndex, 1);
      writePairingFile(channel, pairingData);
      console.log(`[pairing-ipc] Approved ${channel} pairing for user ${req.id} (${req.meta?.username || "unknown"})`);
      return { success: true, userId: req.id, username: req.meta?.username };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("pairing-dismiss", async (_event, payload) => {
    try {
      const { channel, code } = payload || {};
      if (!channel || !code) return { success: false, error: "Missing channel or code" };
      const pairingData = readPairingFile(channel);
      const reqIndex = pairingData.requests.findIndex(
        (r) => r.code.toUpperCase() === code.toUpperCase()
      );
      if (reqIndex === -1) {
        return { success: false, error: "No matching pairing request found" };
      }
      pairingData.requests.splice(reqIndex, 1);
      writePairingFile(channel, pairingData);
      console.log(`[pairing-ipc] Dismissed ${channel} pairing request`);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

// src/window.ts
var mainWindow = null;
var gatewayHandle = null;
function getMainWindow() {
  return mainWindow;
}
function killGateway() {
  if (gatewayHandle?.process) {
    gatewayHandle.process.kill();
  }
}
var updateLoadingStatus = (message, percent) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const safeMsg = String(message || "").replace(/`/g, "\\`").replace(/\\/g, "\\\\");
    const safePct = Number(percent || 0);
    mainWindow.webContents.executeJavaScript(
      `window.__REAL_LOADING_DRIVEN__=true; if (window.setLoadingState) { window.setLoadingState(\`${safeMsg}\`, ${safePct}); }`,
      true
    ).catch(() => {
    });
  } catch {
  }
};
function registerAllIpcHandlers() {
  const getGW = () => gatewayHandle;
  const onStartGateway = async () => {
    gatewayHandle = await startGateway(updateLoadingStatus);
  };
  registerGatewayHandlers(getGW);
  registerChatHandlers(getGW, () => mainWindow);
  registerAppStateHandlers();
  registerSubscriptionHandlers();
  registerAgentHandlers();
  registerProviderHandlers(getGW, onStartGateway);
  registerRelayHandlers();
  registerDeviceHandlers();
  registerChannelHandlers();
  registerSkillsHandlers(getGW);
  registerCronHandlers(getGW);
  registerPairingHandlers();
}
function createWindow() {
  import_electron13.Menu.setApplicationMenu(null);
  mainWindow = new import_electron13.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path12.join(__dirname, "preload.js"),
      webviewTag: true
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const gw = gatewayHandle;
    const target = /^https?:\/\/127\.0\.0\.1:\d+\/?$/i.test(String(url || "")) ? buildDashboardUrl(url, gw?.baseUrl) : url;
    import_electron13.shell.openExternal(target);
    return { action: "deny" };
  });
  mainWindow.webContents.on("before-input-event", (_e, input) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (input.type !== "keyDown") return;
    const meta = input.meta;
    if (meta && input.key === "r") {
      mainWindow.webContents.reload();
    } else if (meta && input.shift && input.key === "i") {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    console.error("[renderer] process gone:", details.reason, details.exitCode);
  });
  mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("[renderer] did-fail-load:", code, desc);
  });
  mainWindow.loadFile("loading.html");
  (async () => {
    try {
      if (process.env.MYOPENCLAW_E2E === "1") {
        console.log("[startup] E2E mode: skipping runtime download and gateway start");
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadFile("index.html");
        return;
      }
      console.log("[startup] Begin startup flow...");
      let openclawBin = findOpenClawCli();
      console.log("[startup] findOpenClawCli =", openclawBin || "(not found)");
      console.log("[startup] findRuntimeDir =", findRuntimeDir() || "(not found)");
      if (!openclawBin && !findRuntimeDir()) {
        console.log("[startup] No openclaw or runtime found, downloading runtime...");
        updateLoadingStatus("Downloading OpenClaw runtime...", 30);
        await ensureEmbeddedRuntime(updateLoadingStatus);
        clearCliCache();
        openclawBin = findOpenClawCli();
      }
      if (openclawBin) {
        ensureOpenClawInPath(openclawBin);
      }
      if (!fs12.existsSync(CONFIG_FILE)) {
        const binForOnboard = openclawBin || findOpenClawCli();
        if (binForOnboard) {
          updateLoadingStatus("Running first-time setup...", 80);
          console.log("[startup] No config found, running openclaw onboard...");
          await runOpenClawOnboard(binForOnboard);
        } else if (findRuntimeDir()) {
          try {
            updateLoadingStatus("Running first-time setup...", 80);
            console.log("[startup] No CLI found, running onboard via node entry point...");
            const runtimeDir = findRuntimeDir();
            const nodeBin = findNodeBinary();
            const entryMjs = path12.join(runtimeDir, "openclaw-deps", "openclaw", "openclaw.mjs");
            const entryJs = path12.join(runtimeDir, "openclaw-deps", "openclaw", "dist", "entry.js");
            const entryFile = fs12.existsSync(entryMjs) ? entryMjs : entryJs;
            await runOpenClawOnboard(nodeBin, [entryFile], runtimeDir);
          } catch (onboardErr) {
            console.error("[startup] Onboard via node failed:", onboardErr.message);
          }
        } else {
          console.log("[startup] No openclaw CLI or runtime available for onboard, skipping");
        }
      }
      if (fs12.existsSync(CONFIG_FILE)) {
        gatewayHandle = await startGateway(updateLoadingStatus);
      } else {
        console.log("[startup] No gateway config after onboard, relay-only mode");
      }
    } catch (err) {
      console.error("[startup] Error:", err.message);
      global.__MYOPENCLAW_STARTUP_ERROR__ = err?.message || String(err);
      updateLoadingStatus(`Setup error: ${err?.message || "Unknown error"}`, 0);
      await new Promise((r) => setTimeout(r, 3e3));
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadFile("index.html");
    }
  })();
}

// src/main.ts
initFileLogger();
var isVM = (() => {
  try {
    const cpuModel = os5.cpus()?.[0]?.model || "";
    return /virtual|Apple Virtual|QEMU|KVM|VirtualBox|VMware/i.test(cpuModel);
  } catch {
    return false;
  }
})();
if (isVM) {
  import_electron14.app.commandLine.appendSwitch("disable-gpu");
  console.log("[gpu] Disabled GPU acceleration (VM detected)");
}
process.stdout?.on("error", () => {
});
process.stderr?.on("error", () => {
});
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    import_electron14.app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path13.resolve(process.argv[1])]);
  }
} else {
  import_electron14.app.setAsDefaultProtocolClient(PROTOCOL);
}
import_electron14.app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url, getMainWindow);
});
var gotTheLock = import_electron14.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron14.app.quit();
} else {
  import_electron14.app.on("second-instance", (_event, argv) => {
    const deepLinkUrl = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (deepLinkUrl) handleDeepLink(deepLinkUrl, getMainWindow);
    const mainWindow2 = getMainWindow();
    if (mainWindow2) {
      if (mainWindow2.isMinimized()) mainWindow2.restore();
      mainWindow2.focus();
    }
  });
  registerAllIpcHandlers();
  import_electron14.app.whenReady().then(() => {
    console.log("[app] ready");
    const deviceId = ensureDeviceId();
    registerDevice(deviceId, import_electron14.app.getVersion());
    const state = loadAppState();
    if (!state.relay.baseUrl) {
      state.relay.baseUrl = RELAY_BASE_URL;
      saveAppState(state);
    }
    startPerfMonitor();
    console.log("[app] creating window...");
    createWindow();
    const launchUrl = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (launchUrl) handleDeepLink(launchUrl, getMainWindow);
  });
  import_electron14.app.on("window-all-closed", () => {
    killGateway();
    if (process.platform !== "darwin") import_electron14.app.quit();
  });
  import_electron14.app.on("activate", () => {
    if (import_electron14.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
