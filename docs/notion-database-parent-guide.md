# Creating Pages in Notion Databases - Quick Guide

## Overview

With the upgraded Notion API (version 2025-09-03), you can now create pages directly in Notion databases using the `parent_database_id` parameter.

## How to Get Your Database ID

### Method 1: From Notion URL
1. Open your database in Notion
2. Look at the URL: `https://www.notion.so/workspace/abc123def456?v=...`
3. The database ID is the part between the last `/` and the `?`: `abc123def456`

### Method 2: From Database Settings
1. Open your database in Notion
2. Click the `•••` menu in the top right
3. Go to "Manage data sources"
4. Click "Copy database ID"

## Basic Usage

### Simple Page Creation
```typescript
{
  action: 'create_page',
  parent_database_id: 'your-database-id',
  title: 'My New Task'
}
```

### With Content
```typescript
{
  action: 'create_page',
  parent_database_id: 'your-database-id',
  title: 'Project Planning',
  content: `
# Overview
This is the project overview

## Tasks
- Task 1
- Task 2
  `
}
```

### With Database Properties
```typescript
{
  action: 'create_page',
  parent_database_id: 'your-database-id',
  title: 'Important Task',
  properties: {
    Status: {
      select: { name: 'In Progress' }
    },
    Priority: {
      select: { name: 'High' }
    },
    DueDate: {
      date: { start: '2025-01-20' }
    },
    Tags: {
      multi_select: [
        { name: 'urgent' },
        { name: 'work' }
      ]
    }
  }
}
```

## Common Database Property Types

### Select (Single Choice)
```typescript
Status: {
  select: { name: 'To Do' }
}
```

### Multi-Select (Multiple Choices)
```typescript
Tags: {
  multi_select: [
    { name: 'tag1' },
    { name: 'tag2' }
  ]
}
```

### Date
```typescript
DueDate: {
  date: { start: '2025-01-15' }
}
```

### Date Range
```typescript
Timeline: {
  date: {
    start: '2025-01-15',
    end: '2025-01-20'
  }
}
```

### Number
```typescript
Score: {
  number: 85
}
```

### Checkbox
```typescript
Completed: {
  checkbox: true
}
```

### URL
```typescript
Link: {
  url: 'https://example.com'
}
```

### Email
```typescript
Contact: {
  email: 'user@example.com'
}
```

### Phone
```typescript
Phone: {
  phone_number: '+1234567890'
}
```

### Rich Text
```typescript
Description: {
  rich_text: [
    {
      type: 'text',
      text: { content: 'This is a description' }
    }
  ]
}
```

## Common Use Cases

### Task Management Database
```typescript
{
  action: 'create_page',
  parent_database_id: 'task-db-id',
  title: 'Complete project documentation',
  properties: {
    Status: { select: { name: 'In Progress' } },
    Priority: { select: { name: 'High' } },
    DueDate: { date: { start: '2025-01-25' } },
    Assignee: { people: [{ id: 'user-id' }] },
    Tags: { multi_select: [{ name: 'documentation' }, { name: 'urgent' }] }
  },
  content: `
## Description
Need to complete all project documentation before deadline.

## Subtasks
- [ ] Write API documentation
- [ ] Create user guide
- [ ] Review and publish
  `
}
```

### Class Notes Database
```typescript
{
  action: 'create_page',
  parent_database_id: 'notes-db-id',
  title: 'Lecture 5: Data Structures',
  properties: {
    Subject: { select: { name: 'Computer Science' } },
    Date: { date: { start: '2025-01-15' } },
    Topics: { multi_select: [{ name: 'Arrays' }, { name: 'Linked Lists' }] }
  },
  content: `
# Arrays
- Fixed size
- Contiguous memory
- O(1) access time

# Linked Lists
- Dynamic size
- Non-contiguous memory
- O(n) access time
  `
}
```

### Project Tracker Database
```typescript
{
  action: 'create_page',
  parent_database_id: 'projects-db-id',
  title: 'Mobile App Redesign',
  properties: {
    Status: { select: { name: 'Planning' } },
    StartDate: { date: { start: '2025-01-20' } },
    Budget: { number: 50000 },
    Team: { multi_select: [{ name: 'Design' }, { name: 'Development' }] }
  }
}
```

## Tips

1. **Property Names**: Use the exact property names as they appear in your database (case-sensitive)
2. **Required Properties**: Some databases have required properties - make sure to include them
3. **Title Property**: The `title` parameter automatically sets the title/name property
4. **Content**: Use markdown format for the `content` parameter
5. **Property Types**: Make sure the property type matches what's configured in your database

## Troubleshooting

### "No data sources found for database"
- Make sure the database ID is correct
- Verify your integration has access to the database
- Check that the database exists and isn't deleted

### "Property not found"
- Property names are case-sensitive
- Check the exact property name in your database settings
- Some properties may be read-only (created_by, created_time, etc.)

### "Invalid property value"
- Make sure the property type matches (e.g., don't send a string for a number property)
- For select properties, the option must exist in the database
- For people properties, the user ID must be valid

## Differences from Page Parents

| Feature | Page Parent | Database Parent |
|---------|-------------|-----------------|
| Parent Parameter | `parent_page_id` | `parent_database_id` |
| Properties | Only `title` allowed | All database properties |
| Structure | Nested pages | Database entries |
| Use Case | Notes, documents | Tasks, projects, structured data |

## Additional Resources

- [Notion API Documentation](https://developers.notion.com/)
- [Property Object Reference](https://developers.notion.com/reference/property-object)
- [Create Page API](https://developers.notion.com/reference/post-page)
