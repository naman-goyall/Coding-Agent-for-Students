/**
 * Google OAuth Client
 * 
 * Handles OAuth 2.0 authentication flow for Google APIs
 * Based on Gemini CLI implementation with improvements
 */

import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import { URL } from 'url';
import open from 'open';
import crypto from 'crypto';
import {
  OAuthConfig,
  AuthorizationResult,
  OAuthError,
  DEFAULT_SCOPES,
  credentialsToStoredTokens,
  storedTokensToCredentials,
  AuthState,
} from './oauth-types.js';
import { TokenStorage, defaultTokenStorage } from './token-storage.js';

/**
 * GoogleOAuth class for managing OAuth 2.0 flow
 */
export class GoogleOAuth {
  private oauth2Client: OAuth2Client;
  private tokenStorage: TokenStorage;
  private scopes: string[];
  private authState: AuthState = AuthState.UNAUTHENTICATED;

  constructor(
    config: OAuthConfig,
    scopes: string[] = DEFAULT_SCOPES,
    tokenStorage?: TokenStorage
  ) {
    this.oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri || 'http://localhost'
    );
    this.scopes = scopes;
    this.tokenStorage = tokenStorage || defaultTokenStorage;
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return this.authState;
  }

  /**
   * Authenticate user and return OAuth2Client
   * Handles both initial authentication and token refresh
   */
  async authenticate(): Promise<OAuth2Client> {
    try {
      // Check for existing tokens
      const existingTokens = await this.tokenStorage.loadTokens();

      if (existingTokens) {
        // Check if tokens are expired
        if (this.tokenStorage.isExpired(existingTokens)) {
          console.log('🔄 Access token expired, attempting refresh...');
          this.authState = AuthState.TOKEN_EXPIRED;

          // Try to refresh
          if (existingTokens.refresh_token) {
            try {
              const credentials = storedTokensToCredentials(existingTokens);
              this.oauth2Client.setCredentials(credentials);

              const { credentials: refreshedCredentials } =
                await this.oauth2Client.refreshAccessToken();

              const newTokens = credentialsToStoredTokens(refreshedCredentials);
              await this.tokenStorage.saveTokens(newTokens);

              console.log('✅ Access token refreshed successfully');
              this.authState = AuthState.AUTHENTICATED;
              return this.oauth2Client;
            } catch (refreshError) {
              console.log('⚠️  Token refresh failed, re-authenticating...');
              // Continue to full authentication flow
            }
          }
        } else {
          // Tokens are valid
          const credentials = storedTokensToCredentials(existingTokens);
          this.oauth2Client.setCredentials(credentials);

          const expiryTime = this.tokenStorage.formatTimeUntilExpiry(existingTokens);
          console.log(`✅ Using existing authentication (expires in ${expiryTime})`);
          
          this.authState = AuthState.AUTHENTICATED;
          return this.oauth2Client;
        }
      }

      // No valid tokens, start OAuth flow
      console.log('🔐 Starting Google OAuth authentication...');
      this.authState = AuthState.AUTHENTICATING;

      const { code, redirectUri } = await this.getAuthorizationCode();

      // Update client with actual redirect URI
      this.oauth2Client = new OAuth2Client(
        this.oauth2Client._clientId,
        this.oauth2Client._clientSecret,
        redirectUri
      );

      // Exchange authorization code for tokens
      console.log('🔄 Exchanging authorization code for tokens...');
      const { tokens } = await this.oauth2Client.getToken(code);

      // Save tokens
      const storedTokens = credentialsToStoredTokens(tokens);
      await this.tokenStorage.saveTokens(storedTokens);

      // Set credentials
      this.oauth2Client.setCredentials(tokens);

      console.log('✅ Authentication successful!');
      this.authState = AuthState.AUTHENTICATED;

      return this.oauth2Client;
    } catch (error) {
      this.authState = AuthState.ERROR;
      throw new OAuthError(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AUTH_FAILED',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get authorization code from OAuth flow
   * Starts local server and opens browser for user authentication
   */
  private async getAuthorizationCode(): Promise<AuthorizationResult> {
    // Get an available port
    const port = await this.getAvailablePort();
    const redirectUri = `http://localhost:${port}/oauth2callback`;

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        try {
          if (req.url?.startsWith('/oauth2callback')) {
            const url = new URL(req.url, redirectUri);
            const code = url.searchParams.get('code');
            const returnedState = url.searchParams.get('state');
            const error = url.searchParams.get('error');

            // Check for errors
            if (error) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: Arial; padding: 40px; text-align: center;">
                    <h1 style="color: #dc3545;">❌ Authentication Failed</h1>
                    <p>Error: ${error}</p>
                    <p>You can close this tab and try again.</p>
                  </body>
                </html>
              `);
              server.close();
              reject(new OAuthError(`OAuth error: ${error}`, error));
              return;
            }

            // Verify state parameter
            if (returnedState !== state) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: Arial; padding: 40px; text-align: center;">
                    <h1 style="color: #dc3545;">❌ Security Error</h1>
                    <p>State verification failed. Please try again.</p>
                  </body>
                </html>
              `);
              server.close();
              reject(new OAuthError('State verification failed', 'INVALID_STATE'));
              return;
            }

            // Success
            if (code) {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: Arial; padding: 40px; text-align: center;">
                    <h1 style="color: #28a745;">✅ Authentication Successful!</h1>
                    <p>You can now close this tab and return to the terminal.</p>
                    <script>setTimeout(() => window.close(), 2000);</script>
                  </body>
                </html>
              `);
              server.close();
              resolve({ code, redirectUri });
            } else {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: Arial; padding: 40px; text-align: center;">
                    <h1 style="color: #dc3545;">❌ No Authorization Code</h1>
                    <p>Authentication failed. Please try again.</p>
                  </body>
                </html>
              `);
              server.close();
              reject(new OAuthError('No authorization code received', 'NO_CODE'));
            }
          }
        } catch (err) {
          server.close();
          reject(err);
        }
      });

      // Start server
      server.listen(port, async () => {
        try {
          // Generate authorization URL
          const authUrl = this.oauth2Client.generateAuthUrl({
            access_type: 'offline', // Request refresh token
            scope: this.scopes,
            redirect_uri: redirectUri,
            prompt: 'consent', // Force consent to ensure refresh token
            state: state, // CSRF protection
          });

          console.log(`\n🌐 Opening browser for authentication...`);
          console.log(`📍 Callback server listening on port ${port}\n`);
          console.log(`If the browser doesn't open, visit this URL:\n${authUrl}\n`);

          // Open browser
          await open(authUrl);
        } catch (err) {
          server.close();
          reject(err);
        }
      });

      // Handle server errors
      server.on('error', (err) => {
        reject(
          new OAuthError(
            `Server error: ${err.message}`,
            'SERVER_ERROR',
            err
          )
        );
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(
          new OAuthError(
            'Authentication timeout - no response received',
            'TIMEOUT'
          )
        );
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Get an available port for the callback server
   */
  private async getAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = http.createServer();
      
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          const port = address.port;
          server.close(() => resolve(port));
        } else {
          reject(new Error('Failed to get port'));
        }
      });

      server.on('error', reject);
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.tokenStorage.loadTokens();
    if (!tokens) return false;
    
    return !this.tokenStorage.isExpired(tokens);
  }

  /**
   * Revoke authentication and delete tokens
   */
  async revoke(): Promise<void> {
    try {
      const tokens = await this.tokenStorage.loadTokens();
      
      if (tokens?.access_token) {
        await this.oauth2Client.revokeToken(tokens.access_token);
      }
      
      await this.tokenStorage.deleteTokens();
      this.authState = AuthState.UNAUTHENTICATED;
      
      console.log('✅ Authentication revoked successfully');
    } catch (error) {
      throw new OAuthError(
        `Failed to revoke authentication: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REVOKE_FAILED',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get current OAuth2Client (must be authenticated first)
   */
  getClient(): OAuth2Client {
    if (this.authState !== AuthState.AUTHENTICATED) {
      throw new OAuthError('Not authenticated. Call authenticate() first.', 'NOT_AUTHENTICATED');
    }
    return this.oauth2Client;
  }
}

/**
 * Create a Google OAuth client from environment variables
 */
export function createGoogleOAuthFromEnv(
  scopes?: string[],
  tokenStorage?: TokenStorage
): GoogleOAuth {
  // Import DEFAULT_GOOGLE_OAUTH from oauth-defaults.ts
  // This contains the hardcoded credentials that work for all users
  const { DEFAULT_GOOGLE_OAUTH } = require('../config/oauth-defaults.js');
  
  const clientId = DEFAULT_GOOGLE_OAUTH.clientId;
  const clientSecret = DEFAULT_GOOGLE_OAUTH.clientSecret;

  // Check if credentials are still placeholder values
  if (clientId === 'your-client-id.apps.googleusercontent.com' || 
      clientSecret === 'GOCSPX-your-client-secret') {
    throw new OAuthError(
      'Google OAuth credentials not configured. Developer: Please update src/config/oauth-defaults.ts with your actual credentials.',
      'MISSING_CREDENTIALS'
    );
  }

  return new GoogleOAuth(
    {
      clientId,
      clientSecret,
    },
    scopes,
    tokenStorage
  );
}
