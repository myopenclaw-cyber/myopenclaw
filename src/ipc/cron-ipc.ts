import * as crypto from 'crypto';
import axios from 'axios';
import { ipcMain } from 'electron';
import type { GatewayHandle } from '../types';
import { buildConnectParams, handleConnectResponse } from '../device-identity';

// ---------------------------------------------------------------------------
// WebSocket JSON-RPC helper (native ws via dynamic require)
// ---------------------------------------------------------------------------

function wsRpc(
  port: number,
  token: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const reqMsg = JSON.stringify({ type: 'req', id, method, params });
    let ws: any;

    try {
      // Use a simple HTTP upgrade approach instead of the ws package to avoid
      // dependency concerns. Fall back to the bundled ws if available.
      const WebSocket = require('ws'); // eslint-disable-line @typescript-eslint/no-var-requires
      ws = new WebSocket(`ws://127.0.0.1:${port}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      reject(new Error('WebSocket (ws) module not available'));
      return;
    }

    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error(`cron RPC timeout: ${method}`));
    }, 10000);

    let connected = false;
    let challengeNonce: string | null = null;
    const connectId = crypto.randomUUID();

    // Gateway sends connect.challenge as the first frame; we wait for it
    // before sending our signed connect request.

    ws.on('message', (data: Buffer | string) => {
      try {
        const msg = JSON.parse(typeof data === 'string' ? data : data.toString('utf8'));

        // Handle connect.challenge — extract nonce and send signed connect
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          challengeNonce = msg.payload?.nonce;
          ws.send(JSON.stringify({
            type: 'req',
            id: connectId,
            method: 'connect',
            params: buildConnectParams(token, challengeNonce!),
          }));
          return;
        }

        // Ignore other server events during handshake
        if (msg.type === 'event') return;

        // Wait for connect acknowledgment before sending RPC
        if (!connected) {
          if (msg.type === 'res' && msg.id === connectId && msg.ok) {
            connected = true;
            handleConnectResponse(msg.payload);
            ws.send(reqMsg);
            return;
          }
        }

        if (msg.id !== id) return;
        clearTimeout(timer);
        ws.close();
        if (msg.ok) {
          resolve(msg.payload);
        } else {
          const errMsg = typeof msg.error === 'object' ? msg.error?.message : msg.error;
          reject(new Error(errMsg || `RPC error: ${method}`));
        }
      } catch (e) {
        clearTimeout(timer);
        ws.close();
        reject(e);
      }
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

type CronSchedule =
  | { kind: 'cron'; expr: string; tz?: string }
  | { kind: 'every'; everyMs: number }
  | { kind: 'at'; at: string };

type CronConfig = {
  name: string;
  schedule: CronSchedule;
  message: string;
};

function validateCronConfig(config: CronConfig): CronConfig {
  if (config.schedule.kind === 'at') {
    const atMs = Date.parse(config.schedule.at);
    if (!Number.isFinite(atMs)) {
      throw new Error('Invalid timestamp');
    }
    if (atMs < Date.now()) {
      throw new Error('Generated timestamp is in the past. Please review the schedule.');
    }
  }
  return config;
}

function slugifyCronName(input: string): string {
  const slug = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'scheduled-task';
}

function normalizeCronConfig(rawConfig: any, fallbackDescription: string): CronConfig {
  const schedule = rawConfig?.schedule || {};
  const kind = schedule?.kind;

  let normalizedSchedule: CronSchedule;
  if (kind === 'cron') {
    const expr = String(schedule.expr || '').trim();
    if (!expr) throw new Error('Missing cron expression');
    const tz = String(schedule.tz || '').trim();
    normalizedSchedule = tz ? { kind: 'cron', expr, tz } : { kind: 'cron', expr };
  } else if (kind === 'every') {
    const everyMs = Number(schedule.everyMs);
    if (!Number.isFinite(everyMs) || everyMs < 1000) throw new Error('Missing interval');
    normalizedSchedule = { kind: 'every', everyMs };
  } else if (kind === 'at') {
    const at = String(schedule.at || '').trim();
    if (!at) throw new Error('Missing timestamp');
    normalizedSchedule = { kind: 'at', at };
  } else {
    throw new Error('Missing schedule kind');
  }

  const description = String(fallbackDescription || '').trim();
  return validateCronConfig({
    name: slugifyCronName(String(rawConfig?.name || '').trim() || description),
    schedule: normalizedSchedule,
    message: String(rawConfig?.message || '').trim() || description,
  });
}

function parseCronConfig(content: string, fallbackDescription: string): CronConfig | null {
  const cleaned = String(content || '')
    .replace(/```json?\n?/g, '')
    .replace(/```/g, '')
    .trim();
  if (!cleaned) return null;

  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) return null;

  try {
    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    return normalizeCronConfig(parsed, fallbackDescription);
  } catch {
    return null;
  }
}

async function requestCronConfig(
  port: number,
  token: string,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  options: { toolChoice?: 'none' } = {},
): Promise<string> {
  const body: Record<string, unknown> = {
    model: 'openclaw:main',
    messages,
    stream: false,
    temperature: 0,
  };
  if (options.toolChoice) body.tool_choice = options.toolChoice;

  const response = await axios.post(`http://127.0.0.1:${port}/v1/chat/completions`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  return String(response?.data?.choices?.[0]?.message?.content || '').trim();
}

function extractJobId(job: any): string {
  return String(job?.jobId || job?.id || '').trim();
}

async function listCronJobs(port: number, token: string): Promise<any[]> {
  const payload = await wsRpc(port, token, 'cron.list', {}) as { jobs?: any[] };
  return Array.isArray(payload?.jobs) ? payload.jobs : [];
}

async function detectNewCronJobs(
  port: number,
  token: string,
  beforeIds: Set<string>,
): Promise<any[]> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const jobs = await listCronJobs(port, token);
    const created = jobs.filter((job) => {
      const id = extractJobId(job);
      return id && !beforeIds.has(id);
    });
    if (created.length) return created;
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// IPC handler registration
// ---------------------------------------------------------------------------

export function registerCronHandlers(
  getGatewayHandle: () => GatewayHandle | null,
): void {
  function requireGateway(): { port: number; token: string } {
    const gw = getGatewayHandle();
    if (!gw) throw new Error('Gateway is not running');
    return { port: gw.port, token: gw.token };
  }

  ipcMain.handle('cron-list', async () => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.list', {});
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-add', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.add', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-update', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.update', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-remove', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.remove', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-run', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.run', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-runs', async (_event, params: Record<string, unknown>) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, 'cron.runs', params);
      return { success: true, ...(payload as object) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cron-generate', async (_event, params: { description: string }) => {
    try {
      const { port, token } = requireGateway();
      const beforeJobs = await listCronJobs(port, token);
      const beforeJobIds = new Set(beforeJobs.map((job) => extractJobId(job)).filter(Boolean));
      const nowIso = new Date().toISOString();
      const systemPrompt = [
        'You are a cron job configuration assistant.',
        'If the user is clearly asking to create or schedule a cron job, use the available cron tools to create it directly.',
        'If you successfully create the cron job, reply with a brief confirmation only.',
        'If you cannot safely create it directly, parse the user\'s natural language description into a structured cron job config.',
        `Current time: ${nowIso}`,
        'Never claim the job is already created unless the cron tool actually succeeded.',
        'Never return a past timestamp when the user asks for a future reminder or schedule.',
        'Return ONLY valid JSON (no markdown fences, no explanation) with this structure:',
        '{',
        '  "name": "short-kebab-case-name",',
        '  "schedule": {',
        '    "kind": "cron" | "every" | "at",',
        '    "expr": "cron expression (only when kind=cron, e.g. 0 9 * * *)",',
        '    "tz": "optional timezone like Asia/Shanghai (only when kind=cron)",',
        '    "everyMs": 60000 (only when kind=every, milliseconds)',
        '    "at": "2026-03-15T09:00:00Z (only when kind=at, ISO timestamp)"',
        '  },',
        '  "message": "the prompt message to send to the agent when the job runs"',
        '}',
      ].join('\n');

      const content = await requestCronConfig(port, token, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: params.description },
      ]);

      if (!content) {
        return { success: false, error: 'AI returned empty response' };
      }

      const createdJobs = await detectNewCronJobs(port, token, beforeJobIds);
      if (createdJobs.length) {
        return {
          success: true,
          created: true,
          jobs: createdJobs,
          assistantReply: content,
        };
      }

      const directConfig = parseCronConfig(content, params.description);
      if (directConfig) {
        return { success: true, config: directConfig };
      }

      const repairPrompt = [
        'You convert scheduling requests into structured cron job JSON.',
        'The assistant reply may be a plain English confirmation instead of JSON.',
        'Infer the correct schedule from the original request and the assistant reply.',
        `Current time: ${nowIso}`,
        'Never claim the job is already created.',
        'Never return a past timestamp when the request implies a future schedule.',
        'Return ONLY valid JSON with this structure:',
        '{',
        '  "name": "short-kebab-case-name",',
        '  "schedule": {',
        '    "kind": "cron" | "every" | "at",',
        '    "expr": "cron expression when kind=cron",',
        '    "tz": "optional timezone like Asia/Shanghai",',
        '    "everyMs": 60000,',
        '    "at": "2026-03-15T09:00:00Z"',
        '  },',
        '  "message": "the prompt to send when the job runs"',
        '}',
      ].join('\n');

      const repairedContent = await requestCronConfig(port, token, [
        { role: 'system', content: repairPrompt },
        {
          role: 'user',
          content: [
            'Original request:',
            params.description,
            '',
            'Assistant reply:',
            content,
          ].join('\n'),
        },
      ], { toolChoice: 'none' });

      const repairedConfig = parseCronConfig(repairedContent, params.description);
      if (repairedConfig) {
        return { success: true, config: repairedConfig, normalizedFromReply: true };
      }

      return { success: false, error: content };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
