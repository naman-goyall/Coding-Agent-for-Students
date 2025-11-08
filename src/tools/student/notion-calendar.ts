import { z } from 'zod';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';

const inputSchema = z.object({
  action: z.enum([
    'list_events',
    'create_event',
    'get_event',
    'update_event',
    'delete_event',
  ]).describe('Action to perform'),
  event_id: z.string().optional().describe('Event page ID for get/update/delete actions'),
  title: z.string().optional().describe('Event title'),
  description: z.string().optional().describe('Event description'),
  location: z.string().optional().describe('Event location'),
  start_date: z.string().optional().describe('Event start date/time in format YYYY-MM-DDTHH:MM:SS (WITHOUT timezone offset, e.g., 2025-11-12T23:59:59)'),
  end_date: z.string().optional().describe('Event end date/time in format YYYY-MM-DDTHH:MM:SS (WITHOUT timezone offset, e.g., 2025-11-12T23:59:59)'),
  tags: z.array(z.string()).optional().describe('Event tags/categories'),
  max_results: z.number().default(10).describe('Maximum number of events to return'),
});

interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

let notionConfig: NotionConfig | null = null;

export function setNotionConfig(config: NotionConfig): void {
  notionConfig = config;
}

export function getNotionConfig(): NotionConfig | null {
  return notionConfig;
}

class NotionClient {
  private readonly apiVersion = '2025-09-03';
  private dataSourceId: string | null = null;

  constructor(
    private apiKey: string,
    private databaseId: string
  ) {}

  private async makeRequest(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<any> {
    const url = `https://api.notion.com/v1${endpoint}`;
    
    logger.debug(`Notion API request: ${method} ${url}`);

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Notion-Version': this.apiVersion,
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Notion API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(error as Error, 'Notion API request failed');
      throw error;
    }
  }

  private async getDataSourceId(): Promise<string> {
    // Cache the data source ID to avoid repeated API calls
    if (this.dataSourceId) {
      return this.dataSourceId;
    }

    // Retrieve the database to get its data sources
    const database = await this.makeRequest(`/databases/${this.databaseId}`);
    
    // In the new API, databases have data_sources array
    // For simple calendars, there's typically just one data source
    if (database.data_sources && database.data_sources.length > 0) {
      const sourceId = database.data_sources[0].id;
      this.dataSourceId = sourceId;
      return sourceId;
    }

    // Fallback: if no data_sources array, the database ID might be the data source ID
    // This handles edge cases during transition
    this.dataSourceId = this.databaseId;
    return this.databaseId;
  }

  async queryDatabase(params: {
    maxResults?: number;
    startCursor?: string;
    filter?: any;
    sorts?: any[];
  }): Promise<any> {
    // Get the data source ID first
    const dataSourceId = await this.getDataSourceId();

    const body: any = {
      page_size: params.maxResults || 10,
    };

    if (params.startCursor) {
      body.start_cursor = params.startCursor;
    }

    if (params.filter) {
      body.filter = params.filter;
    }

    if (params.sorts) {
      body.sorts = params.sorts;
    }

    // Use the new data_sources endpoint instead of databases
    return this.makeRequest(`/data_sources/${dataSourceId}/query`, 'POST', body);
  }

  async getPage(pageId: string): Promise<any> {
    return this.makeRequest(`/pages/${pageId}`);
  }

  async createPage(properties: any): Promise<any> {
    // Get the data source ID first
    const dataSourceId = await this.getDataSourceId();

    const body = {
      parent: {
        type: 'data_source_id',
        data_source_id: dataSourceId,
      },
      properties,
    };

    return this.makeRequest('/pages', 'POST', body);
  }

  async updatePage(pageId: string, properties: any): Promise<any> {
    const body = {
      properties,
    };

    return this.makeRequest(`/pages/${pageId}`, 'PATCH', body);
  }

  async archivePage(pageId: string): Promise<any> {
    const body = {
      archived: true,
    };

    return this.makeRequest(`/pages/${pageId}`, 'PATCH', body);
  }
}

function extractTextFromRichText(richText: any[]): string {
  if (!richText || richText.length === 0) return '';
  return richText.map((text: any) => text.plain_text).join('');
}

function extractDateInfo(dateProperty: any): { start: string; end?: string } | null {
  if (!dateProperty || !dateProperty.date) return null;
  return {
    start: dateProperty.date.start,
    end: dateProperty.date.end || undefined,
  };
}

function formatEventsList(response: any): string {
  const events = response.results || [];
  
  if (events.length === 0) {
    return 'No upcoming events found in your Notion calendar.';
  }

  let output = `Found ${events.length} event(s) in your Notion calendar:\n\n`;
  
  events.forEach((page: any, index: number) => {
    const props = page.properties;
    
    // Extract title (assuming "Name" or "Title" property)
    const titleProp = props.Name || props.Title || props.Event;
    const title = titleProp ? extractTextFromRichText(titleProp.title) : '(No Title)';
    
    // Extract date
    const dateProp = props.Date || props.When;
    const dateInfo = dateProp ? extractDateInfo(dateProp) : null;
    
    output += `${index + 1}. **${title}**\n`;
    
    if (dateInfo) {
      const startDate = new Date(dateInfo.start);
      output += `   Start: ${startDate.toLocaleString()}\n`;
      
      if (dateInfo.end) {
        const endDate = new Date(dateInfo.end);
        output += `   End: ${endDate.toLocaleString()}\n`;
      }
    }
    
    // Extract location if exists
    const locationProp = props.Location;
    if (locationProp && locationProp.rich_text && locationProp.rich_text.length > 0) {
      const location = extractTextFromRichText(locationProp.rich_text);
      output += `   Location: ${location}\n`;
    }
    
    // Extract tags if exists
    const tagsProp = props.Tags || props.Category;
    if (tagsProp && tagsProp.multi_select && tagsProp.multi_select.length > 0) {
      const tags = tagsProp.multi_select.map((tag: any) => tag.name).join(', ');
      output += `   Tags: ${tags}\n`;
    }
    
    output += `   ID: ${page.id}\n`;
    output += `   URL: ${page.url}\n`;
    output += '\n';
  });

  return output;
}

function formatEvent(page: any): string {
  const props = page.properties;
  
  // Extract title
  const titleProp = props.Name || props.Title || props.Event;
  const title = titleProp ? extractTextFromRichText(titleProp.title) : '(No Title)';
  
  let output = `**${title}**\n\n`;
  
  // Extract date
  const dateProp = props.Date || props.When;
  const dateInfo = dateProp ? extractDateInfo(dateProp) : null;
  
  if (dateInfo) {
    const startDate = new Date(dateInfo.start);
    output += `Start: ${startDate.toLocaleString()}\n`;
    
    if (dateInfo.end) {
      const endDate = new Date(dateInfo.end);
      output += `End: ${endDate.toLocaleString()}\n`;
    }
  }
  
  // Extract location
  const locationProp = props.Location;
  if (locationProp && locationProp.rich_text && locationProp.rich_text.length > 0) {
    const location = extractTextFromRichText(locationProp.rich_text);
    output += `Location: ${location}\n`;
  }
  
  // Extract description
  const descProp = props.Description || props.Notes;
  if (descProp && descProp.rich_text && descProp.rich_text.length > 0) {
    const description = extractTextFromRichText(descProp.rich_text);
    output += `\nDescription:\n${description}\n`;
  }
  
  // Extract tags
  const tagsProp = props.Tags || props.Category;
  if (tagsProp && tagsProp.multi_select && tagsProp.multi_select.length > 0) {
    const tags = tagsProp.multi_select.map((tag: any) => tag.name).join(', ');
    output += `\nTags: ${tags}\n`;
  }
  
  // Extract created/updated info
  output += `\nCreated: ${new Date(page.created_time).toLocaleString()}\n`;
  output += `Last Updated: ${new Date(page.last_edited_time).toLocaleString()}\n`;
  
  output += `\nPage ID: ${page.id}\n`;
  output += `View in Notion: ${page.url}\n`;

  return output;
}

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    // Check if Notion is configured
    if (!notionConfig || !notionConfig.apiKey || !notionConfig.databaseId) {
      return {
        success: false,
        error: 'Notion calendar is not configured. Please set your Notion API key and database ID in the configuration.',
      };
    }

    const client = new NotionClient(notionConfig.apiKey, notionConfig.databaseId);
    const { action } = params;

    logger.debug(`Executing Notion calendar action: ${action}`, params);

    switch (action) {
      case 'list_events': {
        // Query database with filter for upcoming events
        const now = new Date().toISOString();
        
        const response = await client.queryDatabase({
          maxResults: params.max_results,
          filter: {
            property: 'Date',
            date: {
              on_or_after: now,
            },
          },
          sorts: [
            {
              property: 'Date',
              direction: 'ascending',
            },
          ],
        });
        
        return {
          success: true,
          output: formatEventsList(response),
        };
      }

      case 'get_event': {
        if (!params.event_id) {
          return {
            success: false,
            error: 'event_id is required for get_event action',
          };
        }
        
        const page = await client.getPage(params.event_id);
        return {
          success: true,
          output: formatEvent(page),
        };
      }

      case 'create_event': {
        if (!params.title || !params.start_date) {
          return {
            success: false,
            error: 'title and start_date are required for create_event action',
          };
        }

        // Get the local timezone in IANA format (e.g., "America/New_York")
        const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Format date for Notion - keep as-is without timezone conversion
        const formatDateForNotion = (dateStr: string): string => {
          // If already has timezone info, strip it since we'll use time_zone field
          if (dateStr.endsWith('Z')) {
            return dateStr.slice(0, -1);
          }
          if (/[+-]\d{2}:\d{2}$/.test(dateStr)) {
            return dateStr.replace(/[+-]\d{2}:\d{2}$/, '');
          }
          // Return as-is (should be in format: 2025-11-12T23:59:59)
          return dateStr;
        };

        const properties: any = {
          Name: {
            title: [
              {
                text: {
                  content: params.title,
                },
              },
            ],
          },
          Date: {
            date: {
              start: formatDateForNotion(params.start_date),
              end: params.end_date ? formatDateForNotion(params.end_date) : null,
              time_zone: localTimezone,
            },
          },
        };

        if (params.description) {
          properties.Description = {
            rich_text: [
              {
                text: {
                  content: params.description,
                },
              },
            ],
          };
        }

        if (params.location) {
          properties.Location = {
            rich_text: [
              {
                text: {
                  content: params.location,
                },
              },
            ],
          };
        }

        if (params.tags && params.tags.length > 0) {
          properties.Tags = {
            multi_select: params.tags.map(tag => ({ name: tag })),
          };
        }

        const createdPage = await client.createPage(properties);
        return {
          success: true,
          output: `Event created successfully!\n\n${formatEvent(createdPage)}`,
        };
      }

      case 'update_event': {
        if (!params.event_id) {
          return {
            success: false,
            error: 'event_id is required for update_event action',
          };
        }

        const properties: any = {};

        if (params.title) {
          properties.Name = {
            title: [
              {
                text: {
                  content: params.title,
                },
              },
            ],
          };
        }

        if (params.start_date || params.end_date) {
          // Get existing page to preserve dates if only one is updated
          const existingPage = await client.getPage(params.event_id);
          const existingDate = existingPage.properties.Date?.date;
          
          properties.Date = {
            date: {
              start: params.start_date || existingDate?.start,
              end: params.end_date || existingDate?.end || null,
            },
          };
        }

        if (params.description) {
          properties.Description = {
            rich_text: [
              {
                text: {
                  content: params.description,
                },
              },
            ],
          };
        }

        if (params.location) {
          properties.Location = {
            rich_text: [
              {
                text: {
                  content: params.location,
                },
              },
            ],
          };
        }

        if (params.tags) {
          properties.Tags = {
            multi_select: params.tags.map(tag => ({ name: tag })),
          };
        }

        const updatedPage = await client.updatePage(params.event_id, properties);
        return {
          success: true,
          output: `Event updated successfully!\n\n${formatEvent(updatedPage)}`,
        };
      }

      case 'delete_event': {
        if (!params.event_id) {
          return {
            success: false,
            error: 'event_id is required for delete_event action',
          };
        }

        await client.archivePage(params.event_id);
        return {
          success: true,
          output: `Event ${params.event_id} archived successfully.`,
        };
      }

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  } catch (error: any) {
    logger.error(error, 'Notion calendar tool execution error');
    return {
      success: false,
      error: error.message || 'Unknown error during Notion calendar operation',
    };
  }
}

export const notionCalendarTool: Tool = {
  name: 'notion_calendar',
  description: `Interact with Notion calendar database to manage events and schedules.
  
Available actions:
- list_events: Get upcoming events from Notion calendar database (optional: max_results)
- get_event: Get details of a specific event (requires event_id)
- create_event: Create a new calendar event (requires title, start_date; optional: end_date, description, location, tags)
- update_event: Update an existing event (requires event_id; optional: title, description, location, start_date, end_date, tags)
- delete_event: Archive an event (requires event_id)

IMPORTANT: Dates must be in format YYYY-MM-DDTHH:MM:SS WITHOUT timezone offset (e.g., "2025-11-12T23:59:59", NOT "2025-11-12T23:59:59-05:00").
The tool automatically handles timezone conversion using the system's local timezone.

Note: Notion API must be configured with an integration token and calendar database ID before use.
The database should have these properties: Name (title), Date (date), Description (rich_text), Location (rich_text), Tags (multi_select).`,
  inputSchema,
  execute,
};
