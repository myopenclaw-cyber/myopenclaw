import type { ChildProcess } from 'child_process';

// ---------------------------------------------------------------------------
// Agent & Conversation
// ---------------------------------------------------------------------------

export interface Agent {
  id: string;
  name: string;
  channels: string[];
  soul?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

// ---------------------------------------------------------------------------
// Relay
// ---------------------------------------------------------------------------

export interface RelayConfig {
  baseUrl: string;
  authToken: string;
  accessToken: string;
  refreshToken: string;
  userEmail: string;
}

// ---------------------------------------------------------------------------
// App State (persisted to app-state.json)
// ---------------------------------------------------------------------------

export type PremiumTier = 'free' | 'premium' | 'pro';

export type UpdateChannel = 'stable' | 'beta';

export interface AppState {
  premiumTier: PremiumTier;
  isPremium: boolean;
  plan: PremiumTier;
  planExpiresAt: string | null;
  freeQuotaUsed: number;
  userApiKey: string;
  userApiKeyQuotaUsed: number;
  activeAgentId: string;
  agents: Agent[];
  conversations: Record<string, ConversationMessage[]>;
  relay: RelayConfig;
  deviceId: string;
  deviceToken: string;
  updateChannel: UpdateChannel;
}

// ---------------------------------------------------------------------------
// Plan Features
// ---------------------------------------------------------------------------

export interface PlanFeatures {
  maxAgents: number;
  canUseRelay: boolean;
  modelTier: string;
}

// ---------------------------------------------------------------------------
// Premium Gate
// ---------------------------------------------------------------------------

export type PremiumGateResult =
  | { allow: true; tier: string }
  | { allow: false; reason: string; message: string; loginRequired?: boolean; premiumRequired?: boolean };

// ---------------------------------------------------------------------------
// Embedded Config (embedded-config.json)
// ---------------------------------------------------------------------------

export interface ProviderEntry {
  baseUrl?: string;
  apiKey?: string;
  api?: string;
  models?: Array<{ id: string; name: string }>;
}

export interface EmbeddedConfig {
  gateway?: {
    auth?: { token?: string; mode?: string };
    http?: {
      endpoints?: {
        chatCompletions?: { enabled: boolean };
      };
    };
  };
  models?: {
    mode?: string;
    providers?: Record<string, ProviderEntry>;
  };
  agents?: {
    defaults?: {
      model?: {
        primary?: string;
        fallback?: string;
      };
    };
  };
  channels?: Record<string, {
    enabled: boolean;
    accounts: Record<string, unknown>;
  }>;
}

// ---------------------------------------------------------------------------
// Provider Config (resolved from embedded-config)
// ---------------------------------------------------------------------------

export interface ProviderConfig {
  providerId: string;
  baseUrl: string;
  apiKey: string;
  modelId: string;
  api: string;
}

// ---------------------------------------------------------------------------
// Gateway Handle (returned by startGateway)
// ---------------------------------------------------------------------------

export interface GatewayHandle {
  port: number;
  baseUrl: string;
  process: ChildProcess | null;
  token: string;
}

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

export type LoadingStatusCallback = (message: string, percent: number) => void;
