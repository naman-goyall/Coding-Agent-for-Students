#!/usr/bin/env node

import chalk from 'chalk';
import { createProgram } from './cli/commands.js';
import { loadConfig } from './config/load-config.js';
import { logger } from './utils/logger.js';
import { runSetupWizard } from './cli/setup-wizard.js';
import { PersistentConfigManager } from './config/persistent-config.js';
import { config as loadEnv } from 'dotenv';

async function main() {
  try {
    // Check if setup command is being run
    const isSetup = process.argv.includes('setup');
    
    if (isSetup) {
      const hasReset = process.argv.includes('--reset');
      await runSetupWizard({ reset: hasReset });
      return;
    }

    // Check if this is a first-time user (no config exists)
    loadEnv();
    const hasEnvConfig = !!process.env.ANTHROPIC_API_KEY;
    
    if (!hasEnvConfig) {
      const configManager = new PersistentConfigManager();
      const hasPersistentConfig = await configManager.hasConfig();
      
      if (!hasPersistentConfig) {
        // First-time user - automatically run setup wizard
        console.log('');
        console.log(chalk.hex('#D4A574').bold('   👋 Welcome to Sparky!'));
        console.log('');
        console.log(chalk.white('   It looks like this is your first time running Sparky.'));
        console.log(chalk.white('   Let\'s get you set up with a quick configuration wizard.'));
        console.log('');
        
        await runSetupWizard({ reset: false });
        console.log(chalk.green.bold('   ✅ Setup complete! Run "sparky" again to start.'));
        console.log('');
        return;
      }
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

