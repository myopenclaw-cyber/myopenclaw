import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Setup
  saveConfig: (config: Record<string, unknown>) => ipcRenderer.invoke('save-config', config),

  // Chat
  sendMessage: (payload: Record<string, unknown> | string) => ipcRenderer.invoke('send-message', payload),

  // Gateway
  getGatewayInfo: () => ipcRenderer.invoke('get-gateway-info'),
  openGatewayDashboard: () => ipcRenderer.invoke('open-gateway-dashboard'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getStartupError: () => ipcRenderer.invoke('get-startup-error'),

  // App state
  getAppState: () => ipcRenderer.invoke('get-app-state'),
  getAgentConversation: (agentId: string) => ipcRenderer.invoke('get-agent-conversation', agentId),

  // Premium / quota
  setUserApiKey: (apiKey: string) => ipcRenderer.invoke('set-user-api-key', apiKey),
  setPremiumStatus: (isPremium: boolean) => ipcRenderer.invoke('set-premium-status', isPremium),
  setPremiumTier: (tier: string) => ipcRenderer.invoke('set-premium-tier', tier),

  // Subscription
  getSubscriptionStatus: () => ipcRenderer.invoke('get-subscription-status'),
  createCheckoutSession: (plan: string) => ipcRenderer.invoke('create-checkout-session', { plan }),
  activateSubscription: (data: Record<string, unknown>) => ipcRenderer.invoke('activate-subscription', data),

  // Agents
  listAgents: () => ipcRenderer.invoke('list-agents'),
  addAgent: (data: Record<string, unknown>) => ipcRenderer.invoke('add-agent', data),
  renameAgent: (payload: Record<string, unknown>) => ipcRenderer.invoke('rename-agent', payload),
  setAgentChannels: (payload: Record<string, unknown>) => ipcRenderer.invoke('set-agent-channels', payload),
  deleteAgent: (agentId: string) => ipcRenderer.invoke('delete-agent', agentId),
  setActiveAgent: (id: string) => ipcRenderer.invoke('set-active-agent', id),

  // Provider config
  saveProviderConfig: (payload: Record<string, unknown>) => ipcRenderer.invoke('save-provider-config', payload),
  getProviderConfig: () => ipcRenderer.invoke('get-provider-config'),
  deleteProviderConfig: (id: string) => ipcRenderer.invoke('delete-provider-config', id),
  resetModelConfig: () => ipcRenderer.invoke('reset-model-config'),

  // Relay
  saveRelayConfig: (config: Record<string, unknown>) => ipcRenderer.invoke('save-relay-config', config),
  getRelayConfig: () => ipcRenderer.invoke('get-relay-config'),
  testRelayConnection: () => ipcRenderer.invoke('test-relay-connection'),
  saveRelayAuth: (tokens: Record<string, unknown>) => ipcRenderer.invoke('save-relay-auth', tokens),

  // Device / quota
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  checkQuota: () => ipcRenderer.invoke('check-quota'),
  openLogin: () => ipcRenderer.invoke('open-login'),
  logout: () => ipcRenderer.invoke('logout'),

  // Channel config
  saveAgentChannelConfig: (payload: Record<string, unknown>) => ipcRenderer.invoke('save-agent-channel-config', payload),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
