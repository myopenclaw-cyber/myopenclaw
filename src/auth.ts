import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { AUTH_PROFILES_DIR, AUTH_PROFILES_FILE, CONFIG_FILE, OPENCLAW_CONFIG_DIR, RELAY_BASE_URL } from './constants';
import { loadEmbeddedConfig, loadAppState, saveAppState, getUserProviderConfig } from './config-store';
import { logDnsDiagnostics } from './network-diagnostics';

export function syncAuthProfileForProvider(providerId: string, apiKey: string, api: string = ''): void {
  try {
    const key = String(apiKey || '').trim();
    if (!providerId || !key) return;

    const buildAuthPayload = () => {
      let auth: any = { version: 1, profiles: {}, lastGood: {}, usageStats: {} };
      if (fs.existsSync(AUTH_PROFILES_FILE)) {
        auth = JSON.parse(fs.readFileSync(AUTH_PROFILES_FILE, 'utf8').replace(/^\uFEFF/, ''));
        auth.version = auth.version || 1;
        auth.profiles = auth.profiles || {};
        auth.lastGood = auth.lastGood || {};
        auth.usageStats = auth.usageStats || {};
      }
      const bind = (pid: string) => {
        const profileId = `${pid}:default`;
        auth.profiles[profileId] = { type: 'api_key', provider: pid, key };
        auth.lastGood[pid] = profileId;
      };
      bind(providerId);
      if (String(api).trim() === 'anthropic-messages') bind('anthropic');
      return auth;
    };

    const auth = buildAuthPayload();
    const newContent = JSON.stringify(auth, null, 2);

    // Write to all agents (main + others)
    for (const agentId of getAllAgentIds()) {
      const agentDir = path.join(OPENCLAW_CONFIG_DIR, 'agents', agentId, 'agent');
      const profileFile = path.join(agentDir, 'auth-profiles.json');
      fs.mkdirSync(agentDir, { recursive: true });
      const oldContent = fs.existsSync(profileFile) ? fs.readFileSync(profileFile, 'utf8') : '';
      if (newContent !== oldContent) {
        fs.writeFileSync(profileFile, newContent, 'utf8');
      }
    }
  } catch (e: any) {
    console.error('[auth-profile-sync] failed:', e.message);
  }
}

export function ensureAuthProfilesFromEmbeddedConfig(): void {
  try {
    const cfg = loadEmbeddedConfig();
    const providers = cfg?.models?.providers || {};
    for (const [providerId, p] of Object.entries(providers)) {
      const key = String(p?.apiKey || '').trim();
      if (!key) continue;
      syncAuthProfileForProvider(providerId, key, p?.api || '');
      syncAgentModelRegistries();
      break;
    }
  } catch (e: any) {
    console.error('[auth-profile-sync-bootstrap] failed:', e.message);
  }
}

function buildRelayRuntimeApiKey(explicitRelayApiKey?: string): string {
  const state = loadAppState();
  const jwt = String(explicitRelayApiKey || state.relay?.accessToken || '').trim();
  if (jwt) return jwt;
  const deviceToken = String(state.deviceToken || '').trim();
  if (deviceToken) return deviceToken;
  const deviceId = String(state.deviceId || '').trim();
  if (deviceId) return `device:${deviceId}`;
  return '';
}

function buildAgentModelsPayload(explicitRelayApiKey?: string): any {
  const gatewayCfg: any = fs.existsSync(CONFIG_FILE)
    ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, ''))
    : {};
  const embeddedCfg = loadEmbeddedConfig();
  const mergedProviders: Record<string, any> = {};

  for (const [providerId, provider] of Object.entries(gatewayCfg?.models?.providers || {})) {
    mergedProviders[providerId] = JSON.parse(JSON.stringify(provider));
  }

  for (const [providerId, provider] of Object.entries(embeddedCfg?.models?.providers || {})) {
    mergedProviders[providerId] = {
      ...(mergedProviders[providerId] || {}),
      ...JSON.parse(JSON.stringify(provider)),
    };
  }

  const relayApiKey = buildRelayRuntimeApiKey(explicitRelayApiKey);
  if (mergedProviders.relay) {
    if (relayApiKey) {
      mergedProviders.relay.apiKey = relayApiKey;
    } else if (mergedProviders.relay.apiKey !== undefined) {
      delete mergedProviders.relay.apiKey;
    }
  }

  return {
    mode: gatewayCfg?.models?.mode || embeddedCfg?.models?.mode || 'merge',
    providers: mergedProviders,
  };
}

function getAllAgentIds(): string[] {
  const state = loadAppState();
  const ids = new Set<string>(['main']);
  for (const agent of state.agents || []) {
    if (String(agent?.id || '').trim()) ids.add(String(agent.id));
  }
  return Array.from(ids);
}

function getAgentModelsFile(agentId: string): string {
  return path.join(OPENCLAW_CONFIG_DIR, 'agents', agentId, 'agent', 'models.json');
}

export function syncAgentModelRegistries(explicitRelayApiKey?: string): void {
  try {
    const payload = JSON.stringify(buildAgentModelsPayload(explicitRelayApiKey), null, 2);
    for (const agentId of getAllAgentIds()) {
      const modelsFile = getAgentModelsFile(agentId);
      fs.mkdirSync(path.dirname(modelsFile), { recursive: true });
      const current = fs.existsSync(modelsFile) ? fs.readFileSync(modelsFile, 'utf8') : '';
      if (current !== payload) {
        fs.writeFileSync(modelsFile, payload, 'utf8');
      }
    }
  } catch (e: any) {
    console.error('[auth-model-sync] failed:', e.message);
  }
}

/**
 * Decode JWT payload without verification (just base64).
 * Returns null if the token is not a valid JWT shape.
 */
function decodeJwtPayload(token: string): { exp?: number; sub?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * If the current accessToken is expired or expiring within 5 minutes,
 * use the refreshToken to obtain a new pair and persist them.
 * Returns the (possibly refreshed) accessToken.
 */
export async function refreshJwtIfNeeded(relayBaseUrl?: string): Promise<string> {
  const state = loadAppState();
  const base = relayBaseUrl || state.relay?.baseUrl || RELAY_BASE_URL;
  const jwt = state.relay?.accessToken || '';
  if (!jwt) return '';

  const payload = decodeJwtPayload(jwt);
  if (!payload?.exp) return jwt;

  const nowSec = Math.floor(Date.now() / 1000);
  const FIVE_MIN = 5 * 60;
  if (payload.exp > nowSec + FIVE_MIN) return jwt; // still valid

  const refreshToken = state.relay?.refreshToken || '';
  if (!refreshToken) {
    console.log('[auth] JWT expired and no refreshToken available');
    return '';
  }

  try {
    const url = base.replace(/\/+$/, '') + '/v1/auth/refresh';
    const res = await axios.post(url, { refreshToken }, { timeout: 15000 });
    const tokens = res.data?.tokens;
    if (!tokens?.accessToken) throw new Error('No accessToken in refresh response');

    state.relay.accessToken = tokens.accessToken;
    state.relay.refreshToken = tokens.refreshToken || refreshToken;
    saveAppState(state);
    syncAgentModelRegistries(tokens.accessToken);
    console.log('[auth] JWT refreshed successfully');
    return tokens.accessToken;
  } catch (e: any) {
    await logDnsDiagnostics('relay-auth-refresh', e, base.replace(/\/+$/, '') + '/v1/auth/refresh');
    const status = e?.response?.status;
    const detail = e?.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.error(`[auth] JWT refresh failed: ${status || ''} ${detail}`);
    // Token is expired and refresh failed — clear stale tokens so callers
    // don't fall back to the expired accessToken.
    if (state.relay) {
      state.relay.accessToken = '';
      state.relay.refreshToken = '';
      saveAppState(state);
      console.log('[auth] Cleared expired tokens — user needs to re-login');
    }
    return '';
  }
}

/**
 * Ensure the gateway has at least one AI provider configured.
 * If no direct API key is set, configure the relay as a fallback provider
 * using `device:<deviceId>` as the auth token.
 */
export async function ensureGatewayProviderOrRelay(): Promise<void> {
  try {
    // If user already has a provider key, nothing to do
    const userProvider = getUserProviderConfig();
    if (userProvider) return;

    // Check relay credentials: JWT > deviceToken > deviceId
    const state = loadAppState();
    const rawRelayUrl = state.relay?.baseUrl || RELAY_BASE_URL;
    const relayUrl = rawRelayUrl.replace(/\/+$/, '') + '/v1';
    const deviceToken = state.deviceToken || '';
    const deviceId = state.deviceId || '';

    // Auto-refresh JWT if expired
    const jwt = await refreshJwtIfNeeded(rawRelayUrl);

    if (!relayUrl || (!jwt && !deviceToken && !deviceId)) return;

    // Prefer user JWT (logged in) > signed device token > unsigned device ID
    const relayApiKey = jwt || deviceToken || `device:${deviceId}`;
    const authType = jwt ? 'jwt' : deviceToken ? 'deviceToken' : 'deviceId';
    console.log(`[auth] Using ${authType} for relay auth (key length: ${relayApiKey.length})`);

    const RELAY_PROVIDER = 'relay';

    syncAuthProfileForProvider(RELAY_PROVIDER, relayApiKey);

    // Fetch available models from relay API (with cache-first strategy)
    const headers: Record<string, string> = {};
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
    if (deviceId) headers['X-Device-Id'] = deviceId;

    // Use previously cached relay models from openclaw.json if available,
    // then refresh in background to avoid blocking startup
    const existingCfg: any = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, ''))
      : {};
    const cachedModels = existingCfg?.models?.providers?.relay?.models;

    let relayModels: Array<{ id: string; name: string; available?: boolean }> = [];
    if (cachedModels?.length) {
      // Use cached models immediately, refresh async in background
      console.log('[auth] Using cached relay models, refreshing in background');
      relayModels = cachedModels.map((m: any) => ({ id: m.id, name: m.name || m.id, available: true }));
      // Fire-and-forget background refresh
      axios.get(`${relayUrl}/models`, { headers, timeout: 10000 }).then(res => {
        const fresh = res.data?.data || [];
        if (fresh.length) {
          console.log('[auth] Background relay models refresh complete:', fresh.length, 'models');
        }
      }).catch((error: any) => {
        void logDnsDiagnostics('relay-models-refresh-background', error, `${relayUrl}/models`);
      });
    } else {
      // No cache: must fetch synchronously on first launch
      try {
        const res = await axios.get(`${relayUrl}/models`, { headers, timeout: 10000 });
        relayModels = res.data?.data || [];
      } catch (e: any) {
        await logDnsDiagnostics('relay-models-fetch', e, `${relayUrl}/models`);
        console.log('[auth] Failed to fetch relay models, using fallback:', e.message);
      }
    }

    // Build gateway model list from relay models
    const gatewayModels = relayModels.length
      ? relayModels.map(m => ({ id: m.id, name: m.name || m.id, contextWindow: 180000, maxTokens: 8192 }))
      : [{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 180000, maxTokens: 8192 }];

    // Default to first available model
    const firstAvailable = relayModels.find(m => m.available !== false);
    const defaultModel = firstAvailable?.id || gatewayModels[0].id;

    const ocCfg: any = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, ''))
      : {};
    ocCfg.models = ocCfg.models || {};
    ocCfg.models.mode = ocCfg.models.mode || 'merge';
    ocCfg.models.providers = ocCfg.models.providers || {};

    // Clean up old 'anthropic' entry that pointed to relay (from previous versions)
    const oldAnthropic = ocCfg.models.providers['anthropic'];
    if (oldAnthropic?.baseUrl?.includes('myopenclaw-relay-service')) {
      delete ocCfg.models.providers['anthropic'];
    }

    ocCfg.models.providers[RELAY_PROVIDER] = {
      ...(ocCfg.models.providers[RELAY_PROVIDER] || {}),
      baseUrl: relayUrl,
      api: 'openai-completions',
      models: gatewayModels,
    };

    // Set default model and workspace — always use MyOpenClaw's own paths
    ocCfg.agents = ocCfg.agents || {};
    ocCfg.agents.defaults = ocCfg.agents.defaults || {};
    ocCfg.agents.defaults.model = {
      ...(ocCfg.agents.defaults.model || {}),
      primary: `${RELAY_PROVIDER}/${defaultModel}`,
    };
    const workspaceDir = path.join(OPENCLAW_CONFIG_DIR, 'workspace');
    fs.mkdirSync(path.join(workspaceDir, '.openclaw'), { recursive: true });
    ocCfg.agents.defaults.workspace = workspaceDir;

    // Ensure gateway HTTP chat completions endpoint is enabled
    ocCfg.gateway = ocCfg.gateway || {};
    ocCfg.gateway.http = ocCfg.gateway.http || {};
    ocCfg.gateway.http.endpoints = ocCfg.gateway.http.endpoints || {};
    ocCfg.gateway.http.endpoints.chatCompletions = { enabled: true };

    // Remove tools.profile to prevent upstream providers rejecting the tools parameter
    if (ocCfg.tools?.profile) {
      delete ocCfg.tools.profile;
    }

    // Only write if config actually changed — avoids triggering gateway reload
    const newContent = JSON.stringify(ocCfg, null, 2);
    const oldContent = fs.existsSync(CONFIG_FILE) ? fs.readFileSync(CONFIG_FILE, 'utf8') : '';
    if (newContent !== oldContent) {
      fs.writeFileSync(CONFIG_FILE, newContent, 'utf8');
      console.log('[auth] Configured relay provider fallback:', relayUrl);
    }
    syncAgentModelRegistries(relayApiKey);
  } catch (e: any) {
    console.error('[auth] ensureGatewayProviderOrRelay failed:', e.message);
  }
}
