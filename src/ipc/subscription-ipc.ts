import { ipcMain } from 'electron';
import axios from 'axios';
import { RELAY_BASE_URL } from '../constants';
import { refreshJwtIfNeeded } from '../auth';
import { applyPlanToState, loadAppState, saveAppState, getPlanFeatures, normalizePlan } from '../config-store';
import type { AppState, PremiumTier } from '../types';

async function syncSubscriptionFromRelay(state: AppState): Promise<boolean> {
  const relay = state.relay;
  const baseUrl = (relay?.baseUrl || RELAY_BASE_URL).replace(/\/+$/, '');
  const freshJwt = await refreshJwtIfNeeded(baseUrl);
  const authToken = freshJwt || relay?.accessToken || relay?.authToken;
  if (!authToken) return false;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${authToken}`,
  };
  if (state.deviceId) headers['X-Device-Id'] = state.deviceId;

  const response = await axios.get(`${baseUrl}/v1/usage`, { headers, timeout: 15000 });
  const remotePlan = normalizePlan(response.data?.usage?.plan);
  const currentPlan = normalizePlan(state.plan || state.premiumTier);
  if (remotePlan !== currentPlan) {
    applyPlanToState(state, remotePlan);
    saveAppState(state);
  }
  return true;
}

export function registerSubscriptionHandlers(): void {
  ipcMain.handle('set-user-api-key', async (_event, apiKey: string) => {
    const state = loadAppState();
    state.userApiKey = (apiKey || '').trim();
    state.userApiKeyQuotaUsed = 0;
    saveAppState(state);
    return { success: true, state };
  });

  ipcMain.handle('set-premium-status', async (_event, isPremium: boolean) => {
    const state = loadAppState();
    applyPlanToState(state, isPremium ? 'premium' : 'free');
    saveAppState(state);
    return { success: true, state };
  });

  ipcMain.handle('set-premium-tier', async (_event, tier: PremiumTier) => {
    const state = loadAppState();
    if (!['free', 'premium', 'pro'].includes(tier)) {
      return { success: false, error: 'Invalid tier' };
    }
    applyPlanToState(state, tier);
    saveAppState(state);
    return { success: true, state };
  });

  ipcMain.handle('get-subscription-status', async () => {
    const state = loadAppState();
    try {
      await syncSubscriptionFromRelay(state);
    } catch (e: any) {
      console.warn('[subscription] relay sync skipped:', e?.message || e);
    }
    const plan = state.plan || state.premiumTier || 'free';
    const features = getPlanFeatures(plan);
    return { plan, planExpiresAt: state.planExpiresAt || null, features };
  });

  ipcMain.handle('create-checkout-session', async (_event, data: { plan?: string }) => {
    const { plan } = data || {};
    if (!plan || !['free', 'premium', 'pro'].includes(plan)) {
      return { success: false, error: 'Invalid plan' };
    }
    const state = loadAppState();
    applyPlanToState(state, plan, null);
    saveAppState(state);
    return { success: true, mock: true };
  });

  ipcMain.handle('activate-subscription', async (_event, data: { plan?: string; expiresAt?: string }) => {
    const { plan, expiresAt } = data || {};
    if (!plan || !['free', 'premium', 'pro'].includes(plan)) {
      return { success: false, error: 'Invalid plan' };
    }
    const state = loadAppState();
    applyPlanToState(state, plan, expiresAt || null);
    saveAppState(state);
    return { success: true };
  });
}
