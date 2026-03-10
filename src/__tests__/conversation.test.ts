import { describe, it, expect } from 'vitest';
import { extractTextFromMessageContent, normalizeConversationText } from '../conversation';

describe('extractTextFromMessageContent', () => {
  it('returns string content as-is', () => {
    expect(extractTextFromMessageContent('hello')).toBe('hello');
  });

  it('returns empty string for non-string non-array', () => {
    expect(extractTextFromMessageContent(42)).toBe('');
    expect(extractTextFromMessageContent(null)).toBe('');
    expect(extractTextFromMessageContent(undefined)).toBe('');
  });

  it('joins text parts from array of content blocks', () => {
    const content = [
      { type: 'text', text: 'Hello' },
      { type: 'text', text: 'World' },
    ];
    expect(extractTextFromMessageContent(content)).toBe('Hello\nWorld');
  });

  it('handles mixed array with strings and objects', () => {
    const content = ['direct string', { type: 'text', text: 'from block' }];
    expect(extractTextFromMessageContent(content)).toBe('direct string\nfrom block');
  });

  it('skips null/undefined entries in array', () => {
    const content = [null, { type: 'text', text: 'only' }, undefined];
    expect(extractTextFromMessageContent(content)).toBe('only');
  });

  it('skips non-text type blocks', () => {
    const content = [
      { type: 'image', url: 'x.png' },
      { type: 'text', text: 'visible' },
    ];
    expect(extractTextFromMessageContent(content)).toBe('visible');
  });
});

describe('normalizeConversationText', () => {
  it('returns trimmed text for assistant role', () => {
    expect(normalizeConversationText('assistant', '  Hello world  ')).toBe('Hello world');
  });

  it('strips [Current message] marker for user role', () => {
    const input = 'some context [Current message - respond to this] actual question';
    expect(normalizeConversationText('user', input)).toBe('actual question');
  });

  it('strips leading "User:" prefix', () => {
    expect(normalizeConversationText('user', 'User: hello')).toBe('hello');
    expect(normalizeConversationText('user', '  User:   hi  ')).toBe('hi');
  });

  it('strips chat context block', () => {
    const input = '[Chat messages since your last reply - for context]\nold message\n[Current message - respond to this]\nnew message';
    expect(normalizeConversationText('user', input)).toBe('new message');
  });

  it('returns empty string for empty/null input', () => {
    expect(normalizeConversationText('user', '')).toBe('');
    expect(normalizeConversationText('user', null as any)).toBe('');
  });
});
