import * as crypto from 'crypto';
import { ipcMain } from 'electron';
import { loadAppState, saveAppState, getPlanFeatures } from '../config-store';

export function registerAgentHandlers(): void {
  ipcMain.handle('list-agents', async () => {
    const state = loadAppState();
    return state.agents;
  });

  ipcMain.handle('add-agent', async (_event, data) => {
    const state = loadAppState();
    const plan = state.plan || state.premiumTier || 'free';
    const features = getPlanFeatures(plan);
    const totalAgents = state.agents.length;

    if (features.maxAgents !== -1 && totalAgents >= features.maxAgents) {
      return { error: 'upgrade_required', message: 'Upgrade to add more agents' };
    }

    const name = (typeof data === 'string' ? data : data?.name) || `Agent ${state.agents.length + 1}`;
    const newAgent = { id: crypto.randomUUID(), name, channels: [] as string[] };
    state.agents.push(newAgent);
    state.activeAgentId = newAgent.id;
    saveAppState(state);
    return newAgent;
  });

  ipcMain.handle('rename-agent', async (_event, payload) => {
    const state = loadAppState();
    const agentId = payload.agentId || payload.id;
    if (agentId === 'main') return { success: false, error: 'Cannot rename main agent' };
    const agent = state.agents.find(a => a.id === agentId);
    if (!agent) return { success: false, error: 'Agent not found' };
    agent.name = payload.name || agent.name;
    saveAppState(state);
    return { success: true, agents: state.agents };
  });

  ipcMain.handle('set-agent-channels', async (_event, payload) => {
    const state = loadAppState();
    const agent = state.agents.find(a => a.id === payload.id);
    if (!agent) return { success: false, error: 'Agent not found' };
    agent.channels = Array.isArray(payload.channels) ? payload.channels : [];
    saveAppState(state);
    return { success: true, agents: state.agents };
  });

  ipcMain.handle('delete-agent', async (_event, agentId: string) => {
    const state = loadAppState();
    if (agentId === 'main') return { success: false, error: 'Main agent cannot be deleted' };
    const index = state.agents.findIndex(a => a.id === agentId);
    if (index < 0) return { success: false, error: 'Agent not found' };
    state.agents.splice(index, 1);
    if (state.activeAgentId === agentId) state.activeAgentId = 'main';
    if (state.conversations) delete state.conversations[agentId];
    saveAppState(state);
    return { success: true, agents: state.agents, state };
  });

  ipcMain.handle('set-active-agent', async (_event, id: string) => {
    const state = loadAppState();
    if (!state.agents.find(a => a.id === id)) return { success: false, error: 'Agent not found' };
    state.activeAgentId = id;
    saveAppState(state);
    return { success: true, state };
  });
}
