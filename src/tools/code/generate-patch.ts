import { z } from 'zod';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';
import { DiffUtils } from '../../utils/diff-utils.js';

const inputSchema = z.object({
  original_path: z.string().describe('Path to original file'),
  modified_path: z.string().optional().describe('Path to modified file (if different from original)'),
  modified_content: z.string().optional().describe('Modified content as string (alternative to modified_path)'),
  context_lines: z.number().default(3).describe('Number of context lines in diff'),
  output_file: z.string().optional().describe('Optional: Save patch to file'),
});

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    const { original_path, modified_path, modified_content, context_lines, output_file } = params;

    // Validate inputs
    if (!modified_path && !modified_content) {
      return {
        success: false,
        error: 'Must provide either modified_path or modified_content',
      };
    }

    const originalPath = resolve(original_path);

    if (!existsSync(originalPath)) {
      return {
        success: false,
        error: `Original file not found: ${original_path}`,
      };
    }

    logger.debug('Generating patch', {
      originalPath,
      modifiedPath: modified_path,
      hasModifiedContent: !!modified_content,
    });

    // Read original file
    const originalContent = await readFile(originalPath, 'utf-8');

    // Get modified content
    let modifiedContentStr: string;
    if (modified_content) {
      modifiedContentStr = modified_content;
    } else if (modified_path) {
      const modPath = resolve(modified_path);
      if (!existsSync(modPath)) {
        return {
          success: false,
          error: `Modified file not found: ${modified_path}`,
        };
      }
      modifiedContentStr = await readFile(modPath, 'utf-8');
    } else {
      return {
        success: false,
        error: 'No modified content provided',
      };
    }

    // Generate diff
    const patch = DiffUtils.createUnifiedDiff(
      originalContent,
      modifiedContentStr,
      original_path,
      context_lines
    );

    if (!patch) {
      return {
        success: true,
        output: 'No differences found between original and modified content.',
      };
    }

    // Get summary
    const summary = DiffUtils.summarizeChanges(patch);

    // Save to file if requested
    if (output_file) {
      const { writeFile } = await import('fs/promises');
      const outputPath = resolve(output_file);
      await writeFile(outputPath, patch, 'utf-8');
      logger.debug(`Saved patch to: ${outputPath}`);
    }

    const savedNote = output_file ? `\nPatch saved to: ${output_file}` : '';

    return {
      success: true,
      output: `Generated patch for ${original_path}
Changes: ${summary}${savedNote}

${DiffUtils.colorDiff(patch)}

To apply this patch, use:
  apply_patch with the patch content above`,
    };
  } catch (error) {
    logger.error(error as Error, 'generate_patch error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during patch generation',
    };
  }
}

export const generatePatchTool: Tool = {
  name: 'generate_patch',
  description:
    'Generate a unified diff patch by comparing two versions of a file. Can compare two files or a file with provided content. Optionally save patch to a file. Use this to create patches that can be reviewed and applied later.',
  inputSchema,
  execute,
};
