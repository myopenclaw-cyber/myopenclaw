import { describe, it, expect } from 'vitest';
import { getPlanFeatures, checkPremiumGate, getDefaultAppState } from '../config-store';
import type { AppState } from '../types';

describe('getPlanFeatures', () => {
  it('returns free tier features by default', () => {
    const features = getPlanFeatures('free');
    expect(features.maxAgents).toBe(1);
    expect(features.canUseRelay).toBe(true);
    expect(features.modelTier).toBe('basic');
  });

  it('returns premium tier features', () => {
    const features = getPlanFeatures('premium');
    expect(features.maxAgents).toBe(5);
    expect(features.modelTier).toBe('sonnet');
  });

  it('returns pro tier features with unlimited agents', () => {
    const features = getPlanFeatures('pro');
    expect(features.maxAgents).toBe(-1);
    expect(features.modelTier).toBe('opus');
  });

  it('returns free tier for unknown plan', () => {
    const features = getPlanFeatures('unknown');
    expect(features.maxAgents).toBe(1);
    expect(features.modelTier).toBe('basic');
  });
});

describe('checkPremiumGate', () => {
  function makeState(overrides: Partial<AppState> = {}): AppState {
    return { ...getDefaultAppState(), ...overrides };
  }

  it('allows premium tier', () => {
    const result = checkPremiumGate(makeState({ premiumTier: 'premium' }));
    expect(result.allow).toBe(true);
    if (result.allow) expect(result.tier).toBe('premium');
  });

  it('allows pro tier', () => {
    const result = checkPremiumGate(makeState({ premiumTier: 'pro' }));
    expect(result.allow).toBe(true);
    if (result.allow) expect(result.tier).toBe('pro');
  });

  it('allows free tier with relay configured', () => {
    const result = checkPremiumGate(makeState({
      premiumTier: 'free',
      relay: { baseUrl: 'http://relay', authToken: 'tok', accessToken: '', refreshToken: '', userEmail: '' },
    }));
    expect(result.allow).toBe(true);
  });

  it('allows free tier with user API key', () => {
    const result = checkPremiumGate(makeState({
      premiumTier: 'free',
      userApiKey: 'sk-test',
    }));
    expect(result.allow).toBe(true);
    if (result.allow) expect(result.tier).toBe('user_api_key');
  });

  it('allows free tier under quota', () => {
    const result = checkPremiumGate(makeState({
      premiumTier: 'free',
      freeQuotaUsed: 5,
    }));
    expect(result.allow).toBe(true);
    if (result.allow) expect(result.tier).toBe('free');
  });

  it('blocks free tier when quota exhausted', () => {
    const result = checkPremiumGate(makeState({
      premiumTier: 'free',
      freeQuotaUsed: 10,
    }));
    expect(result.allow).toBe(false);
  });
});

describe('getDefaultAppState', () => {
  it('returns consistent defaults', () => {
    const state = getDefaultAppState();
    expect(state.premiumTier).toBe('free');
    expect(state.isPremium).toBe(false);
    expect(state.activeAgentId).toBe('main');
    expect(state.agents).toHaveLength(1);
    expect(state.agents[0].id).toBe('main');
  });
});
