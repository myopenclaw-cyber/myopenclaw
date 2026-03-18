import { getServers, promises as dnsPromises } from 'dns';

const DNS_ERROR_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'EAI_FAIL', 'ENODATA']);
const DNS_PROBE_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`DNS probe timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function summarizeProxyEnv(value?: string): string | undefined {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch {
    return '<set>';
  }
}

function getRequestMeta(requestUrl?: string): { hostname?: string; origin?: string; pathname?: string } {
  const raw = String(requestUrl || '').trim();
  if (!raw) return {};
  try {
    const parsed = new URL(raw);
    return {
      hostname: parsed.hostname,
      origin: parsed.origin,
      pathname: parsed.pathname,
    };
  } catch {
    return {};
  }
}

export function isDnsResolutionError(error: any): boolean {
  const code = String(error?.code || error?.cause?.code || '').toUpperCase();
  const message = String(error?.message || '');
  return DNS_ERROR_CODES.has(code) || /ENOTFOUND|EAI_AGAIN|EAI_FAIL|getaddrinfo/i.test(message);
}

export async function logDnsDiagnostics(context: string, error: any, requestUrl?: string): Promise<void> {
  if (!isDnsResolutionError(error)) return;

  const meta = getRequestMeta(requestUrl || error?.config?.url);
  const diagnostics: Record<string, any> = {
    context,
    code: error?.code || error?.cause?.code || null,
    errno: error?.errno || error?.cause?.errno || null,
    syscall: error?.syscall || error?.cause?.syscall || null,
    message: error?.message || String(error),
    hostname: meta.hostname || null,
    requestOrigin: meta.origin || null,
    requestPath: meta.pathname || null,
    dnsServers: getServers(),
    proxy: {
      http: summarizeProxyEnv(process.env.HTTP_PROXY || process.env.http_proxy),
      https: summarizeProxyEnv(process.env.HTTPS_PROXY || process.env.https_proxy),
      all: summarizeProxyEnv(process.env.ALL_PROXY || process.env.all_proxy),
      noProxy: process.env.NO_PROXY || process.env.no_proxy || '',
    },
  };

  if (meta.hostname) {
    const startedAt = Date.now();
    try {
      const addresses = await withTimeout(
        dnsPromises.lookup(meta.hostname, { all: true, verbatim: true }),
        DNS_PROBE_TIMEOUT_MS,
      );
      diagnostics.probe = {
        ok: true,
        elapsedMs: Date.now() - startedAt,
        addresses: addresses.map((entry) => `${entry.address}/${entry.family}`),
      };
    } catch (probeError: any) {
      diagnostics.probe = {
        ok: false,
        elapsedMs: Date.now() - startedAt,
        code: probeError?.code || null,
        message: probeError?.message || String(probeError),
      };
    }
  }

  console.error('[dns] Resolution diagnostics:', JSON.stringify(diagnostics));
}
