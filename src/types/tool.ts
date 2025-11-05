import type { z } from 'zod';

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  execute: (params: any) => Promise<ToolResult>;
}

// Anthropic tool definition format
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

