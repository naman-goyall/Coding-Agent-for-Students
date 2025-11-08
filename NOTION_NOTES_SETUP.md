# Notion Notes Setup Guide

## Overview

The Notion Notes tool allows you to create and manage pages in your Notion workspace. With the default parent page configuration, you can automatically create new pages under a specific parent page without having to specify it each time.

## Quick Setup

### 1. Get Your Notion Integration Token

1. Go to https://www.notion.so/profile/integrations
2. Click "New integration"
3. Give it a name (e.g., "School Agent Notes")
4. Select the workspace
5. Click "Submit"
6. Copy the "Internal Integration Token" (starts with `secret_`)

### 2. Get Your Parent Page ID

**Option A: From the page URL**
1. Open the page in Notion where you want notes to be created
2. Click "Share" → "Copy link"
3. The URL looks like: `https://www.notion.so/My-Page-2a535ac53fdc816f8df5f52fbd1f6a3f`
4. The page ID is the last part: `2a535ac5-3fdc-816f-8df5-f52fbd1f6a3f`
   - Note: Add dashes if they're missing (format: 8-4-4-4-12 characters)

**Option B: From the page settings**
1. Open the page in Notion
2. Click the `•••` menu in the top right
3. Scroll down and click "Copy link"
4. Extract the ID from the URL as shown above

### 3. Share the Page with Your Integration

**IMPORTANT:** Your integration needs access to the parent page!

1. Open the parent page in Notion
2. Click "Share" in the top right
3. Click "Invite"
4. Search for your integration name (e.g., "School Agent Notes")
5. Click "Invite"

### 4. Add to Your .env File

Add these lines to your `.env` file:

```bash
# Notion Notes Configuration
NOTION_NOTES_API_KEY=secret_your-integration-token-here
NOTION_NOTES_PARENT_PAGE_ID=2a535ac5-3fdc-816f-8df5-f52fbd1f6a3f
```

**Note:** If you already have `NOTION_API_KEY` set for the calendar integration, you can use the same token:
- Just set `NOTION_NOTES_PARENT_PAGE_ID` (the tool will use `NOTION_API_KEY` automatically)
- Or set `NOTION_NOTES_API_KEY` if you want to use a different integration

### 5. Restart the Agent

```bash
npm run build
npm start chat
```

You should see:
```
✓ Notion notes integration enabled
✓ Default parent page ID set: 2a535ac5-3fdc-816f-8df5-f52fbd1f6a3f
```

## Usage

### Creating Pages (with default parent)

Once configured, you can create pages without specifying a parent:

```typescript
{
  action: 'create_page',
  title: 'My New Note',
  content: '# Content here...'
}
```

The page will automatically be created under your configured parent page!

### Creating Pages (with specific parent)

You can still override the default by providing a specific parent:

```typescript
{
  action: 'create_page',
  parent_page_id: 'different-page-id',
  title: 'My New Note',
  content: '# Content here...'
}
```

### Creating Pages in a Database

To create a page in a database instead:

```typescript
{
  action: 'create_page',
  parent_database_id: 'your-database-id',
  title: 'Task Name',
  properties: {
    Status: { select: { name: 'To Do' } },
    Priority: { select: { name: 'High' } }
  }
}
```

## Example Workflow

### Organizing Your Notes

Create a structure like this in Notion:

```
📚 School Notes (your parent page - share this with the integration)
├── 📝 CS 6460 - Educational Technology
├── 📝 CS 6750 - Human-Computer Interaction
└── 📝 General Notes
```

Set `NOTION_NOTES_PARENT_PAGE_ID` to the "School Notes" page ID.

Now when you ask the agent to create notes, they'll automatically appear under "School Notes"!

### Example Commands

**Create a lecture note:**
```
"Create a Notion note titled 'Lecture 5: Data Structures' with bullet points about arrays and linked lists"
```

**Create a todo list:**
```
"Create a Notion page called 'Week 3 Tasks' with my upcoming assignments"
```

**Create meeting notes:**
```
"Create a Notion page for today's team meeting with sections for agenda, discussion, and action items"
```

## Troubleshooting

### "Notion notes is not configured"
- Make sure `NOTION_NOTES_API_KEY` or `NOTION_API_KEY` is set in your `.env` file
- Restart the agent after adding the configuration

### "No data sources found for database"
- This happens when using `parent_database_id` with an invalid database ID
- Make sure the database ID is correct
- Verify your integration has access to the database

### Pages not appearing in Notion
- Check that you shared the parent page with your integration
- Verify the parent page ID is correct (32 characters with dashes)
- Look in your Notion workspace - the page might be created but in a different location

### "Either parent_page_id or parent_database_id is required"
- This means `NOTION_NOTES_PARENT_PAGE_ID` is not set in your `.env`
- Add the configuration and restart the agent
- Or provide `parent_page_id` explicitly in your request

## Configuration Options

| Environment Variable | Required | Description |
|---------------------|----------|-------------|
| `NOTION_NOTES_API_KEY` | Yes* | Notion integration token (or use `NOTION_API_KEY`) |
| `NOTION_NOTES_PARENT_PAGE_ID` | No | Default parent page ID for new pages |

*Either `NOTION_NOTES_API_KEY` or `NOTION_API_KEY` must be set.

## Advanced Usage

### Using Different Integrations

You can use different integrations for calendar and notes:

```bash
# For calendar (database access)
NOTION_API_KEY=secret_calendar_integration_token
NOTION_DATABASE_ID=your-calendar-database-id

# For notes (page access)
NOTION_NOTES_API_KEY=secret_notes_integration_token
NOTION_NOTES_PARENT_PAGE_ID=your-parent-page-id
```

### No Default Parent

If you don't set `NOTION_NOTES_PARENT_PAGE_ID`, you'll need to provide `parent_page_id` or `parent_database_id` each time you create a page.

## Additional Resources

- [Notion API Documentation](https://developers.notion.com/)
- [Notion Integration Setup](https://www.notion.so/help/create-integrations-with-the-notion-api)
- [NOTION_API_UPGRADE_2025-09-03.md](./NOTION_API_UPGRADE_2025-09-03.md) - Technical details about the API upgrade
- [docs/notion-database-parent-guide.md](./docs/notion-database-parent-guide.md) - Guide for creating pages in databases
