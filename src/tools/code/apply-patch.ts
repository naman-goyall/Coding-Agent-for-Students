import { z } from 'zod';
import { readFile, writeFile, copyFile } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';
import { DiffUtils, type DiffHunk } from '../../utils/diff-utils.js';

const inputSchema = z.object({
  patch: z.string().describe('Unified diff patch to apply'),
  base_path: z.string().default('.').describe('Base directory for file paths'),
  reverse: z.boolean().default(false).describe('Apply patch in reverse'),
  dry_run: z.boolean().default(false).describe('Preview changes without applying'),
  backup: z.boolean().default(true).describe('Create backup before applying'),
  fuzzy: z.boolean().default(true).describe('Allow fuzzy matching if exact match fails'),
});

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    const { patch, base_path, reverse, dry_run, backup, fuzzy } = params;
    const basePath = resolve(base_path);

    logger.debug('Applying patch', {
      basePathLength: patch.length,
      basePath,
      reverse,
      dryRun: dry_run,
    });

    // Parse patch
    const parsedDiff = DiffUtils.parseDiff(patch);
    if (!parsedDiff) {
      return {
        success: false,
        error: 'Invalid patch format. Expected unified diff format.',
      };
    }

    // Apply patch to file
    const filePath = resolve(basePath, parsedDiff.newFile.replace(/^[ab]\//, ''));

    if (!existsSync(filePath)) {
      return {
        success: false,
        error: `File not found: ${parsedDiff.newFile}`,
      };
    }

    // Read file
    const originalContent = await readFile(filePath, 'utf-8');
    const lines = originalContent.split('\n');

    // Create backup if requested and not dry run
    if (backup && !dry_run) {
      const backupPath = `${filePath}.bak`;
      await copyFile(filePath, backupPath);
      logger.debug(`Created backup: ${backupPath}`);
    }

    // Apply hunks
    let modifiedLines = [...lines];
    let successCount = 0;
    let failCount = 0;
    const results: string[] = [];

    for (const hunk of parsedDiff.hunks) {
      const result = applyHunk(modifiedLines, hunk, reverse, fuzzy);
      if (result.success) {
        modifiedLines = result.lines;
        successCount++;
        results.push(`✓ Hunk at line ${hunk.oldStart} applied`);
      } else {
        failCount++;
        results.push(`✗ Hunk at line ${hunk.oldStart} failed: ${result.error}`);
      }
    }

    if (failCount > 0 && !fuzzy) {
      return {
        success: false,
        error: `Failed to apply ${failCount} hunk(s):\n${results.join('\n')}`,
      };
    }

    const modifiedContent = modifiedLines.join('\n');

    // Show diff preview
    const previewDiff = DiffUtils.createUnifiedDiff(
      originalContent,
      modifiedContent,
      parsedDiff.newFile
    );

    if (!dry_run) {
      // Write modified content
      await writeFile(filePath, modifiedContent, 'utf-8');
    }

    const summary = DiffUtils.summarizeChanges(previewDiff);
    const mode = dry_run ? '[DRY RUN]' : '';
    const backupNote = backup && !dry_run ? '\nBackup: Created (.bak)' : '';

    return {
      success: true,
      output: `${mode} Applied patch to ${parsedDiff.newFile}
${successCount} hunk(s) applied successfully
${failCount > 0 ? `${failCount} hunk(s) failed (fuzzy matching used)` : ''}
Changes: ${summary}${backupNote}

${results.join('\n')}

Preview:
${DiffUtils.colorDiff(previewDiff)}`,
    };
  } catch (error) {
    logger.error(error as Error, 'apply_patch error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during patch application',
    };
  }
}

/**
 * Apply a single hunk to file lines
 */
function applyHunk(
  lines: string[],
  hunk: DiffHunk,
  reverse: boolean,
  fuzzy: boolean
): { success: boolean; lines: string[]; error?: string } {
  // Find the hunk location
  const targetLine = hunk.oldStart - 1; // Convert to 0-indexed

  // Extract expected and new content from hunk
  const expectedLines: string[] = [];
  const newLines: string[] = [];

  for (const line of hunk.lines) {
    if (reverse) {
      // Reverse mode: swap additions and deletions
      if (line.type === 'remove' || line.type === 'context') {
        newLines.push(line.content);
      }
      if (line.type === 'add' || line.type === 'context') {
        expectedLines.push(line.content);
      }
    } else {
      // Normal mode
      if (line.type === 'remove' || line.type === 'context') {
        expectedLines.push(line.content);
      }
      if (line.type === 'add' || line.type === 'context') {
        newLines.push(line.content);
      }
    }
  }

  // Try exact match at target location
  let matchLocation = targetLine;
  if (matchesAt(lines, expectedLines, targetLine)) {
    // Exact match found
    const result = [...lines];
    result.splice(matchLocation, expectedLines.length, ...newLines);
    return { success: true, lines: result };
  }

  // Try fuzzy matching
  if (fuzzy) {
    // Search nearby lines
    const searchRange = 50;
    for (
      let offset = -searchRange;
      offset <= searchRange;
      offset++
    ) {
      const testLocation = targetLine + offset;
      if (testLocation >= 0 && matchesAt(lines, expectedLines, testLocation)) {
        const result = [...lines];
        result.splice(testLocation, expectedLines.length, ...newLines);
        logger.debug(`Fuzzy match found at offset ${offset}`);
        return { success: true, lines: result };
      }
    }
  }

  return {
    success: false,
    lines,
    error: 'Could not find matching context',
  };
}

/**
 * Check if expected lines match at given location
 */
function matchesAt(lines: string[], expected: string[], startIndex: number): boolean {
  if (startIndex < 0 || startIndex + expected.length > lines.length) {
    return false;
  }

  for (let i = 0; i < expected.length; i++) {
    if (lines[startIndex + i] !== expected[i]) {
      return false;
    }
  }

  return true;
}

export const applyPatchTool: Tool = {
  name: 'apply_patch',
  description:
    'Apply a unified diff patch to a file. Supports dry run mode, fuzzy matching, and automatic backups. Use this to apply patches from git diff, diff command, or generated patches.',
  inputSchema,
  execute,
};
