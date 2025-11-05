import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { AgentController } from '../agent/controller.js';
import { ChatUI } from './ui.js';
import { logger } from '../utils/logger.js';
import type { AgentConfig } from '../types/config.js';
import { createToolRegistry } from '../tools/index.js';

export function createProgram(config: AgentConfig) {
  const program = new Command();

  program
    .name('school-agent')
    .description('AI coding assistant for students powered by Claude Sonnet 4.5')
    .version('1.0.0');

  program
    .command('chat')
    .description('Start interactive chat session')
    .option('-d, --directory <path>', 'Working directory', process.cwd())
    .action(async (options) => {
      try {
        const toolRegistry = createToolRegistry();
        const agent = new AgentController(
          {
            ...config,
            workingDirectory: options.directory,
          },
          toolRegistry
        );

        // Render the UI
        render(React.createElement(ChatUI, { agent }));
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
  school-agent chat              Start interactive chat
  school-agent run "question"    Ask a single question

EXAMPLES:
  # Start a chat session
  school-agent chat

  # Ask a quick question
  school-agent run "How do I create a React component?"
  
  # Get help with an error
  school-agent run "What does 'Cannot read property of undefined' mean?"

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

