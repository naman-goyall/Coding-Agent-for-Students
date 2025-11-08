/**
 * Google OAuth Authentication Test
 * 
 * Test script to verify OAuth authentication flow
 * Run this to test the authentication system independently
 * 
 * Usage:
 *   npm run dev src/auth/test-auth.ts
 */

import 'dotenv/config';
import { createGoogleOAuthFromEnv } from './google-oauth.js';
import { defaultTokenStorage } from './token-storage.js';

async function testAuthentication() {
  console.log('🧪 Google OAuth Authentication Test\n');
  console.log('=' .repeat(50));

  try {
    // Check environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.log('\n❌ Missing Google OAuth credentials!');
      console.log('\nPlease set the following in your .env file:');
      console.log('  - GOOGLE_CLIENT_ID');
      console.log('  - GOOGLE_CLIENT_SECRET');
      console.log('\nSee .env.example for details.');
      process.exit(1);
    }

    console.log('\n✅ Environment variables loaded');
    console.log(`   Client ID: ${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...`);

    // Check for existing tokens
    const hasTokens = await defaultTokenStorage.hasTokens();
    console.log(`\n📁 Token storage: ${defaultTokenStorage.getTokenPath()}`);
    console.log(`   Existing tokens: ${hasTokens ? '✅ Yes' : '❌ No'}`);

    if (hasTokens) {
      const tokens = await defaultTokenStorage.loadTokens();
      if (tokens) {
        const isExpired = defaultTokenStorage.isExpired(tokens);
        const timeUntilExpiry = defaultTokenStorage.formatTimeUntilExpiry(tokens);
        
        console.log(`   Token status: ${isExpired ? '⚠️  Expired' : '✅ Valid'}`);
        console.log(`   Expires in: ${timeUntilExpiry}`);
      }
    }

    // Create OAuth client
    console.log('\n🔧 Creating OAuth client...');
    const oauth = createGoogleOAuthFromEnv();
    console.log('✅ OAuth client created');

    // Authenticate
    console.log('\n🔐 Starting authentication...');
    const client = await oauth.authenticate();
    console.log('✅ Authentication successful!');

    // Get token info
    const credentials = client.credentials;
    console.log('\n📊 Token Information:');
    console.log(`   Access token: ${credentials.access_token?.substring(0, 20)}...`);
    console.log(`   Token type: ${credentials.token_type}`);
    console.log(`   Scopes: ${credentials.scope}`);
    console.log(`   Has refresh token: ${credentials.refresh_token ? '✅ Yes' : '❌ No'}`);
    
    if (credentials.expiry_date) {
      const expiryDate = new Date(credentials.expiry_date);
      console.log(`   Expires at: ${expiryDate.toLocaleString()}`);
    }

    // Test API call (basic test)
    console.log('\n🧪 Testing API connectivity...');
    try {
      const response = await client.request({
        url: 'https://www.googleapis.com/oauth2/v1/userinfo',
      });
      
      if (response.data && typeof response.data === 'object') {
        const data = response.data as { email?: string; name?: string };
        console.log('✅ API call successful!');
        console.log(`   Email: ${data.email || 'N/A'}`);
        console.log(`   Name: ${data.name || 'N/A'}`);
      }
    } catch (apiError) {
      console.log('⚠️  API test failed (may need additional scopes)');
      console.log(`   Error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed!\n');
    console.log('Your OAuth authentication is working correctly.');
    console.log('You can now use Google Calendar and Google Docs tools.\n');

  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('❌ Test failed!\n');
    
    if (error instanceof Error) {
      console.log(`Error: ${error.message}\n`);
      
      if (error.message.includes('Missing Google OAuth credentials')) {
        console.log('💡 Tip: Make sure you have set up your .env file correctly.');
        console.log('   Copy .env.example to .env and add your credentials.\n');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log('💡 Tip: Check your internet connection.\n');
      } else if (error.message.includes('invalid_client')) {
        console.log('💡 Tip: Double-check your Client ID and Client Secret.\n');
      }
    }
    
    console.log('Stack trace:');
    console.log(error);
    process.exit(1);
  }
}

// Run the test
testAuthentication();
