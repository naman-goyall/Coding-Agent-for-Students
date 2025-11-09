#!/usr/bin/env node

import { createProgram } from './cli/commands.js';
import { loadConfig } from './config/load-config.js';
import { logger } from './utils/logger.js';
import { runSetupWizard } from './cli/setup-wizard.js';

async function main() {
  try {
    // Check if setup command is being run (doesn't need config)
    const isSetup = process.argv.includes('setup');
    
    if (isSetup) {
      const hasReset = process.argv.includes('--reset');
      await runSetupWizard({ reset: hasReset });
      return;
    }

    // Load configuration for all other commands
    const config = await loadConfig();

    // Create and run CLI program
    const program = createProgram(config);
    await program.parseAsync(process.argv);
  } catch (error) {
    logger.error(error as Error, 'Fatal error');
    process.exit(1);
  }
}

main();

