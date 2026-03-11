import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import {
  OPENCLAW_CONFIG_DIR,
  EMBEDDED_CONFIG_FILE,
  APP_STATE_FILE,
  DEFAULT_PORT,
} from './constants';
import type {
  AppState,
  RelayConfig,
  PremiumTier,
  PlanFeatures,
  PremiumGateResult,
  EmbeddedConfig,
  ProviderConfig,
} from './types';

// ---------------------------------------------------------------------------
// Gateway token helpers
// ---------------------------------------------------------------------------

export function readGatewayTokenFromConfig(): string {
  try {
    if (!fs.existsSync(EMBEDDED_CONFIG_FILE)) return '';
    const config = JSON.parse(fs.readFileSync(EMBEDDED_CONFIG_FILE, 'utf8').replace(/^\uFEFF/, ''));
    return String(config?.gateway?.auth?.token || '').trim();
  } catch {
    return '';
  }
}

export function ensureRandomGatewayToken(): string {
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

export function buildDashboardUrl(baseUrl: string, gatewayBaseUrl?: string | null): string {
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
// App State (persisted to app-state.json)
// ---------------------------------------------------------------------------

export function getDefaultAppState(): AppState {
  return {
    premiumTier: 'free',
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
        channels: [],
      },
    ],
    conversations: {},
    relay: { baseUrl: '', authToken: '', accessToken: '', refreshToken: '', userEmail: '' },
    deviceId: '',
    deviceToken: '',
  };
}

export function getPlanFeatures(plan: string): PlanFeatures {
  const features: Record<string, PlanFeatures> = {
    free: { maxAgents: 1, canUseRelay: true, modelTier: 'basic' },
    premium: { maxAgents: 5, canUseRelay: true, modelTier: 'sonnet' },
    pro: { maxAgents: -1, canUseRelay: true, modelTier: 'opus' },
  };
  return features[plan] || features.free;
}

export function loadAppState(): AppState {
  try {
    if (!fs.existsSync(APP_STATE_FILE)) {
      saveAppState(getDefaultAppState());
      return getDefaultAppState();
    }
    const state: AppState = { ...getDefaultAppState(), ...JSON.parse(fs.readFileSync(APP_STATE_FILE, 'utf8')) };
    if (!state.premiumTier) state.premiumTier = state.isPremium ? 'premium' : 'free';
    state.isPremium = state.premiumTier !== 'free';
    if (!state.plan || state.plan === 'free') state.plan = state.premiumTier;
    return state;
  } catch (error: any) {
    console.error('[app-state] load failed, using default:', error.message);
    return getDefaultAppState();
  }
}

export function saveAppState(state: AppState): void {
  const dir = path.dirname(APP_STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(APP_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Premium / quota helpers
// ---------------------------------------------------------------------------

const ANONYMOUS_FREE_LIMIT = 3;

export function checkPremiumGate(state: AppState): PremiumGateResult {
  if (state.premiumTier === 'premium' || state.premiumTier === 'pro') {
    return { allow: true, tier: state.premiumTier };
  }
  const relay: RelayConfig = state.relay || { baseUrl: '', authToken: '', accessToken: '', refreshToken: '', userEmail: '' };
  const hasRelay = !!(relay.accessToken || relay.authToken);
  if (hasRelay) {
    return { allow: true, tier: 'free' };
  }
  if (state.userApiKey) {
    return { allow: true, tier: 'user_api_key' };
  }
  if (state.freeQuotaUsed < ANONYMOUS_FREE_LIMIT) {
    return { allow: true, tier: 'anonymous' };
  }
  return {
    allow: false,
    reason: 'login_required',
    message: "You've used your 3 free messages. Sign in to continue chatting.",
    loginRequired: true,
  };
}

export function consumeQuota(state: AppState, tier: string): void {
  if (tier === 'free' || tier === 'anonymous') state.freeQuotaUsed += 1;
  if (tier === 'user_api_key') state.userApiKeyQuotaUsed += 1;
}

// ---------------------------------------------------------------------------
// Embedded OpenClaw config (embedded-config.json)
// ---------------------------------------------------------------------------

export function loadEmbeddedConfig(): EmbeddedConfig {
  try {
    if (!fs.existsSync(EMBEDDED_CONFIG_FILE)) return {};
    const raw = fs.readFileSync(EMBEDDED_CONFIG_FILE, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch (e: any) {
    console.error('[embedded-config] load failed:', e.message);
    return {};
  }
}

export function saveEmbeddedConfig(config: EmbeddedConfig): void {
  const dir = path.dirname(EMBEDDED_CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(EMBEDDED_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

export function getUserProviderConfig(): ProviderConfig | null {
  const cfg = loadEmbeddedConfig();
  const providers = cfg?.models?.providers || {};
  for (const [providerId, p] of Object.entries(providers)) {
    const apiKey = String(p?.apiKey || '').trim();
    if (apiKey) {
      return {
        providerId,
        baseUrl: String(p?.baseUrl || '').trim(),
        apiKey,
        modelId: p?.models?.[0]?.id || 'default',
        api: p?.api || 'openai-completions',
      };
    }
  }
  return null;
}
