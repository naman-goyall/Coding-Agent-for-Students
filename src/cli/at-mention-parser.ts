/**
 * At-mention parser for detecting and parsing @mentions in user input
 * Supports:
 * - File mentions: @filename.ts
 * - Directory mentions: @directory/
 * - File with line range: @filename.ts:10-20
 * - Tool mentions: @canvas, @notion, etc.
 */

import { getAllToolNames } from './tool-mentions.js';

export interface AtMention {
  type: 'file' | 'directory' | 'tool';
  path?: string;
  toolName?: string;
  lineRange?: { start: number; end: number };
  startIndex: number;
  endIndex: number;
  raw: string;
}

// Get list of known tools from tool-mentions
const KNOWN_TOOLS = getAllToolNames();

/**
 * Parse all @mentions from input string
 * Returns array of AtMention objects with their positions
 */
export function parseAtMentions(input: string): AtMention[] {
  const mentions: AtMention[] = [];
  let i = 0;

  while (i < input.length) {
    // Look for unescaped @ symbol
    if (input[i] === '@' && (i === 0 || input[i - 1] !== '\\')) {
      const mention = parseAtMentionAt(input, i);
      if (mention) {
        mentions.push(mention);
        i = mention.endIndex;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return mentions;
}

/**
 * Parse a single @mention starting at the given index
 */
function parseAtMentionAt(input: string, startIndex: number): AtMention | null {
  if (input[startIndex] !== '@') {
    return null;
  }

  let i = startIndex + 1;
  let path = '';

  // Parse the path/tool name
  // Continue until we hit whitespace, punctuation (except / . - _), or end of string
  while (i < input.length) {
    const char = input[i];

    // Handle escaped spaces
    if (char === '\\' && i + 1 < input.length && input[i + 1] === ' ') {
      path += ' ';
      i += 2;
      continue;
    }

    // Stop at unescaped whitespace or certain punctuation
    if (
      char === ' ' ||
      char === '\n' ||
      char === '\t' ||
      char === ',' ||
      char === ';' ||
      char === ')' ||
      char === ']' ||
      char === '}'
    ) {
      break;
    }

    // Stop at period followed by space or end (but allow periods in paths)
    if (char === '.' && (i + 1 >= input.length || input[i + 1] === ' ')) {
      break;
    }

    path += char;
    i++;
  }

  // If we didn't parse anything, return null
  if (path.length === 0) {
    return null;
  }

  const endIndex = i;
  const raw = input.substring(startIndex, endIndex);

  // Check if it's a tool mention
  const lowerPath = path.toLowerCase();
  if (KNOWN_TOOLS.includes(lowerPath)) {
    return {
      type: 'tool',
      toolName: lowerPath,
      startIndex,
      endIndex,
      raw,
    };
  }

  // Parse line range if present (e.g., @file.ts:10-20)
  let lineRange: { start: number; end: number } | undefined;
  let actualPath = path;

  const lineRangeMatch = path.match(/^(.+):(\d+)-(\d+)$/);
  if (lineRangeMatch) {
    actualPath = lineRangeMatch[1];
    lineRange = {
      start: parseInt(lineRangeMatch[2], 10),
      end: parseInt(lineRangeMatch[3], 10),
    };
  } else {
    // Check for single line number (e.g., @file.ts:10)
    const singleLineMatch = path.match(/^(.+):(\d+)$/);
    if (singleLineMatch) {
      actualPath = singleLineMatch[1];
      const lineNum = parseInt(singleLineMatch[2], 10);
      lineRange = { start: lineNum, end: lineNum };
    }
  }

  // Determine if it's a directory (ends with /)
  const isDirectory = actualPath.endsWith('/');

  return {
    type: isDirectory ? 'directory' : 'file',
    path: actualPath,
    lineRange,
    startIndex,
    endIndex,
    raw,
  };
}

/**
 * Get the current @mention being typed at the cursor position
 * Returns the partial mention text for autocomplete, or null if not in a mention
 */
export function getCurrentAtMention(
  input: string,
  cursorPos: number
): { text: string; startIndex: number } | null {
  // Look backwards from cursor to find the most recent unescaped @
  let atIndex = -1;
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (input[i] === '@' && (i === 0 || input[i - 1] !== '\\')) {
      atIndex = i;
      break;
    }
    // Stop if we hit whitespace or punctuation (not in a mention)
    if (
      input[i] === ' ' ||
      input[i] === '\n' ||
      input[i] === '\t' ||
      input[i] === ',' ||
      input[i] === ';'
    ) {
      break;
    }
  }

  if (atIndex === -1) {
    return null;
  }

  // Extract the text from @ to cursor
  const text = input.substring(atIndex, cursorPos);
  return { text, startIndex: atIndex };
}

/**
 * Unescape a path (remove backslashes before spaces)
 */
export function unescapePath(path: string): string {
  return path.replace(/\\ /g, ' ');
}

/**
 * Escape a path (add backslashes before spaces)
 */
export function escapePath(path: string): string {
  return path.replace(/ /g, '\\ ');
}

/**
 * Check if a tool name is valid
 */
export function isValidTool(toolName: string): boolean {
  return KNOWN_TOOLS.includes(toolName.toLowerCase());
}

/**
 * Get list of all known tools
 */
export function getKnownTools(): string[] {
  return [...KNOWN_TOOLS];
}
