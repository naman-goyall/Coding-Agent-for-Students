import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

const inputSchema = z.object({
  command: z.string().describe('Shell command to execute'),
  timeout: z.number().default(30000).describe('Timeout in milliseconds'),
  cwd: z.string().optional().describe('Working directory for command execution'),
});

// Dangerous commands that require extra caution
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//, // rm -rf /
  /:\(\)\{.*:\|:.*\}/, // Fork bombs
  /mkfs/, // Format filesystem
  /dd\s+if=.*of=\/dev/, // Disk operations
  />\/dev\/sd/, // Writing to disk devices
];

function isDangerousCommand(command: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(command));
}

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    const { command, timeout, cwd } = params;

    logger.debug(`Executing bash command: ${command}`, { timeout, cwd });

    // Check for dangerous commands
    if (isDangerousCommand(command)) {
      return {
        success: false,
        error: `Dangerous command detected and blocked: ${command}`,
      };
    }

    // Execute command
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      cwd: cwd || process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB
      shell: '/bin/bash',
    });

    // Combine stdout and stderr
    const output = [stdout, stderr].filter(Boolean).join('\n');

    if (!output) {
      return {
        success: true,
        output: 'Command executed successfully (no output)',
      };
    }

    return {
      success: true,
      output: `$ ${command}\n\n${output}`,
    };
  } catch (error: any) {
    logger.error(error, 'bash execution error');

    // Handle timeout
    if (error.killed && error.signal === 'SIGTERM') {
      return {
        success: false,
        error: `Command timed out after ${params.timeout}ms`,
      };
    }

    // Handle non-zero exit code
    if (error.code !== undefined) {
      const output = [error.stdout, error.stderr].filter(Boolean).join('\n');
      return {
        success: false,
        error: `Command failed with exit code ${error.code}\n${output}`,
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown error during command execution',
    };
  }
}

export const bashTool: Tool = {
  name: 'execute_bash',
  description:
    'Execute bash shell commands. Use this to run terminal commands like npm install, git status, ls, grep, etc. Returns stdout and stderr. Be careful with destructive commands.',
  inputSchema,
  execute,
};

