/**
 * Token Storage System
 * 
 * Handles secure storage and retrieval of OAuth tokens
 * Tokens are stored in ~/.sparky/google-tokens.json with restricted permissions
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { StoredTokens, TokenStorageError } from './oauth-types.js';

/**
 * Token storage configuration
 */
const STORAGE_DIR = path.join(os.homedir(), '.sparky');
const TOKEN_FILE = path.join(STORAGE_DIR, 'google-tokens.json');
const FILE_PERMISSIONS = 0o600; // Owner read/write only

/**
 * TokenStorage class for managing OAuth tokens
 */
export class TokenStorage {
  private tokenPath: string;

  constructor(customPath?: string) {
    this.tokenPath = customPath || TOKEN_FILE;
  }

  /**
   * Initialize storage directory
   */
  private async ensureStorageDirectory(): Promise<void> {
    const dir = path.dirname(this.tokenPath);
    
    try {
      await fs.access(dir);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Save tokens to storage
   */
  async saveTokens(tokens: StoredTokens): Promise<void> {
    try {
      await this.ensureStorageDirectory();

      const tokenData = JSON.stringify(tokens, null, 2);
      await fs.writeFile(this.tokenPath, tokenData, { 
        mode: FILE_PERMISSIONS,
        encoding: 'utf-8'
      });

      console.log(`✅ Tokens saved to ${this.tokenPath}`);
    } catch (error) {
      throw new TokenStorageError(
        `Failed to save tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Load tokens from storage
   */
  async loadTokens(): Promise<StoredTokens | null> {
    try {
      await fs.access(this.tokenPath);
      const tokenData = await fs.readFile(this.tokenPath, 'utf-8');
      const tokens = JSON.parse(tokenData) as StoredTokens;

      // Validate token structure
      if (!this.isValidTokenStructure(tokens)) {
        throw new TokenStorageError('Invalid token structure in storage');
      }

      return tokens;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist - this is fine for first-time auth
        return null;
      }
      
      throw new TokenStorageError(
        `Failed to load tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if tokens exist
   */
  async hasTokens(): Promise<boolean> {
    try {
      await fs.access(this.tokenPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete stored tokens
   */
  async deleteTokens(): Promise<void> {
    try {
      await fs.unlink(this.tokenPath);
      console.log('🗑️  Tokens deleted');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new TokenStorageError(
          `Failed to delete tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error : undefined
        );
      }
    }
  }

  /**
   * Check if tokens are expired
   */
  isExpired(tokens: StoredTokens): boolean {
    if (!tokens.expiry_date) {
      return false; // No expiry date means token doesn't expire
    }

    const now = Date.now();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes buffer for clock skew
    
    return now >= (tokens.expiry_date - expiryBuffer);
  }

  /**
   * Validate token structure
   */
  private isValidTokenStructure(tokens: unknown): tokens is StoredTokens {
    if (!tokens || typeof tokens !== 'object') {
      return false;
    }

    const t = tokens as Partial<StoredTokens>;
    
    return (
      typeof t.access_token === 'string' &&
      typeof t.token_type === 'string' &&
      typeof t.scope === 'string' &&
      typeof t.expiry_date === 'number'
    );
  }

  /**
   * Get token file path
   */
  getTokenPath(): string {
    return this.tokenPath;
  }

  /**
   * Get time until token expiry
   */
  getTimeUntilExpiry(tokens: StoredTokens): number {
    if (!tokens.expiry_date) {
      return Infinity;
    }

    return Math.max(0, tokens.expiry_date - Date.now());
  }

  /**
   * Format time until expiry as human-readable string
   */
  formatTimeUntilExpiry(tokens: StoredTokens): string {
    const ms = this.getTimeUntilExpiry(tokens);
    
    if (ms === Infinity) {
      return 'Never';
    }

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }
}

/**
 * Default token storage instance
 */
export const defaultTokenStorage = new TokenStorage();
