import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { OPENCLAW_CONFIG_DIR } from './constants';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const IDENTITY_DIR = path.join(OPENCLAW_CONFIG_DIR, 'identity');
const KEYPAIR_FILE = path.join(IDENTITY_DIR, 'device.json');
const DEVICE_AUTH_FILE = path.join(IDENTITY_DIR, 'device-auth.json');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface StoredKeypair {
  publicKey: string;  // PEM
  privateKey: string; // PEM
}

function ensureIdentityDir(): void {
  fs.mkdirSync(IDENTITY_DIR, { recursive: true });
}

function loadKeypair(): StoredKeypair | null {
  try {
    if (fs.existsSync(KEYPAIR_FILE)) {
      const data = JSON.parse(fs.readFileSync(KEYPAIR_FILE, 'utf8'));
      if (data.publicKey && data.privateKey) return data;
    }
  } catch (e: any) {
    console.warn('[device-identity] Failed to load keypair:', e.message);
  }
  return null;
}

function ensureKeypair(): StoredKeypair {
  const existing = loadKeypair();
  if (existing) return existing;

  ensureIdentityDir();
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const stored: StoredKeypair = {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }) as string,
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
  };
  fs.writeFileSync(KEYPAIR_FILE, JSON.stringify(stored, null, 2), 'utf8');
  fs.chmodSync(KEYPAIR_FILE, 0o600);
  console.log('[device-identity] Generated new Ed25519 keypair');
  return stored;
}

/** Extract raw 32-byte Ed25519 public key from PEM. */
function getRawPublicKey(pem: string): Buffer {
  const keyObj = crypto.createPublicKey(pem);
  const spki = keyObj.export({ type: 'spki', format: 'der' }) as Buffer;
  // Ed25519 SPKI DER = 12-byte header + 32-byte raw key
  return Buffer.from(spki).subarray(12);
}

function deriveDeviceId(rawPubKey: Buffer): string {
  return crypto.createHash('sha256').update(rawPubKey).digest('hex');
}

// ---------------------------------------------------------------------------
// Device auth token persistence
// ---------------------------------------------------------------------------

function loadDeviceAuthToken(): string | null {
  try {
    if (fs.existsSync(DEVICE_AUTH_FILE)) {
      const data = JSON.parse(fs.readFileSync(DEVICE_AUTH_FILE, 'utf8'));
      return data.deviceToken || null;
    }
  } catch {}
  return null;
}

function saveDeviceAuthToken(token: string): void {
  ensureIdentityDir();
  fs.writeFileSync(
    DEVICE_AUTH_FILE,
    JSON.stringify({ deviceToken: token }, null, 2),
    'utf8',
  );
  fs.chmodSync(DEVICE_AUTH_FILE, 0o600);
  console.log('[device-identity] Saved device auth token');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const CLIENT_ID = 'cli';
const CLIENT_MODE = 'cli';
const ROLE = 'operator';
const SCOPES = [
  'operator.admin',
  'operator.approvals',
  'operator.pairing',
  'operator.read',
  'operator.write',
];

/**
 * Build the full `params` object for the gateway `connect` request,
 * including Ed25519 device identity signed with the server challenge nonce.
 *
 * The gateway protocol is challenge-response:
 *   1. Server sends `connect.challenge { nonce }` as first frame
 *   2. Client signs v2 payload including that nonce
 *   3. Client sends `connect` request with signed device block
 */
export function buildConnectParams(
  gatewayToken: string,
  challengeNonce: string,
): Record<string, unknown> {
  const kp = ensureKeypair();
  const rawPub = getRawPublicKey(kp.publicKey);
  const deviceId = deriveDeviceId(rawPub);
  const signedAt = Date.now();

  // v2 signing payload: v2|deviceId|clientId|clientMode|role|sortedScopes|signedAtMs|token|nonce
  const scopesCsv = [...SCOPES].sort().join(',');
  const tokenStr = gatewayToken || '';
  const payload = `v2|${deviceId}|${CLIENT_ID}|${CLIENT_MODE}|${ROLE}|${scopesCsv}|${signedAt}|${tokenStr}|${challengeNonce}`;

  const privateKey = crypto.createPrivateKey(kp.privateKey);
  const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey);

  return {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: CLIENT_ID,
      version: '1.0.0',
      platform: process.platform,
      mode: CLIENT_MODE,
    },
    caps: [],
    role: ROLE,
    scopes: SCOPES,
    device: {
      id: deviceId,
      publicKey: rawPub.toString('base64url'),
      signature: signature.toString('base64url'),
      signedAt,
      nonce: challengeNonce,
    },
    auth: {
      token: gatewayToken,
    },
  };
}

/**
 * Extract and persist the device auth token from a successful connect response.
 */
export function handleConnectResponse(payload: unknown): void {
  try {
    const p = payload as Record<string, unknown>;
    const auth = p?.auth as Record<string, unknown> | undefined;
    if (auth?.deviceToken && typeof auth.deviceToken === 'string') {
      saveDeviceAuthToken(auth.deviceToken);
    }
  } catch {}
}
