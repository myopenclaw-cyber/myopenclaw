const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Setup
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // Chat
  sendMessage: (payload) => ipcRenderer.invoke('send-message', payload),

  // Gateway
  getGatewayInfo: () => ipcRenderer.invoke('get-gateway-info'),
  openGatewayDashboard: () => ipcRenderer.invoke('open-gateway-dashboard'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getStartupError: () => ipcRenderer.invoke('get-startup-error'),

  // App state
  getAppState: () => ipcRenderer.invoke('get-app-state'),
  getAgentConversation: (agentId) => ipcRenderer.invoke('get-agent-conversation', agentId),

  // Premium / quota
  setUserApiKey: (apiKey) => ipcRenderer.invoke('set-user-api-key', apiKey),
  setPremiumStatus: (isPremium) => ipcRenderer.invoke('set-premium-status', isPremium),
  setPremiumTier: (tier) => ipcRenderer.invoke('set-premium-tier', tier),

  // Subscription (Worktree B)
  getSubscriptionStatus: () => ipcRenderer.invoke('get-subscription-status'),
  createCheckoutSession: (plan) => ipcRenderer.invoke('create-checkout-session', { plan }),
  activateSubscription: (data) => ipcRenderer.invoke('activate-subscription', data),

  // Agents
  listAgents: () => ipcRenderer.invoke('list-agents'),
  addAgent: (data) => ipcRenderer.invoke('add-agent', data),
  renameAgent: (payload) => ipcRenderer.invoke('rename-agent', payload),
  setAgentChannels: (payload) => ipcRenderer.invoke('set-agent-channels', payload),
  deleteAgent: (agentId) => ipcRenderer.invoke('delete-agent', agentId),
  setActiveAgent: (id) => ipcRenderer.invoke('set-active-agent', id),

  // Provider config
  saveProviderConfig: (payload) => ipcRenderer.invoke('save-provider-config', payload),
  getProviderConfig: () => ipcRenderer.invoke('get-provider-config'),
  deleteProviderConfig: (id) => ipcRenderer.invoke('delete-provider-config', id),
  resetModelConfig: () => ipcRenderer.invoke('reset-model-config'),

  // Relay (Worktree A)
  saveRelayConfig: (config) => ipcRenderer.invoke('save-relay-config', config),
  getRelayConfig: () => ipcRenderer.invoke('get-relay-config'),
  testRelayConnection: () => ipcRenderer.invoke('test-relay-connection'),
  saveRelayAuth: (tokens) => ipcRenderer.invoke('save-relay-auth', tokens),

  // Device / quota
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  checkQuota: () => ipcRenderer.invoke('check-quota'),
  openLogin: () => ipcRenderer.invoke('open-login'),

  // Channel config
  saveAgentChannelConfig: (payload) => ipcRenderer.invoke('save-agent-channel-config', payload)
});
