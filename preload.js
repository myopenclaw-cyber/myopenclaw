const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  sendMessage: (payload) => ipcRenderer.invoke('send-message', payload),
  getGatewayInfo: () => ipcRenderer.invoke('get-gateway-info'),
  openGatewayDashboard: () => ipcRenderer.invoke('open-gateway-dashboard'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getAppState: () => ipcRenderer.invoke('get-app-state'),
  getAgentConversation: (agentId) => ipcRenderer.invoke('get-agent-conversation', agentId),
  listAgents: () => ipcRenderer.invoke('list-agents'),
  setActiveAgent: (id) => ipcRenderer.invoke('set-active-agent', id),
  saveProviderConfig: (payload) => ipcRenderer.invoke('save-provider-config', payload),
  getProviderConfig: () => ipcRenderer.invoke('get-provider-config'),
  deleteProviderConfig: (id) => ipcRenderer.invoke('delete-provider-config', id),
  resetModelConfig: () => ipcRenderer.invoke('reset-model-config'),
  getStartupError: () => ipcRenderer.invoke('get-startup-error')
});
