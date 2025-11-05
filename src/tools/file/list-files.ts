import { z } from 'zod';
import { resolve } from 'path';
import type { Tool, ToolResult } from '../../types/tool.js';
import { FileUtils } from '../../utils/file-utils.js';
import { logger } from '../../utils/logger.js';

const inputSchema = z.object({
  path: z.string().default('.').describe('Directory path to list'),
  recursive: z.boolean().default(false).describe('List files recursively'),
  ignore_patterns: z
    .array(z.string())
    .optional()
    .describe('Patterns to ignore (e.g., "*.log", "temp")'),
});

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    const { path, recursive, ignore_patterns } = params;
    const absolutePath = resolve(path);

    logger.debug(`Listing files in: ${absolutePath}`, { recursive });

    const files = await FileUtils.listFiles(absolutePath, {
      recursive,
      ignorePatterns: ignore_patterns,
    });

    if (files.length === 0) {
      return {
        success: true,
        output: `No files found in ${path}`,
      };
    }

    // Format output
    const output = files
      .map(file => {
        const icon = file.type === 'directory' ? '📁' : '📄';
        const size = file.size ? ` (${FileUtils.formatFileSize(file.size)})` : '';
        return `${icon} ${file.path}${size}`;
      })
      .join('\n');

    const summary = `Found ${files.length} item(s) in ${path}\n\n${output}`;

    return {
      success: true,
      output: summary,
    };
  } catch (error) {
    logger.error(error as Error, 'list_files error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const listFilesTool: Tool = {
  name: 'list_files',
  description:
    'List files and directories in a given path. Use this to explore the project structure and find files.',
  inputSchema,
  execute,
};

