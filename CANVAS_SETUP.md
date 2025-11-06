# Canvas LMS Integration Setup

This guide will help you set up Canvas LMS integration with the School Agent CLI.

## Prerequisites

- An active Canvas LMS account at your school
- Access to your Canvas profile settings

## Getting Your Canvas Access Token

### Step 1: Log in to Canvas

Go to your school's Canvas instance (e.g., `https://your-school.instructure.com`) and log in with your credentials.

### Step 2: Navigate to Settings

1. Click on your profile picture or name in the top-left corner
2. Select **Settings** from the dropdown menu
3. Or directly navigate to `/profile` in your Canvas URL

### Step 3: Generate Access Token

1. Scroll down to the **Approved Integrations** section
2. Click the **+ New Access Token** button
3. Fill in the token details:
   - **Purpose**: Enter a descriptive name (e.g., "School Agent CLI")
   - **Expires**: (Optional) Set an expiration date for security
4. Click **Generate Token**

### Step 4: Copy Your Token

⚠️ **Important**: The token will only be shown once! Copy it immediately.

The token will look something like this:
```
1234~abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890
```

## Configuring School Agent

### Option 1: Using Environment Variables (Recommended)

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your Canvas credentials:
   ```bash
   # Canvas LMS Configuration
   CANVAS_DOMAIN=your-school.instructure.com
   CANVAS_ACCESS_TOKEN=your_token_here
   ```

   **Note**: Replace `your-school.instructure.com` with your actual Canvas domain (without `https://`)

3. Save the file

### Option 2: Using Configuration File (Future)

Configuration file support will be added in a future update.

## Verifying Your Setup

Once configured, you can verify Canvas integration by starting the agent:

```bash
npm start chat
```

You should see a message: "Canvas integration enabled"

## Using Canvas Features

The agent can now help you with Canvas-related tasks:

### List Your Courses
```
"Show me my Canvas courses"
"What courses am I enrolled in?"
```

### View Assignments
```
"Show me assignments for course 12345"
"What assignments do I have in my CS101 course?"
```

### Check Grades
```
"What's my grade in course 12345?"
"Show me my current grades"
```

### View Announcements
```
"Show me recent announcements for course 12345"
"Any new announcements in my classes?"
```

### Get Assignment Details
```
"Tell me about assignment 67890 in course 12345"
"What's due for assignment 67890?"
```

## Available Canvas Actions

The Canvas tool supports the following actions:

| Action | Description | Required Parameters |
|--------|-------------|---------------------|
| `list_courses` | Get all active courses | None |
| `list_assignments` | Get assignments for a course | `course_id` |
| `get_assignment` | Get detailed assignment info | `course_id`, `assignment_id` |
| `get_grades` | Get current grades for a course | `course_id` |
| `list_announcements` | Get recent announcements | `course_id` |

## Security Best Practices

1. **Keep your token secret**: Never share your Canvas access token with anyone
2. **Use .gitignore**: Make sure `.env` is in your `.gitignore` file (it already is by default)
3. **Set expiration dates**: Consider setting expiration dates on your tokens
4. **Rotate tokens regularly**: Generate new tokens periodically for better security
5. **Revoke unused tokens**: Remove old tokens from Canvas settings if you're not using them

## Troubleshooting

### "Canvas is not configured" Error

This means the Canvas credentials are not loaded. Check:
- Your `.env` file exists and has the correct values
- Both `CANVAS_DOMAIN` and `CANVAS_ACCESS_TOKEN` are set
- There are no typos in the variable names

### "Canvas API error (401)" - Unauthorized

This usually means:
- Your access token is invalid or expired
- You need to generate a new token from Canvas

### "Canvas API error (404)" - Not Found

This usually means:
- The course ID or assignment ID doesn't exist
- You don't have access to that course
- The resource has been deleted

### "Canvas API error (403)" - Forbidden

This means:
- You don't have permission to access that resource
- The course is not published or is restricted

## Getting Course and Assignment IDs

### Finding Course IDs

1. **From the agent**: Use `"Show me my Canvas courses"` - the agent will display course IDs
2. **From Canvas URL**: When viewing a course, the URL contains the course ID:
   ```
   https://your-school.instructure.com/courses/12345
                                              ^^^^^
                                           Course ID
   ```

### Finding Assignment IDs

1. **From the agent**: Use `"Show me assignments for course 12345"` - the agent will display assignment IDs
2. **From Canvas URL**: When viewing an assignment, the URL contains both IDs:
   ```
   https://your-school.instructure.com/courses/12345/assignments/67890
                                              ^^^^^              ^^^^^
                                           Course ID        Assignment ID
   ```

## API Rate Limits

Canvas has API rate limits to prevent abuse:
- Default: 3000 requests per hour per user
- The agent automatically handles rate limit errors

If you hit rate limits, you'll see an error message. Wait a few minutes before trying again.

## Privacy Note

The School Agent CLI:
- Only accesses data you have permission to view
- Does not store your Canvas data permanently
- Does not share your data with third parties
- Uses your token only to make API requests on your behalf

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the Canvas API documentation: https://developerdocs.instructure.com/services/canvas
3. Check your Canvas permissions with your instructor or IT department
4. Open an issue on the project repository

## Additional Resources

- [Canvas API Documentation](https://developerdocs.instructure.com/services/canvas)
- [Canvas OAuth2 Documentation](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth)
- [Canvas API Policy](https://www.instructure.com/policies/api-policy)
