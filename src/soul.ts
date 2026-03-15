import * as fs from 'fs';
import * as path from 'path';
import {
  OPENCLAW_CONFIG_DIR,
  CONFIG_FILE,
  GATEWAY_WORKSPACE_DIR,
  SYSTEM_SOUL,
} from './constants';

/**
 * Returns the workspace directory for an agent.
 * 'main' uses the shared default workspace; others get a dedicated dir.
 */
export function getAgentWorkspaceDir(agentId: string): string {
  if (agentId === 'main') return GATEWAY_WORKSPACE_DIR;
  return path.join(OPENCLAW_CONFIG_DIR, `workspace-${agentId}`);
}

/**
 * Builds the full SOUL.md content: system rules + optional custom personality.
 */
export function buildSoulMdContent(customSoul: string | undefined): string {
  const parts = [SYSTEM_SOUL];
  if (customSoul && customSoul.trim()) {
    parts.push(`\n## Agent Personality\n\n${customSoul.trim()}`);
  }
  return parts.join('\n') + '\n';
}

/**
 * Creates the agent's workspace dir (if needed) and writes SOUL.md.
 */
export function writeAgentSoulMd(agentId: string, customSoul: string | undefined): void {
  const wsDir = getAgentWorkspaceDir(agentId);
  if (!fs.existsSync(wsDir)) {
    fs.mkdirSync(wsDir, { recursive: true });
  }
  const soulPath = path.join(wsDir, 'SOUL.md');
  fs.writeFileSync(soulPath, buildSoulMdContent(customSoul), 'utf8');
}

/**
 * Removes the workspace directory for a non-main agent.
 * Safe no-op for 'main'.
 */
export function removeAgentWorkspace(agentId: string): void {
  if (agentId === 'main') return;
  const wsDir = getAgentWorkspaceDir(agentId);
  if (fs.existsSync(wsDir)) {
    fs.rmSync(wsDir, { recursive: true, force: true });
  }
}

/**
 * Adds an agent entry to openclaw.json agents.list with its workspace path.
 * Creates the file if it doesn't exist. Skips if entry already present.
 */
export function registerAgentInGatewayConfig(agentId: string): void {
  try {
    const cfg: any = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, ''))
      : {};
    cfg.agents = cfg.agents || {};
    cfg.agents.list = cfg.agents.list || [];

    const exists = cfg.agents.list.some((a: any) => a.id === agentId);
    if (!exists) {
      const entry: Record<string, string> = { id: agentId };
      if (agentId !== 'main') {
        entry.workspace = getAgentWorkspaceDir(agentId);
      }
      cfg.agents.list.push(entry);
    }

    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e: any) {
    console.error('[soul] registerAgentInGatewayConfig failed:', e.message);
  }
}

/**
 * Removes an agent entry from openclaw.json agents.list.
 */
export function unregisterAgentFromGatewayConfig(agentId: string): void {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return;
    const cfg: any = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, ''));
    if (!cfg.agents?.list) return;
    cfg.agents.list = cfg.agents.list.filter((a: any) => a.id !== agentId);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e: any) {
    console.error('[soul] unregisterAgentFromGatewayConfig failed:', e.message);
  }
}

/**
 * Ensures the main agent has a SOUL.md. Only writes if missing (preserves customizations).
 */
export function ensureMainAgentSoul(): void {
  const wsDir = GATEWAY_WORKSPACE_DIR;
  if (!fs.existsSync(wsDir)) {
    fs.mkdirSync(wsDir, { recursive: true });
  }
  const soulPath = path.join(wsDir, 'SOUL.md');
  if (!fs.existsSync(soulPath)) {
    fs.writeFileSync(soulPath, buildSoulMdContent(undefined), 'utf8');
  }
}
