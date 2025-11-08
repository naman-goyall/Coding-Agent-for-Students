# Notion Notes - .env Configuration Example

## Quick Copy-Paste Template

Add these lines to your `.env` file:

```bash
# ============================================
# Notion Notes Integration
# ============================================
# Your Notion integration token (starts with secret_)
NOTION_NOTES_API_KEY=secret_your-integration-token-here

# Default parent page ID (where new notes will be created)
# Format: 8-4-4-4-12 characters with dashes
# Example: 2a535ac5-3fdc-816f-8df5-f52fbd1f6a3f
NOTION_NOTES_PARENT_PAGE_ID=your-parent-page-id-here
```

## How to Get These Values

### 1. Get Your Integration Token (`NOTION_NOTES_API_KEY`)

1. Go to: https://www.notion.so/profile/integrations
2. Click "New integration"
3. Name it (e.g., "School Agent Notes")
4. Select your workspace
5. Click "Submit"
6. Copy the token (starts with `secret_`)

### 2. Get Your Parent Page ID (`NOTION_NOTES_PARENT_PAGE_ID`)

**From URL:**
```
URL: https://www.notion.so/My-Notes-2a535ac53fdc816f8df5f52fbd1f6a3f
ID:  2a535ac5-3fdc-816f-8df5-f52fbd1f6a3f
```

**Steps:**
1. Open your parent page in Notion
2. Click "Share" → "Copy link"
3. Extract the ID from the URL (last part after the last dash)
4. Format with dashes: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`

### 3. Share Page with Integration

**CRITICAL STEP:**
1. Open the parent page in Notion
2. Click "Share" (top right)
3. Click "Invite"
4. Search for your integration name
5. Click "Invite"

Without this step, the agent won't be able to create pages!

## Alternative: Use Existing Notion Integration

If you already have `NOTION_API_KEY` set for the calendar, you can reuse it:

```bash
# Existing calendar config
NOTION_API_KEY=secret_your-integration-token-here
NOTION_DATABASE_ID=your-database-id-here

# Just add the parent page ID for notes
NOTION_NOTES_PARENT_PAGE_ID=your-parent-page-id-here
```

The tool will automatically use `NOTION_API_KEY` if `NOTION_NOTES_API_KEY` is not set.

## Verification

After adding to `.env`, restart the agent:

```bash
npm run build
npm start chat
```

You should see:
```
✓ Notion notes integration enabled
✓ Default parent page ID set: 2a535ac5-3fdc-816f-8df5-f52fbd1f6a3f
```

## Example Usage

Once configured, create pages without specifying a parent:

**Agent command:**
```
"Create a Notion note titled 'Meeting Notes' with today's discussion points"
```

**Result:**
- Page created under your default parent page
- No need to specify parent_page_id
- Automatic organization!
