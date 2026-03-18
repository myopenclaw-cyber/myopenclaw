import axios from 'axios';
import { readGatewayTokenFromConfig } from './config-store';
import { logDnsDiagnostics } from './network-diagnostics';
import type { ConversationMessage } from './types';

export async function checkRelayHealth(baseUrl: string, token: string): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const requestUrl = `${baseUrl}/health`;
  try {
    const response = await axios.get(requestUrl, {
      headers,
      timeout: 20000,
    });
    return response.data;
  } catch (error: any) {
    await logDnsDiagnostics('relay-health', error, requestUrl);
    throw error;
  }
}

export async function sendViaGateway(gatewayBaseUrl: string, messages: ConversationMessage[]): Promise<string> {
  if (!gatewayBaseUrl) {
    throw new Error('Gateway not started');
  }
  const token = readGatewayTokenFromConfig();
  const response = await axios.post(`${gatewayBaseUrl}/v1/chat/completions`, {
    model: 'openclaw:main',
    messages,
    stream: false,
  }, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-openclaw-agent-id': 'main',
    },
    timeout: 60000,
  });
  return response?.data?.choices?.[0]?.message?.content || 'No response from OpenClaw.';
}

export async function sendViaRelay(
  relayBaseUrl: string,
  relayAuthToken: string,
  messages: ConversationMessage[],
  deviceId: string,
  model?: string,
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (relayAuthToken) {
    headers['Authorization'] = `Bearer ${relayAuthToken}`;
  }
  if (deviceId) {
    headers['X-Device-Id'] = deviceId;
  }
  const requestUrl = `${relayBaseUrl}/v1/chat/completions`;
  try {
    const response = await axios.post(requestUrl, {
      model: model || 'openclaw:main',
      messages,
    }, {
      headers,
      timeout: 60000,
    });
    return response?.data?.choices?.[0]?.message?.content || 'No response from relay.';
  } catch (error: any) {
    await logDnsDiagnostics('relay-chat', error, requestUrl);
    throw error;
  }
}
