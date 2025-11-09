# Google OAuth Setup Guide

Complete guide for setting up Google OAuth authentication for Google Workspace integration (Calendar, Docs, Gmail, Drive, and Sheets).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step-by-Step Setup](#step-by-step-setup)
3. [Configuration](#configuration)
4. [Testing Authentication](#testing-authentication)
5. [Troubleshooting](#troubleshooting)
6. [Security Notes](#security-notes)

---

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- School Agent CLI installed

---

## Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.goocagle.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project details:
   - **Project name**: `School Agent CLI` (or any name you prefer)
   - **Organization**: Leave blank (or select if you have one)
4. Click **"Create"**
5. Wait for the project to be created (takes a few seconds)
6. Select your new project from the project dropdown

### Step 2: Enable Required APIs

1. In the Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search for and enable the following APIs:

   **Required APIs:**
   - **Google Calendar API** - Click "Enable"
   - **Google Docs API** - Click "Enable"
   - **Google Drive API** - Click "Enable" (required for Docs and file access)
   - **Gmail API** - Click "Enable"

   **Optional (for Sheets support):**
   - **Google Sheets API** - Click "Enable"

3. Wait for each API to be enabled (usually instant)

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** user type (unless you have a Google Workspace organization)
3. Click **"Create"**

**App Information:**
- **App name**: `School Agent CLI`
- **User support email**: Your email address
- **App logo**: Optional (you can skip this)

**App domain (optional - you can skip these):**
- Application home page: Leave blank
- Application privacy policy link: Leave blank
- Application terms of service link: Leave blank

**Developer contact information:**
- Email addresses: Your email address

4. Click **"Save and Continue"**

**Scopes:**
1. Click **"Add or Remove Scopes"**
2. Add the following scopes:
   - `.../auth/calendar` - Google Calendar API
   - `.../auth/documents` - Google Docs API
   - `.../auth/drive` - Google Drive API (full read access for PDF files)
   - `.../auth/gmail.modify` - Gmail API (read, send, and organize emails)
   - `.../auth/spreadsheets` - Google Sheets API (optional)

3. Click **"Update"** → **"Save and Continue"**

**Test Users:**
1. Click **"Add Users"**
2. Add your Google email address
3. Click **"Add"** → **"Save and Continue"**

**Important**: Your app will be in "Testing" mode, which means only test users can authenticate. This is fine for personal use. To make it public, you'd need to submit for verification (not necessary for this project).

4. Review your settings and click **"Back to Dashboard"**

### Step 4: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Configure the OAuth client:
   - **Application type**: Select **"Desktop app"**
   - **Name**: `School Agent CLI` (or any name)
4. Click **"Create"**

5. A modal will appear with your credentials:
   - **Client ID**: Copy this (ends with `.apps.googleusercontent.com`)
   - **Client Secret**: Copy this (starts with `GOCSPX-`)
   
6. Click **"OK"**

**Optional**: You can download the JSON file by clicking the download icon, but you only need the Client ID and Client Secret.

---

## Configuration

### 1. Set Environment Variables

Copy your credentials to your `.env` file:

```bash
# Copy .env.example to .env if you haven't already
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=1234567890-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YourClientSecretHere
```

**Important**: 
- Never commit your `.env` file to version control
- Keep your Client Secret private
- The `.gitignore` file already excludes `.env`

### 2. Verify Configuration

Check that your `.env` file has:
- ✅ `GOOGLE_CLIENT_ID` - ending with `.apps.googleusercontent.com`
- ✅ `GOOGLE_CLIENT_SECRET` - starting with `GOCSPX-`

---

## Testing Authentication

### Option 1: Run Test Script

The easiest way to test authentication:

```bash
npm run dev src/auth/test-auth.ts
```

This will:
1. Check your environment variables
2. Start the OAuth flow
3. Open your browser for authentication
4. Save tokens to `~/.school-agent/google-tokens.json`
5. Test API connectivity

**Expected Output:**
```
🧪 Google OAuth Authentication Test

==================================================

✅ Environment variables loaded
   Client ID: 1234567890-abcdefgh...

📁 Token storage: /Users/yourusername/.school-agent/google-tokens.json
   Existing tokens: ❌ No

🔧 Creating OAuth client...
✅ OAuth client created

🔐 Starting authentication...
🌐 Opening browser for authentication...
📍 Callback server listening on port 54321

If the browser doesn't open, visit this URL:
https://accounts.google.com/o/oauth2/v2/auth?...

✅ Tokens saved to /Users/yourusername/.school-agent/google-tokens.json
✅ Authentication successful!

📊 Token Information:
   Access token: ya29.a0AfH6SMBw...
   Token type: Bearer
   Scopes: https://www.googleapis.com/auth/calendar ...
   Has refresh token: ✅ Yes
   Expires at: 11/8/2025, 4:12:34 PM

🧪 Testing API connectivity...
✅ API call successful!
   Email: your.email@gmail.com
   Name: Your Name

==================================================
✅ All tests passed!
```

### Option 2: Use in the Agent

The authentication will happen automatically when you use Google tools:

```bash
npm run dev
```

Then in the agent:
```
You: Create a calendar event for tomorrow at 2pm
```

The agent will:
1. Detect you're not authenticated
2. Start OAuth flow automatically
3. Open browser for authentication
4. Complete the request

---

## Troubleshooting

### Issue: "Missing Google OAuth credentials"

**Cause**: Environment variables not set

**Solution**:
1. Check that `.env` file exists
2. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
3. Make sure there are no extra spaces or quotes
4. Restart your terminal/IDE after editing `.env`

### Issue: "Access blocked: School Agent CLI has not completed the Google verification process"

**Cause**: App is in testing mode and your email is not added as a test user

**Solution**:
1. Go to Google Cloud Console → OAuth consent screen
2. Scroll to "Test users"
3. Add your Google email address
4. Try authenticating again

### Issue: "invalid_client" error

**Cause**: Client ID or Client Secret is incorrect

**Solution**:
1. Go to Google Cloud Console → Credentials
2. Click on your OAuth client
3. Copy the Client ID and Client Secret again
4. Update your `.env` file
5. Delete existing tokens: `rm ~/.school-agent/google-tokens.json`
6. Try again

### Issue: "redirect_uri_mismatch" error

**Cause**: Redirect URI not authorized (should not happen with Desktop app type)

**Solution**:
1. Go to Google Cloud Console → Credentials
2. Click on your OAuth client
3. Verify Application type is "Desktop app"
4. If not, create a new credential with Desktop app type

### Issue: Browser doesn't open

**Cause**: Running in SSH session or headless environment

**Solution**:
1. Copy the URL shown in the terminal
2. Open it manually in your browser
3. Complete authentication
4. The CLI will automatically detect the callback

### Issue: "Token refresh failed"

**Cause**: Refresh token expired or revoked

**Solution**:
1. Delete tokens: `rm ~/.school-agent/google-tokens.json`
2. Run authentication again
3. Grant permissions when prompted

### Issue: "insufficient_permissions" or "Insufficient Permission"

**Cause**: Missing required API scopes

**Solution**:
1. Go to Google Cloud Console → OAuth consent screen
2. Add missing scopes (Calendar, Docs, Drive)
3. Delete existing tokens: `rm ~/.school-agent/google-tokens.json`
4. Re-authenticate to get new tokens with correct scopes

---

## Security Notes

### Token Storage

- Tokens are stored at: `~/.school-agent/google-tokens.json`
- File permissions: `0o600` (owner read/write only)
- Contains: access token, refresh token, expiry date
- **Never share or commit token files!**

### Token Lifecycle

- **Access Token**: Valid for 1 hour
- **Refresh Token**: Valid indefinitely (until revoked)
- Automatic refresh happens when access token expires
- You only need to authenticate once

### Revoking Access

To revoke access:

**Option 1: Delete tokens**
```bash
rm ~/.school-agent/google-tokens.json
```

**Option 2: Revoke via Google Account**
1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find "School Agent CLI"
3. Click "Remove Access"

**Option 3: Revoke via Agent (coming soon)**
```bash
# Future feature
school-agent auth revoke google
```

### Best Practices

1. ✅ Keep your Client Secret private
2. ✅ Never commit `.env` or token files
3. ✅ Use environment-specific credentials for development/production
4. ✅ Regularly review authorized apps in your Google Account
5. ✅ Use minimal scopes (only request what you need)
6. ❌ Don't share your credentials with others
7. ❌ Don't hardcode credentials in your code

---

## Advanced Configuration

### Custom Token Storage Location

You can specify a custom token storage location:

```typescript
import { TokenStorage } from './auth/token-storage.js';

const customStorage = new TokenStorage('/path/to/custom-tokens.json');
```

### Custom Scopes

Request specific scopes:

```typescript
import { createGoogleOAuthFromEnv, GOOGLE_SCOPES } from './auth/google-oauth.js';

const oauth = createGoogleOAuthFromEnv([
  GOOGLE_SCOPES.CALENDAR_READONLY,  // Read-only calendar
  GOOGLE_SCOPES.DOCUMENTS,           // Full Docs access
]);
```

### Multiple Accounts (Future Feature)

Currently, the system supports one Google account at a time. Multiple account support is planned for a future release.

---

## Next Steps

After setting up OAuth:

1. ✅ **Test Calendar Tool**: See [GOOGLE_CALENDAR_QUICKSTART.md](./GOOGLE_CALENDAR_QUICKSTART.md)
2. ✅ **Test Docs Tool**: See [GOOGLE_DOCS_QUICKSTART.md](./GOOGLE_DOCS_QUICKSTART.md)
3. ✅ **Test Sheets Tool**: See [GOOGLE_SHEETS_QUICKSTART.md](./GOOGLE_SHEETS_QUICKSTART.md) (bonus)

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [Google Docs API Documentation](https://developers.google.com/docs)
- [Google Drive API Documentation](https://developers.google.com/drive)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review your configuration against this guide
3. Run the test script for detailed diagnostics
4. Check Google Cloud Console audit logs

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Phase**: Phase 1 - OAuth Authentication Foundation
