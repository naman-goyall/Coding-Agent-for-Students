/**
 * Google OAuth Types
 * 
 * Type definitions for Google OAuth 2.0 authentication flow
 */

import { Credentials } from 'google-auth-library';

/**
 * Stored token information
 */
export interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

/**
 * Authorization result from OAuth flow
 */
export interface AuthorizationResult {
  code: string;
  redirectUri: string;
}

/**
 * Google API scopes
 */
export const GOOGLE_SCOPES = {
  CALENDAR: 'https://www.googleapis.com/auth/calendar',
  CALENDAR_READONLY: 'https://www.googleapis.com/auth/calendar.readonly',
  CALENDAR_EVENTS: 'https://www.googleapis.com/auth/calendar.events',
  DOCUMENTS: 'https://www.googleapis.com/auth/documents',
  DRIVE_FILE: 'https://www.googleapis.com/auth/drive.file',
  SPREADSHEETS: 'https://www.googleapis.com/auth/spreadsheets',
} as const;

/**
 * Default scopes for School Agent
 */
export const DEFAULT_SCOPES = [
  GOOGLE_SCOPES.CALENDAR,
  GOOGLE_SCOPES.DOCUMENTS,
  GOOGLE_SCOPES.DRIVE_FILE,
];

/**
 * OAuth error types
 */
export class OAuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

/**
 * Token storage error
 */
export class TokenStorageError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'TokenStorageError';
  }
}

/**
 * Authentication state
 */
export enum AuthState {
  UNAUTHENTICATED = 'unauthenticated',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  TOKEN_EXPIRED = 'token_expired',
  ERROR = 'error',
}

/**
 * Convert Credentials to StoredTokens
 */
export function credentialsToStoredTokens(
  credentials: Credentials
): StoredTokens {
  if (!credentials.access_token) {
    throw new TokenStorageError('Missing access token in credentials');
  }

  return {
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token ?? undefined,
    scope: credentials.scope ?? '',
    token_type: credentials.token_type ?? 'Bearer',
    expiry_date: credentials.expiry_date ?? 0,
  };
}

/**
 * Convert StoredTokens to Credentials
 */
export function storedTokensToCredentials(
  tokens: StoredTokens
): Credentials {
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
    token_type: tokens.token_type,
    expiry_date: tokens.expiry_date,
  };
}
