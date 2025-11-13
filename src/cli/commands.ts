import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { AgentController } from '../agent/controller.js';
import { ChatUI } from './ui.js';
import { logger } from '../utils/logger.js';
import type { AgentConfig } from '../types/config.js';
import { createToolRegistry } from '../tools/index.js';
import { setCanvasConfig } from '../tools/student/canvas.js';
import { setTavilyApiKey } from '../tools/system/web-search.js';

export function createProgram(config: AgentConfig) {
  const program = new Command();

  program
    .name('sparky')
    .description('AI coding assistant for students powered by Claude Sonnet 4.5')
    .version('1.0.0');

  // Chat command (default when just running "sparky")
  program
    .command('chat', { isDefault: true })
    .description('Start interactive chat session (default)')
    .option('-d, --directory <path>', 'Working directory', process.cwd())
    .action(async (options) => {
      try {
        // Initialize Canvas config if available
        if (config.canvas) {
          setCanvasConfig(config.canvas);
          logger.info('Canvas integration enabled');
        }

        // Initialize Tavily API key if available
        if (config.tavilyApiKey) {
          setTavilyApiKey(config.tavilyApiKey);
          logger.info('Tavily search integration enabled');
        }

        const toolRegistry = createToolRegistry();
        const agent = new AgentController(
          {
            ...config,
            workingDirectory: options.directory,
          },
          toolRegistry
        );

        // Render the UI without clearing the screen
        render(React.createElement(ChatUI, { agent }), {
          patchConsole: false,
        });
      } catch (error) {
        logger.error(error as Error, 'Failed to start chat');
        process.exit(1);
      }
    });

  program
    .command('run <prompt>')
    .description('Run a single command and exit')
    .action(async (prompt: string) => {
      try {
        // Initialize Canvas config if available
        if (config.canvas) {
          setCanvasConfig(config.canvas);
        }

        const toolRegistry = createToolRegistry();
        const agent = new AgentController(config, toolRegistry);
        
        console.log('🤖 Agent: Thinking...\n');
        
        const response = await agent.sendMessage(prompt);
        
        console.log('🤖 Agent:', response);
      } catch (error) {
        logger.error(error as Error, 'Failed to run command');
        process.exit(1);
      }
    });

  program
    .command('help-topics')
    .description('Show help topics and examples')
    .action(() => {
      console.log(`
🎓 School Agent - Help Topics

GETTING STARTED:
  sparky setup                   Set up Sparky (first time only)
  sparky                         Start interactive chat
  sparky run "question"          Ask a single question

EXAMPLES:
  # Start a chat session
  sparky

  # Ask a quick question
  sparky run "How do I create a React component?"
  
  # Get help with an error
  sparky run "What does 'Cannot read property of undefined' mean?"

TIPS:
  - Be specific with your questions
  - You can ask for explanations, code examples, or debugging help
  - The agent remembers context within a chat session
  - Press Ctrl+C to exit at any time

More features coming soon:
  - File operations (read, write, search)
  - Canvas LMS integration
  - Todo management
  - Web search
  - And more!
      `);
    });

  return program;
}

