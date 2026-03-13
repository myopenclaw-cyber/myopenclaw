import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { AUTH_PROFILES_DIR, AUTH_PROFILES_FILE, CONFIG_FILE, OPENCLAW_CONFIG_DIR, RELAY_BASE_URL } from './constants';
import { loadEmbeddedConfig, loadAppState, saveAppState, getUserProviderConfig } from './config-store';

export function syncAuthProfileForProvider(providerId: string, apiKey: string, api: string = ''): void {
  try {
    const key = String(apiKey || '').trim();
    if (!providerId || !key) return;
    fs.mkdirSync(AUTH_PROFILES_DIR, { recursive: true });
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
    const newContent = JSON.stringify(auth, null, 2);
    const oldContent = fs.existsSync(AUTH_PROFILES_FILE) ? fs.readFileSync(AUTH_PROFILES_FILE, 'utf8') : '';
    if (newContent !== oldContent) {
      fs.writeFileSync(AUTH_PROFILES_FILE, newContent, 'utf8');
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
      break;
    }
  } catch (e: any) {
    console.error('[auth-profile-sync-bootstrap] failed:', e.message);
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
    console.log('[auth] JWT refreshed successfully');
    return tokens.accessToken;
  } catch (e: any) {
    const status = e?.response?.status;
    const detail = e?.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.error(`[auth] JWT refresh failed: ${status || ''} ${detail}`);
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
      }).catch(() => { /* background refresh failed, cached models still valid */ });
    } else {
      // No cache: must fetch synchronously on first launch
      try {
        const res = await axios.get(`${relayUrl}/models`, { headers, timeout: 10000 });
        relayModels = res.data?.data || [];
      } catch (e: any) {
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
  } catch (e: any) {
    console.error('[auth] ensureGatewayProviderOrRelay failed:', e.message);
  }
}
