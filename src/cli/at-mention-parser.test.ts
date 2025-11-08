/**
 * Tests for at-mention parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseAtMentions,
  getCurrentAtMention,
  unescapePath,
  escapePath,
  isValidTool,
} from './at-mention-parser.js';

describe('parseAtMentions', () => {
  it('should parse a simple file mention', () => {
    const input = 'Explain @src/cli/ui.tsx to me';
    const mentions = parseAtMentions(input);

    expect(mentions).toHaveLength(1);
    expect(mentions[0]).toMatchObject({
      type: 'file',
      path: 'src/cli/ui.tsx',
      startIndex: 8,
      raw: '@src/cli/ui.tsx',
    });
  });

  it('should parse a directory mention', () => {
    const input = 'List files in @src/';
    const mentions = parseAtMentions(input);

    expect(mentions).toHaveLength(1);
    expect(mentions[0]).toMatchObject({
      type: 'directory',
      path: 'src/',
      startIndex: 14,
      raw: '@src/',
    });
  });

  it('should parse a file with line range', () => {
    const input = 'Explain @src/cli/ui.tsx:50-100';
    const mentions = parseAtMentions(input);

    expect(mentions).toHaveLength(1);
    expect(mentions[0]).toMatchObject({
      type: 'file',
      path: 'src/cli/ui.tsx',
      lineRange: { start: 50, end: 100 },
      startIndex: 8,
      raw: '@src/cli/ui.tsx:50-100',
    });
  });

  it('should parse a file with single line number', () => {
    const input = 'What does @src/cli/ui.tsx:42 do?';
    const mentions = parseAtMentions(input);

    expect(mentions).toHaveLength(1);
    expect(mentions[0]).toMatchObject({
      type: 'file',
      path: 'src/cli/ui.tsx',
      lineRange: { start: 42, end: 42 },
      startIndex: 10,
      raw: '@src/cli/ui.tsx:42',
    });
  });

  it('should parse a tool mention', () => {
    const input = 'Get my assignments @canvas';
    const mentions = parseAtMentions(input);

    expect(mentions).toHaveLength(1);
    expect(mentions[0]).toMatchObject({
      type: 'tool',
      toolName: 'canvas',
      startIndex: 19,
      raw: '@canvas',
    });
  });

  it('should parse multiple mentions', () => {
    const input = 'Compare @file1.ts and @file2.ts using @canvas';
    const mentions = parseAtMentions(input);

    expect(mentions).toHaveLength(3);
    expect(mentions[0].path).toBe('file1.ts');
    expect(mentions[1].path).toBe('file2.ts');
    expect(mentions[2].toolName).toBe('canvas');
  });

  it('should handle escaped @ symbols', () => {
    const input = 'Email is user\\@example.com but check @file.ts';
    const mentions = parseAtMentions(input);

    expect(mentions).toHaveLength(1);
    expect(mentions[0].path).toBe('file.ts');
  });

  it('should handle escaped spaces in paths', () => {
    const input = 'Check @my\\ file\\ name.ts';
    const mentions = parseAtMentions(input);

    expect(mentions).toHaveLength(1);
    expect(mentions[0].path).toBe('my file name.ts');
  });

  it('should stop at punctuation', () => {
    const input = 'Check @file.ts, then @other.ts.';
    const mentions = parseAtMentions(input);

    expect(mentions).toHaveLength(2);
    expect(mentions[0].path).toBe('file.ts');
    expect(mentions[1].path).toBe('other.ts');
  });

  it('should handle @ at end of string', () => {
    const input = 'Check @file.ts';
    const mentions = parseAtMentions(input);

    expect(mentions).toHaveLength(1);
    expect(mentions[0].path).toBe('file.ts');
  });

  it('should return empty array for no mentions', () => {
    const input = 'No mentions here';
    const mentions = parseAtMentions(input);

    expect(mentions).toHaveLength(0);
  });

  it('should handle @ with no following text', () => {
    const input = 'Just an @ symbol';
    const mentions = parseAtMentions(input);

    expect(mentions).toHaveLength(0);
  });
});

describe('getCurrentAtMention', () => {
  it('should detect current mention being typed', () => {
    const input = 'Check @src/cli/';
    const cursorPos = input.length;
    const current = getCurrentAtMention(input, cursorPos);

    expect(current).toMatchObject({
      text: '@src/cli/',
      startIndex: 6,
    });
  });

  it('should detect partial mention', () => {
    const input = 'Check @sr';
    const cursorPos = input.length;
    const current = getCurrentAtMention(input, cursorPos);

    expect(current).toMatchObject({
      text: '@sr',
      startIndex: 6,
    });
  });

  it('should return null when not in a mention', () => {
    const input = 'Check file.ts';
    const cursorPos = input.length;
    const current = getCurrentAtMention(input, cursorPos);

    expect(current).toBeNull();
  });

  it('should return null when cursor is before @', () => {
    const input = 'Check @file.ts';
    const cursorPos = 5; // Before @
    const current = getCurrentAtMention(input, cursorPos);

    expect(current).toBeNull();
  });

  it('should handle cursor in middle of mention', () => {
    const input = 'Check @src/cli/ui.tsx';
    const cursorPos = 14; // After @src/cli (before /)
    const current = getCurrentAtMention(input, cursorPos);

    expect(current).toMatchObject({
      text: '@src/cli',
      startIndex: 6,
    });
  });
});

describe('path escaping', () => {
  it('should escape spaces', () => {
    expect(escapePath('my file.ts')).toBe('my\\ file.ts');
  });

  it('should unescape spaces', () => {
    expect(unescapePath('my\\ file.ts')).toBe('my file.ts');
  });

  it('should handle multiple spaces', () => {
    expect(escapePath('my file name.ts')).toBe('my\\ file\\ name.ts');
    expect(unescapePath('my\\ file\\ name.ts')).toBe('my file name.ts');
  });
});

describe('tool validation', () => {
  it('should validate known tools', () => {
    expect(isValidTool('canvas')).toBe(true);
    expect(isValidTool('deepwiki')).toBe(true);
    expect(isValidTool('websearch')).toBe(true);
    expect(isValidTool('googlecal')).toBe(true);
    expect(isValidTool('googledocs')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isValidTool('Canvas')).toBe(true);
    expect(isValidTool('DEEPWIKI')).toBe(true);
  });

  it('should reject unknown tools', () => {
    expect(isValidTool('unknown')).toBe(false);
    expect(isValidTool('random')).toBe(false);
  });
});
