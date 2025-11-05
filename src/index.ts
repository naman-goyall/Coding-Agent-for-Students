#!/usr/bin/env node

import { createProgram } from './cli/commands.js';
import { loadConfig } from './config/load-config.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    // Load configuration
    const config = loadConfig();

    // Create and run CLI program
    const program = createProgram(config);
    await program.parseAsync(process.argv);
  } catch (error) {
    logger.error(error as Error, 'Fatal error');
    process.exit(1);
  }
}

main();

