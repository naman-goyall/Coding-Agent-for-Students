# Google Docs Quickstart Guide

Complete guide for using the Google Docs tool in School Agent CLI.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Available Actions](#available-actions)
4. [Usage Examples](#usage-examples)
5. [Common Use Cases](#common-use-cases)
6. [Troubleshooting](#troubleshooting)
7. [Tips & Best Practices](#tips--best-practices)

---

## Prerequisites

Before using the Google Docs tool, ensure you have:

1. ✅ **Google OAuth configured** - See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
2. ✅ **Environment variables set** in `.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
   ```
3. ✅ **Authenticated with Google** - Run authentication test:
   ```bash
   npm run test:google-auth
   ```

---

## Quick Start

### 1. Start the Agent

```bash
npm start chat
```

### 2. Use Natural Language

Simply talk to the agent about your documents:

```
You: Create a new document called "My Notes"

You: List my recent documents

You: Add text to document abc123

You: What's in my document about assignments?
```

The agent will automatically use the Google Docs tool! 🎉

---

## Available Actions

| Action | Description | Required Parameters |
|--------|-------------|---------------------|
| `create_document` | Create a new Google Doc | `title` |
| `get_document` | Get document content | `document_id` |
| `append_text` | Append text to end of document | `document_id`, `text` |
| `insert_text` | Insert text at specific position | `document_id`, `text`, `index` |
| `update_document` | Batch update (advanced) | `document_id`, `requests` |
| `list_documents` | List your Google Docs | None (optional: query, max_results) |

---

## Usage Examples

### Create a New Document

**Natural Language:**
```
You: Create a document called "Class Notes"
You: Make a new doc titled "Assignment 1"
You: Create a document "Meeting Notes" with content "Today's agenda..."
```

**Direct Tool Call:**
```typescript
{
  action: "create_document",
  title: "My Research Paper",
  content: "# Introduction\n\nThis paper explores..."
}
```

**Result:**
- ✅ Document created
- 📄 Document title
- 🔗 Link to edit
- 🆔 Document ID

### List Your Documents

**Natural Language:**
```
You: Show me my recent documents
You: List all my docs
You: Find documents about "assignment"
```

**Direct Tool Call:**
```typescript
{
  action: "list_documents",
  max_results: 10,
  order_by: "modifiedTime"
}
```

**Search for specific documents:**
```typescript
{
  action: "list_documents",
  query: "assignment",
  max_results: 20
}
```

### Get Document Content

**Natural Language:**
```
You: Show me the content of document abc123
You: What's in my research paper?
You: Read document xyz789
```

**Direct Tool Call:**
```typescript
{
  action: "get_document",
  document_id: "1A2B3C4D5E6F7G8H9I0J"
}
```

**Result:**
- 📄 Document title
- 📊 Word count
- 📊 Character count
- 📝 Content (first 500 chars)

### Append Text to Document

**Natural Language:**
```
You: Add "New section" to document abc123
You: Append notes to my class doc
You: Add a conclusion paragraph
```

**Direct Tool Call:**
```typescript
{
  action: "append_text",
  document_id: "1A2B3C4D5E6F7G8H9I0J",
  text: "\n\n## New Section\n\nThis is additional content."
}
```

### Insert Text at Position

**Natural Language:**
```
You: Insert text at the beginning of document abc123
You: Add a header to my doc
```

**Direct Tool Call:**
```typescript
{
  action: "insert_text",
  document_id: "1A2B3C4D5E6F7G8H9I0J",
  text: "# Document Title\n\n",
  index: 1
}
```

**Note**: Index 1 is the start of the document.

### Batch Update (Advanced)

For advanced formatting and multiple operations:

```typescript
{
  action: "update_document",
  document_id: "1A2B3C4D5E6F7G8H9I0J",
  requests: [
    {
      insertText: {
        text: "\n\n---\nFooter content",
        location: { index: 1 }
      }
    },
    {
      updateTextStyle: {
        textStyle: {
          bold: true
        },
        range: {
          startIndex: 1,
          endIndex: 10
        },
        fields: "bold"
      }
    }
  ]
}
```

---

## Common Use Cases

### For Students

#### 1. Class Notes
```
You: Create a document "CS101 Lecture 5 Notes"
You: Append today's class notes to my CS101 doc
```

#### 2. Assignment Drafts
```
You: Make a new document "Essay Draft - The Great Gatsby"
You: Add my introduction paragraph to the essay
```

#### 3. Research Papers
```
You: Create "Research Paper - Climate Change" with an outline
You: List all my research documents
```

#### 4. Study Guides
```
You: Create a study guide for my midterm
You: Add key concepts to my study guide
```

### For Professionals

#### 1. Meeting Notes
```
You: Create "Weekly Team Meeting - Nov 8" 
You: Append action items to meeting notes
```

#### 2. Project Documentation
```
You: Make a document "Project Spec v2"
You: Add technical requirements to spec doc
```

#### 3. Reports
```
You: Create monthly report document
You: Add Q4 statistics to report
```

#### 4. Brainstorming
```
You: Create "Product Ideas Brainstorm"
You: Add new feature ideas to brainstorm doc
```

### For Everyone

#### 1. Personal Notes
```
You: Create a grocery list document
You: Create "Travel Plans - Europe 2025"
```

#### 2. Documentation
```
You: Create "How to Setup Project" guide
You: Add troubleshooting steps to guide
```

#### 3. Writing
```
You: Start a new story document "Chapter 1"
You: Continue writing in my story doc
```

---

## Document Structure

### Understanding Document Indices

Google Docs uses a content index system:

- **Index 1**: Start of document (after title)
- **Index N**: Each character has an index
- **End Index**: Last position in document

**Example:**
```
Index:  1    2    3    4    5    6
Text:   [H] [e] [l] [l] [o] [\n]
```

### Finding Document IDs

**Option 1**: From URL
```
https://docs.google.com/document/d/1A2B3C4D5E6F7G8H9I0J/edit
                                   ^^^^^^^^^^^^^^^^^^^
                                   This is the ID
```

**Option 2**: From list_documents output
```
You: List my documents
```
The output includes Document IDs.

---

## Content Formatting

### Adding Markdown-style Content

While Google Docs doesn't directly support Markdown, you can add structured text:

```typescript
{
  action: "create_document",
  title: "My Document",
  content: `# Heading 1

## Heading 2

- Bullet point 1
- Bullet point 2

**Bold text** (will appear as plain text, but can be formatted later)

1. Numbered item
2. Another item`
}
```

### Multi-line Content

Use `\n` for line breaks:

```typescript
{
  action: "append_text",
  document_id: "abc123",
  text: "Line 1\nLine 2\n\nLine 4 (with blank line above)"
}
```

---

## Troubleshooting

### Issue: "Failed to authenticate"

**Cause**: Not authenticated with Google

**Solution**:
```bash
npm run test:google-auth
```
Follow the browser flow to authenticate.

### Issue: "Document not found"

**Cause**: Invalid document ID or no access

**Solution**:
- Verify document ID is correct
- Check you have access to the document
- List documents to find the correct ID

### Issue: "Missing required parameter: title"

**Cause**: Trying to create document without title

**Solution**:
Always provide a title when creating:
```typescript
{ action: "create_document", title: "My Document" }
```

### Issue: "Failed to insert text: Invalid index"

**Cause**: Index out of bounds

**Solution**:
- Use index 1 for start of document
- Get document first to see content length
- Use `append_text` instead for adding to end

### Issue: "Insufficient permissions"

**Cause**: Missing Google Docs API scope

**Solution**:
1. Delete tokens: `rm ~/.school-agent/google-tokens.json`
2. Re-authenticate: `npm run test:google-auth`
3. Grant all requested permissions

---

## Tips & Best Practices

### 1. Use Natural Language

Let the AI agent handle the complexity:
```
You: Create a meeting notes document and add today's agenda
```
Instead of manual API calls.

### 2. List Before Editing

Find the right document ID first:
```
You: List my documents
[Copy the ID]
You: Add text to document abc123
```

### 3. Start with Simple Operations

Begin with create and append:
- ✅ `create_document`
- ✅ `append_text`
- ✅ `get_document`

Then progress to:
- ⭐ `insert_text`
- ⭐ `update_document`

### 4. Use Descriptive Titles

Good titles make documents easy to find:
```
✅ "CS101 Lecture 5 - Sorting Algorithms - Nov 8 2025"
❌ "Notes"
```

### 5. Organize with Search

Use queries to filter:
```typescript
{ action: "list_documents", query: "CS101" }  // All CS101 docs
{ action: "list_documents", query: "2025" }   // All 2025 docs
```

### 6. Batch Updates for Formatting

Use `update_document` for complex operations:
- Formatting multiple sections
- Adding headers and footers
- Styling text (bold, italic, etc.)

### 7. Keep Backups

Google Docs has version history, but important docs should be backed up.

---

## Testing

### Manual Test

```bash
# Start the agent
npm start chat

# Try it out
You: Create a test document called "Test Doc"
You: List my documents
You: Get content from the test document
```

### Automated Test

```bash
# Run the test script
npm run test:google-docs
```

This will:
- Create a test document
- Get its content
- Append text
- Insert text at position
- Batch update
- List all documents
- Search for documents

---

## Comparison: Notion Notes vs Google Docs

| Feature | Notion Notes | Google Docs ✅ |
|---------|-------------|----------------|
| **Rich Text Editor** | ✅ Yes | ✅ Yes |
| **Collaboration** | ✅ Yes | ✅ Real-time |
| **Version History** | ⚠️ Limited | ✅ Full history |
| **Offline Access** | ⚠️ Limited | ✅ Yes (with app) |
| **Native Apps** | Notion app | ✅ All platforms |
| **Comments** | ✅ Yes | ✅ Yes |
| **Suggestions** | ❌ No | ✅ Yes |
| **Export Options** | ⚠️ Limited | ✅ Many formats |
| **Search** | ⚠️ Basic | ✅ Powerful |
| **Integration** | Notion ecosystem | ✅ Google ecosystem |
| **Free Tier** | Yes | ✅ Yes (15GB Drive) |

**Winner**: Google Docs for most document needs! 🏆

---

## Advanced Features

### Working with Google Drive

Documents are automatically saved to Google Drive. You can:
- Share documents with others
- Organize in folders
- Set permissions
- Access from any device

### Document Ordering

Sort documents by:
- `modifiedTime` (default) - Recently edited
- `createdTime` - Recently created
- `name` - Alphabetical

```typescript
{
  action: "list_documents",
  order_by: "name",
  max_results: 20
}
```

### Content Extraction

The `get_document` action extracts:
- Plain text content
- Word count
- Character count
- Document structure

Note: Formatting (bold, italic, etc.) is not extracted in plain text mode.

---

## Next Steps

1. ✅ **Try it out**: Create your first document
2. 📚 **Explore**: Try different actions
3. 🔄 **Integrate**: Use for daily note-taking
4. 🚀 **Advanced**: Explore batch updates

---

## Additional Resources

- [Google Docs API Documentation](https://developers.google.com/docs/api)
- [OAuth Setup Guide](./GOOGLE_OAUTH_SETUP.md)
- [Google Calendar Quickstart](./GOOGLE_CALENDAR_QUICKSTART.md)
- [Batch Update Requests](https://developers.google.com/docs/api/how-tos/batch-update)

---

## Limitations

1. **Plain Text Extraction**: `get_document` returns plain text without formatting
2. **No Formatting in Creation**: Initial content is added as plain text
3. **No Image Support**: Cannot add images via this tool
4. **No Comments**: Cannot read/add comments programmatically
5. **Character Limit**: Documents have a 1M character limit

These are acceptable limitations and can be addressed with batch updates or manual editing.

---

## API Rate Limits

Google Docs API has generous limits:
- **Read requests**: 300 per minute per user
- **Write requests**: 60 per minute per user

For normal use, you won't hit these limits.

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Phase**: Phase 3 - Google Docs Tool
