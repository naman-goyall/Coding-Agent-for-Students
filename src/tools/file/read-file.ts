import { z } from 'zod';
import { resolve } from 'path';
import { stat } from 'fs/promises';
import type { Tool, ToolResult } from '../../types/tool.js';
import { FileUtils } from '../../utils/file-utils.js';
import { logger } from '../../utils/logger.js';

const inputSchema = z.object({
  path: z.string().describe('File path to read'),
  start_line: z.number().optional().describe('Start line number (1-indexed)'),
  end_line: z.number().optional().describe('End line number (inclusive)'),
  add_line_numbers: z.boolean().default(true).describe('Add line numbers to output'),
});

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    const { path, start_line, end_line, add_line_numbers } = params;
    const absolutePath = resolve(path);

    logger.debug(`Reading file: ${absolutePath}`, {
      startLine: start_line,
      endLine: end_line,
    });

    const content = await FileUtils.readFileWithLines(absolutePath, {
      startLine: start_line,
      endLine: end_line,
      addLineNumbers: add_line_numbers,
    });

    // Get file stats for metadata
    const stats = await stat(absolutePath);
    const fileSize = FileUtils.formatFileSize(stats.size);

    const lineRange = start_line || end_line
      ? ` (lines ${start_line || 1}-${end_line || 'end'})`
      : '';

    const header = `File: ${path}${lineRange}\nSize: ${fileSize}\n\n`;

    return {
      success: true,
      output: header + content,
    };
  } catch (error) {
    logger.error(error as Error, 'read_file error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const readFileTool: Tool = {
  name: 'read_file',
  description:
    'Read the contents of a file with optional line range. Returns file contents with line numbers. Use this to examine source code or text files.',
  inputSchema,
  execute,
};

