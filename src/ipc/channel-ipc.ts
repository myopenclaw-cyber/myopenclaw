import { ipcMain } from 'electron';
import { loadEmbeddedConfig, saveEmbeddedConfig } from '../config-store';

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
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}
