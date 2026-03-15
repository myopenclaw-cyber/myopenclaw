import * as fs from 'fs';
import { ipcMain } from 'electron';
import { OPENCLAW_CONFIG_DIR, CONFIG_FILE, AUTH_PROFILES_DIR, AUTH_PROFILES_FILE } from '../constants';
import { loadEmbeddedConfig, saveEmbeddedConfig, loadAppState } from '../config-store';
import { syncAuthProfileForProvider, syncAgentModelRegistries } from '../auth';
import type { GatewayHandle, LoadingStatusCallback } from '../types';

export function registerProviderHandlers(
  getGatewayHandle: () => GatewayHandle | null,
  onStartGateway: () => Promise<void>,
): void {
  ipcMain.handle('save-provider-config', async (_event, payload) => {
    try {
      const { providerId = 'default', baseUrl = '', apiKey = '', api = '', modelId = 'default' } = payload || {};
      const cleanProviderId = String(providerId || '').trim();
      const cleanModelId = String(modelId || '').trim();
      const autoApi = String(api || '').trim() || 'openai-completions';
      if (!cleanProviderId) return { success: false, error: 'Provider Name is required' };
      if (!cleanModelId) return { success: false, error: 'Model Name is required' };
      if (!String(apiKey || '').trim()) return { success: false, error: 'API Key is required' };

      const cfg = loadEmbeddedConfig();
      cfg.models = cfg.models || {};
      cfg.models.mode = cfg.models.mode || 'merge';
      cfg.models.providers = cfg.models.providers || {};

      cfg.models.providers[cleanProviderId] = {
        ...(cfg.models.providers[cleanProviderId] || {}),
        baseUrl, apiKey, api: autoApi,
        models: [{ id: cleanModelId, name: cleanModelId }],
      };

      cfg.agents = cfg.agents || {};
      cfg.agents.defaults = cfg.agents.defaults || {};
      cfg.agents.defaults.model = cfg.agents.defaults.model || {};
      cfg.agents.defaults.model.primary = `${cleanProviderId}/${cleanModelId}`;
      if (cfg.agents.defaults.model.fallback !== undefined) delete cfg.agents.defaults.model.fallback;

      saveEmbeddedConfig(cfg);
      syncAuthProfileForProvider(cleanProviderId, apiKey, autoApi);
      syncAgentModelRegistries();

      const gw = getGatewayHandle();
      if (!gw?.baseUrl) {
        try {
          if (!fs.existsSync(CONFIG_FILE)) {
            fs.mkdirSync(OPENCLAW_CONFIG_DIR, { recursive: true });
            const gatewayConfig = {
              gateway: { auth: { mode: 'token' }, http: { endpoints: { chatCompletions: { enabled: true } } } },
              models: {
                mode: 'merge',
                providers: {
                  [cleanProviderId]: {
                    baseUrl: baseUrl || undefined,
                    apiKey,
                    api: autoApi,
                    models: [{ id: cleanModelId, name: cleanModelId }],
                  },
                },
              },
            };
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(gatewayConfig, null, 2));
            console.log('[save-provider] Created gateway config, starting gateway...');
          }
          await onStartGateway();
        } catch (gwErr: any) {
          console.error('[save-provider] Gateway start failed:', gwErr.message);
        }
      }

      return { success: true, apiResolved: autoApi, modelResolved: `${cleanProviderId}/${cleanModelId}` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-provider-config', async () => {
    try {
      const cfg = loadEmbeddedConfig();
      const providers = cfg?.models?.providers || {};
      const entries = Object.entries(providers);

      // Check embedded-config providers (user API key)
      if (entries.length) {
        const [providerId, p] = entries[0];
        if (String(p?.apiKey || '').trim()) {
          return {
            success: true,
            configured: true,
            provider: {
              providerId,
              modelId: p?.models?.[0]?.id || 'default',
              api: p?.api || 'openai-completions',
              baseUrl: p?.baseUrl || '',
              apiKey: p?.apiKey || '',
            },
          };
        }
      }

      // Check relay mode (device token or device ID = relay is configured)
      const state = loadAppState();
      const hasRelay = !!(state.deviceToken || state.deviceId);
      return { success: true, configured: hasRelay };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('delete-provider-config', async (_event, providerId: string) => {
    try {
      const cfg = loadEmbeddedConfig();
      cfg.models = cfg.models || {};
      cfg.models.providers = cfg.models.providers || {};
      const id = String(providerId || '').trim();
      if (id && cfg.models.providers[id]) delete cfg.models.providers[id];
      cfg.agents = cfg.agents || {};
      cfg.agents.defaults = cfg.agents.defaults || {};
      cfg.agents.defaults.model = cfg.agents.defaults.model || {};
      cfg.agents.defaults.model.primary = 'openclaw:main';
      if (cfg.agents.defaults.model.fallback !== undefined) delete cfg.agents.defaults.model.fallback;
      saveEmbeddedConfig(cfg);
      syncAgentModelRegistries();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('reset-model-config', async () => {
    try {
      const cfg = loadEmbeddedConfig();
      cfg.models = { mode: 'merge', providers: {} };
      cfg.agents = cfg.agents || {};
      cfg.agents.defaults = cfg.agents.defaults || {};
      if (cfg.agents.defaults.model !== undefined) delete cfg.agents.defaults.model;
      saveEmbeddedConfig(cfg);

      fs.mkdirSync(AUTH_PROFILES_DIR, { recursive: true });
      fs.writeFileSync(AUTH_PROFILES_FILE, JSON.stringify({ version: 1, profiles: {}, lastGood: {}, usageStats: {} }, null, 2), 'utf8');
      syncAgentModelRegistries();

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Setup wizard - save initial config
  ipcMain.handle('save-config', async (_event, config: { provider?: string; apiKey?: string; baseUrl?: string }) => {
    try {
      if (!fs.existsSync(OPENCLAW_CONFIG_DIR)) {
        fs.mkdirSync(OPENCLAW_CONFIG_DIR, { recursive: true });
      }
      const providerId = config.provider === 'openai' ? 'openai' : 'anthropic';
      const modelId = config.provider === 'openai' ? 'gpt-4' : 'claude-3-5-sonnet-20241022';
      const openclawConfig = {
        gateway: { auth: { mode: 'token' }, http: { endpoints: { chatCompletions: { enabled: true } } } },
        models: {
          mode: 'merge',
          providers: {
            [providerId]: {
              apiKey: config.apiKey,
              baseUrl: config.baseUrl || undefined,
              api: 'openai-completions',
              models: [{ id: modelId, name: modelId }],
            },
          },
        },
      };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(openclawConfig, null, 2));
      syncAgentModelRegistries();
      await onStartGateway();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
