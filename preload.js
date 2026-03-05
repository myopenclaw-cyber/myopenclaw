const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  sendMessage: (payload) => ipcRenderer.invoke('send-message', payload),
  getGatewayInfo: () => ipcRenderer.invoke('get-gateway-info'),
  openGatewayDashboard: () => ipcRenderer.invoke('open-gateway-dashboard'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getAppState: () => ipcRenderer.invoke('get-app-state'),
  getAgentConversation: (agentId) => ipcRenderer.invoke('get-agent-conversation', agentId),
  setUserApiKey: (apiKey) => ipcRenderer.invoke('set-user-api-key', apiKey),
  setPremiumStatus: (isPremium) => ipcRenderer.invoke('set-premium-status', isPremium),
  setPremiumTier: (tier) => ipcRenderer.invoke('set-premium-tier', tier),
  listAgents: () => ipcRenderer.invoke('list-agents'),
  addAgent: (payload) => ipcRenderer.invoke('add-agent', payload),
  renameAgent: (payload) => ipcRenderer.invoke('rename-agent', payload),
  setAgentChannels: (payload) => ipcRenderer.invoke('set-agent-channels', payload),
  deleteAgent: (id) => ipcRenderer.invoke('delete-agent', id),
  setActiveAgent: (id) => ipcRenderer.invoke('set-active-agent', id),
  saveProviderConfig: (payload) => ipcRenderer.invoke('save-provider-config', payload),
  saveAgentChannelConfig: (payload) => ipcRenderer.invoke('save-agent-channel-config', payload),
  createCheckoutSession: (plan) => ipcRenderer.invoke('create-checkout-session', plan),
  getStartupError: () => ipcRenderer.invoke('get-startup-error'),
  getLocalAppConfig: () => ipcRenderer.invoke('get-local-app-config'),
  saveLocalAppConfig: (patch) => ipcRenderer.invoke('save-local-app-config', patch)
});
