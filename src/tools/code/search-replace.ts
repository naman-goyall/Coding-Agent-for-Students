import { z } from 'zod';
import { readFile, writeFile, copyFile, stat } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';
import { DiffUtils } from '../../utils/diff-utils.js';

const inputSchema = z.object({
  path: z.string().describe('File path to modify'),
  search: z.string().describe('Text or pattern to search for'),
  replace: z.string().describe('Text to replace with'),
  regex: z.boolean().default(false).describe('Treat search as regex pattern'),
  case_sensitive: z.boolean().default(true).describe('Case sensitive search'),
  match_whole_word: z.boolean().default(false).describe('Match whole words only'),
  backup: z.boolean().default(true).describe('Create backup before modifying'),
});

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    const { path, search, replace, regex, case_sensitive, match_whole_word, backup } = params;
    const absolutePath = resolve(path);

    logger.debug(`Search and replace in: ${absolutePath}`, {
      search,
      replace,
      regex,
    });

    // Check if file exists
    if (!existsSync(absolutePath)) {
      return {
        success: false,
        error: `File not found: ${path}`,
      };
    }

    // Read file
    const originalContent = await readFile(absolutePath, 'utf-8');

    // Create backup if requested
    if (backup) {
      const backupPath = `${absolutePath}.bak`;
      await copyFile(absolutePath, backupPath);
      logger.debug(`Created backup: ${backupPath}`);
    }

    // Perform search and replace
    let modifiedContent: string;
    let matchCount = 0;

    if (regex) {
      // Use regex
      const flags = case_sensitive ? 'g' : 'gi';
      const pattern = new RegExp(search, flags);
      const matches = originalContent.match(pattern);
      matchCount = matches ? matches.length : 0;
      modifiedContent = originalContent.replace(pattern, replace);
    } else {
      // Literal string replacement
      // Handle case sensitivity
      if (!case_sensitive) {
        // Case-insensitive literal search
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(escapedSearch, 'gi');
        const matches = originalContent.match(pattern);
        matchCount = matches ? matches.length : 0;
        modifiedContent = originalContent.replace(pattern, replace);
      } else if (match_whole_word) {
        // Whole word matching
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\b${escapedSearch}\\b`, 'g');
        const matches = originalContent.match(pattern);
        matchCount = matches ? matches.length : 0;
        modifiedContent = originalContent.replace(pattern, replace);
      } else {
        // Simple replacement
        const parts = originalContent.split(search);
        matchCount = parts.length - 1;
        modifiedContent = parts.join(replace);
      }
    }

    // Check if any changes were made
    if (matchCount === 0) {
      return {
        success: true,
        output: `No matches found for: "${search}"`,
      };
    }

    // Write modified content
    await writeFile(absolutePath, modifiedContent, 'utf-8');

    // Generate diff
    const diff = DiffUtils.createUnifiedDiff(originalContent, modifiedContent, path);
    const summary = DiffUtils.summarizeChanges(diff);

    // Get file stats
    const stats = await stat(absolutePath);

    return {
      success: true,
      output: `Modified ${path}: ${matchCount} replacement(s) made ${summary}

${DiffUtils.colorDiff(diff)}

File size: ${stats.size} bytes
Backup: ${backup ? 'Created (.bak)' : 'None'}`,
    };
  } catch (error) {
    logger.error(error as Error, 'search_replace error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during search and replace',
    };
  }
}

export const searchReplaceTool: Tool = {
  name: 'search_replace',
  description:
    'Search and replace text in a file. Supports literal text or regex patterns. Shows a diff of changes. Automatically creates backups. Use this to make targeted changes to code.',
  inputSchema,
  execute,
};

