/**
 * Setup Wizard for Sparky
 * 
 * Interactive setup for first-time configuration with beautiful colored output
 */

import readline from 'readline';
import chalk from 'chalk';
import Anthropic from '@anthropic-ai/sdk';
import { PersistentConfigManager, type PersistedConfig } from '../config/persistent-config.js';
import { createGoogleOAuthFromEnv } from '../auth/google-oauth.js';
import { DEFAULT_SCOPES } from '../auth/oauth-types.js';

// Color scheme matching the agent UI
const colors = {
  primary: chalk.hex('#ff8800'),      // Orange - primary accent
  secondary: chalk.hex('#D4A574'),    // Tan/beige - ASCII art (matches agent UI)
  success: chalk.green,                // Green - success messages
  error: chalk.red,                    // Red - errors
  info: chalk.cyan,                    // Cyan - links and info
  text: chalk.white,                   // White - primary text
  muted: chalk.gray,                   // Gray - secondary text
  divider: chalk.hex('#ff8800'),      // Orange divider
};

interface SetupOptions {
  reset?: boolean;
}

/**
 * Create readline interface
 */
function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Ask a question and get user input
 */
function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Validate Anthropic API key
 */
async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({ apiKey });
    // Try a minimal API call to verify the key
    await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Setup wizard main function
 */
export async function runSetupWizard(options: SetupOptions = {}): Promise<void> {
  const rl = createReadline();
  const configManager = new PersistentConfigManager();

  try {
    // Welcome banner
    console.log('');
    console.log(colors.secondary.bold(`   ███████╗██████╗  █████╗ ██████╗ ██╗  ██╗██╗   ██╗`));
    console.log(colors.secondary.bold(`   ██╔════╝██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝╚██╗ ██╔╝`));
    console.log(colors.secondary.bold(`   ███████╗██████╔╝███████║██████╔╝█████╔╝  ╚████╔╝ `));
    console.log(colors.secondary.bold(`   ╚════██║██╔═══╝ ██╔══██║██╔══██╗██╔═██╗   ╚██╔╝  `));
    console.log(colors.secondary.bold(`   ███████║██║     ██║  ██║██║  ██║██║  ██╗   ██║   `));
    console.log(colors.secondary.bold(`   ╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   `));
    console.log('');
    console.log(colors.text('   Your AI coding assistant for students'));
    console.log(colors.divider('   ────────────────────────────────────────────────────────'));
    console.log('');

    // Check for existing config
    const hasExisting = await configManager.hasConfig();
    if (hasExisting && !options.reset) {
      const overwrite = await ask(
        rl,
        colors.primary('⚠️  Configuration already exists. Overwrite? (y/n): ')
      );
      if (overwrite.toLowerCase() !== 'y') {
        console.log('');
        console.log(colors.success('✅ Setup cancelled. Existing configuration preserved.'));
        console.log('');
        rl.close();
        return;
      }
    }

    // Step 1: Anthropic API Key
    console.log(colors.secondary.bold('   Step 1: Anthropic API Key'));
    console.log(colors.divider('   ────────────────────────────────────────────────────────'));
    console.log(colors.muted('   Get your API key from: ') + colors.info.underline('https://console.anthropic.com'));
    console.log('');

    let anthropicKey = '';
    let keyValid = false;

    while (!keyValid) {
      anthropicKey = await ask(rl, colors.text('   Enter your Anthropic API key: '));
      
      if (!anthropicKey.startsWith('sk-ant-')) {
        console.log(colors.error('   ❌ Invalid key format. Should start with "sk-ant-"'));
        console.log('');
        continue;
      }

      console.log(colors.primary('   ⏳ Validating API key...'));
      keyValid = await validateAnthropicKey(anthropicKey);
      
      if (!keyValid) {
        console.log(colors.error('   ❌ API key validation failed. Please check your key.'));
        console.log('');
      } else {
        console.log(colors.success('   ✅ API key validated'));
        console.log('');
      }
    }

    // Step 2: Canvas Integration (Optional)
    console.log(colors.secondary.bold('   Step 2: Canvas Integration (Optional)'));
    console.log(colors.divider('   ────────────────────────────────────────────────────────'));
    const setupCanvas = await ask(rl, colors.text('   Setup Canvas LMS integration? (y/n): '));

    let canvasConfig: { domain: string; accessToken: string } | undefined;

    if (setupCanvas.toLowerCase() === 'y') {
      console.log('');
      console.log(colors.info('   Canvas Setup:'));
      const canvasDomain = await ask(rl, colors.text('   Enter your Canvas domain (e.g., myschool.instructure.com): '));
      const canvasToken = await ask(rl, colors.text('   Enter your Canvas access token: '));

      if (canvasDomain && canvasToken) {
        canvasConfig = {
          domain: canvasDomain,
          accessToken: canvasToken,
        };
        console.log(colors.success('   ✅ Canvas configuration saved'));
        console.log('');
      }
    } else {
      console.log(colors.muted('   ⏭️  Skipping Canvas setup'));
      console.log('');
    }

    // Step 3: Google Workspace (Optional)
    console.log(colors.secondary.bold('   Step 3: Google Workspace (Optional)'));
    console.log(colors.divider('   ────────────────────────────────────────────────────────'));
    const setupGoogle = await ask(rl, colors.text('   Setup Google Calendar, Gmail, Docs, Drive? (y/n): '));

    let googleEnabled = false;

    if (setupGoogle.toLowerCase() === 'y') {
      console.log('');
      console.log(colors.info('   🔐 Starting Google OAuth authorization...'));
      console.log(colors.muted('   A browser window will open for you to authorize Sparky.'));
      console.log(colors.muted('   You\'ll be asked to grant access to:'));
      console.log(colors.text('     • Google Calendar (view and manage events)'));
      console.log(colors.text('     • Gmail (read, send, and manage emails)'));
      console.log(colors.text('     • Google Docs (view and create documents)'));
      console.log(colors.text('     • Google Drive (view and search files)'));
      console.log('');

      try {
        // Use built-in OAuth credentials (set via environment or defaults)
        const oauth = createGoogleOAuthFromEnv(DEFAULT_SCOPES);
        await oauth.authenticate();
        console.log(colors.success('   ✅ Google authorization successful!'));
        console.log('');
        googleEnabled = true;
      } catch (error) {
        console.log(colors.primary('   ⚠️  Google authorization failed. You can set this up later with "sparky setup --reset".'));
        console.log('');
      }
    } else {
      console.log(colors.muted('   ⏭️  Skipping Google setup'));
      console.log('');
    }

    // Save configuration
    console.log(colors.primary('   💾 Saving configuration...'));

    const config: Omit<PersistedConfig, 'version' | 'createdAt' | 'lastUpdated'> = {
      anthropic: {
        apiKey: anthropicKey,
        model: 'claude-sonnet-4-20250514',
        maxTokens: 4096,
      },
    };

    if (canvasConfig) {
      config.canvas = canvasConfig;
    }

    if (googleEnabled) {
      config.googleEnabled = true;
    }

    await configManager.createConfig(config);

    console.log('');
    console.log(colors.divider('   ────────────────────────────────────────────────────────'));
    console.log(colors.success.bold('   Setup complete! 🎉'));
    console.log('');
    console.log(colors.text('   Run ') + colors.primary.bold('sparky') + colors.text(' to start your AI coding assistant'));
    console.log(colors.divider('   ────────────────────────────────────────────────────────'));
    console.log('');

  } catch (error) {
    console.log('');
    console.log(colors.error('   ❌ Setup failed: ') + (error instanceof Error ? error.message : 'Unknown error'));
    console.log('');
    process.exit(1);
  } finally {
    rl.close();
  }
}
