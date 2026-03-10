import { app, ipcMain } from 'electron';
import { loadAppState, checkPremiumGate } from '../config-store';
import { loadAgentConversationFromOpenClaw } from '../conversation';

export function registerAppStateHandlers(): void {
  ipcMain.handle('get-app-state', async () => {
    const state = loadAppState();
    const gate = checkPremiumGate(state);
    return { ...state, gate };
  });

  ipcMain.handle('get-agent-conversation', async (_event, agentId: string = 'main') => {
    const conversation = loadAgentConversationFromOpenClaw(agentId, 120);
    return { success: true, conversation };
  });

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });
}
