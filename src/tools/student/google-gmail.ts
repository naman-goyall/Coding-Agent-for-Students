/**
 * Google Gmail Tool
 * 
 * Provides integration with Gmail for managing emails
 * Actions: list_messages, get_message, send_message, search_messages, delete_message, mark_as_read
 */

import { z } from 'zod';
import { google } from 'googleapis';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';
import { createGoogleOAuthFromEnv } from '../../auth/google-oauth.js';

// Input schema for the tool
const inputSchema = z.object({
  action: z.enum([
    'list_messages',
    'get_message',
    'send_message',
    'search_messages',
    'delete_message',
    'mark_as_read',
    'mark_as_unread',
  ]).describe('The Gmail action to perform'),
  
  // Message ID (for get, delete, mark as read/unread)
  message_id: z.string().optional().describe('Message ID for get/delete/mark actions'),
  
  // Email composition (for send)
  to: z.string().optional().describe('Recipient email address'),
  subject: z.string().optional().describe('Email subject'),
  body: z.string().optional().describe('Email body (plain text or HTML)'),
  cc: z.string().optional().describe('CC email addresses (comma-separated)'),
  bcc: z.string().optional().describe('BCC email addresses (comma-separated)'),
  
  // Query parameters (for list/search)
  query: z.string().optional().describe('Search query (Gmail search syntax)'),
  max_results: z.number().min(1).max(20).default(10).describe('Maximum number of messages to return (max 20 to prevent rate limits)'),
  include_spam_trash: z.boolean().default(false).describe('Include messages from spam/trash'),
  
  // Labels
  label_ids: z.array(z.string()).optional().describe('Label IDs to filter by'),
});

type InputSchema = z.infer<typeof inputSchema>;

/**
 * Google Gmail client wrapper
 */
class GoogleGmailClient {
  private oauth: ReturnType<typeof createGoogleOAuthFromEnv>;
  
  constructor() {
    this.oauth = createGoogleOAuthFromEnv();
  }

  /**
   * List messages
   */
  async listMessages(params: InputSchema): Promise<ToolResult> {
    try {
      const auth = await this.oauth.authenticate();
      const gmail = google.gmail({ version: 'v1', auth });

      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: params.max_results,
        q: params.query,
        includeSpamTrash: params.include_spam_trash,
        labelIds: params.label_ids,
      });

      const messages = response.data.messages || [];
      
      if (messages.length === 0) {
        return {
          success: true,
          output: '📧 No messages found',
        };
      }

      // Fetch details for each message
      const detailedMessages = await Promise.all(
        messages.map(async (msg) => {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date'],
          });
          
          const headers = detail.data.payload?.headers || [];
          const getHeader = (name: string) => 
            headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

          return {
            id: detail.data.id,
            threadId: detail.data.threadId,
            snippet: detail.data.snippet,
            from: getHeader('From'),
            to: getHeader('To'),
            subject: getHeader('Subject'),
            date: getHeader('Date'),
            labels: detail.data.labelIds || [],
          };
        })
      );

      let output = `📧 Found ${messages.length} message(s):\n\n`;
      
      detailedMessages.forEach((msg, index) => {
        output += `${index + 1}. **${msg.subject || '(No subject)'}**\n`;
        output += `   📤 From: ${msg.from}\n`;
        output += `   📥 To: ${msg.to}\n`;
        output += `   📅 Date: ${msg.date}\n`;
        output += `   📝 Snippet: ${msg.snippet}\n`;
        output += `   🆔 ID: ${msg.id}\n`;
        output += '\n';
      });

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to list Gmail messages');
      return {
        success: false,
        error: `Failed to list messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get a specific message
   */
  async getMessage(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.message_id) {
        return {
          success: false,
          error: 'message_id is required for get_message action',
        };
      }

      const auth = await this.oauth.authenticate();
      const gmail = google.gmail({ version: 'v1', auth });

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: params.message_id,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload?.headers || [];
      const getHeader = (name: string) => 
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      // Extract body
      let body = '';
      if (message.payload?.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      } else if (message.payload?.parts) {
        // Multi-part message
        const textPart = message.payload.parts.find(
          part => part.mimeType === 'text/plain' || part.mimeType === 'text/html'
        );
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
      }

      let output = `📧 **${getHeader('Subject') || '(No subject)'}**\n\n`;
      output += `📤 From: ${getHeader('From')}\n`;
      output += `📥 To: ${getHeader('To')}\n`;
      output += `📅 Date: ${getHeader('Date')}\n`;
      if (getHeader('Cc')) output += `📋 CC: ${getHeader('Cc')}\n`;
      output += `🆔 ID: ${message.id}\n`;
      output += `🏷️  Labels: ${message.labelIds?.join(', ') || 'None'}\n`;
      output += `\n📝 **Body:**\n${body.substring(0, 1000)}${body.length > 1000 ? '...' : ''}\n`;

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to get Gmail message');
      return {
        success: false,
        error: `Failed to get message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Send a message
   */
  async sendMessage(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.to || !params.subject || !params.body) {
        return {
          success: false,
          error: 'to, subject, and body are required for send_message action',
        };
      }

      const auth = await this.oauth.authenticate();
      const gmail = google.gmail({ version: 'v1', auth });

      // Create email in RFC 2822 format
      const email = [
        `To: ${params.to}`,
        params.cc ? `Cc: ${params.cc}` : '',
        params.bcc ? `Bcc: ${params.bcc}` : '',
        `Subject: ${params.subject}`,
        '',
        params.body,
      ].filter(Boolean).join('\n');

      const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      let output = `✅ Email sent successfully\n\n`;
      output += `📥 To: ${params.to}\n`;
      if (params.cc) output += `📋 CC: ${params.cc}\n`;
      output += `📝 Subject: ${params.subject}\n`;
      output += `🆔 Message ID: ${response.data.id}\n`;

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to send Gmail message');
      return {
        success: false,
        error: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Search messages
   */
  async searchMessages(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.query) {
        return {
          success: false,
          error: 'query is required for search_messages action',
        };
      }

      // Use list_messages with the query
      return this.listMessages(params);
    } catch (error) {
      logger.error(error as Error, 'Failed to search Gmail messages');
      return {
        success: false,
        error: `Failed to search messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.message_id) {
        return {
          success: false,
          error: 'message_id is required for delete_message action',
        };
      }

      const auth = await this.oauth.authenticate();
      const gmail = google.gmail({ version: 'v1', auth });

      await gmail.users.messages.delete({
        userId: 'me',
        id: params.message_id,
      });

      return {
        success: true,
        output: `✅ Message deleted successfully\n🆔 Message ID: ${params.message_id}`,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to delete Gmail message');
      return {
        success: false,
        error: `Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.message_id) {
        return {
          success: false,
          error: 'message_id is required for mark_as_read action',
        };
      }

      const auth = await this.oauth.authenticate();
      const gmail = google.gmail({ version: 'v1', auth });

      await gmail.users.messages.modify({
        userId: 'me',
        id: params.message_id,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });

      return {
        success: true,
        output: `✅ Message marked as read\n🆔 Message ID: ${params.message_id}`,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to mark Gmail message as read');
      return {
        success: false,
        error: `Failed to mark as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Mark message as unread
   */
  async markAsUnread(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.message_id) {
        return {
          success: false,
          error: 'message_id is required for mark_as_unread action',
        };
      }

      const auth = await this.oauth.authenticate();
      const gmail = google.gmail({ version: 'v1', auth });

      await gmail.users.messages.modify({
        userId: 'me',
        id: params.message_id,
        requestBody: {
          addLabelIds: ['UNREAD'],
        },
      });

      return {
        success: true,
        output: `✅ Message marked as unread\n🆔 Message ID: ${params.message_id}`,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to mark Gmail message as unread');
      return {
        success: false,
        error: `Failed to mark as unread: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
  const client = new GoogleGmailClient();

  switch (parsed.action) {
    case 'list_messages':
      return client.listMessages(parsed);
    
    case 'get_message':
      return client.getMessage(parsed);
    
    case 'send_message':
      return client.sendMessage(parsed);
    
    case 'search_messages':
      return client.searchMessages(parsed);
    
    case 'delete_message':
      return client.deleteMessage(parsed);
    
    case 'mark_as_read':
      return client.markAsRead(parsed);
    
    case 'mark_as_unread':
      return client.markAsUnread(parsed);
    
    default:
      return {
        success: false,
        error: `Unknown action: ${parsed.action}`,
      };
  }
}

/**
 * Google Gmail Tool
 */
export const googleGmailTool: Tool = {
  name: 'google_gmail',
  description: `Manage Gmail messages - read, send, search, and organize emails.

Actions available:
- list_messages: List recent messages (optionally with query filter)
- get_message: Get full details of a specific message
- send_message: Send a new email
- search_messages: Search for messages using Gmail search syntax
- delete_message: Delete a message
- mark_as_read: Mark a message as read
- mark_as_unread: Mark a message as unread

⚠️ CRITICAL - Rate Limit Prevention:
- ALWAYS use max_results ≤ 20 (default is 10, which is good)
- Each email result contains ~300 tokens (subject, snippet, metadata)
- 50 emails = 15,000+ tokens = instant rate limit! ❌
- Use SPECIFIC queries to get fewer, more relevant results
- For finding sent applications: use "in:sent" to search only sent messages

Gmail search syntax (combine multiple for specificity):
- "from:john@example.com" - From specific sender
- "to:professor@school.edu" - To specific recipient
- "subject:internship" - Subject contains word
- "in:sent" - Only sent messages (use this for finding YOUR applications!)
- "in:inbox" - Only inbox (default)
- "is:unread" - Only unread
- "has:attachment" - Has attachments
- "after:2024/11/01" - After date
- "before:2024/12/01" - Before date
- "label:important" - With label
- Combine: "in:sent internship after:2024/10/01" - Sent internship emails from Oct onwards

Best practices:
- Start with max_results: 10, increase only if needed
- Use specific date ranges (after:/before:) to narrow results
- Combine multiple search terms for precision
- Use "in:sent" when looking for emails YOU sent (applications, replies)
- Use "from:" when looking for emails FROM someone specific

Requirements:
- Google OAuth credentials must be configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- User must authenticate via browser on first use
- Gmail API must be enabled in Google Cloud Console

Examples:
- Recent inbox: {action: "list_messages", max_results: 10}
- Your sent applications: {action: "search_messages", query: "in:sent (internship OR application) after:2024/11/01", max_results: 15}
- Unread from prof: {action: "search_messages", query: "from:prof@school.edu is:unread", max_results: 10}
- Get message: {action: "get_message", message_id: "abc123"}
- Send email: {action: "send_message", to: "student@school.edu", subject: "Assignment", body: "Here is my work..."}`,
  inputSchema,
  execute,
};
