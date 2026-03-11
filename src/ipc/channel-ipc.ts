import * as fs from 'fs';
import { ipcMain } from 'electron';
import { loadEmbeddedConfig, saveEmbeddedConfig } from '../config-store';
import { CONFIG_FILE } from '../constants';
import { ensureGatewayProviderOrRelay } from '../auth';

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
}
