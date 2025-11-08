/**
 * Context builder for @mentions
 * Reads file contents, directory listings, and tool descriptions
 * Formats them for injection into the agent's context
 */

import { readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseAtMentions, type AtMention } from '../cli/at-mention-parser.js';
import { getToolByName, formatToolForContext } from '../cli/tool-mentions.js';

export interface FileAttachment {
  type: 'file' | 'directory' | 'tool';
  path?: string;
  content: string;
  lineRange?: { start: number; end: number };
  toolName?: string;
}

/**
 * Build context from @mentions in user message
 * Returns formatted context string to prepend to user message
 */
export function buildContextFromMentions(
  userMessage: string,
  workspaceRoot: string
): { context: string; attachments: FileAttachment[] } {
  const mentions = parseAtMentions(userMessage);
  const attachments: FileAttachment[] = [];
  const contextParts: string[] = [];

  for (const mention of mentions) {
    try {
      if (mention.type === 'file') {
        const fileContext = buildFileContext(mention, workspaceRoot);
        if (fileContext) {
          contextParts.push(fileContext.formatted);
          attachments.push(fileContext.attachment);
        }
      } else if (mention.type === 'directory') {
        const dirContext = buildDirectoryContext(mention, workspaceRoot);
        if (dirContext) {
          contextParts.push(dirContext.formatted);
          attachments.push(dirContext.attachment);
        }
      } else if (mention.type === 'tool') {
        const toolContext = buildToolContext(mention);
        if (toolContext) {
          contextParts.push(toolContext.formatted);
          attachments.push(toolContext.attachment);
        }
      }
    } catch (error) {
      // Log error but continue processing other mentions
      console.error(`Error processing mention ${mention.raw}:`, error);
    }
  }

  const context = contextParts.length > 0
    ? contextParts.join('\n\n---\n\n')
    : '';

  return { context, attachments };
}

/**
 * Build context for a file mention
 */
function buildFileContext(
  mention: AtMention,
  workspaceRoot: string
): { formatted: string; attachment: FileAttachment } | null {
  if (!mention.path) return null;

  const fullPath = join(workspaceRoot, mention.path);
  const MAX_FILE_SIZE = 1024 * 1024; // 1MB limit

  try {
    // Check if file exists
    const stats = statSync(fullPath);
    if (!stats.isFile()) {
      return null;
    }

    // Check file size
    if (stats.size > MAX_FILE_SIZE) {
      const formatted = `
File: ${mention.path}
⚠️  Warning: File is too large (${formatFileSize(stats.size)}). Maximum size is 1MB.
Consider using a line range instead: @${mention.path}:1-100
`.trim();

      return {
        formatted,
        attachment: {
          type: 'file',
          path: mention.path,
          content: '',
        },
      };
    }

    // Read file content
    let content = readFileSync(fullPath, 'utf-8');

    // Handle line ranges
    if (mention.lineRange) {
      const lines = content.split('\n');
      const { start, end } = mention.lineRange;
      
      // Extract specified lines (1-indexed)
      const selectedLines = lines.slice(start - 1, end);
      content = selectedLines.join('\n');

      // Format with line range
      const formatted = `
File: ${mention.path} (lines ${start}-${end})
\`\`\`
${content}
\`\`\`
`.trim();

      return {
        formatted,
        attachment: {
          type: 'file',
          path: mention.path,
          content,
          lineRange: mention.lineRange,
        },
      };
    }

    // Detect file extension for syntax highlighting
    const ext = mention.path.split('.').pop() || '';
    const language = getLanguageFromExtension(ext);

    // Format full file
    const formatted = `
File: ${mention.path}
\`\`\`${language}
${content}
\`\`\`
`.trim();

    return {
      formatted,
      attachment: {
        type: 'file',
        path: mention.path,
        content,
      },
    };
  } catch (error) {
    // File not found or permission denied
    const formatted = `
File: ${mention.path}
❌ Error: Could not read file (${error instanceof Error ? error.message : 'unknown error'})
`.trim();

    return {
      formatted,
      attachment: {
        type: 'file',
        path: mention.path,
        content: '',
      },
    };
  }
}

/**
 * Build context for a directory mention
 */
function buildDirectoryContext(
  mention: AtMention,
  workspaceRoot: string
): { formatted: string; attachment: FileAttachment } | null {
  if (!mention.path) return null;

  const fullPath = join(workspaceRoot, mention.path);

  try {
    // Check if directory exists
    const stats = statSync(fullPath);
    if (!stats.isDirectory()) {
      return null;
    }

    // List directory contents
    const items = readdirSync(fullPath, { withFileTypes: true });
    
    // Sort: directories first, then files, both alphabetically
    const sortedItems = items.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
    
    // Format directory listing with file sizes
    const listing = sortedItems
      .map(item => {
        const icon = item.isDirectory() ? '📁' : '📄';
        const name = item.isDirectory() ? `${item.name}/` : item.name;
        
        // Add file size for files
        if (!item.isDirectory()) {
          try {
            const itemPath = join(fullPath, item.name);
            const itemStats = statSync(itemPath);
            const size = formatFileSize(itemStats.size);
            return `  ${icon} ${name.padEnd(40)} ${size}`;
          } catch {
            return `  ${icon} ${name}`;
          }
        }
        
        return `  ${icon} ${name}`;
      })
      .join('\n');

    const formatted = `
Directory: ${mention.path}
${listing}
`.trim();

    return {
      formatted,
      attachment: {
        type: 'directory',
        path: mention.path,
        content: listing,
      },
    };
  } catch (error) {
    // Directory not found or permission denied
    const formatted = `
Directory: ${mention.path}
❌ Error: Could not read directory (${error instanceof Error ? error.message : 'unknown error'})
`.trim();

    return {
      formatted,
      attachment: {
        type: 'directory',
        path: mention.path,
        content: '',
      },
    };
  }
}

/**
 * Build context for a tool mention
 */
function buildToolContext(
  mention: AtMention
): { formatted: string; attachment: FileAttachment } | null {
  if (!mention.toolName) return null;

  const tool = getToolByName(mention.toolName);
  if (!tool) return null;

  const formatted = formatToolForContext(tool);

  return {
    formatted,
    attachment: {
      type: 'tool',
      toolName: mention.toolName,
      content: formatted,
    },
  };
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Get language identifier for syntax highlighting
 */
function getLanguageFromExtension(ext: string): string {
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    md: 'markdown',
    sql: 'sql',
  };

  return languageMap[ext.toLowerCase()] || '';
}

/**
 * Format context and user message together
 */
export function formatMessageWithContext(
  userMessage: string,
  context: string
): string {
  if (!context) {
    return userMessage;
  }

  return `${context}\n\n---\n\nUser question: ${userMessage}`;
}
