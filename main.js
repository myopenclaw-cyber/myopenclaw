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
var path7 = __toESM(require("path"));
var os3 = __toESM(require("os"));
var import_electron11 = require("electron");
var import_child_process3 = require("child_process");

// src/constants.ts
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var OPENCLAW_CONFIG_DIR = path.join(os.homedir(), ".openclaw");
var CONFIG_FILE = path.join(OPENCLAW_CONFIG_DIR, "openclaw.json");
var DEFAULT_PORT = 18800;
var EMBEDDED_CONFIG_FILE = path.join(OPENCLAW_CONFIG_DIR, "embedded-config.json");
var APP_STATE_FILE = path.join(OPENCLAW_CONFIG_DIR, "app-state.json");
var AUTH_PROFILES_DIR = path.join(OPENCLAW_CONFIG_DIR, "agents", "main", "agent");
var AUTH_PROFILES_FILE = path.join(AUTH_PROFILES_DIR, "auth-profiles.json");
var DOWNLOADED_RUNTIME_DIR = path.join(OPENCLAW_CONFIG_DIR, "runtime");
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
    deviceId: ""
  };
}
function getPlanFeatures(plan) {
  const features = {
    free: { maxAgents: 1, canUseRelay: true, modelTier: "basic" },
    premium: { maxAgents: 5, canUseRelay: true, modelTier: "sonnet" },
    pro: { maxAgents: -1, canUseRelay: true, modelTier: "opus" }
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
  if (state.freeQuotaUsed < 10) {
    return { allow: true, tier: "free" };
  }
  return { allow: false, reason: "free_exhausted", message: "Free quota reached. Login to use Cloud Relay or add your API key." };
}
function consumeQuota(state, tier) {
  if (tier === "free") state.freeQuotaUsed += 1;
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
    await import_axios.default.post(`${RELAY_BASE_URL}/v1/devices`, {
      deviceId,
      platform: process.platform,
      appVersion
    }, { timeout: 8e3 });
    console.log("[device-registration] Device registered successfully");
  } catch (err) {
    console.log("[device-registration] Registration failed (non-fatal):", err.message);
  }
}

// src/deep-link.ts
var import_axios2 = __toESM(require("axios"));
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
        const deviceId = state.deviceId;
        if (deviceId) {
          import_axios2.default.post(`${RELAY_BASE_URL}/v1/devices/${encodeURIComponent(deviceId)}/link`, {}, {
            headers: { "Authorization": `Bearer ${accessToken}` },
            timeout: 8e3
          }).then(() => {
            console.log("[DeepLink] Device linked to user account");
          }).catch((err) => {
            console.log("[DeepLink] Device link failed (non-fatal):", err.message);
          });
        }
        const mainWindow2 = getMainWindow2();
        if (mainWindow2 && !mainWindow2.isDestroyed()) {
          mainWindow2.webContents.executeJavaScript(`
            if (typeof loadRelayConfig === 'function') loadRelayConfig();
            if (typeof loadDeviceInfo === 'function') loadDeviceInfo();
            if (typeof refreshQuota === 'function') refreshQuota();
            if (typeof refreshState === 'function') refreshState();
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
var path6 = __toESM(require("path"));
var fs7 = __toESM(require("fs"));
var import_electron10 = require("electron");

// src/runtime.ts
var path3 = __toESM(require("path"));
var fs2 = __toESM(require("fs"));
var os2 = __toESM(require("os"));
var import_axios3 = __toESM(require("axios"));
var import_child_process = require("child_process");
function getRuntimeTargetLabel() {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return process.arch === "arm64" ? "mac_silicon" : "mac_intel";
  return "linux";
}
async function downloadFile(url, outputPath, onProgress) {
  const writer = fs2.createWriteStream(outputPath);
  const response = await (0, import_axios3.default)({ method: "get", url, responseType: "stream", timeout: 0 });
  const total = Number(response.headers["content-length"] || 0);
  let loaded = 0;
  response.data.on("data", (chunk) => {
    loaded += chunk.length;
    if (total > 0 && typeof onProgress === "function") {
      onProgress(Math.max(0, Math.min(100, Math.round(loaded / total * 100))));
    }
  });
  response.data.pipe(writer);
  return new Promise((resolve2, reject) => {
    writer.on("finish", resolve2);
    writer.on("error", reject);
  });
}
function findRuntimeDir() {
  const embeddedDir = path3.join(__dirname, "resources", "openclaw-deps", "openclaw", "dist");
  if (fs2.existsSync(path3.join(embeddedDir, "entry.js")) || fs2.existsSync(path3.join(embeddedDir, "entry.mjs"))) {
    return path3.join(__dirname, "resources");
  }
  const dlDir = path3.join(DOWNLOADED_RUNTIME_DIR, "openclaw-deps", "openclaw", "dist");
  if (fs2.existsSync(path3.join(dlDir, "entry.js")) || fs2.existsSync(path3.join(dlDir, "entry.mjs"))) {
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
  const manifestPath = path3.join(__dirname, "resources", "runtime-manifest.json");
  if (!fs2.existsSync(manifestPath)) {
    throw new Error("Missing runtime-manifest.json. Cannot download runtime automatically.");
  }
  const manifest = JSON.parse(fs2.readFileSync(manifestPath, "utf8"));
  const target = getRuntimeTargetLabel();
  const url = manifest?.[target]?.url;
  if (!url) {
    throw new Error(`No runtime download URL configured for platform "${target}". Please download the runtime manually or use the full installer.`);
  }
  const zipPath = path3.join(os2.tmpdir(), `myopenclaw-runtime-${target}.zip`);
  console.log(`[runtime] Downloading runtime for ${target}...`);
  updateLoadingStatus2("Downloading openclaw ...", 52);
  await downloadFile(url, zipPath, (p) => {
    updateLoadingStatus2(`Downloading openclaw ... ${p}%`, 52 + Math.round(p * 0.28));
  });
  console.log("[runtime] Extracting runtime...");
  updateLoadingStatus2("Extracting openclaw runtime...", 84);
  fs2.mkdirSync(DOWNLOADED_RUNTIME_DIR, { recursive: true });
  if (process.platform === "win32") {
    (0, import_child_process.execFileSync)("powershell.exe", ["-NoProfile", "-Command", `Expand-Archive -Path '${zipPath}' -DestinationPath '${DOWNLOADED_RUNTIME_DIR}' -Force`], { stdio: "inherit" });
  } else {
    (0, import_child_process.execFileSync)("unzip", ["-o", zipPath, "-d", DOWNLOADED_RUNTIME_DIR], { stdio: "inherit" });
  }
  if (!findRuntimeDir()) {
    throw new Error("Runtime extracted but dist/entry.(m)js not found. The runtime package may be incomplete.");
  }
  console.log("[runtime] Runtime ready");
  updateLoadingStatus2("Runtime installed", 88);
}
function verifyOpenClawCli(binPath) {
  try {
    (0, import_child_process.execFileSync)(binPath, ["--version"], { encoding: "utf8", timeout: 1e4, stdio: "pipe" });
    return true;
  } catch (e) {
    console.log(`[cli] Verification failed for ${binPath}:`, e.message);
    return false;
  }
}
function findOpenClawCli() {
  const candidates = [];
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = (0, import_child_process.execFileSync)(cmd, ["openclaw"], { encoding: "utf8", timeout: 3e3 }).trim();
    if (result) candidates.push(result.split(/\r?\n/)[0]);
  } catch {
  }
  const home = os2.homedir();
  candidates.push(
    path3.join(home, ".local", "bin", "openclaw"),
    "/usr/local/bin/openclaw",
    path3.join(home, ".openclaw", "bin", "openclaw")
  );
  const nvmDir = path3.join(home, ".nvm", "versions", "node");
  try {
    if (fs2.existsSync(nvmDir)) {
      const versions = fs2.readdirSync(nvmDir).filter((v) => v.startsWith("v")).sort((a, b) => b.localeCompare(a, void 0, { numeric: true }));
      for (const ver of versions) {
        candidates.push(path3.join(nvmDir, ver, "bin", "openclaw"));
      }
    }
  } catch {
  }
  const binNames = process.platform === "win32" ? ["openclaw.cmd", "openclaw.exe", "openclaw"] : ["openclaw"];
  for (const bin of binNames) {
    candidates.push(path3.join(__dirname, "resources", "openclaw-deps", ".bin", bin));
    candidates.push(path3.join(DOWNLOADED_RUNTIME_DIR, "openclaw-deps", ".bin", bin));
  }
  for (const p of candidates) {
    if (!fs2.existsSync(p)) continue;
    console.log(`[cli] Found candidate: ${p}, verifying...`);
    if (verifyOpenClawCli(p)) {
      console.log(`[cli] Verified openclaw CLI: ${p}`);
      return p;
    }
  }
  return null;
}
function findNodeBinary() {
  const nodeExe = process.platform === "win32" ? "node.exe" : "node";
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const nodePath = (0, import_child_process.execFileSync)(cmd, [nodeExe], { encoding: "utf8", timeout: 3e3 }).trim().split(/\r?\n/)[0];
    if (nodePath) {
      const ver = (0, import_child_process.execFileSync)(nodePath, ["--version"], { encoding: "utf8", timeout: 3e3 }).trim();
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
    path3.join(__dirname, "resources", "node", nodeExe),
    path3.join(DOWNLOADED_RUNTIME_DIR, "node", nodeExe)
  ];
  for (const p of candidates) {
    if (fs2.existsSync(p)) {
      console.log(`[node] Using bundled node: ${p}`);
      return p;
    }
  }
  throw new Error(`No suitable Node.js found (>= ${MIN_NODE_MAJOR_VERSION}). Please install Node.js or use the full version of MyOpenClaw.`);
}
function ensureOpenClawInPath(openclawBin) {
  if (!openclawBin || process.platform === "win32") return;
  try {
    const resolved = fs2.realpathSync(openclawBin);
    const standardDirs = ["/usr/local/bin", "/usr/bin", path3.join(os2.homedir(), ".local", "bin")];
    const binDir = path3.dirname(resolved);
    if (standardDirs.includes(binDir)) {
      console.log("[path] openclaw already in standard PATH:", resolved);
      return;
    }
    const localBinDir = path3.join(os2.homedir(), ".local", "bin");
    const symlinkTarget = path3.join(localBinDir, "openclaw");
    fs2.mkdirSync(localBinDir, { recursive: true });
    try {
      fs2.unlinkSync(symlinkTarget);
    } catch {
    }
    fs2.symlinkSync(resolved, symlinkTarget);
    fs2.chmodSync(symlinkTarget, 493);
    console.log(`[path] Created symlink: ${symlinkTarget} -> ${resolved}`);
    const home = os2.homedir();
    const exportLine = 'export PATH="$HOME/.local/bin:$PATH"';
    const profiles = [".zshrc", ".bashrc"].map((f) => path3.join(home, f));
    for (const profile of profiles) {
      try {
        const content = fs2.existsSync(profile) ? fs2.readFileSync(profile, "utf8") : "";
        if (!content.includes(".local/bin")) {
          fs2.appendFileSync(profile, `
# Added by MyOpenClaw
${exportLine}
`);
          console.log(`[path] Added ~/.local/bin to ${profile}`);
        }
      } catch (e) {
        console.log(`[path] Could not update ${profile}:`, e.message);
      }
    }
    if (!process.env.PATH.includes(localBinDir)) {
      process.env.PATH = `${localBinDir}:${process.env.PATH}`;
    }
  } catch (e) {
    console.error("[path] ensureOpenClawInPath failed:", e.message);
  }
}
function runOpenClawOnboard(openclawBin) {
  return new Promise((resolve2, _reject) => {
    const args = [
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
      OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
      OPENCLAW_CONFIG_PATH: CONFIG_FILE
    };
    console.log(`[onboard] Running: ${openclawBin} ${args.join(" ")}`);
    const proc = (0, import_child_process.spawn)(openclawBin, args, { stdio: "pipe", env });
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
        resolve2(output);
      } else {
        console.error(`[onboard] Exited with code ${code}`);
        resolve2(output);
      }
    });
    proc.on("error", (err) => {
      console.error("[onboard] Error:", err.message);
      resolve2("");
    });
  });
}

// src/gateway.ts
var path4 = __toESM(require("path"));
var fs4 = __toESM(require("fs"));
var import_child_process2 = require("child_process");
var import_axios5 = __toESM(require("axios"));

// src/auth.ts
var fs3 = __toESM(require("fs"));
function syncAuthProfileForProvider(providerId, apiKey, api = "") {
  try {
    const key = String(apiKey || "").trim();
    if (!providerId || !key) return;
    fs3.mkdirSync(AUTH_PROFILES_DIR, { recursive: true });
    let auth = { version: 1, profiles: {}, lastGood: {}, usageStats: {} };
    if (fs3.existsSync(AUTH_PROFILES_FILE)) {
      auth = JSON.parse(fs3.readFileSync(AUTH_PROFILES_FILE, "utf8").replace(/^\uFEFF/, ""));
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
    fs3.writeFileSync(AUTH_PROFILES_FILE, JSON.stringify(auth, null, 2), "utf8");
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

// src/network.ts
var net = __toESM(require("net"));
var import_axios4 = __toESM(require("axios"));
async function findAvailablePort(startPort = DEFAULT_PORT) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error("No available port found");
}
function isPortAvailable(port) {
  return new Promise((resolve2) => {
    const server = net.createServer();
    server.once("error", () => resolve2(false));
    server.once("listening", () => {
      server.close();
      resolve2(true);
    });
    server.listen(port, "127.0.0.1");
  });
}
async function isOpenClawGatewayRunning(port) {
  try {
    const resp = await import_axios4.default.get(`http://127.0.0.1:${port}/health`, { timeout: 1200 });
    const body = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data || "");
    return body.includes("OpenClaw Control") || body.includes("openclaw-app");
  } catch {
    return false;
  }
}

// src/gateway.ts
async function startGateway(updateLoadingStatus2) {
  let gatewayPort;
  if (await isOpenClawGatewayRunning(18800)) {
    gatewayPort = 18800;
  } else {
    gatewayPort = await findAvailablePort(18800);
  }
  const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;
  console.log(`[startGateway] Starting gateway on port ${gatewayPort}...`);
  updateLoadingStatus2("Establishing secure connections...", 48);
  ensureAuthProfilesFromEmbeddedConfig();
  const gatewayToken = ensureRandomGatewayToken();
  try {
    const ocCfg = fs4.existsSync(CONFIG_FILE) ? JSON.parse(fs4.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
    ocCfg.gateway = ocCfg.gateway || {};
    ocCfg.gateway.auth = ocCfg.gateway.auth || {};
    ocCfg.gateway.auth.token = gatewayToken;
    ocCfg.gateway.auth.mode = "token";
    fs4.writeFileSync(CONFIG_FILE, JSON.stringify(ocCfg, null, 2), "utf8");
    console.log("[startGateway] Synced gateway token to openclaw.json");
  } catch (e) {
    console.error("[startGateway] Failed to sync token to openclaw.json:", e.message);
  }
  updateLoadingStatus2("Launching openclaw gateway...", 90);
  const gatewayEnv = {
    ...process.env,
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
    gatewayProcess = (0, import_child_process2.spawn)(openclawBin, ["gateway", "run", "--port", String(gatewayPort), "--allow-unconfigured"], {
      stdio: "pipe",
      env: gatewayEnv,
      ...process.platform === "win32" ? { windowsHide: true } : {}
    });
  } else {
    const runtimeDir = findRuntimeDir() || path4.join(__dirname, "resources");
    const entryMjs = path4.join(runtimeDir, "openclaw-deps", "openclaw", "openclaw.mjs");
    const entryJs = path4.join(runtimeDir, "openclaw-deps", "openclaw", "dist", "entry.js");
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
  gatewayProcess.stdout.on("data", (data) => console.log(`[Gateway stdout] ${data}`));
  gatewayProcess.stderr.on("data", (data) => console.error(`[Gateway stderr] ${data}`));
  gatewayProcess.on("exit", (code, signal) => {
    console.log(`[Gateway] Process exited with code ${code}, signal ${signal}`);
    if (code !== 0) console.error("[Gateway] Unexpected exit!");
  });
  gatewayProcess.on("error", (err) => console.error("[Gateway] Process error:", err));
  console.log("[startGateway] Waiting for gateway to start...");
  updateLoadingStatus2("Checking gateway health...", 94);
  await new Promise((resolve2) => setTimeout(resolve2, 8e3));
  await waitForGateway(gatewayBaseUrl);
  updateLoadingStatus2("Startup complete. Opening workspace...", 100);
  console.log(`[startGateway] Gateway started successfully on ${gatewayBaseUrl}`);
  return {
    port: gatewayPort,
    baseUrl: gatewayBaseUrl,
    process: gatewayProcess,
    token: readGatewayTokenFromConfig()
  };
}
async function waitForGateway(gatewayBaseUrl, maxRetries = 30) {
  console.log(`[waitForGateway] Checking ${gatewayBaseUrl}/health...`);
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`[waitForGateway] Attempt ${i + 1}/${maxRetries}...`);
      const response = await import_axios5.default.get(`${gatewayBaseUrl}/health`, { timeout: 2e3 });
      console.log(`[waitForGateway] Success! Response:`, response.data);
      return true;
    } catch (error) {
      console.log(`[waitForGateway] Attempt ${i + 1} failed:`, error.message);
      await new Promise((resolve2) => setTimeout(resolve2, 1e3));
    }
  }
  console.error("[waitForGateway] Max retries reached, gateway failed to start");
  throw new Error("Gateway failed to start after 30 attempts. Please check your configuration and try again.");
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

// src/messaging.ts
var import_axios6 = __toESM(require("axios"));
async function checkRelayHealth(baseUrl, token) {
  const response = await import_axios6.default.get(`${baseUrl}/health`, {
    headers: { "Authorization": `Bearer ${token}` },
    timeout: 8e3
  });
  return response.data;
}
async function sendViaGateway(gatewayBaseUrl, messages) {
  if (!gatewayBaseUrl) {
    throw new Error("Gateway not started");
  }
  const token = readGatewayTokenFromConfig();
  const response = await import_axios6.default.post(`${gatewayBaseUrl}/v1/chat/completions`, {
    model: "openclaw:main",
    messages,
    stream: false
  }, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-openclaw-agent-id": "main"
    },
    timeout: 6e4
  });
  return response?.data?.choices?.[0]?.message?.content || "No response from OpenClaw.";
}
async function sendViaRelay(relayBaseUrl, relayAuthToken, messages, deviceId) {
  const headers = {
    "Authorization": `Bearer ${relayAuthToken}`,
    "Content-Type": "application/json"
  };
  if (deviceId) {
    headers["X-Device-Id"] = deviceId;
  }
  const response = await import_axios6.default.post(`${relayBaseUrl}/v1/chat/completions`, {
    model: "openclaw:main",
    messages
  }, {
    headers,
    timeout: 6e4
  });
  return response?.data?.choices?.[0]?.message?.content || "No response from relay.";
}

// src/ipc/chat-ipc.ts
function registerChatHandlers(getGatewayHandle) {
  import_electron2.ipcMain.handle("send-message", async (_event, payload) => {
    try {
      const message = typeof payload === "string" ? payload : payload?.message;
      const agentId = payload?.agentId || "main";
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
      state.conversations = state.conversations || {};
      const conv = state.conversations[agentId] || [];
      const messages = [...conv, { role: "user", content: message }].slice(-20);
      const embeddedCfg = loadEmbeddedConfig();
      const hasLocalProvider = !!(embeddedCfg?.models?.providers && Object.keys(embeddedCfg.models.providers).length > 0);
      const relay = state.relay;
      const relayAuthToken = relay.accessToken || relay.authToken;
      const hasRelay = !!(relay.baseUrl && relayAuthToken);
      const deviceId = state.deviceId || "";
      const gw = getGatewayHandle();
      const gatewayBaseUrl = gw?.baseUrl || null;
      let content;
      if (hasLocalProvider && gatewayBaseUrl) {
        content = await sendViaGateway(gatewayBaseUrl, messages);
      } else if (hasRelay) {
        content = await sendViaRelay(relay.baseUrl, relayAuthToken, messages, deviceId);
      } else if (gatewayBaseUrl) {
        const userProvider = getUserProviderConfig();
        if (!userProvider) {
          return {
            success: false,
            noApiKeyConfigured: true,
            error: "OpenClaw depends on an LLM model to provide intelligence. Please configure your API key or a relay service."
          };
        }
        content = await sendViaGateway(gatewayBaseUrl, messages);
      } else {
        throw new Error("No AI provider configured. Add an API key or configure a relay service.");
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
      return { success: false, error: msg, status };
    }
  });
}

// src/ipc/app-state-ipc.ts
var import_electron3 = require("electron");

// src/conversation.ts
var path5 = __toESM(require("path"));
var fs5 = __toESM(require("fs"));
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
    const sessionsDir = path5.join(__dirname, "resources", ".openclaw-myopenclaw", "agents", agentId, "sessions");
    if (!fs5.existsSync(sessionsDir)) return [];
    let sessionFiles = [];
    const sessionsIndex = path5.join(sessionsDir, "sessions.json");
    if (fs5.existsSync(sessionsIndex)) {
      const idx = JSON.parse(fs5.readFileSync(sessionsIndex, "utf8").replace(/^\uFEFF/, ""));
      const rows = Object.values(idx || {}).filter((v) => v && v.sessionFile);
      rows.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
      sessionFiles = rows.map((r) => r.sessionFile).filter((f) => f && fs5.existsSync(f));
    }
    if (!sessionFiles.length) {
      sessionFiles = fs5.readdirSync(sessionsDir).filter((f) => f.endsWith(".jsonl")).map((f) => ({ full: path5.join(sessionsDir, f), mtime: fs5.statSync(path5.join(sessionsDir, f)).mtimeMs })).sort((a, b) => b.mtime - a.mtime).map((x) => x.full);
    }
    const conv = [];
    for (const file of sessionFiles) {
      const lines = fs5.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
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
var crypto3 = __toESM(require("crypto"));
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
    const newAgent = { id: crypto3.randomUUID(), name, channels: [] };
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
var fs6 = __toESM(require("fs"));
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
          if (!fs6.existsSync(CONFIG_FILE)) {
            fs6.mkdirSync(OPENCLAW_CONFIG_DIR, { recursive: true });
            const gatewayConfig = {
              models: { default: `${cleanProviderId}/${cleanModelId}` },
              litellm: { apiKey, baseUrl: baseUrl || void 0 }
            };
            fs6.writeFileSync(CONFIG_FILE, JSON.stringify(gatewayConfig, null, 2));
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
      if (!entries.length) return { success: true, configured: false };
      const [providerId, p] = entries[0];
      return {
        success: true,
        configured: !!String(p?.apiKey || "").trim(),
        provider: {
          providerId,
          modelId: p?.models?.[0]?.id || "default",
          api: p?.api || "openai-completions",
          baseUrl: p?.baseUrl || "",
          apiKey: p?.apiKey || ""
        }
      };
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
      fs6.mkdirSync(AUTH_PROFILES_DIR, { recursive: true });
      fs6.writeFileSync(AUTH_PROFILES_FILE, JSON.stringify({ version: 1, profiles: {}, lastGood: {}, usageStats: {} }, null, 2), "utf8");
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron6.ipcMain.handle("save-config", async (_event, config) => {
    try {
      if (!fs6.existsSync(OPENCLAW_CONFIG_DIR)) {
        fs6.mkdirSync(OPENCLAW_CONFIG_DIR, { recursive: true });
      }
      const openclawConfig = {
        models: {
          default: config.provider === "openai" ? "openai/gpt-4" : "anthropic/claude-3-5-sonnet-20241022"
        },
        litellm: {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl || void 0
        }
      };
      fs6.writeFileSync(CONFIG_FILE, JSON.stringify(openclawConfig, null, 2));
      await onStartGateway();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// src/ipc/relay-ipc.ts
var import_electron7 = require("electron");
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
      const relay = state.relay;
      const authToken = relay.accessToken || relay.authToken;
      const baseUrl = relay.baseUrl || RELAY_BASE_URL;
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
      const loginUrl = `${homepageUrl}/login.html?deviceId=${deviceId}&redirect=myopenclaw`;
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
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("logout", async () => {
    try {
      const state = loadAppState();
      state.relay.accessToken = "";
      state.relay.refreshToken = "";
      state.relay.userEmail = "";
      saveAppState(state);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

// src/ipc/device-ipc.ts
var import_electron8 = require("electron");
var import_axios7 = __toESM(require("axios"));
function registerDeviceHandlers() {
  import_electron8.ipcMain.handle("get-device-id", async () => {
    const state = loadAppState();
    return { success: true, deviceId: state.deviceId || "" };
  });
  import_electron8.ipcMain.handle("check-quota", async () => {
    const state = loadAppState();
    const relay = state.relay;
    const deviceId = state.deviceId;
    const baseUrl = relay.baseUrl || RELAY_BASE_URL;
    if (!deviceId) {
      return { success: false, error: "not_configured" };
    }
    try {
      const authToken = relay.accessToken || relay.authToken;
      const headers = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      const response = await import_axios7.default.get(`${baseUrl}/v1/devices/${deviceId}/usage`, { headers, timeout: 8e3 });
      return response.data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// src/ipc/channel-ipc.ts
var import_electron9 = require("electron");
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
  registerChatHandlers(getGW);
  registerAppStateHandlers();
  registerSubscriptionHandlers();
  registerAgentHandlers();
  registerProviderHandlers(getGW, onStartGateway);
  registerRelayHandlers();
  registerDeviceHandlers();
  registerChannelHandlers();
}
function createWindow() {
  import_electron10.Menu.setApplicationMenu(null);
  mainWindow = new import_electron10.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path6.join(__dirname, "preload.js")
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const gw = gatewayHandle;
    const target = /^https?:\/\/127\.0\.0\.1:\d+\/?$/i.test(String(url || "")) ? buildDashboardUrl(url, gw?.baseUrl) : url;
    import_electron10.shell.openExternal(target);
    return { action: "deny" };
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
        openclawBin = findOpenClawCli();
      }
      if (openclawBin) {
        ensureOpenClawInPath(openclawBin);
      }
      if (!fs7.existsSync(CONFIG_FILE)) {
        const binForOnboard = openclawBin || findOpenClawCli();
        if (binForOnboard) {
          updateLoadingStatus("Running first-time setup...", 80);
          console.log("[startup] No config found, running openclaw onboard...");
          await runOpenClawOnboard(binForOnboard);
        } else {
          console.log("[startup] No openclaw CLI available for onboard, skipping");
        }
      }
      if (fs7.existsSync(CONFIG_FILE)) {
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
var isVM = (() => {
  try {
    if (process.platform === "darwin") {
      const model = (0, import_child_process3.execFileSync)("sysctl", ["-n", "machdep.cpu.brand_string"], { encoding: "utf8", timeout: 2e3 }).trim();
      return /virtual|Apple Virtual/i.test(model);
    }
    const cpuModel = os3.cpus()?.[0]?.model || "";
    return /virtual|QEMU|KVM|VirtualBox|VMware/i.test(cpuModel);
  } catch {
    return false;
  }
})();
if (isVM) {
  import_electron11.app.commandLine.appendSwitch("disable-gpu");
  console.log("[gpu] Disabled GPU acceleration (VM detected)");
}
process.stdout?.on("error", () => {
});
process.stderr?.on("error", () => {
});
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    import_electron11.app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path7.resolve(process.argv[1])]);
  }
} else {
  import_electron11.app.setAsDefaultProtocolClient(PROTOCOL);
}
import_electron11.app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url, getMainWindow);
});
var gotTheLock = import_electron11.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron11.app.quit();
} else {
  import_electron11.app.on("second-instance", (_event, argv) => {
    const deepLinkUrl = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (deepLinkUrl) handleDeepLink(deepLinkUrl, getMainWindow);
    const mainWindow2 = getMainWindow();
    if (mainWindow2) {
      if (mainWindow2.isMinimized()) mainWindow2.restore();
      mainWindow2.focus();
    }
  });
}
registerAllIpcHandlers();
import_electron11.app.whenReady().then(() => {
  console.log("[app] ready");
  const deviceId = ensureDeviceId();
  registerDevice(deviceId, import_electron11.app.getVersion());
  const state = loadAppState();
  if (!state.relay.baseUrl) {
    state.relay.baseUrl = RELAY_BASE_URL;
    saveAppState(state);
  }
  console.log("[app] creating window...");
  createWindow();
  const launchUrl = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (launchUrl) handleDeepLink(launchUrl, getMainWindow);
});
import_electron11.app.on("window-all-closed", () => {
  killGateway();
  if (process.platform !== "darwin") import_electron11.app.quit();
});
import_electron11.app.on("activate", () => {
  if (import_electron11.BrowserWindow.getAllWindows().length === 0) createWindow();
});
