"use strict";

// src/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Setup
  saveConfig: (config) => import_electron.ipcRenderer.invoke("save-config", config),
  // Chat
  sendMessage: (payload) => import_electron.ipcRenderer.invoke("send-message", payload),
  // Gateway
  getGatewayInfo: () => import_electron.ipcRenderer.invoke("get-gateway-info"),
  openGatewayDashboard: () => import_electron.ipcRenderer.invoke("open-gateway-dashboard"),
  openExternal: (url) => import_electron.ipcRenderer.invoke("open-external", url),
  getStartupError: () => import_electron.ipcRenderer.invoke("get-startup-error"),
  // App state
  getAppState: () => import_electron.ipcRenderer.invoke("get-app-state"),
  getAgentConversation: (agentId) => import_electron.ipcRenderer.invoke("get-agent-conversation", agentId),
  // Premium / quota
  setUserApiKey: (apiKey) => import_electron.ipcRenderer.invoke("set-user-api-key", apiKey),
  setPremiumStatus: (isPremium) => import_electron.ipcRenderer.invoke("set-premium-status", isPremium),
  setPremiumTier: (tier) => import_electron.ipcRenderer.invoke("set-premium-tier", tier),
  // Subscription
  getSubscriptionStatus: () => import_electron.ipcRenderer.invoke("get-subscription-status"),
  createCheckoutSession: (plan) => import_electron.ipcRenderer.invoke("create-checkout-session", { plan }),
  activateSubscription: (data) => import_electron.ipcRenderer.invoke("activate-subscription", data),
  // Agents
  listAgents: () => import_electron.ipcRenderer.invoke("list-agents"),
  addAgent: (data) => import_electron.ipcRenderer.invoke("add-agent", data),
  renameAgent: (payload) => import_electron.ipcRenderer.invoke("rename-agent", payload),
  setAgentChannels: (payload) => import_electron.ipcRenderer.invoke("set-agent-channels", payload),
  deleteAgent: (agentId) => import_electron.ipcRenderer.invoke("delete-agent", agentId),
  setActiveAgent: (id) => import_electron.ipcRenderer.invoke("set-active-agent", id),
  // Provider config
  saveProviderConfig: (payload) => import_electron.ipcRenderer.invoke("save-provider-config", payload),
  getProviderConfig: () => import_electron.ipcRenderer.invoke("get-provider-config"),
  deleteProviderConfig: (id) => import_electron.ipcRenderer.invoke("delete-provider-config", id),
  resetModelConfig: () => import_electron.ipcRenderer.invoke("reset-model-config"),
  // Relay
  saveRelayConfig: (config) => import_electron.ipcRenderer.invoke("save-relay-config", config),
  getRelayConfig: () => import_electron.ipcRenderer.invoke("get-relay-config"),
  testRelayConnection: () => import_electron.ipcRenderer.invoke("test-relay-connection"),
  saveRelayAuth: (tokens) => import_electron.ipcRenderer.invoke("save-relay-auth", tokens),
  // Device / quota
  getDeviceId: () => import_electron.ipcRenderer.invoke("get-device-id"),
  checkQuota: () => import_electron.ipcRenderer.invoke("check-quota"),
  openLogin: () => import_electron.ipcRenderer.invoke("open-login"),
  logout: () => import_electron.ipcRenderer.invoke("logout"),
  // Channel config
  saveAgentChannelConfig: (payload) => import_electron.ipcRenderer.invoke("save-agent-channel-config", payload),
  // App info
  getAppVersion: () => import_electron.ipcRenderer.invoke("get-app-version"),
  openLogFile: () => import_electron.ipcRenderer.invoke("open-log-file")
});
