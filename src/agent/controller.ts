import Anthropic from '@anthropic-ai/sdk';
import type { ToolUseBlock } from '@anthropic-ai/sdk/resources/messages.js';
import { ConversationManager } from './conversation.js';
import { logger } from '../utils/logger.js';
import type { AgentConfig } from '../types/config.js';
import type { ToolRegistry } from '../tools/registry.js';

export interface StreamChunk {
  type: 'content' | 'tool_use' | 'tool_result' | 'error' | 'done';
  content?: string;
  toolName?: string;
  toolInput?: any;
  toolResult?: string;
  error?: string;
}

export class AgentController {
  private client: Anthropic;
  private conversation: ConversationManager;
  private config: AgentConfig;
  private toolRegistry: ToolRegistry;
  private readonly systemPrompt = `You are a helpful AI coding assistant designed specifically for students. You help with:
- Understanding code and programming concepts
- Debugging and fixing errors
- Writing and improving code
- Learning new technologies
- Managing school projects

You have access to tools that let you:
- List files and directories (list_files)
- Read file contents (read_file)
- Write or modify files (write_file)
- Search for patterns in code (ripgrep)
- Execute shell commands (execute_bash)
- Search the web for information (web_search)

Use these tools when needed to help students. When using execute_bash, be careful with destructive commands. When writing files, explain what you're creating. When searching the web, find relevant documentation and resources.

Provide clear, concise, and helpful responses. When explaining code, break it down step by step. Always be encouraging and educational.`;

  constructor(config: AgentConfig, toolRegistry: ToolRegistry) {
    this.config = config;
    this.toolRegistry = toolRegistry;
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
    this.conversation = new ConversationManager();
  }

  async *chat(userMessage: string): AsyncGenerator<StreamChunk> {
    try {
      // Add user message to conversation
      this.conversation.addMessage({
        role: 'user',
        content: userMessage,
      });

      logger.debug('Sending message to Claude', {
        tokenEstimate: this.conversation.estimateTokens(),
      });

      // Agentic loop: keep going until we get a final response
      let continueLoop = true;
      let iterationCount = 0;
      const maxIterations = 10;

      while (continueLoop && iterationCount < maxIterations) {
        iterationCount++;

        // Create API request
        const response = await this.client.messages.create({
          model: this.config.anthropic.model,
          max_tokens: this.config.anthropic.maxTokens,
          system: this.systemPrompt,
          messages: this.conversation.getMessages(),
          tools: this.toolRegistry.getAnthropicTools(),
        });

        logger.debug('Received response', {
          stopReason: response.stop_reason,
          contentBlocks: response.content.length,
        });

        // Process content blocks
        const toolUses: ToolUseBlock[] = [];

        for (const block of response.content) {
          if (block.type === 'text') {
            yield {
              type: 'content',
              content: block.text,
            };
          } else if (block.type === 'tool_use') {
            toolUses.push(block);
            yield {
              type: 'tool_use',
              toolName: block.name,
              toolInput: block.input,
            };
          }
        }

        // Add assistant response to conversation
        this.conversation.addMessage({
          role: 'assistant',
          content: response.content,
        });

        // If there are tool uses, execute them
        if (toolUses.length > 0) {
          const toolResults: any[] = [];

          for (const toolUse of toolUses) {
            logger.debug(`Executing tool: ${toolUse.name}`, toolUse.input as object);

            try {
              const result = await this.toolRegistry.executeTool(toolUse.name, toolUse.input);

              const resultText = result.success
                ? result.output || 'Success'
                : `Error: ${result.error}`;

              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: resultText,
              });

              yield {
                type: 'tool_result',
                toolName: toolUse.name,
                toolResult: resultText,
              };
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              logger.error(error as Error, `Tool execution failed: ${toolUse.name}`);

              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: `Error: ${errorMsg}`,
                is_error: true,
              });

              yield {
                type: 'tool_result',
                toolName: toolUse.name,
                toolResult: `Error: ${errorMsg}`,
              };
            }
          }

          // Add tool results to conversation
          this.conversation.addMessage({
            role: 'user',
            content: toolResults as any,
          });

          // Continue the loop to let Claude respond to tool results
          continueLoop = true;
        } else {
          // No tool uses, we're done
          continueLoop = false;
        }

        // If Claude's stop_reason is 'end_turn', it's done
        if (response.stop_reason === 'end_turn') {
          continueLoop = false;
        }
      }

      yield {
        type: 'done',
      };

      logger.debug('Conversation complete', {
        iterations: iterationCount,
        totalTokens: this.conversation.estimateTokens(),
      });
    } catch (error) {
      logger.error(error as Error, 'Chat error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      yield {
        type: 'error',
        error: errorMessage,
      };
    }
  }

  async sendMessage(userMessage: string): Promise<string> {
    // Non-streaming version - collect all chunks
    const chunks: string[] = [];

    for await (const chunk of this.chat(userMessage)) {
      if (chunk.type === 'content' && chunk.content) {
        chunks.push(chunk.content);
      } else if (chunk.type === 'tool_use' && chunk.toolName) {
        chunks.push(`\n[Using tool: ${chunk.toolName}]\n`);
      } else if (chunk.type === 'tool_result') {
        chunks.push(`[Tool result received]\n`);
      }
    }

    return chunks.join('');
  }

  clearHistory(): void {
    this.conversation.clear();
  }

  getTokenEstimate(): number {
    return this.conversation.estimateTokens();
  }
}
