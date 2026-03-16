import * as path from 'path';
import * as fs from 'fs';
import type { ConversationMessage } from './types';
import { OPENCLAW_CONFIG_DIR } from './constants';

export function extractTextFromMessageContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const c of content) {
    if (!c) continue;
    if (typeof c === 'string') parts.push(c);
    else if (c.type === 'text' && c.text) parts.push(String(c.text));
  }
  return parts.join('\n').trim();
}

export function normalizeConversationText(role: string, text: string): string {
  let t = String(text || '').trim();
  if (!t) return t;
  if (role === 'user') {
    const marker = '[Current message - respond to this]';
    const idx = t.lastIndexOf(marker);
    if (idx >= 0) t = t.slice(idx + marker.length).trim();
    t = t.replace(/^\s*User\s*:\s*/i, '').trim();
  }
  t = t.replace(/^\s*\[Chat messages since your last reply - for context\][\s\S]*?\[Current message - respond to this\]\s*/i, '');
  t = t.replace(/^\s*User\s*:\s*/i, '').trim();
  return t;
}

export function loadAgentConversationFromOpenClaw(agentId: string = 'main', limit: number = 80): ConversationMessage[] {
  try {
    const sessionsDir = path.join(OPENCLAW_CONFIG_DIR, 'agents', agentId, 'sessions');
    if (!fs.existsSync(sessionsDir)) return [];

    let sessionFiles: string[] = [];
    const sessionsIndex = path.join(sessionsDir, 'sessions.json');
    if (fs.existsSync(sessionsIndex)) {
      const idx = JSON.parse(fs.readFileSync(sessionsIndex, 'utf8').replace(/^\uFEFF/, ''));
      const rows = Object.values(idx || {}).filter((v: any) => v && v.sessionFile);
      rows.sort((a: any, b: any) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
      sessionFiles = rows.map((r: any) => r.sessionFile).filter((f: any) => f && fs.existsSync(f));
    }

    if (!sessionFiles.length) {
      sessionFiles = fs.readdirSync(sessionsDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => ({ full: path.join(sessionsDir, f), mtime: fs.statSync(path.join(sessionsDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)
        .map(x => x.full);
    }

    const conv: ConversationMessage[] = [];
    for (const file of sessionFiles) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        let row: any;
        try { row = JSON.parse(line); } catch { continue; }
        if (row?.type !== 'message' || !row.message) continue;
        const role = row.message.role;
        if (role !== 'user' && role !== 'assistant') continue;
        let text = extractTextFromMessageContent(row.message.content);
        if (!text && row.message.errorMessage) text = row.message.errorMessage;
        if (!text) continue;
        const uiRole: 'user' | 'assistant' = role === 'assistant' ? 'assistant' : 'user';
        text = normalizeConversationText(uiRole, text);
        if (!text) continue;
        conv.push({ role: uiRole, content: text, timestamp: row.timestamp || row.message.timestamp || 0 });
      }
      if (conv.length >= limit * 2) break;
    }

    conv.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
    return conv.slice(-Math.max(1, limit));
  } catch (e: any) {
    console.error('[conversation-load] failed:', e.message);
    return [];
  }
}
