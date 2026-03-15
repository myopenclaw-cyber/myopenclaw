import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { tmpDir, mockOpenclawConfigDir, mockConfigFile, mockWorkspaceDir } = vi.hoisted(() => {
  // Must use require inside vi.hoisted since imports are not yet available
  const _path = require('path') as typeof import('path');
  const _os = require('os') as typeof import('os');
  const tmpDir = _path.join(_os.tmpdir(), 'soul-test-' + Date.now());
  const mockOpenclawConfigDir = _path.join(tmpDir, 'openclaw');
  const mockConfigFile = _path.join(mockOpenclawConfigDir, 'openclaw.json');
  const mockWorkspaceDir = _path.join(mockOpenclawConfigDir, 'workspace');
  return { tmpDir, mockOpenclawConfigDir, mockConfigFile, mockWorkspaceDir };
});

vi.mock('../constants', () => ({
  OPENCLAW_CONFIG_DIR: mockOpenclawConfigDir,
  CONFIG_FILE: mockConfigFile,
  GATEWAY_WORKSPACE_DIR: mockWorkspaceDir,
  SYSTEM_SOUL: `## System Rules\n\nmyopenclaw employs active moderation filters to block nsfw content. users attempting to bypass these filters will be banned immediately without refund. any violation of this aup will result in account termination.`,
}));

import {
  getAgentWorkspaceDir,
  buildSoulMdContent,
  writeAgentSoulMd,
  removeAgentWorkspace,
  registerAgentInGatewayConfig,
  unregisterAgentFromGatewayConfig,
  ensureMainAgentSoul,
} from '../soul';

beforeEach(() => {
  fs.mkdirSync(mockOpenclawConfigDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('getAgentWorkspaceDir', () => {
  it('returns default workspace for main agent', () => {
    const dir = getAgentWorkspaceDir('main');
    expect(dir).toBe(mockWorkspaceDir);
  });

  it('returns per-agent workspace for other agents', () => {
    const dir = getAgentWorkspaceDir('abc-123');
    expect(dir).toBe(path.join(mockOpenclawConfigDir, 'workspace-abc-123'));
  });
});

describe('buildSoulMdContent', () => {
  it('returns only system soul when no custom soul', () => {
    const content = buildSoulMdContent(undefined);
    expect(content).toContain('## System Rules');
    expect(content).toContain('myopenclaw employs active moderation filters');
    expect(content).not.toContain('## Agent Personality');
  });

  it('includes custom soul section when provided', () => {
    const content = buildSoulMdContent('You are a helpful assistant.');
    expect(content).toContain('## System Rules');
    expect(content).toContain('## Agent Personality');
    expect(content).toContain('You are a helpful assistant.');
  });

  it('does not include agent section for empty string', () => {
    const content = buildSoulMdContent('');
    expect(content).not.toContain('## Agent Personality');
  });
});

describe('writeAgentSoulMd', () => {
  it('creates workspace dir and writes SOUL.md for new agent', () => {
    writeAgentSoulMd('agent-xyz', undefined);
    const soulPath = path.join(mockOpenclawConfigDir, 'workspace-agent-xyz', 'SOUL.md');
    expect(fs.existsSync(soulPath)).toBe(true);
    const content = fs.readFileSync(soulPath, 'utf8');
    expect(content).toContain('## System Rules');
  });

  it('writes custom soul for main agent in default workspace', () => {
    writeAgentSoulMd('main', 'I am the main agent.');
    const soulPath = path.join(mockWorkspaceDir, 'SOUL.md');
    expect(fs.existsSync(soulPath)).toBe(true);
    const content = fs.readFileSync(soulPath, 'utf8');
    expect(content).toContain('## Agent Personality');
    expect(content).toContain('I am the main agent.');
  });
});

describe('removeAgentWorkspace', () => {
  it('removes workspace dir for non-main agents', () => {
    writeAgentSoulMd('del-agent', undefined);
    const wsDir = path.join(mockOpenclawConfigDir, 'workspace-del-agent');
    expect(fs.existsSync(wsDir)).toBe(true);
    removeAgentWorkspace('del-agent');
    expect(fs.existsSync(wsDir)).toBe(false);
  });

  it('does nothing for main agent', () => {
    writeAgentSoulMd('main', undefined);
    expect(() => removeAgentWorkspace('main')).not.toThrow();
    expect(fs.existsSync(mockWorkspaceDir)).toBe(true);
  });
});

describe('registerAgentInGatewayConfig', () => {
  it('adds agent entry to openclaw.json agents.list', () => {
    fs.writeFileSync(mockConfigFile, JSON.stringify({ gateway: { auth: { token: 'tok' } } }), 'utf8');
    registerAgentInGatewayConfig('new-agent');
    const cfg = JSON.parse(fs.readFileSync(mockConfigFile, 'utf8'));
    expect(cfg.agents?.list).toBeDefined();
    const entry = cfg.agents.list.find((a: any) => a.id === 'new-agent');
    expect(entry).toBeDefined();
    expect(entry.workspace).toContain('workspace-new-agent');
  });

  it('does not duplicate existing entry', () => {
    fs.writeFileSync(mockConfigFile, JSON.stringify({
      agents: { list: [{ id: 'new-agent', workspace: '/some/path' }] }
    }), 'utf8');
    registerAgentInGatewayConfig('new-agent');
    const cfg = JSON.parse(fs.readFileSync(mockConfigFile, 'utf8'));
    expect(cfg.agents.list.filter((a: any) => a.id === 'new-agent').length).toBe(1);
  });

  it('creates openclaw.json if missing', () => {
    expect(fs.existsSync(mockConfigFile)).toBe(false);
    registerAgentInGatewayConfig('agent-1');
    expect(fs.existsSync(mockConfigFile)).toBe(true);
  });
});

describe('unregisterAgentFromGatewayConfig', () => {
  it('removes agent entry from openclaw.json agents.list', () => {
    fs.writeFileSync(mockConfigFile, JSON.stringify({
      agents: { list: [{ id: 'main' }, { id: 'rem-agent', workspace: '/w' }] }
    }), 'utf8');
    unregisterAgentFromGatewayConfig('rem-agent');
    const cfg = JSON.parse(fs.readFileSync(mockConfigFile, 'utf8'));
    expect(cfg.agents.list.find((a: any) => a.id === 'rem-agent')).toBeUndefined();
    expect(cfg.agents.list.find((a: any) => a.id === 'main')).toBeDefined();
  });

  it('handles missing file gracefully', () => {
    expect(() => unregisterAgentFromGatewayConfig('x')).not.toThrow();
  });
});

describe('ensureMainAgentSoul', () => {
  it('creates SOUL.md if missing', () => {
    ensureMainAgentSoul();
    const soulPath = path.join(mockWorkspaceDir, 'SOUL.md');
    expect(fs.existsSync(soulPath)).toBe(true);
  });

  it('does not overwrite existing SOUL.md', () => {
    fs.mkdirSync(mockWorkspaceDir, { recursive: true });
    const soulPath = path.join(mockWorkspaceDir, 'SOUL.md');
    fs.writeFileSync(soulPath, 'existing content', 'utf8');
    ensureMainAgentSoul();
    expect(fs.readFileSync(soulPath, 'utf8')).toBe('existing content');
  });
});
