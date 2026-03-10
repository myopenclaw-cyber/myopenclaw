import * as net from 'net';
import axios from 'axios';
import { DEFAULT_PORT } from './constants';

export async function findAvailablePort(startPort: number = DEFAULT_PORT): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error('No available port found');
}

export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(port, '127.0.0.1');
  });
}

export async function isOpenClawGatewayRunning(port: number): Promise<boolean> {
  try {
    const resp = await axios.get(`http://127.0.0.1:${port}/health`, { timeout: 1200 });
    const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data || '');
    return body.includes('OpenClaw Control') || body.includes('openclaw-app');
  } catch {
    return false;
  }
}
