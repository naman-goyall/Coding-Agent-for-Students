import type { Tool, AnthropicTool } from '../types/tool.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getAnthropicTools(): AnthropicTool[] {
    return Array.from(this.tools.values()).map(tool => {
      const jsonSchema = zodToJsonSchema(tool.inputSchema, {
        target: 'openApi3',
        $refStrategy: 'none',
      });

      return {
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: 'object',
          properties: (jsonSchema as any).properties || {},
          required: (jsonSchema as any).required || [],
        },
      };
    });
  }

  async executeTool(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Validate params against schema
    const validatedParams = tool.inputSchema.parse(params);

    // Execute tool
    return await tool.execute(validatedParams);
  }
}

