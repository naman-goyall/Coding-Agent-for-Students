# Google Calendar Quickstart Guide

Complete guide for using the Google Calendar tool in School Agent CLI.

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

Before using the Google Calendar tool, ensure you have:

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

Simply talk to the agent about your calendar:

```
You: What events do I have this week?

You: Create a meeting for tomorrow at 2pm titled "Team Standup"

You: Find my interview events

You: Delete the event with ID abc123
```

The agent will automatically use the Google Calendar tool! 🎉

---

## Available Actions

| Action | Description | Required Parameters |
|--------|-------------|---------------------|
| `list_events` | List upcoming events | None (optional: max_results, time_min, time_max) |
| `get_event` | Get details of a specific event | `event_id` |
| `create_event` | Create a new event | `summary`, (`start` & `end`) or (`start_date` & `end_date`) |
| `update_event` | Update an existing event | `event_id`, fields to update |
| `delete_event` | Delete an event | `event_id` |
| `search_events` | Search for events | `query` |

---

## Usage Examples

### List Upcoming Events

**Natural Language:**
```
You: Show me my next 10 events
You: What's on my calendar today?
You: List my upcoming meetings
```

**Direct Tool Call:**
```typescript
{
  action: "list_events",
  max_results: 10
}
```

### Create a Timed Event

**Natural Language:**
```
You: Create a meeting tomorrow at 2pm for 1 hour called "Project Review"
You: Schedule a dentist appointment for Friday at 10am
You: Add a call with John next Monday at 3pm
```

**Direct Tool Call:**
```typescript
{
  action: "create_event",
  summary: "Team Meeting",
  description: "Discuss Q4 goals",
  start: "2025-11-15T14:00:00-05:00",
  end: "2025-11-15T15:00:00-05:00",
  location: "Conference Room A",
  attendees: ["john@example.com", "jane@example.com"]
}
```

### Create an All-Day Event

**Natural Language:**
```
You: Mark November 28 as Thanksgiving holiday
You: Add a conference on December 5-7
You: Set January 1st as a holiday
```

**Direct Tool Call:**
```typescript
{
  action: "create_event",
  summary: "Company Conference",
  start_date: "2025-12-05",
  end_date: "2025-12-08",  // Exclusive end date
  location: "San Francisco, CA",
  description: "Annual company-wide conference"
}
```

### Get Event Details

**Natural Language:**
```
You: Show me details of event [event-id]
You: Get information about the meeting I created
```

**Direct Tool Call:**
```typescript
{
  action: "get_event",
  event_id: "abc123xyz"
}
```

### Update an Event

**Natural Language:**
```
You: Change the meeting title to "Budget Review"
You: Reschedule the event to 3pm tomorrow
You: Update the location to "Room 301"
```

**Direct Tool Call:**
```typescript
{
  action: "update_event",
  event_id: "abc123xyz",
  summary: "Updated Meeting Title",
  start: "2025-11-15T15:00:00-05:00",
  end: "2025-11-15T16:00:00-05:00"
}
```

### Delete an Event

**Natural Language:**
```
You: Delete the meeting at 2pm
You: Cancel event abc123
You: Remove the dentist appointment
```

**Direct Tool Call:**
```typescript
{
  action: "delete_event",
  event_id: "abc123xyz"
}
```

### Search Events

**Natural Language:**
```
You: Find all interview events
You: Search for meetings with "budget" in the title
You: Show me all dentist appointments
```

**Direct Tool Call:**
```typescript
{
  action: "search_events",
  query: "interview",
  max_results: 20
}
```

---

## Common Use Cases

### For Students

#### 1. Class Schedule
```
You: Create a class every Monday at 9am called "Computer Science 101"
```

#### 2. Assignment Deadlines
```
You: Add an all-day event on November 20 for "Final Project Due"
```

#### 3. Study Sessions
```
You: Schedule a study session tomorrow from 2pm to 5pm
```

#### 4. Office Hours
```
You: Find all office hour events this week
```

### For Professionals

#### 1. Meeting Management
```
You: Show me all meetings with my manager this month
You: Create a 1-on-1 meeting next Tuesday at 10am
```

#### 2. Interview Scheduling
```
You: List all my interview events
You: Schedule an interview with Jane Doe on Friday at 2pm
```

#### 3. Project Milestones
```
You: Add project milestone on December 1st
```

#### 4. Work-Life Balance
```
You: Create a recurring lunch break every weekday at noon
```

---

## Date and Time Formats

### ISO 8601 Format (Recommended)

For timed events, use ISO 8601 with timezone:

```
2025-11-15T14:00:00-05:00  ← November 15, 2025 at 2:00 PM EST
2025-12-25T09:30:00-08:00  ← December 25, 2025 at 9:30 AM PST
2025-01-01T00:00:00Z       ← January 1, 2025 at midnight UTC
```

### Date-Only Format (All-Day Events)

For all-day events, use YYYY-MM-DD:

```
2025-11-15  ← November 15, 2025
2025-12-25  ← December 25, 2025
```

**Note**: End dates for all-day events are **exclusive**. To create a single all-day event on Nov 15, use:
- `start_date: "2025-11-15"`
- `end_date: "2025-11-16"` ← Day after

---

## Recurring Events

Google Calendar supports recurring events using RRULE format:

```typescript
{
  action: "create_event",
  summary: "Weekly Team Meeting",
  start: "2025-11-11T14:00:00-05:00",
  end: "2025-11-11T15:00:00-05:00",
  recurrence: [
    "RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20251231T235959Z"
  ]
}
```

**Common Recurrence Patterns:**

- Daily: `RRULE:FREQ=DAILY`
- Weekly on Mondays: `RRULE:FREQ=WEEKLY;BYDAY=MO`
- Monthly on 15th: `RRULE:FREQ=MONTHLY;BYMONTHDAY=15`
- Every weekday: `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`

---

## Reminders and Notifications

Add reminders to events:

```typescript
{
  action: "create_event",
  summary: "Important Meeting",
  start: "2025-11-15T14:00:00-05:00",
  end: "2025-11-15T15:00:00-05:00",
  reminders: [
    { method: "email", minutes: 60 },   // Email 1 hour before
    { method: "popup", minutes: 15 }    // Popup 15 minutes before
  ]
}
```

**Reminder Methods:**
- `email` - Email reminder
- `popup` - Desktop/mobile notification

---

## Attendees and Invitations

Invite people to events:

```typescript
{
  action: "create_event",
  summary: "Team Meeting",
  start: "2025-11-15T14:00:00-05:00",
  end: "2025-11-15T15:00:00-05:00",
  attendees: [
    "john@example.com",
    "jane@example.com",
    "bob@company.com"
  ]
}
```

When you update or delete events with attendees, Google Calendar will automatically send email notifications.

---

## Troubleshooting

### Issue: "Failed to authenticate"

**Cause**: Not authenticated with Google

**Solution**:
```bash
npm run test:google-auth
```
Follow the browser flow to authenticate.

### Issue: "Event not found"

**Cause**: Invalid event ID or event deleted

**Solution**:
- List events to get valid IDs
- Check that the event still exists
- Verify you're using the correct calendar

### Issue: "Missing required parameter: summary"

**Cause**: Trying to create an event without a title

**Solution**:
Always provide a `summary` (title) when creating events:
```typescript
{ action: "create_event", summary: "My Event", ... }
```

### Issue: "Invalid datetime format"

**Cause**: Incorrect date/time format

**Solution**:
Use ISO 8601 format: `2025-11-15T14:00:00-05:00`

Or for all-day events: `start_date: "2025-11-15"`

### Issue: "Insufficient permissions"

**Cause**: Missing Google Calendar API scope

**Solution**:
1. Delete tokens: `rm ~/.school-agent/google-tokens.json`
2. Re-authenticate: `npm run test:google-auth`
3. Grant all requested permissions

---

## Tips & Best Practices

### 1. Use Natural Language

The AI agent can understand natural language! Instead of:
```typescript
{ action: "create_event", summary: "Meeting", ... }
```

Simply say:
```
You: Create a meeting tomorrow at 2pm
```

### 2. Get Event IDs from List

To update or delete events, first list them to get the ID:
```
You: List my events
[Copy the ID from the output]
You: Delete event abc123xyz
```

### 3. Specify Timezones

Always include timezone in your datetime strings:
```
2025-11-15T14:00:00-05:00  ← Good (EST)
2025-11-15T14:00:00        ← Ambiguous
```

### 4. Use All-Day Events for Dates

For holidays, birthdays, deadlines without specific times:
```typescript
{
  action: "create_event",
  summary: "Project Deadline",
  start_date: "2025-11-30",
  end_date: "2025-12-01"
}
```

### 5. Batch Operations

Create multiple events in one conversation:
```
You: Create these events:
1. Team meeting Monday at 10am
2. Lunch with client Tuesday at noon
3. Project review Friday at 3pm
```

### 6. Search Before Delete

Search for events to find the right one:
```
You: Search for "dentist" events
[Review results]
You: Delete event abc123xyz
```

---

## Testing

### Manual Test

```bash
# Start the agent
npm start chat

# Try creating an event
You: Create a test event tomorrow at 2pm

# List to verify
You: Show my upcoming events

# Delete to clean up
You: Delete the test event
```

### Automated Test

```bash
# Run the test script
npx tsx src/tools/student/test-google-calendar.ts
```

This will:
- List events
- Create a test event
- Get event details
- Update the event
- Search for it
- Delete it
- Create an all-day event

---

## Comparison: Notion Calendar vs Google Calendar

| Feature | Notion Calendar | Google Calendar |
|---------|----------------|-----------------|
| **Authentication** | API token | OAuth 2.0 |
| **Setup** | Simpler | More steps (but one-time) |
| **Integration** | Notion ecosystem | Google ecosystem |
| **Recurring Events** | Limited | Full support |
| **Reminders** | Basic | Rich (email, popup) |
| **Attendees** | No | Yes |
| **Native Apps** | Notion app | Google Calendar apps |
| **Sharing** | Notion sharing | Google Calendar sharing |
| **Best For** | Notion-first workflows | Standard calendar needs |

**Recommendation**: Use Google Calendar for most calendar management needs, especially if you use Gmail or other Google services.

---

## Advanced Features

### Multiple Calendars

By default, events are created in your primary calendar. To use a specific calendar:

```typescript
{
  action: "create_event",
  summary: "Personal Event",
  calendar_id: "personal@gmail.com",  // Your calendar ID
  start: "2025-11-15T14:00:00-05:00",
  end: "2025-11-15T15:00:00-05:00"
}
```

### Time Filtering

Filter events by time range:

```typescript
{
  action: "list_events",
  time_min: "2025-11-01T00:00:00Z",
  time_max: "2025-11-30T23:59:59Z",
  max_results: 50
}
```

---

## Next Steps

1. ✅ **Try it out**: Create your first event
2. 📚 **Explore**: Try different actions
3. 🔄 **Automate**: Use for daily scheduling
4. 🚀 **Advanced**: Try recurring events and reminders

---

## Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [OAuth Setup Guide](./GOOGLE_OAUTH_SETUP.md)
- [RRULE Format](https://datatracker.ietf.org/doc/html/rfc5545#section-3.8.5.3)
- [ISO 8601 DateTime Format](https://en.wikipedia.org/wiki/ISO_8601)

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Phase**: Phase 2 - Google Calendar Tool
