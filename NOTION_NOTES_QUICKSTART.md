# Notion Notes - Quick Start Guide

## Setup

1. **Get your Notion API key**:
   - Go to https://www.notion.so/profile/integrations
   - Create a new integration
   - Copy the "Internal Integration Token" (starts with `secret_`)

2. **Add to your `.env` file**:
   ```bash
   NOTION_API_KEY=secret_your-integration-token-here
   ```

3. **Share pages with your integration**:
   - Open any Notion page you want to access
   - Click "Share" → "Invite"
   - Select your integration name
   - This gives the integration access to that page and its children

## Usage

### 1. List Your Pages

First, see what pages you have access to:

```
Can you list my recent Notion pages?
```

The agent will use:
```json
{
  "action": "list_pages",
  "max_results": 10
}
```

### 2. Search for Specific Pages

Find pages by name:

```
Search my Notion for pages about "School" or "Assignments"
```

The agent will use:
```json
{
  "action": "search_pages",
  "query": "School",
  "max_results": 5
}
```

### 3. Create a New Page

**IMPORTANT**: You need a parent page ID first!

```
Create a new Notion page called "Sprint 4 Assignment" under page ID abc123...
```

The agent will use:
```json
{
  "action": "create_page",
  "title": "Sprint 4 Assignment",
  "parent_page_id": "abc123...",
  "content": "# Sprint 4\n\n## My Contributions\n\n- Feature A\n- Feature B"
}
```

### 4. Get Page Content

Read an existing page:

```
Show me the content of Notion page abc123...
```

The agent will use:
```json
{
  "action": "get_page",
  "page_id": "abc123..."
}
```

### 5. Append Content

Add more content to an existing page:

```
Add this to my Notion page abc123...: "## New Section\n\nNew content here"
```

The agent will use:
```json
{
  "action": "append_content",
  "page_id": "abc123...",
  "content": "## New Section\n\nNew content here"
}
```

### 6. Update Page Title

Change a page's title:

```
Rename Notion page abc123... to "Sprint 4 - Final Report"
```

The agent will use:
```json
{
  "action": "update_page",
  "page_id": "abc123...",
  "title": "Sprint 4 - Final Report"
}
```

## Markdown Support

Content is written in markdown format:

```markdown
# Heading 1
## Heading 2
### Heading 3

- Bullet point 1
- Bullet point 2

1. Numbered item 1
2. Numbered item 2

> This is a quote

\`\`\`javascript
console.log("Code block");
\`\`\`

Regular paragraph text.
```

## Common Workflows

### Creating an Assignment Document

```
1. List my Notion pages
2. Create a new page called "Sprint 4 Assignment" under my "School Notes" page
3. Add this content: [your assignment content in markdown]
```

### Organizing Notes

```
1. Search for pages about "CS 449"
2. Create a new page under the course page for "Week 10 Notes"
3. Add my lecture notes to that page
```

### Updating Existing Notes

```
1. Get the content of my "Project Ideas" page
2. Append this new idea: "## Idea 3: AI Study Assistant"
```

## Tips

- **Always get page IDs first**: Use `list_pages` or `search_pages` before creating new pages
- **Use markdown**: Format your content with markdown for better organization
- **Share with integration**: Make sure your Notion integration has access to the pages you want to work with
- **Page IDs**: You can find page IDs in the URL or from the list/search results

## Troubleshooting

### "parent_page_id is required"
- You tried to create a page without specifying a parent
- Solution: Use `list_pages` to find a parent page ID first

### "Notion notes is not configured"
- Your `NOTION_API_KEY` is not set in `.env`
- Solution: Add your integration token to `.env` file

### "Notion API error (403)"
- Your integration doesn't have access to the page
- Solution: Share the page with your integration in Notion

### "Page not found"
- The page ID is invalid or the integration doesn't have access
- Solution: Verify the page ID and check sharing settings

## Example Session

```
You: List my recent Notion pages

Agent: [Shows list of pages with IDs]

You: Create a new page called "Sprint 4 Report" under page abc123... with this content:
# Sprint 4 Individual Report

## My Contributions
- Built the user dashboard
- Implemented authentication
- Conducted 3 user interviews

## Reflections
This sprint went well...

Agent: [Creates the page and shows confirmation with URL]

You: Great! Now append this section:
## Next Steps
- Finalize testing
- Deploy to production

Agent: [Appends content and confirms]
```

## Related Tools

- **notion_calendar**: Manage events in a Notion calendar database
- **canvas**: Access Canvas LMS assignments and courses
- **deepwiki**: Learn from open source project documentation
