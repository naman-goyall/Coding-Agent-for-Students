import { z } from 'zod';
import { resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

const inputSchema = z.object({
  pattern: z.string().describe('Pattern to search for (supports regex)'),
  path: z.string().default('.').describe('Directory or file to search in'),
  file_pattern: z
    .string()
    .optional()
    .describe('File pattern to filter (e.g., "*.ts", "*.py")'),
  case_sensitive: z.boolean().default(true).describe('Case sensitive search'),
  context_lines: z.number().default(2).describe('Number of context lines to show'),
  max_results: z.number().default(50).describe('Maximum number of results to return'),
});

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    const { pattern, path, file_pattern, case_sensitive, context_lines, max_results } = params;
    const absolutePath = resolve(path);

    logger.debug(`Searching for pattern: ${pattern} in ${absolutePath}`);

    // Check if ripgrep is available
    const hasRipgrep = await checkRipgrepAvailable();

    if (hasRipgrep) {
      return await executeRipgrep(
        pattern,
        absolutePath,
        file_pattern,
        case_sensitive,
        context_lines,
        max_results
      );
    } else {
      return await executeGrep(
        pattern,
        absolutePath,
        file_pattern,
        case_sensitive,
        context_lines,
        max_results
      );
    }
  } catch (error) {
    logger.error(error as Error, 'ripgrep error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkRipgrepAvailable(): Promise<boolean> {
  try {
    await execAsync('which rg');
    return true;
  } catch {
    return false;
  }
}

async function executeRipgrep(
  pattern: string,
  path: string,
  filePattern: string | undefined,
  caseSensitive: boolean,
  contextLines: number,
  maxResults: number
): Promise<ToolResult> {
  try {
    const args: string[] = [
      'rg',
      '--line-number',
      '--color=never',
      '--heading',
      `-C ${contextLines}`,
      `--max-count ${maxResults}`,
    ];

    if (!caseSensitive) {
      args.push('-i');
    }

    if (filePattern) {
      args.push(`--glob "${filePattern}"`);
    }

    // Escape the pattern for shell
    const escapedPattern = pattern.replace(/"/g, '\\"');
    args.push(`"${escapedPattern}"`);
    args.push(`"${path}"`);

    const command = args.join(' ');
    logger.debug(`Running: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    if (!stdout && !stderr) {
      return {
        success: true,
        output: `No matches found for pattern: ${pattern}`,
      };
    }

    if (stderr && !stdout) {
      return {
        success: false,
        error: stderr,
      };
    }

    return {
      success: true,
      output: `Search results for "${pattern}":\n\n${stdout}`,
    };
  } catch (error: any) {
    // Exit code 1 means no matches found
    if (error.code === 1) {
      return {
        success: true,
        output: `No matches found for pattern: ${pattern}`,
      };
    }
    throw error;
  }
}

async function executeGrep(
  pattern: string,
  path: string,
  filePattern: string | undefined,
  caseSensitive: boolean,
  contextLines: number,
  maxResults: number
): Promise<ToolResult> {
  try {
    logger.debug('Using grep (ripgrep not available)');

    const args: string[] = ['grep', '-n', '-r', `-C ${contextLines}`];

    if (!caseSensitive) {
      args.push('-i');
    }

    if (filePattern) {
      args.push(`--include="${filePattern}"`);
    }

    const escapedPattern = pattern.replace(/"/g, '\\"');
    args.push(`"${escapedPattern}"`);
    args.push(`"${path}"`);

    const command = args.join(' ') + ` | head -n ${maxResults * 4}`;
    logger.debug(`Running: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024,
    });

    if (!stdout && !stderr) {
      return {
        success: true,
        output: `No matches found for pattern: ${pattern}`,
      };
    }

    return {
      success: true,
      output: `Search results for "${pattern}":\n\n${stdout}`,
    };
  } catch (error: any) {
    if (error.code === 1) {
      return {
        success: true,
        output: `No matches found for pattern: ${pattern}`,
      };
    }
    throw error;
  }
}

export const ripgrepTool: Tool = {
  name: 'ripgrep',
  description:
    'Search for patterns in files using ripgrep (or grep as fallback). Supports regex patterns and returns matches with context. Use this to find code, text, or patterns across multiple files.',
  inputSchema,
  execute,
};

