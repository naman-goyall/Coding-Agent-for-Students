/**
 * Persistent Configuration System
 * 
 * Manages configuration stored in ~/.sparky/ directory
 * Supports both persistent config (for global installs) and .env (for local dev)
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { AgentConfig } from '../types/config.js';

/**
 * Configuration storage paths
 */
export const SPARKY_DIR = path.join(os.homedir(), '.sparky');
export const CONFIG_FILE = path.join(SPARKY_DIR, 'config.json');
const FILE_PERMISSIONS = 0o600; // Owner read/write only

/**
 * Persisted configuration structure
 */
export interface PersistedConfig {
  anthropic: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
  };
  canvas?: {
    domain: string;
    accessToken: string;
  };
  google?: {
    clientId: string;
    clientSecret: string;
  };
  version: string;
  createdAt: string;
  lastUpdated: string;
}

/**
 * Configuration error class
 */
export class ConfigError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Persistent configuration manager
 */
export class PersistentConfigManager {
  private configPath: string;

  constructor(customPath?: string) {
    this.configPath = customPath || CONFIG_FILE;
  }

  /**
   * Check if configuration exists
   */
  async hasConfig(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureDirectory(): Promise<void> {
    const dir = path.dirname(this.configPath);
    
    try {
      await fs.access(dir);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Load configuration from persistent storage
   */
  async loadConfig(): Promise<PersistedConfig> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configData) as PersistedConfig;

      // Validate required fields
      if (!this.isValidConfig(config)) {
        throw new ConfigError(
          'Invalid configuration structure',
          'INVALID_CONFIG'
        );
      }

      return config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ConfigError(
          'Configuration not found. Please run: sparky setup',
          'CONFIG_NOT_FOUND'
        );
      }

      if (error instanceof ConfigError) {
        throw error;
      }

      throw new ConfigError(
        `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LOAD_FAILED'
      );
    }
  }

  /**
   * Save configuration to persistent storage
   */
  async saveConfig(config: PersistedConfig): Promise<void> {
    try {
      await this.ensureDirectory();

      // Update timestamp
      config.lastUpdated = new Date().toISOString();

      const configData = JSON.stringify(config, null, 2);
      await fs.writeFile(this.configPath, configData, {
        mode: FILE_PERMISSIONS,
        encoding: 'utf-8',
      });

      console.log(`✅ Configuration saved to ${this.configPath}`);
    } catch (error) {
      throw new ConfigError(
        `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SAVE_FAILED'
      );
    }
  }

  /**
   * Update specific configuration fields
   */
  async updateConfig(updates: Partial<PersistedConfig>): Promise<PersistedConfig> {
    const currentConfig = await this.loadConfig();
    const updatedConfig: PersistedConfig = {
      ...currentConfig,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    await this.saveConfig(updatedConfig);
    return updatedConfig;
  }

  /**
   * Create initial configuration
   */
  async createConfig(config: Omit<PersistedConfig, 'version' | 'createdAt' | 'lastUpdated'>): Promise<PersistedConfig> {
    const now = new Date().toISOString();
    const fullConfig: PersistedConfig = {
      ...config,
      version: '1.0.0',
      createdAt: now,
      lastUpdated: now,
    };

    await this.saveConfig(fullConfig);
    return fullConfig;
  }

  /**
   * Delete configuration
   */
  async deleteConfig(): Promise<void> {
    try {
      await fs.unlink(this.configPath);
      console.log('🗑️  Configuration deleted');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new ConfigError(
          `Failed to delete configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'DELETE_FAILED'
        );
      }
    }
  }

  /**
   * Validate configuration structure
   */
  private isValidConfig(config: unknown): config is PersistedConfig {
    if (!config || typeof config !== 'object') {
      return false;
    }

    const c = config as Partial<PersistedConfig>;

    // Check required anthropic config
    if (!c.anthropic || typeof c.anthropic !== 'object') {
      return false;
    }

    if (typeof c.anthropic.apiKey !== 'string' || !c.anthropic.apiKey) {
      return false;
    }

    // Check version and timestamps
    if (typeof c.version !== 'string' || typeof c.createdAt !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Convert persisted config to agent config
   */
  toAgentConfig(config: PersistedConfig): AgentConfig {
    const agentConfig: AgentConfig = {
      anthropic: {
        apiKey: config.anthropic.apiKey,
        model: config.anthropic.model || 'claude-sonnet-4-20250514',
        maxTokens: config.anthropic.maxTokens || 4096,
      },
      workingDirectory: process.cwd(),
    };

    // Add Canvas config if available
    if (config.canvas) {
      agentConfig.canvas = {
        domain: config.canvas.domain,
        accessToken: config.canvas.accessToken,
      };
    }

    return agentConfig;
  }
}

/**
 * Default configuration manager instance
 */
export const defaultConfigManager = new PersistentConfigManager();
