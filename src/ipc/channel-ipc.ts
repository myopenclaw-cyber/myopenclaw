import * as fs from 'fs';
import * as path from 'path';
import { ipcMain } from 'electron';
import axios from 'axios';
import { loadEmbeddedConfig, saveEmbeddedConfig } from '../config-store';
import { CONFIG_FILE, OPENCLAW_CONFIG_DIR } from '../constants';
import { ensureGatewayProviderOrRelay } from '../auth';

function maskToken(token: string): string {
  if (!token || token.length <= 12) return '****';
  const prefix = token.slice(0, 10);
  const suffix = token.slice(-10);
  return prefix + '****' + suffix;
}

const botNameCache = new Map<string, string>();

async function fetchTelegramBotName(botToken: string): Promise<string> {
  const cacheKey = botToken.slice(-10);
  const cached = botNameCache.get(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const res = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 5000 });
    const name = res.data?.result?.username || '';
    botNameCache.set(cacheKey, name);
    return name;
  } catch {
    botNameCache.set(cacheKey, '');
    return '';
  }
}

/**
 * Sync channels from embedded-config.json into openclaw.json
 * so the running gateway picks up channel changes via config reload.
 */
function syncChannelsToGatewayConfig(channels: Record<string, unknown>): void {
  try {
    const ocCfg: any = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, ''))
      : {};
    ocCfg.channels = { ...(ocCfg.channels || {}), ...channels };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(ocCfg, null, 2), 'utf8');
    console.log('[channel-ipc] Synced channels to openclaw.json');
  } catch (e: any) {
    console.error('[channel-ipc] Failed to sync channels:', e.message);
  }
}

export function registerChannelHandlers(): void {
  ipcMain.handle('save-agent-channel-config', async (_event, payload) => {
    try {
      const { agentId, channelType, configJson } = payload || {};
      const parsed = configJson ? JSON.parse(configJson) : {};
      const cfg = loadEmbeddedConfig();
      cfg.channels = cfg.channels || {};
      cfg.channels[channelType] = cfg.channels[channelType] || { enabled: true, accounts: {} };
      cfg.channels[channelType].enabled = true;
      cfg.channels[channelType].accounts = cfg.channels[channelType].accounts || {};
      cfg.channels[channelType].accounts[agentId || 'default'] = parsed;
      saveEmbeddedConfig(cfg);

      // Also sync to openclaw.json so the running gateway picks it up
      syncChannelsToGatewayConfig(cfg.channels);

      // Ensure gateway has a provider (relay fallback if no API key)
      ensureGatewayProviderOrRelay();

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Return configured channels, their config (masked), and paired users
  ipcMain.handle('get-channel-status', async () => {
    try {
      const cfg = loadEmbeddedConfig();
      const channels: Record<string, {
        enabled: boolean;
        accounts: Record<string, Record<string, unknown>>;
        pairedUsers: Record<string, Array<{ id: string }>>;
      }> = {};

      const cfgChannels = cfg.channels || {};
      const credDir = path.join(OPENCLAW_CONFIG_DIR, 'credentials');

      for (const [channelType, channelCfg] of Object.entries(cfgChannels)) {
        const ch = channelCfg as { enabled?: boolean; accounts?: Record<string, Record<string, unknown>> };
        if (!ch.accounts || !Object.keys(ch.accounts).length) continue;

        const accounts: Record<string, Record<string, unknown>> = {};
        const pairedUsers: Record<string, Array<{ id: string }>> = {};

        for (const [accountId, accountCfg] of Object.entries(ch.accounts)) {
          const masked: Record<string, unknown> = { ...(accountCfg || {}) };

          // Mask sensitive token fields for display
          for (const key of ['botToken', 'token', 'apiKey']) {
            if (typeof masked[key] === 'string' && (masked[key] as string).length > 0) {
              masked[`_raw_${key}`] = masked[key];
              masked[key] = maskToken(masked[key] as string);
            }
          }

          // Fetch bot name for Telegram
          if (channelType === 'telegram' && accountCfg?.botToken) {
            const botName = await fetchTelegramBotName(accountCfg.botToken as string);
            if (botName) masked._botName = botName;
          }

          accounts[accountId] = masked;

          const allowFile = path.join(credDir, `${channelType}-${accountId}-allowFrom.json`);
          try {
            if (fs.existsSync(allowFile)) {
              const data = JSON.parse(fs.readFileSync(allowFile, 'utf8'));
              pairedUsers[accountId] = (data.allowFrom || []).map((id: string) => ({ id }));
            }
          } catch { /* ignore */ }
        }

        channels[channelType] = {
          enabled: ch.enabled !== false,
          accounts,
          pairedUsers,
        };
      }

      return { success: true, channels };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}
