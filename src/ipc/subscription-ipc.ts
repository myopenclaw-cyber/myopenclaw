import { ipcMain } from 'electron';
import { loadAppState, saveAppState, getPlanFeatures } from '../config-store';
import type { PremiumTier } from '../types';

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
    state.premiumTier = isPremium ? 'premium' : 'free';
    state.isPremium = state.premiumTier !== 'free';
    state.plan = state.premiumTier;
    saveAppState(state);
    return { success: true, state };
  });

  ipcMain.handle('set-premium-tier', async (_event, tier: PremiumTier) => {
    const state = loadAppState();
    if (!['free', 'premium', 'pro'].includes(tier)) {
      return { success: false, error: 'Invalid tier' };
    }
    state.premiumTier = tier;
    state.isPremium = tier !== 'free';
    state.plan = tier;
    saveAppState(state);
    return { success: true, state };
  });

  ipcMain.handle('get-subscription-status', async () => {
    const state = loadAppState();
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
    state.plan = plan as PremiumTier;
    state.planExpiresAt = null;
    state.premiumTier = plan as PremiumTier;
    state.isPremium = plan !== 'free';
    saveAppState(state);
    return { success: true, mock: true };
  });

  ipcMain.handle('activate-subscription', async (_event, data: { plan?: string; expiresAt?: string }) => {
    const { plan, expiresAt } = data || {};
    if (!plan || !['free', 'premium', 'pro'].includes(plan)) {
      return { success: false, error: 'Invalid plan' };
    }
    const state = loadAppState();
    state.plan = plan as PremiumTier;
    state.planExpiresAt = expiresAt || null;
    state.premiumTier = plan as PremiumTier;
    state.isPremium = plan !== 'free';
    saveAppState(state);
    return { success: true };
  });
}
