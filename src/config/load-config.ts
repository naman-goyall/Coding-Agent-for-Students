import { config as loadEnv } from 'dotenv';
import { logger } from '../utils/logger.js';
import type { AgentConfig } from '../types/config.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import { PersistentConfigManager, ConfigError } from './persistent-config.js';

/**
 * Load configuration with priority:
 * 1. Environment variables (.env) - for local development
 * 2. Persistent config (~/.sparky/config.json) - for global installation
 */
export async function loadConfig(): Promise<AgentConfig> {
  // Try loading from .env first (for local dev / backward compatibility)
  loadEnv();

  const envApiKey = process.env.ANTHROPIC_API_KEY;

  // If .env has API key, use environment-based config
  if (envApiKey) {
    logger.info('Using configuration from .env file (local development mode)');
    return loadConfigFromEnv(envApiKey);
  }

  // Otherwise, try loading from persistent storage
  const configManager = new PersistentConfigManager();

  try {
    const hasConfig = await configManager.hasConfig();
    
    if (!hasConfig) {
      logger.error(
        'Sparky is not configured yet.\n\n' +
        'For global installation, run:\n' +
        '  sparky setup\n\n' +
        'For local development, create a .env file:\n' +
        '  cp .env.example .env\n' +
        '  # Edit .env and add your API keys'
      );
      process.exit(1);
    }

    const persistedConfig = await configManager.loadConfig();
    logger.info('Using configuration from ~/.sparky/config.json (global mode)');
    
    return configManager.toAgentConfig(persistedConfig);
  } catch (error) {
    if (error instanceof ConfigError && error.code === 'CONFIG_NOT_FOUND') {
      logger.error(error.message);
      process.exit(1);
    }
    
    throw error;
  }
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(apiKey: string): AgentConfig {
  // Load Canvas config if available
  const canvasDomain = process.env.CANVAS_DOMAIN;
  const canvasAccessToken = process.env.CANVAS_ACCESS_TOKEN;

  const config: AgentConfig = {
    anthropic: {
      apiKey,
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      maxTokens: parseInt(process.env.MAX_TOKENS || '4096', 10),
    },
    workingDirectory: DEFAULT_CONFIG.workingDirectory,
  };

  // Add Canvas config if both domain and token are provided
  if (canvasDomain && canvasAccessToken) {
    config.canvas = {
      domain: canvasDomain,
      accessToken: canvasAccessToken,
    };
    logger.info('Canvas configuration loaded from environment');
  }

  return config;
}
