import { z } from 'zod';
import { readFile, writeFile, copyFile } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';
import { DiffUtils } from '../../utils/diff-utils.js';

const inputSchema = z.object({
  path: z.string().describe('File path to edit'),
  edits: z
    .array(
      z.object({
        start_line: z.number().describe('Start line number (1-indexed)'),
        end_line: z.number().describe('End line number (inclusive, 1-indexed)'),
        new_content: z.string().describe('New content to replace the line range'),
      })
    )
    .describe('Array of edits to apply'),
  backup: z.boolean().default(true).describe('Create backup before editing'),
});

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    const { path, edits, backup } = params;
    const absolutePath = resolve(path);

    logger.debug(`Editing file: ${absolutePath}`, {
      editCount: edits.length,
    });

    // Check if file exists
    if (!existsSync(absolutePath)) {
      return {
        success: false,
        error: `File not found: ${path}`,
      };
    }

    // Validate edits
    for (const edit of edits) {
      if (edit.start_line < 1) {
        return {
          success: false,
          error: `Invalid start_line: ${edit.start_line}. Line numbers must be >= 1`,
        };
      }
      if (edit.end_line < edit.start_line) {
        return {
          success: false,
          error: `Invalid line range: ${edit.start_line}-${edit.end_line}. end_line must be >= start_line`,
        };
      }
    }

    // Check for overlapping edits
    const sortedEdits = [...edits].sort((a, b) => a.start_line - b.start_line);
    for (let i = 0; i < sortedEdits.length - 1; i++) {
      if (sortedEdits[i].end_line >= sortedEdits[i + 1].start_line) {
        return {
          success: false,
          error: `Overlapping edits detected at lines ${sortedEdits[i].start_line}-${sortedEdits[i].end_line} and ${sortedEdits[i + 1].start_line}-${sortedEdits[i + 1].end_line}`,
        };
      }
    }

    // Read file
    const originalContent = await readFile(absolutePath, 'utf-8');
    const lines = originalContent.split('\n');

    // Validate line ranges
    for (const edit of edits) {
      if (edit.end_line > lines.length) {
        return {
          success: false,
          error: `Line ${edit.end_line} exceeds file length (${lines.length} lines)`,
        };
      }
    }

    // Create backup if requested
    if (backup) {
      const backupPath = `${absolutePath}.bak`;
      await copyFile(absolutePath, backupPath);
      logger.debug(`Created backup: ${backupPath}`);
    }

    // Apply edits in reverse order to maintain line numbers
    const modifiedLines = [...lines];
    for (let i = sortedEdits.length - 1; i >= 0; i--) {
      const edit = sortedEdits[i];
      const startIdx = edit.start_line - 1; // Convert to 0-indexed
      const endIdx = edit.end_line; // Inclusive

      // Split new content into lines
      const newLines = edit.new_content.split('\n');

      // Replace the range
      modifiedLines.splice(startIdx, endIdx - startIdx, ...newLines);
    }

    const modifiedContent = modifiedLines.join('\n');

    // Write modified content
    await writeFile(absolutePath, modifiedContent, 'utf-8');

    // Generate diff
    const diff = DiffUtils.createUnifiedDiff(originalContent, modifiedContent, path);
    const summary = DiffUtils.summarizeChanges(diff);

    return {
      success: true,
      output: `Edited ${path}: ${edits.length} edit(s) applied ${summary}

${DiffUtils.colorDiff(diff)}

Backup: ${backup ? 'Created (.bak)' : 'None'}`,
    };
  } catch (error) {
    logger.error(error as Error, 'edit_file error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during file edit',
    };
  }
}

export const editFileTool: Tool = {
  name: 'edit_file',
  description:
    'Make structured edits to a file by specifying line ranges and replacement content. Supports multiple edits in one operation. Shows a diff of all changes. Use this for precise, line-based edits.',
  inputSchema,
  execute,
};

