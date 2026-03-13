import * as path from 'path';
import * as os from 'os';

export const MYOPENCLAW_DATA_DIR = path.join(os.homedir(), '.myopenclaw');
export const OPENCLAW_CONFIG_DIR = path.join(MYOPENCLAW_DATA_DIR, 'openclaw');
export const CONFIG_FILE = path.join(OPENCLAW_CONFIG_DIR, 'openclaw.json');
export const DEFAULT_PORT = 18800;
export const EMBEDDED_CONFIG_FILE = path.join(MYOPENCLAW_DATA_DIR, 'embedded-config.json');
export const APP_STATE_FILE = path.join(MYOPENCLAW_DATA_DIR, 'app-state.json');
export const AUTH_PROFILES_DIR = path.join(OPENCLAW_CONFIG_DIR, 'agents', 'main', 'agent');
export const AUTH_PROFILES_FILE = path.join(AUTH_PROFILES_DIR, 'auth-profiles.json');
export const DOWNLOADED_RUNTIME_DIR = path.join(MYOPENCLAW_DATA_DIR, 'runtime');
export const RELAY_BASE_URL = 'https://relay.myopenclaws.app';
export const PROTOCOL = 'myopenclaw';
export const MIN_NODE_MAJOR_VERSION = 22;
