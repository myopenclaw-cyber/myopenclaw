import * as fs from 'fs';
import * as path from 'path';
import { AUTH_PROFILES_DIR, AUTH_PROFILES_FILE, CONFIG_FILE, OPENCLAW_CONFIG_DIR, RELAY_BASE_URL } from './constants';
import { loadEmbeddedConfig, loadAppState, getUserProviderConfig } from './config-store';

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
    fs.writeFileSync(AUTH_PROFILES_FILE, JSON.stringify(auth, null, 2), 'utf8');
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
 * Ensure the gateway has at least one AI provider configured.
 * If no direct API key is set, configure the relay as a fallback provider
 * using `device:<deviceId>` as the auth token.
 */
export function ensureGatewayProviderOrRelay(): void {
  try {
    // If user already has a provider key, nothing to do
    const userProvider = getUserProviderConfig();
    if (userProvider) return;

    // Check relay + deviceToken (signed) or deviceId (fallback)
    const state = loadAppState();
    const rawRelayUrl = state.relay?.baseUrl || RELAY_BASE_URL;
    const relayUrl = rawRelayUrl.replace(/\/+$/, '') + '/v1';
    const deviceToken = state.deviceToken || '';
    const deviceId = state.deviceId || '';
    if (!relayUrl || (!deviceToken && !deviceId)) return;

    // Prefer signed token; fall back to unsigned for initial registration
    const relayApiKey = deviceToken || `device:${deviceId}`;

    // Use 'relay' provider name — gateway hardcodes Anthropic Messages API
    // for provider named 'anthropic', ignoring the api field
    const RELAY_PROVIDER = 'relay';
    const RELAY_MODEL = 'claude-opus-4-6';

    syncAuthProfileForProvider(RELAY_PROVIDER, relayApiKey);

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
      models: (ocCfg.models.providers[RELAY_PROVIDER]?.models?.length)
        ? ocCfg.models.providers[RELAY_PROVIDER].models
        : [{ id: RELAY_MODEL, name: 'Claude Opus 4.6', contextWindow: 180000, maxTokens: 8192 }],
    };

    // Set default model and workspace — always use MyOpenClaw's own paths
    ocCfg.agents = ocCfg.agents || {};
    ocCfg.agents.defaults = ocCfg.agents.defaults || {};
    ocCfg.agents.defaults.model = {
      ...(ocCfg.agents.defaults.model || {}),
      primary: `${RELAY_PROVIDER}/${RELAY_MODEL}`,
    };
    ocCfg.agents.defaults.workspace = path.join(OPENCLAW_CONFIG_DIR, 'workspace');

    // Remove tools.profile to prevent upstream providers rejecting the tools parameter
    if (ocCfg.tools?.profile) {
      delete ocCfg.tools.profile;
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(ocCfg, null, 2), 'utf8');
    console.log('[auth] Configured relay provider fallback:', relayUrl);
  } catch (e: any) {
    console.error('[auth] ensureGatewayProviderOrRelay failed:', e.message);
  }
}
