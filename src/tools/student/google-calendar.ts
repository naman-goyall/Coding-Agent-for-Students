/**
 * Google Calendar Tool
 * 
 * Provides integration with Google Calendar for managing events
 * Actions: list_events, get_event, create_event, update_event, delete_event, search_events
 */

import { z } from 'zod';
import { google } from 'googleapis';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';
import { createGoogleOAuthFromEnv } from '../../auth/google-oauth.js';

// Input schema for the tool
const inputSchema = z.object({
  action: z.enum([
    'list_events',
    'get_event',
    'create_event',
    'update_event',
    'delete_event',
    'search_events',
  ]).describe('The calendar action to perform'),
  
  // Event ID (for get, update, delete)
  event_id: z.string().optional().describe('Event ID for get/update/delete actions'),
  
  // Event details (for create/update)
  summary: z.string().optional().describe('Event title/summary'),
  description: z.string().optional().describe('Event description'),
  location: z.string().optional().describe('Event location'),
  start: z.string().optional().describe('Event start time in ISO 8601 format (e.g., 2025-11-08T14:00:00-05:00)'),
  end: z.string().optional().describe('Event end time in ISO 8601 format (e.g., 2025-11-08T15:00:00-05:00)'),
  
  // All-day event support
  start_date: z.string().optional().describe('For all-day events: start date in YYYY-MM-DD format'),
  end_date: z.string().optional().describe('For all-day events: end date in YYYY-MM-DD format (exclusive)'),
  
  // Attendees
  attendees: z.array(z.string()).optional().describe('List of attendee email addresses'),
  
  // Reminders
  reminders: z.array(z.object({
    method: z.enum(['email', 'popup']),
    minutes: z.number(),
  })).optional().describe('Event reminders'),
  
  // Recurring events
  recurrence: z.array(z.string()).optional().describe('Recurrence rules in RRULE format'),
  
  // Query parameters (for list/search)
  query: z.string().optional().describe('Search query for search_events action'),
  max_results: z.number().default(10).describe('Maximum number of events to return'),
  time_min: z.string().optional().describe('Lower bound for event start time (ISO 8601)'),
  time_max: z.string().optional().describe('Upper bound for event start time (ISO 8601)'),
  
  // Calendar ID (default: primary)
  calendar_id: z.string().default('primary').describe('Calendar ID (default: primary)'),
});

type InputSchema = z.infer<typeof inputSchema>;

/**
 * Google Calendar client wrapper
 */
class GoogleCalendarClient {
  private oauth: ReturnType<typeof createGoogleOAuthFromEnv>;
  
  constructor() {
    this.oauth = createGoogleOAuthFromEnv();
  }

  /**
   * List upcoming events
   */
  async listEvents(params: InputSchema): Promise<ToolResult> {
    try {
      const auth = await this.oauth.authenticate();
      const calendar = google.calendar({ version: 'v3', auth });

      const timeMin = params.time_min || new Date().toISOString();
      
      const response = await calendar.events.list({
        calendarId: params.calendar_id,
        timeMin: timeMin,
        timeMax: params.time_max,
        maxResults: params.max_results,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      
      if (events.length === 0) {
        return {
          success: true,
          output: '📅 No upcoming events found',
        };
      }

      const formattedEvents = events.map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        status: event.status,
        htmlLink: event.htmlLink,
        attendees: event.attendees?.map(a => ({
          email: a.email,
          responseStatus: a.responseStatus,
        })),
        creator: {
          email: event.creator?.email,
          displayName: event.creator?.displayName,
        },
      }));

      let output = `📅 Found ${events.length} upcoming event(s):\n\n`;
      
      formattedEvents.forEach((event, index) => {
        output += `${index + 1}. **${event.summary || '(No title)'}**\n`;
        if (event.start) output += `   📅 Start: ${new Date(event.start).toLocaleString()}\n`;
        if (event.end) output += `   📅 End: ${new Date(event.end).toLocaleString()}\n`;
        if (event.location) output += `   📍 Location: ${event.location}\n`;
        if (event.description) output += `   📝 Description: ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n`;
        output += `   🔗 Link: ${event.htmlLink}\n`;
        output += `   🆔 ID: ${event.id}\n`;
        output += '\n';
      });

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to list calendar events');
      return {
        success: false,
        error: `Failed to list events: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get a specific event
   */
  async getEvent(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.event_id) {
        return {
          success: false,
          error: 'event_id is required for get_event action',
        };
      }

      const auth = await this.oauth.authenticate();
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.get({
        calendarId: params.calendar_id,
        eventId: params.event_id,
      });

      const event = response.data;

      let output = `📅 **${event.summary || '(No title)'}**\n\n`;
      output += `📅 Start: ${event.start?.dateTime || event.start?.date}\n`;
      output += `📅 End: ${event.end?.dateTime || event.end?.date}\n`;
      output += `📊 Status: ${event.status}\n`;
      if (event.location) output += `📍 Location: ${event.location}\n`;
      if (event.description) output += `📝 Description: ${event.description}\n`;
      output += `🔗 Link: ${event.htmlLink}\n`;
      output += `🆔 ID: ${event.id}\n`;
      
      if (event.attendees && event.attendees.length > 0) {
        output += `\n👥 Attendees (${event.attendees.length}):\n`;
        event.attendees.forEach((a: any) => {
          output += `   - ${a.displayName || a.email} (${a.responseStatus})\n`;
        });
      }
      
      if (event.recurrence && event.recurrence.length > 0) {
        output += `\n🔄 Recurring: ${event.recurrence.join(', ')}\n`;
      }

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to get calendar event');
      return {
        success: false,
        error: `Failed to get event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Create a new event
   */
  async createEvent(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.summary) {
        return {
          success: false,
          error: 'summary is required for create_event action',
        };
      }

      const auth = await this.oauth.authenticate();
      const calendar = google.calendar({ version: 'v3', auth });

      // Determine if this is an all-day event or timed event
      let startTime: any;
      let endTime: any;

      if (params.start_date && params.end_date) {
        // All-day event
        startTime = { date: params.start_date };
        endTime = { date: params.end_date };
      } else if (params.start && params.end) {
        // Timed event
        startTime = { dateTime: params.start };
        endTime = { dateTime: params.end };
      } else if (params.start) {
        // Start time only, default to 1 hour duration
        startTime = { dateTime: params.start };
        const endDate = new Date(params.start);
        endDate.setHours(endDate.getHours() + 1);
        endTime = { dateTime: endDate.toISOString() };
      } else {
        return {
          success: false,
          error: 'Either start/end times or start_date/end_date must be provided',
        };
      }

      const eventResource: any = {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: startTime,
        end: endTime,
      };

      // Add attendees if provided
      if (params.attendees && params.attendees.length > 0) {
        eventResource.attendees = params.attendees.map(email => ({ email }));
      }

      // Add reminders if provided
      if (params.reminders && params.reminders.length > 0) {
        eventResource.reminders = {
          useDefault: false,
          overrides: params.reminders,
        };
      }

      // Add recurrence if provided
      if (params.recurrence && params.recurrence.length > 0) {
        eventResource.recurrence = params.recurrence;
      }

      const response = await calendar.events.insert({
        calendarId: params.calendar_id,
        requestBody: eventResource,
        sendUpdates: params.attendees && params.attendees.length > 0 ? 'all' : 'none',
      });

      const event = response.data;

      let output = `✅ Event "${params.summary}" created successfully\n\n`;
      output += `📅 **${event.summary}**\n`;
      output += `📅 Start: ${event.start?.dateTime || event.start?.date}\n`;
      output += `📅 End: ${event.end?.dateTime || event.end?.date}\n`;
      output += `🔗 Link: ${event.htmlLink}\n`;
      output += `🆔 ID: ${event.id}\n`;

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to create calendar event');
      return {
        success: false,
        error: `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.event_id) {
        return {
          success: false,
          error: 'event_id is required for update_event action',
        };
      }

      const auth = await this.oauth.authenticate();
      const calendar = google.calendar({ version: 'v3', auth });

      // Get the existing event first
      const existingEvent = await calendar.events.get({
        calendarId: params.calendar_id,
        eventId: params.event_id,
      });

      // Build update object with only provided fields
      const updates: any = { ...existingEvent.data };

      if (params.summary) updates.summary = params.summary;
      if (params.description !== undefined) updates.description = params.description;
      if (params.location !== undefined) updates.location = params.location;

      // Update start/end times if provided
      if (params.start_date && params.end_date) {
        updates.start = { date: params.start_date };
        updates.end = { date: params.end_date };
      } else if (params.start && params.end) {
        updates.start = { dateTime: params.start };
        updates.end = { dateTime: params.end };
      } else if (params.start) {
        updates.start = { dateTime: params.start };
        // Keep existing end time or add 1 hour
        if (!updates.end) {
          const endDate = new Date(params.start);
          endDate.setHours(endDate.getHours() + 1);
          updates.end = { dateTime: endDate.toISOString() };
        }
      }

      // Update attendees if provided
      if (params.attendees) {
        updates.attendees = params.attendees.map(email => ({ email }));
      }

      // Update reminders if provided
      if (params.reminders) {
        updates.reminders = {
          useDefault: false,
          overrides: params.reminders,
        };
      }

      const response = await calendar.events.update({
        calendarId: params.calendar_id,
        eventId: params.event_id,
        requestBody: updates,
        sendUpdates: params.attendees && params.attendees.length > 0 ? 'all' : 'none',
      });

      const event = response.data;

      let output = `✅ Event updated successfully\n\n`;
      output += `📅 **${event.summary}**\n`;
      output += `📅 Start: ${event.start?.dateTime || event.start?.date}\n`;
      output += `📅 End: ${event.end?.dateTime || event.end?.date}\n`;
      output += `🔗 Link: ${event.htmlLink}\n`;
      output += `🆔 ID: ${event.id}\n`;

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to update calendar event');
      return {
        success: false,
        error: `Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.event_id) {
        return {
          success: false,
          error: 'event_id is required for delete_event action',
        };
      }

      const auth = await this.oauth.authenticate();
      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.delete({
        calendarId: params.calendar_id,
        eventId: params.event_id,
        sendUpdates: 'all', // Notify attendees
      });

      return {
        success: true,
        output: `✅ Event deleted successfully\n🆔 Event ID: ${params.event_id}`,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to delete calendar event');
      return {
        success: false,
        error: `Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Search events
   */
  async searchEvents(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.query) {
        return {
          success: false,
          error: 'query is required for search_events action',
        };
      }

      const auth = await this.oauth.authenticate();
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.list({
        calendarId: params.calendar_id,
        q: params.query,
        timeMin: params.time_min,
        timeMax: params.time_max,
        maxResults: params.max_results,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      if (events.length === 0) {
        return {
          success: true,
          output: `🔍 No events found matching "${params.query}"`,
        };
      }

      const formattedEvents = events.map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        status: event.status,
        htmlLink: event.htmlLink,
      }));

      let output = `🔍 Found ${events.length} event(s) matching "${params.query}":\n\n`;
      
      formattedEvents.forEach((event, index) => {
        output += `${index + 1}. **${event.summary || '(No title)'}**\n`;
        if (event.start) output += `   📅 Start: ${new Date(event.start).toLocaleString()}\n`;
        if (event.end) output += `   📅 End: ${new Date(event.end).toLocaleString()}\n`;
        if (event.location) output += `   📍 Location: ${event.location}\n`;
        output += `   🔗 Link: ${event.htmlLink}\n`;
        output += `   🆔 ID: ${event.id}\n`;
        output += '\n';
      });

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to search calendar events');
      return {
        success: false,
        error: `Failed to search events: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Execute the tool
 */
async function execute(input: any): Promise<ToolResult> {
  // Parse and validate input to apply defaults
  const parsed = inputSchema.parse(input);
  const client = new GoogleCalendarClient();

  switch (parsed.action) {
    case 'list_events':
      return client.listEvents(parsed);
    
    case 'get_event':
      return client.getEvent(parsed);
    
    case 'create_event':
      return client.createEvent(parsed);
    
    case 'update_event':
      return client.updateEvent(parsed);
    
    case 'delete_event':
      return client.deleteEvent(parsed);
    
    case 'search_events':
      return client.searchEvents(parsed);
    
    default:
      return {
        success: false,
        error: `Unknown action: ${parsed.action}`,
      };
  }
}

/**
 * Google Calendar Tool
 */
export const googleCalendarTool: Tool = {
  name: 'google_calendar',
  description: `Manage Google Calendar events. 

Actions available:
- list_events: List upcoming events
- get_event: Get details of a specific event
- create_event: Create a new event
- update_event: Update an existing event
- delete_event: Delete an event
- search_events: Search for events by query

Requirements:
- Google OAuth credentials must be configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- User must authenticate via browser on first use
- Supports both timed events (with time) and all-day events (date only)

Examples:
- List next 10 events: {action: "list_events", max_results: 10}
- Create meeting: {action: "create_event", summary: "Team Meeting", start: "2025-11-08T14:00:00-05:00", end: "2025-11-08T15:00:00-05:00"}
- Create all-day event: {action: "create_event", summary: "Conference", start_date: "2025-11-15", end_date: "2025-11-16"}
- Search: {action: "search_events", query: "interview"}`,
  inputSchema,
  execute,
};
