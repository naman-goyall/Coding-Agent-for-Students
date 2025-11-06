import { config as loadEnv } from 'dotenv';
import { logger } from '../utils/logger.js';
import type { AgentConfig } from '../types/config.js';
import { DEFAULT_CONFIG } from '../types/config.js';

export function loadConfig(): AgentConfig {
  // Load .env file
  loadEnv();

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    logger.error(
      'ANTHROPIC_API_KEY not found in environment variables.\n' +
      'Please create a .env file with your API key:\n' +
      '  cp .env.example .env\n' +
      '  # Edit .env and add your API key'
    );
    process.exit(1);
  }

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

