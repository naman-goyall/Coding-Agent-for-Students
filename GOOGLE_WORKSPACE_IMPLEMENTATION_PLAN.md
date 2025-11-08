# Google Workspace Integration Implementation Plan

## Executive Summary

This plan outlines the implementation of Google Workspace (Docs + Calendar) integration to replace Notion Notes and Notion Calendar. The implementation will use OAuth 2.0 authentication similar to Gemini CLI, providing a seamless user experience with browser-based authentication.

---

## Research Summary

### Key Findings from Gemini CLI

Based on deep analysis of the `google-gemini/gemini-cli` repository:

1. **OAuth Flow Architecture**
   - Uses `google-auth-library` (`OAuth2Client`) for Google authentication
   - Implements loopback redirect URI (`http://localhost:[dynamic-port]/oauth2callback`)
   - Stores tokens in `~/.gemini/` directory using `HybridTokenStorage`
   - Supports both encrypted (keychain) and file-based token storage
   - Automatically handles token refresh using refresh tokens

2. **Token Management**
   - Tokens stored at: `~/.gemini/oauth-tokens.json` (or encrypted in keychain)
   - File permissions: `0o600` (owner read/write only)
   - Token structure includes: `access_token`, `refresh_token`, `expiry_date`, `token_type`, `scope`
   - Automatic refresh when tokens expire (with 5-minute buffer for clock skew)

3. **Authentication Flow**
   - Start local HTTP server on dynamic port
   - Generate authorization URL with state parameter (CSRF protection)
   - Open browser for user authentication
   - Capture authorization code via redirect
   - Exchange code for tokens
   - Store tokens securely
   - Close local server

### Google APIs Research

1. **Google Calendar API**
   - Base URL: `https://www.googleapis.com/calendar/v3`
   - Scopes needed:
     - `https://www.googleapis.com/auth/calendar` (read/write)
     - `https://www.googleapis.com/auth/calendar.events` (events only)
     - `https://www.googleapis.com/auth/calendar.readonly` (read only)
   - Key endpoints:
     - `GET /calendars/primary/events` - List events
     - `POST /calendars/primary/events` - Create event
     - `GET /calendars/primary/events/{eventId}` - Get event
     - `PUT /calendars/primary/events/{eventId}` - Update event
     - `DELETE /calendars/primary/events/{eventId}` - Delete event

2. **Google Docs API**
   - Base URL: `https://docs.googleapis.com/v1`
   - Scopes needed:
     - `https://www.googleapis.com/auth/documents` (read/write)
     - `https://www.googleapis.com/auth/drive.file` (create files)
   - Key endpoints:
     - `POST /documents` - Create document
     - `GET /documents/{documentId}` - Get document
     - `POST /documents/{documentId}:batchUpdate` - Update document

3. **Google Sheets API (Bonus)**
   - Base URL: `https://sheets.googleapis.com/v4`
   - Scopes needed:
     - `https://www.googleapis.com/auth/spreadsheets` (read/write)

4. **Node.js Library**
   - Package: `googleapis` (official Google APIs Node.js client)
   - Package: `@google-cloud/local-auth` (simplified OAuth flow)
   - Version: `googleapis@105` or later

---

## Architecture Design

### 1. OAuth Authentication System

```
┌─────────────────────────────────────────────────────────────┐
│                     User Flow                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User runs: "Connect to Google Calendar"                 │
│     ↓                                                        │
│  2. CLI checks if tokens exist                              │
│     ↓                                                        │
│  3. If no tokens:                                           │
│     - Start local HTTP server (random port)                 │
│     - Generate auth URL with state parameter                │
│     - Open browser to auth URL                              │
│     ↓                                                        │
│  4. User authenticates in browser                           │
│     - Signs in to Google account                            │
│     - Grants permissions                                     │
│     ↓                                                        │
│  5. Google redirects to localhost with code                 │
│     ↓                                                        │
│  6. CLI exchanges code for tokens                           │
│     ↓                                                        │
│  7. Store tokens securely                                   │
│     ↓                                                        │
│  8. Close browser tab, show success message                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. File Structure

```
src/
├── auth/
│   ├── google-oauth.ts         # OAuth client and flow management
│   ├── token-storage.ts        # Token storage (file + optional encryption)
│   └── oauth-types.ts          # TypeScript types
├── tools/
│   └── student/
│       ├── google-calendar.ts  # Google Calendar tool
│       ├── google-docs.ts      # Google Docs tool
│       └── google-sheets.ts    # Google Sheets tool (bonus)
└── utils/
    └── google-api.ts           # Shared Google API utilities

docs/
├── GOOGLE_OAUTH_SETUP.md       # User setup guide
├── GOOGLE_CALENDAR_QUICKSTART.md
└── GOOGLE_DOCS_QUICKSTART.md

config/
└── .env                        # Store client credentials
```

### 3. Token Storage Design

**Location**: `~/.school-agent/google-tokens.json`

**Structure**:
```json
{
  "access_token": "ya29.a0AfH6...",
  "refresh_token": "1//0gHZ...",
  "scope": "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/documents",
  "token_type": "Bearer",
  "expiry_date": 1699564800000
}
```

**Security**:
- File permissions: `0o600` (owner only)
- Optional: Use Node.js `keytar` for OS keychain storage
- Never commit to git (add to .gitignore)

### 4. OAuth Configuration

**Environment Variables** (`.env`):
```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret

# Optional: Custom redirect URI (default: http://localhost:RANDOM_PORT/oauth2callback)
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

**Scopes to Request**:
```typescript
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
  // Bonus:
  'https://www.googleapis.com/auth/spreadsheets',
];
```

---

## Implementation Plan

### Phase 1: OAuth Authentication Foundation ⭐

**Goal**: Implement core OAuth 2.0 flow with token management

**Files to Create**:
1. `src/auth/oauth-types.ts`
2. `src/auth/token-storage.ts`
3. `src/auth/google-oauth.ts`

**Key Features**:
- OAuth2Client initialization
- Local HTTP server for callback handling
- Authorization URL generation with PKCE
- Token exchange and storage
- Automatic token refresh
- Token validation and expiry checking

**Dependencies**:
```json
{
  "googleapis": "^137.0.0",
  "google-auth-library": "^9.0.0",
  "open": "^10.0.0"
}
```

**Implementation Details**:

```typescript
// src/auth/google-oauth.ts
import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import { URL } from 'url';
import open from 'open';

export class GoogleOAuth {
  private oauth2Client: OAuth2Client;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive.file',
  ];

  async authenticate(): Promise<OAuth2Client> {
    // 1. Check for existing tokens
    const existingTokens = await this.tokenStorage.loadTokens();
    if (existingTokens && !this.isExpired(existingTokens)) {
      return this.createAuthClient(existingTokens);
    }

    // 2. Start OAuth flow
    const { code, redirectUri } = await this.getAuthorizationCode();
    
    // 3. Exchange code for tokens
    const { tokens } = await this.oauth2Client.getToken(code);
    
    // 4. Save tokens
    await this.tokenStorage.saveTokens(tokens);
    
    return this.createAuthClient(tokens);
  }

  private async getAuthorizationCode(): Promise<{ code: string; redirectUri: string }> {
    const port = await this.getAvailablePort();
    const redirectUri = `http://localhost:${port}/oauth2callback`;
    
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        if (req.url?.startsWith('/oauth2callback')) {
          const qs = new URL(req.url, redirectUri).searchParams;
          const code = qs.get('code');
          
          res.end('Authentication successful! You can close this tab.');
          server.close();
          
          if (code) resolve({ code, redirectUri });
          else reject(new Error('No authorization code'));
        }
      });
      
      server.listen(port, () => {
        const authUrl = this.oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: this.SCOPES,
          redirect_uri: redirectUri,
          prompt: 'consent', // Force consent to get refresh token
        });
        
        open(authUrl);
      });
    });
  }
}
```

**Success Criteria**:
- ✅ User can authenticate via browser
- ✅ Tokens stored securely in `~/.school-agent/`
- ✅ Tokens refresh automatically when expired
- ✅ Error handling for network issues and user denial

---

### Phase 2: Google Calendar Tool 📅

**Goal**: Replace Notion Calendar with Google Calendar integration

**File to Create**: `src/tools/student/google-calendar.ts`

**Actions to Support**:

| Action | Description | Parameters |
|--------|-------------|------------|
| `list_events` | List upcoming events | `maxResults?: number`, `timeMin?: string`, `timeMax?: string` |
| `get_event` | Get event details | `eventId: string` |
| `create_event` | Create new event | `summary: string`, `start: DateTime`, `end?: DateTime`, `description?: string`, `location?: string` |
| `update_event` | Update existing event | `eventId: string`, `updates: Partial<Event>` |
| `delete_event` | Delete event | `eventId: string` |
| `search_events` | Search events | `query: string`, `timeMin?: string`, `timeMax?: string` |

**Tool Schema**:
```typescript
{
  name: 'google_calendar',
  description: 'Manage Google Calendar events - create, read, update, delete events',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list_events', 'get_event', 'create_event', 'update_event', 'delete_event', 'search_events'],
        description: 'The calendar action to perform'
      },
      // Action-specific parameters...
    }
  }
}
```

**Implementation Example**:
```typescript
export class GoogleCalendarTool {
  async execute(params: CalendarActionParams) {
    // 1. Authenticate
    const auth = await this.googleOAuth.authenticate();
    const calendar = google.calendar({ version: 'v3', auth });

    switch (params.action) {
      case 'list_events':
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          maxResults: params.maxResults || 10,
          singleEvents: true,
          orderBy: 'startTime',
        });
        return this.formatEvents(response.data.items);

      case 'create_event':
        const event = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: params.summary,
            description: params.description,
            location: params.location,
            start: { dateTime: params.start },
            end: { dateTime: params.end || this.addHour(params.start) },
          },
        });
        return this.formatEvent(event.data);

      // ... other cases
    }
  }
}
```

**Advantages over Notion Calendar**:
- ✅ Native Google Calendar integration
- ✅ No database setup required
- ✅ Automatic sync across devices
- ✅ Built-in reminders and notifications
- ✅ Richer event features (attendees, recurring events, etc.)

---

### Phase 3: Google Docs Tool 📝

**Goal**: Replace Notion Notes with Google Docs integration

**File to Create**: `src/tools/student/google-docs.ts`

**Actions to Support**:

| Action | Description | Parameters |
|--------|-------------|------------|
| `create_document` | Create new Google Doc | `title: string`, `content?: string` |
| `get_document` | Get document content | `documentId: string` |
| `append_text` | Append text to document | `documentId: string`, `text: string` |
| `insert_text` | Insert text at position | `documentId: string`, `text: string`, `index: number` |
| `update_document` | Batch update document | `documentId: string`, `requests: Request[]` |
| `list_documents` | List user's documents | `query?: string`, `maxResults?: number` |

**Tool Schema**:
```typescript
{
  name: 'google_docs',
  description: 'Create and manage Google Docs - create documents, add content, format text',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create_document', 'get_document', 'append_text', 'insert_text', 'update_document', 'list_documents'],
        description: 'The document action to perform'
      },
      // Action-specific parameters...
    }
  }
}
```

**Implementation Example**:
```typescript
export class GoogleDocsTool {
  async execute(params: DocsActionParams) {
    const auth = await this.googleOAuth.authenticate();
    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    switch (params.action) {
      case 'create_document':
        // 1. Create document
        const doc = await docs.documents.create({
          requestBody: { title: params.title },
        });

        // 2. Add initial content if provided
        if (params.content) {
          await docs.documents.batchUpdate({
            documentId: doc.data.documentId,
            requestBody: {
              requests: [{
                insertText: {
                  text: params.content,
                  location: { index: 1 },
                },
              }],
            },
          });
        }

        return {
          documentId: doc.data.documentId,
          title: doc.data.title,
          url: `https://docs.google.com/document/d/${doc.data.documentId}/edit`,
        };

      case 'append_text':
        const document = await docs.documents.get({
          documentId: params.documentId,
        });
        
        const endIndex = document.data.body.content
          .reduce((max, item) => Math.max(max, item.endIndex || 0), 0) - 1;

        await docs.documents.batchUpdate({
          documentId: params.documentId,
          requestBody: {
            requests: [{
              insertText: {
                text: params.text,
                location: { index: endIndex },
              },
            }],
          },
        });

        return { success: true };

      // ... other cases
    }
  }
}
```

**Advantages over Notion Notes**:
- ✅ Native Google Docs editor
- ✅ Better formatting and rich text support
- ✅ Real-time collaboration
- ✅ Google Drive integration
- ✅ Better search functionality
- ✅ Version history

---

### Phase 4: Google Sheets Tool (Bonus) 📊

**Goal**: Add Google Sheets support for data management

**File to Create**: `src/tools/student/google-sheets.ts`

**Actions to Support**:

| Action | Description | Parameters |
|--------|-------------|------------|
| `create_spreadsheet` | Create new sheet | `title: string` |
| `get_values` | Get cell values | `spreadsheetId: string`, `range: string` |
| `update_values` | Update cell values | `spreadsheetId: string`, `range: string`, `values: any[][]` |
| `append_row` | Append row to sheet | `spreadsheetId: string`, `values: any[]` |
| `create_sheet` | Add new sheet/tab | `spreadsheetId: string`, `title: string` |

**Use Cases**:
- Grade tracking
- Assignment lists
- Study schedules
- Project planning
- Budget tracking

---

### Phase 5: Documentation 📚

**Files to Create**:

1. **`GOOGLE_OAUTH_SETUP.md`**
   - Prerequisites (Google Cloud Project setup)
   - Creating OAuth credentials
   - Configuring redirect URIs
   - Setting up consent screen
   - Adding test users
   - Environment variable configuration

2. **`GOOGLE_CALENDAR_QUICKSTART.md`**
   - Quick setup guide
   - Common use cases
   - Example commands
   - Troubleshooting

3. **`GOOGLE_DOCS_QUICKSTART.md`**
   - Quick setup guide
   - Document creation examples
   - Formatting examples
   - Common patterns

4. **`GOOGLE_SHEETS_QUICKSTART.md`** (Bonus)
   - Quick setup guide
   - Data management examples
   - Formula support
   - Common use cases

---

## Migration Strategy

### For Existing Users

**Option 1: Deprecation Notice**
- Add notice in Notion setup docs
- Mark Notion tools as deprecated
- Provide migration timeline

**Option 2: Coexistence**
- Keep both Notion and Google tools
- Let users choose their preference
- Eventually deprecate Notion

**Recommendation**: Option 2 (Coexistence) for smoother transition

---

## Security Considerations

### Token Security
1. **File Permissions**: `0o600` on token files
2. **Encryption**: Optional keychain storage using `keytar`
3. **Gitignore**: Add token paths to `.gitignore`
4. **Environment Variables**: Never commit client secrets

### OAuth Security
1. **State Parameter**: CSRF protection
2. **PKCE**: Code challenge for enhanced security
3. **Scope Minimization**: Only request needed scopes
4. **Token Rotation**: Implement automatic refresh

### User Privacy
1. **Minimal Data Access**: Only access user-authorized data
2. **Local Storage**: Tokens stored locally, not on server
3. **Transparent Permissions**: Clear scope descriptions
4. **Easy Revocation**: Users can revoke access anytime via Google Account

---

## Testing Plan

### Unit Tests
- OAuth flow components
- Token storage/retrieval
- Token refresh logic
- API error handling

### Integration Tests
- Full OAuth flow
- Calendar CRUD operations
- Docs CRUD operations
- Sheets operations (bonus)

### Manual Testing
- First-time authentication
- Token refresh
- Revoked token handling
- Network error handling
- Browser not available scenarios

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Set up Google Cloud Project
- [ ] Implement OAuth authentication
- [ ] Implement token storage
- [ ] Create test cases

### Week 2: Calendar Integration
- [ ] Build Google Calendar tool
- [ ] Implement all calendar actions
- [ ] Add error handling
- [ ] Test calendar features

### Week 3: Docs Integration
- [ ] Build Google Docs tool
- [ ] Implement document actions
- [ ] Add formatting support
- [ ] Test document features

### Week 4: Polish & Documentation
- [ ] Add Google Sheets (bonus)
- [ ] Write user documentation
- [ ] Create setup guides
- [ ] Final testing and bug fixes

---

## Dependencies

```json
{
  "dependencies": {
    "googleapis": "^137.0.0",
    "google-auth-library": "^9.0.0",
    "open": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

---

## Success Metrics

### User Experience
- ✅ One-time authentication setup
- ✅ Browser opens automatically
- ✅ Clear success/error messages
- ✅ Automatic token refresh (invisible to user)

### Functionality
- ✅ All calendar operations working
- ✅ All document operations working
- ✅ Error handling robust
- ✅ Performance acceptable (<2s for operations)

### Security
- ✅ Tokens stored securely
- ✅ Minimal permissions requested
- ✅ CSRF protection implemented
- ✅ Token refresh working

---

## Comparison: Notion vs Google

| Feature | Notion | Google Workspace |
|---------|--------|------------------|
| **Authentication** | Simple API token | OAuth 2.0 (more secure) |
| **Setup Complexity** | Low (2 values) | Medium (OAuth setup) |
| **Token Expiry** | Never | 1 hour (auto-refresh) |
| **User Experience** | Manual token copy | Browser authentication |
| **Calendar Features** | Basic | Rich (attendees, reminders, etc.) |
| **Document Features** | Rich | Very rich (collaboration, version history) |
| **Search** | Good | Excellent |
| **Integration** | Notion ecosystem | Google ecosystem |
| **Mobile Access** | Notion app | Google apps |
| **Collaboration** | Good | Excellent |
| **Best For** | All-in-one workspace | Standard productivity tools |

**Winner**: Google Workspace for most users, especially those already in Google ecosystem

---

## Appendix A: OAuth Consent Screen Setup

### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Click "New Project"
3. Name: "School Agent CLI"
4. Click "Create"

### Step 2: Enable APIs
1. Go to "APIs & Services" → "Library"
2. Enable:
   - Google Calendar API
   - Google Docs API
   - Google Drive API (for Docs)
   - Google Sheets API (bonus)

### Step 3: Configure OAuth Consent
1. Go to "APIs & Services" → "OAuth consent screen"
2. User Type: External
3. App name: "School Agent CLI"
4. User support email: Your email
5. Scopes: Add the required scopes
6. Test users: Add your email

### Step 4: Create Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Desktop app"
4. Name: "School Agent CLI"
5. Download JSON (save as `credentials.json`)

### Step 5: Extract Credentials
From `credentials.json`, extract:
- `client_id`
- `client_secret`

Add to `.env`:
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
```

---

## Appendix B: Error Handling

### Common Errors and Solutions

1. **Invalid Grant**
   - Cause: Refresh token expired or revoked
   - Solution: Re-authenticate user

2. **Insufficient Permissions**
   - Cause: Missing scopes
   - Solution: Update scopes and re-authenticate

3. **Rate Limit Exceeded**
   - Cause: Too many API requests
   - Solution: Implement exponential backoff

4. **Network Error**
   - Cause: No internet connection
   - Solution: Retry with backoff, inform user

5. **Browser Not Available**
   - Cause: CLI running in headless environment
   - Solution: Provide manual URL with instructions

---

## Appendix C: Advanced Features (Future)

### Service Account Support
- For server-side applications
- Domain-wide delegation
- Automated processes

### Multiple Account Support
- Support multiple Google accounts
- Account switching
- Profile management

### Offline Mode
- Cache recent data
- Queue operations
- Sync when online

### Advanced Calendar Features
- Recurring events
- Event reminders
- Attendee management
- Calendar sharing

### Advanced Docs Features
- Table support
- Image insertion
- Style presets
- Template support

---

## Conclusion

This implementation plan provides a comprehensive roadmap for replacing Notion integration with Google Workspace integration. The OAuth-based authentication provides better security and user experience, while Google's APIs offer richer features and better integration with the broader ecosystem.

**Key Benefits**:
- ✅ More secure OAuth authentication
- ✅ Richer features (Calendar, Docs, Sheets)
- ✅ Better integration with Google ecosystem
- ✅ Automatic token refresh
- ✅ Industry-standard implementation

**Timeline**: 4 weeks for full implementation including documentation and testing.

**Effort**: Medium (OAuth setup) but results in better long-term solution.
