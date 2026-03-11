import * as fs from 'fs';
import * as path from 'path';
import { MYOPENCLAW_DATA_DIR } from './constants';

const LOG_FILE = path.join(MYOPENCLAW_DATA_DIR, 'myopenclaw.log');
const MAX_LOG_SIZE = 2 * 1024 * 1024; // 2MB

let logStream: fs.WriteStream | null = null;

function ensureLogStream(): fs.WriteStream {
  if (logStream) return logStream;
  fs.mkdirSync(MYOPENCLAW_DATA_DIR, { recursive: true });

  // Rotate if too large
  try {
    const stats = fs.statSync(LOG_FILE);
    if (stats.size > MAX_LOG_SIZE) {
      const prev = LOG_FILE + '.prev';
      try { fs.unlinkSync(prev); } catch {}
      fs.renameSync(LOG_FILE, prev);
    }
  } catch {}

  logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  return logStream;
}

function formatLine(level: string, msg: string): string {
  const ts = new Date().toISOString();
  return `${ts} [${level}] ${msg}\n`;
}

export function initFileLogger(): void {
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;

  console.log = (...args: unknown[]) => {
    origLog(...args);
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    ensureLogStream().write(formatLine('INFO', msg));
  };

  console.error = (...args: unknown[]) => {
    origError(...args);
    const msg = args.map(a => typeof a === 'string' ? a : (a instanceof Error ? a.stack || a.message : JSON.stringify(a))).join(' ');
    ensureLogStream().write(formatLine('ERROR', msg));
  };

  console.warn = (...args: unknown[]) => {
    origWarn(...args);
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    ensureLogStream().write(formatLine('WARN', msg));
  };

  console.log(`[logger] Logging to ${LOG_FILE}`);
}

export function getLogFilePath(): string {
  return LOG_FILE;
}
