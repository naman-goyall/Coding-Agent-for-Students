# Canvas Tool Reference

## Overview

The Canvas tool provides integration with Canvas LMS, allowing the agent to access course information, assignments, grades, and announcements on behalf of the user.

## Tool Name

`canvas`

## Authentication

The tool requires Canvas credentials to be configured:
- **Domain**: Your Canvas instance domain (e.g., `school.instructure.com`)
- **Access Token**: A personal access token generated from Canvas

Configuration is loaded from environment variables:
```bash
CANVAS_DOMAIN=your-school.instructure.com
CANVAS_ACCESS_TOKEN=your_token_here
```

## Actions

### 1. list_courses

Lists all active courses the user is enrolled in.

**Parameters**: None

**Example Usage**:
```typescript
{
  action: 'list_courses'
}
```

**Returns**:
- Course name
- Course ID
- Course code
- Term ID

### 2. list_assignments

Lists all assignments for a specific course.

**Parameters**:
- `course_id` (required): The Canvas course ID

**Example Usage**:
```typescript
{
  action: 'list_assignments',
  course_id: '12345'
}
```

**Returns**:
- Assignment name
- Assignment ID
- Due date
- Points possible
- Submission types
- Canvas URL

### 3. get_assignment

Gets detailed information about a specific assignment, including automatic PDF extraction and reading.

**Parameters**:
- `course_id` (required): The Canvas course ID
- `assignment_id` (required): The Canvas assignment ID
- `read_pdfs` (optional, default: true): Automatically download and read PDF files from assignment descriptions

**Example Usage**:
```typescript
{
  action: 'get_assignment',
  course_id: '12345',
  assignment_id: '67890'
}
```

**Example - Disable PDF reading**:
```typescript
{
  action: 'get_assignment',
  course_id: '12345',
  assignment_id: '67890',
  read_pdfs: false
}
```

**Returns**:
- Assignment name
- Full description (HTML stripped)
- List of attached PDF files (with URLs)
- Extracted PDF content (if `read_pdfs` is true and pdf-parse is installed)
- Due date
- Points possible
- Submission types
- Canvas URL

**PDF Reading**:
- Automatically detects and extracts PDF links from assignment HTML
- Downloads and reads PDF content using pdf-parse
- Includes full PDF text in the response
- Requires `npm install pdf-parse`
- See [CANVAS_PDF_READING.md](./CANVAS_PDF_READING.md) for details

### 4. get_grades

Gets current grade information for a specific course.

**Parameters**:
- `course_id` (required): The Canvas course ID

**Example Usage**:
```typescript
{
  action: 'get_grades',
  course_id: '12345'
}
```

**Returns**:
- Current grade (letter)
- Current score (percentage)
- Final grade (if available)
- Final score (if available)

### 5. list_announcements

Lists recent announcements for a specific course.

**Parameters**:
- `course_id` (required): The Canvas course ID

**Example Usage**:
```typescript
{
  action: 'list_announcements',
  course_id: '12345'
}
```

**Returns**:
- Announcement title
- Posted date
- Message preview (truncated to 200 characters)
- Canvas URL

## Error Handling

The tool returns appropriate error messages for:
- Missing configuration
- Missing required parameters
- API errors (401, 403, 404, etc.)
- Network errors

## Implementation Details

### Canvas API Client

The tool uses a `CanvasClient` class that:
- Makes authenticated requests to Canvas API v1
- Uses Bearer token authentication
- Returns JSON responses
- Handles errors gracefully

### API Endpoints Used

- `GET /api/v1/courses` - List courses
- `GET /api/v1/courses/:course_id/assignments` - List assignments
- `GET /api/v1/courses/:course_id/assignments/:assignment_id` - Get assignment
- `GET /api/v1/courses/:course_id/enrollments` - Get grades
- `GET /api/v1/courses/:course_id/discussion_topics` - List announcements

### Response Formatting

All responses are formatted as markdown-friendly text with:
- Bold headers for emphasis
- Structured lists
- Readable date formatting
- HTML tag stripping for descriptions

## Security Considerations

1. **Token Storage**: Access tokens are loaded from environment variables, never hardcoded
2. **Token Scope**: Tokens have read-only access to user's own data
3. **HTTPS Only**: All API requests use HTTPS
4. **No Data Storage**: The tool doesn't store Canvas data locally

## Recent Enhancements

✅ **PDF Reading** - Automatically extracts and reads PDF files from assignment descriptions

## Future Enhancements

Potential additions:
- Submit assignments
- Post to discussions
- Download course files (non-PDF)
- Support for other document types (Word, PowerPoint)
- View quiz information
- Calendar integration
- Notification preferences
- Course analytics

## Testing

To test the Canvas tool:

1. Set up Canvas credentials in `.env`
2. Start the agent: `npm start chat`
3. Try these prompts:
   - "Show me my Canvas courses"
   - "List assignments for course [ID]"
   - "What's my grade in course [ID]?"
   - "Show announcements for course [ID]"

## API Documentation

For more details on Canvas API:
- [Canvas LMS API Documentation](https://developerdocs.instructure.com/services/canvas)
- [OAuth2 Documentation](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth)
