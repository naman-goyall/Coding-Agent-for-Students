/**
 * Setup Wizard for Sparky
 * 
 * Interactive setup for first-time configuration
 */

import readline from 'readline';
import Anthropic from '@anthropic-ai/sdk';
import { PersistentConfigManager, type PersistedConfig } from '../config/persistent-config.js';
import { createGoogleOAuthFromEnv } from '../auth/google-oauth.js';
import { DEFAULT_SCOPES } from '../auth/oauth-types.js';

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
    console.log('\n┌─────────────────────────────────────────────┐');
    console.log('│  Welcome to Sparky! 🎓                      │');
    console.log('│  Let\'s set up your AI coding assistant      │');
    console.log('└─────────────────────────────────────────────┘\n');

    // Check for existing config
    const hasExisting = await configManager.hasConfig();
    if (hasExisting && !options.reset) {
      const overwrite = await ask(
        rl,
        '⚠️  Configuration already exists. Overwrite? (y/n): '
      );
      if (overwrite.toLowerCase() !== 'y') {
        console.log('\n✅ Setup cancelled. Existing configuration preserved.\n');
        rl.close();
        return;
      }
    }

    // Step 1: Anthropic API Key
    console.log('Step 1: Anthropic API Key');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Get your API key from: https://console.anthropic.com\n');

    let anthropicKey = '';
    let keyValid = false;

    while (!keyValid) {
      anthropicKey = await ask(rl, 'Enter your Anthropic API key: ');
      
      if (!anthropicKey.startsWith('sk-ant-')) {
        console.log('❌ Invalid key format. Should start with "sk-ant-"\n');
        continue;
      }

      console.log('⏳ Validating API key...');
      keyValid = await validateAnthropicKey(anthropicKey);
      
      if (!keyValid) {
        console.log('❌ API key validation failed. Please check your key.\n');
      } else {
        console.log('✅ API key validated\n');
      }
    }

    // Step 2: Canvas Integration (Optional)
    console.log('Step 2: Canvas Integration (Optional)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const setupCanvas = await ask(rl, 'Setup Canvas LMS integration? (y/n): ');

    let canvasConfig: { domain: string; accessToken: string } | undefined;

    if (setupCanvas.toLowerCase() === 'y') {
      console.log('\nCanvas Setup:');
      const canvasDomain = await ask(rl, 'Enter your Canvas domain (e.g., myschool.instructure.com): ');
      const canvasToken = await ask(rl, 'Enter your Canvas access token: ');

      if (canvasDomain && canvasToken) {
        canvasConfig = {
          domain: canvasDomain,
          accessToken: canvasToken,
        };
        console.log('✅ Canvas configuration saved\n');
      }
    } else {
      console.log('⏭️  Skipping Canvas setup\n');
    }

    // Step 3: Google Workspace (Optional)
    console.log('Step 3: Google Workspace (Optional)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const setupGoogle = await ask(rl, 'Setup Google Calendar, Gmail, Docs? (y/n): ');

    let googleConfig: { clientId: string; clientSecret: string } | undefined;

    if (setupGoogle.toLowerCase() === 'y') {
      console.log('\nGoogle OAuth Setup:');
      console.log('Get credentials from: https://console.cloud.google.com\n');
      
      const googleClientId = await ask(rl, 'Enter Google OAuth Client ID: ');
      const googleClientSecret = await ask(rl, 'Enter Google OAuth Client Secret: ');

      if (googleClientId && googleClientSecret) {
        googleConfig = {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        };

        // Authenticate immediately
        console.log('\n🔐 Starting Google OAuth authentication...');
        
        // Set temporary environment variables for OAuth
        process.env.GOOGLE_CLIENT_ID = googleClientId;
        process.env.GOOGLE_CLIENT_SECRET = googleClientSecret;

        try {
          const oauth = createGoogleOAuthFromEnv(DEFAULT_SCOPES);
          await oauth.authenticate();
          console.log('✅ Google OAuth successful\n');
        } catch (error) {
          console.log('⚠️  Google OAuth failed. You can authenticate later.\n');
        }
      }
    } else {
      console.log('⏭️  Skipping Google setup\n');
    }

    // Save configuration
    console.log('💾 Saving configuration...');

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

    if (googleConfig) {
      config.google = googleConfig;
    }

    await configManager.createConfig(config);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Setup complete! 🎉\n');
    console.log('Run \'sparky\' to start your AI coding assistant');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    rl.close();
  }
}
