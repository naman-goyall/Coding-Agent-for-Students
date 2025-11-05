import { z } from 'zod';
import { writeFile, mkdir, copyFile, stat } from 'fs/promises';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';

const inputSchema = z.object({
  path: z.string().describe('File path to write'),
  content: z.string().describe('Content to write to the file'),
  create_dirs: z.boolean().default(true).describe('Create parent directories if they don\'t exist'),
  backup: z.boolean().default(true).describe('Create backup of existing file before overwriting'),
});

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    const { path, content, create_dirs, backup } = params;
    const absolutePath = resolve(path);

    logger.debug(`Writing file: ${absolutePath}`, {
      contentLength: content.length,
      createDirs: create_dirs,
      backup,
    });

    // Check if file exists
    const fileExists = existsSync(absolutePath);

    // Create backup if file exists and backup is requested
    if (fileExists && backup) {
      const backupPath = `${absolutePath}.bak`;
      await copyFile(absolutePath, backupPath);
      logger.debug(`Created backup: ${backupPath}`);
    }

    // Create parent directories if needed
    if (create_dirs) {
      const dir = dirname(absolutePath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
        logger.debug(`Created directory: ${dir}`);
      }
    }

    // Write file
    await writeFile(absolutePath, content, 'utf-8');

    // Get file size for confirmation
    const stats = await stat(absolutePath);
    const fileSize = stats.size;

    const action = fileExists ? 'Updated' : 'Created';
    const backupNote = fileExists && backup ? ' (backup created as .bak)' : '';

    return {
      success: true,
      output: `${action} file: ${path}\nSize: ${fileSize} bytes${backupNote}`,
    };
  } catch (error) {
    logger.error(error as Error, 'write_file error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during file write',
    };
  }
}

export const writeFileTool: Tool = {
  name: 'write_file',
  description:
    'Write content to a file. Creates new files or overwrites existing ones. Automatically creates parent directories and backs up existing files. Use this to create or modify files.',
  inputSchema,
  execute,
};

