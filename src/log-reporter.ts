import { app } from 'electron';
import axios from 'axios';
import * as os from 'os';
import { loadAppState } from './config-store';
import { RELAY_BASE_URL } from './constants';

// ---------------------------------------------------------------------------
// Remote error reporter — fire-and-forget, never blocks the app
// ---------------------------------------------------------------------------

interface LogEntry {
  level: string;
  category: string;
  message: string;
  meta?: Record<string, unknown>;
  ts: string;
}

const FLUSH_INTERVAL_MS = 30_000;
const MAX_BUFFER = 100;

let buffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function getRelayUrl(): string {
  const state = loadAppState();
  return state.relay?.baseUrl || RELAY_BASE_URL;
}

function getDeviceId(): string {
  const state = loadAppState();
  return state.deviceId || 'unknown';
}

async function flush(): Promise<void> {
  if (buffer.length === 0) return;

  const batch = buffer.splice(0, 50);
  const baseUrl = getRelayUrl();
  const deviceId = getDeviceId();

  const state = loadAppState();
  const userEmail = state.relay?.userEmail || '';

  const logs = batch.map((e) => ({
    level: e.level,
    category: e.category,
    message: e.message,
    meta: e.meta ?? null,
    userEmail: userEmail || null,
    appVersion: app.getVersion(),
    platform: `${os.platform()}-${os.arch()}`,
  }));

  try {
    await axios.post(`${baseUrl}/v1/logs`, { logs }, {
      headers: { 'X-Device-Id': deviceId },
      timeout: 5000,
    });
  } catch {
    // Silent — never let log reporting break the app
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Push an error log entry. Flushes immediately for errors. */
export function reportError(category: string, message: string, meta?: Record<string, unknown>): void {
  buffer.push({ level: 'error', category, message, meta, ts: new Date().toISOString() });
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
  // Errors flush immediately (non-blocking)
  void flush();
}

/** Push a warning (batched, not immediate). */
export function reportWarn(category: string, message: string, meta?: Record<string, unknown>): void {
  buffer.push({ level: 'warn', category, message, meta, ts: new Date().toISOString() });
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
}

/** Start the periodic flush timer. Call once at app startup. */
export function startLogReporter(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
}

/** Flush remaining logs and stop. Call on app quit. */
export async function stopLogReporter(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flush();
}
