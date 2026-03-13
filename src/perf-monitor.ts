import * as os from 'os';
import type { ChildProcess } from 'child_process';

// ---------------------------------------------------------------------------
// Lightweight CPU / memory monitor for the Electron main process + gateway
// Logs periodically and warns when usage exceeds thresholds.
// ---------------------------------------------------------------------------

const SAMPLE_INTERVAL = 10_000;  // sample every 10s
const WARN_CPU_PCT = 80;         // warn if main process > 80% of one core
const WARN_MEM_MB = 512;         // warn if RSS > 512 MB

let _timer: ReturnType<typeof setInterval> | null = null;
let _prevCpu = process.cpuUsage();
let _prevTime = Date.now();
let _gatewayProc: ChildProcess | null = null;

function sample(): void {
  const now = Date.now();
  const elapsed = (now - _prevTime) * 1000; // → microseconds
  if (elapsed <= 0) return;

  const cpu = process.cpuUsage(_prevCpu);
  _prevCpu = process.cpuUsage();
  _prevTime = now;

  // CPU% = (user + system) / elapsed * 100  (single-core basis)
  const cpuPct = ((cpu.user + cpu.system) / elapsed) * 100;
  const mem = process.memoryUsage();
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);

  // Gateway child process info
  let gwInfo = '';
  if (_gatewayProc?.pid && !_gatewayProc.killed) {
    gwInfo = ` | gateway PID=${_gatewayProc.pid}`;
  }

  const line = `[perf] cpu=${cpuPct.toFixed(1)}% rss=${rssMB}MB heap=${heapMB}/${heapTotalMB}MB${gwInfo}`;

  if (cpuPct > WARN_CPU_PCT || rssMB > WARN_MEM_MB) {
    console.warn(line);
    if (cpuPct > WARN_CPU_PCT) {
      console.warn(`[perf] HIGH CPU: ${cpuPct.toFixed(1)}% (threshold: ${WARN_CPU_PCT}%)`);
    }
    if (rssMB > WARN_MEM_MB) {
      console.warn(`[perf] HIGH MEMORY: ${rssMB}MB RSS (threshold: ${WARN_MEM_MB}MB)`);
    }
  } else {
    console.log(line);
  }
}

export function startPerfMonitor(gatewayProcess?: ChildProcess | null): void {
  if (_timer) return; // already running
  if (gatewayProcess) _gatewayProc = gatewayProcess;

  // Reset baseline
  _prevCpu = process.cpuUsage();
  _prevTime = Date.now();

  _timer = setInterval(sample, SAMPLE_INTERVAL);
  // Don't prevent process exit
  if (_timer.unref) _timer.unref();

  console.log(`[perf] Monitor started (interval=${SAMPLE_INTERVAL / 1000}s, cpu_warn=${WARN_CPU_PCT}%, mem_warn=${WARN_MEM_MB}MB)`);
}

export function updateGatewayProcess(proc: ChildProcess | null): void {
  _gatewayProc = proc;
}

export function stopPerfMonitor(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.log('[perf] Monitor stopped');
  }
}
