/**
 * Google Docs Tool
 * 
 * Provides integration with Google Docs for document management
 * Actions: create_document, get_document, append_text, insert_text, update_document, list_documents
 */

import { z } from 'zod';
import { google } from 'googleapis';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';
import { createGoogleOAuthFromEnv } from '../../auth/google-oauth.js';

// Input schema for the tool
const inputSchema = z.object({
  action: z.enum([
    'create_document',
    'get_document',
    'append_text',
    'insert_text',
    'update_document',
    'list_documents',
  ]).describe('The document action to perform'),
  
  // Document ID (for most actions)
  document_id: z.string().optional().describe('Document ID for operations on existing documents'),
  
  // Document creation/modification
  title: z.string().optional().describe('Document title (for create_document)'),
  content: z.string().optional().describe('Initial content or text to add'),
  
  // Text insertion
  text: z.string().optional().describe('Text to insert or append'),
  index: z.number().optional().describe('Position to insert text (for insert_text)'),
  
  // Batch updates
  requests: z.array(z.any()).optional().describe('Batch update requests (for update_document)'),
  
  // List/search parameters
  query: z.string().optional().describe('Search query for list_documents'),
  max_results: z.number().default(10).describe('Maximum number of documents to return'),
  order_by: z.enum(['createdTime', 'modifiedTime', 'name']).default('modifiedTime').describe('Sort order for list'),
});

type InputSchema = z.infer<typeof inputSchema>;

/**
 * Parse markdown and convert to Google Docs formatting requests
 */
function parseMarkdownToRequests(text: string, startIndex: number): any[] {
  const requests: any[] = [];
  
  // Track all markdown patterns with their original positions
  interface MarkdownMatch {
    originalStart: number;
    originalEnd: number;
    contentStart: number;
    contentEnd: number;
    content: string;
    type: 'bold' | 'italic' | 'heading1' | 'heading2' | 'heading3';
    syntaxLength: number;
  }
  
  const matches: MarkdownMatch[] = [];
  
  // Find all bold patterns (**text** or __text__)
  const boldPattern = /(\*\*|__)((?:(?!\1).)+?)\1/g;
  let match;
  
  while ((match = boldPattern.exec(text)) !== null) {
    matches.push({
      originalStart: match.index,
      originalEnd: match.index + match[0].length,
      contentStart: match.index + match[1].length,
      contentEnd: match.index + match[1].length + match[2].length,
      content: match[2],
      type: 'bold',
      syntaxLength: match[1].length * 2, // ** or __ on both sides
    });
  }
  
  // Find all italic patterns (*text* or _text_) - but not ** or __
  const italicPattern = /(?<!\*)(\*)(?!\*)([^*]+?)\1(?!\*)|(?<!_)(_)(?!_)([^_]+?)\3(?!_)/g;
  
  while ((match = italicPattern.exec(text)) !== null) {
    const content = match[2] || match[4];
    const marker = match[1] || match[3];
    matches.push({
      originalStart: match.index,
      originalEnd: match.index + match[0].length,
      contentStart: match.index + marker.length,
      contentEnd: match.index + marker.length + content.length,
      content: content,
      type: 'italic',
      syntaxLength: marker.length * 2,
    });
  }
  
  // Find all heading patterns (# Heading)
  const lines = text.split('\n');
  let currentPos = 0;
  
  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      matches.push({
        originalStart: currentPos,
        originalEnd: currentPos + line.length,
        contentStart: currentPos + headingMatch[1].length + 1, // +1 for space
        contentEnd: currentPos + headingMatch[1].length + 1 + content.length,
        content: content,
        type: level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3',
        syntaxLength: headingMatch[1].length + 1, // ### + space
      });
    }
    currentPos += line.length + 1; // +1 for newline
  }
  
  // Sort matches by position
  matches.sort((a, b) => a.originalStart - b.originalStart);
  
  // Build plain text and calculate new positions
  let plainText = '';
  let lastPos = 0;
  
  const formattingRanges: Array<{
    start: number;
    end: number;
    type: string;
  }> = [];
  
  for (const m of matches) {
    // Add text before this match
    if (m.originalStart > lastPos) {
      plainText += text.substring(lastPos, m.originalStart);
    }
    
    // Add the content (without markdown syntax)
    const newStart = plainText.length;
    plainText += m.content;
    const newEnd = plainText.length;
    
    // Record formatting range in the new text
    formattingRanges.push({
      start: startIndex + newStart,
      end: startIndex + newEnd,
      type: m.type,
    });
    
    lastPos = m.originalEnd;
  }
  
  // Add remaining text
  if (lastPos < text.length) {
    plainText += text.substring(lastPos);
  }
  
  // Insert the plain text first
  requests.push({
    insertText: {
      text: plainText,
      location: { index: startIndex },
    },
  });
  
  // Apply formatting
  for (const range of formattingRanges) {
    // Skip invalid ranges (startIndex must be < endIndex)
    if (range.start >= range.end) {
      continue;
    }
    
    if (range.type === 'bold') {
      requests.push({
        updateTextStyle: {
          textStyle: { bold: true },
          range: { startIndex: range.start, endIndex: range.end },
          fields: 'bold',
        },
      });
    } else if (range.type === 'italic') {
      requests.push({
        updateTextStyle: {
          textStyle: { italic: true },
          range: { startIndex: range.start, endIndex: range.end },
          fields: 'italic',
        },
      });
    } else if (range.type.startsWith('heading')) {
      // For headings, include newline if available, but don't go past text length
      const endIndex = Math.min(range.end + 1, startIndex + plainText.length);
      
      // Only apply heading style if we have valid range
      if (range.start < endIndex) {
        requests.push({
          updateParagraphStyle: {
            paragraphStyle: {
              namedStyleType: range.type === 'heading1' ? 'HEADING_1' 
                            : range.type === 'heading2' ? 'HEADING_2' 
                            : 'HEADING_3',
            },
            range: { startIndex: range.start, endIndex },
            fields: 'namedStyleType',
          },
        });
      }
    }
  }
  
  return requests;
}

/**
 * Google Docs client wrapper
 */
class GoogleDocsClient {
  private oauth: ReturnType<typeof createGoogleOAuthFromEnv>;
  
  constructor() {
    this.oauth = createGoogleOAuthFromEnv();
  }

  /**
   * Create a new Google Doc
   */
  async createDocument(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.title) {
        return {
          success: false,
          error: 'Missing required parameter: title',
        };
      }

      const auth = await this.oauth.authenticate();
      const docs = google.docs({ version: 'v1', auth });

      // Create the document
      const createResponse = await docs.documents.create({
        requestBody: {
          title: params.title,
        },
      });

      const documentId = createResponse.data.documentId!;
      const title = createResponse.data.title!;

      // Add initial content if provided
      if (params.content) {
        const requests = parseMarkdownToRequests(params.content, 1);
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests,
          },
        });
      }

      const url = `https://docs.google.com/document/d/${documentId}/edit`;

      let output = `✅ Document "${title}" created successfully\n\n`;
      output += `📄 **${title}**\n`;
      output += `🔗 Link: ${url}\n`;
      output += `🆔 ID: ${documentId}\n`;
      if (params.content) {
        output += `📝 Content: ${params.content.substring(0, 100)}${params.content.length > 100 ? '...' : ''}\n`;
      }

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to create document');
      return {
        success: false,
        error: `Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get document content
   */
  async getDocument(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.document_id) {
        return {
          success: false,
          error: 'Missing required parameter: document_id',
        };
      }

      const auth = await this.oauth.authenticate();
      const docs = google.docs({ version: 'v1', auth });

      const response = await docs.documents.get({
        documentId: params.document_id,
      });

      const doc = response.data;
      const title = doc.title || '(Untitled)';
      
      // Extract text content from the document
      let content = '';
      if (doc.body?.content) {
        for (const element of doc.body.content) {
          if (element.paragraph) {
            for (const textElement of element.paragraph.elements || []) {
              if (textElement.textRun?.content) {
                content += textElement.textRun.content;
              }
            }
          }
        }
      }

      const url = `https://docs.google.com/document/d/${params.document_id}/edit`;
      const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;

      let output = `📄 **${title}**\n\n`;
      output += `🔗 Link: ${url}\n`;
      output += `🆔 ID: ${params.document_id}\n`;
      output += `📊 Word Count: ${wordCount}\n`;
      output += `📊 Character Count: ${content.length}\n\n`;
      output += `📝 **Content:**\n`;
      output += `${content.substring(0, 500)}${content.length > 500 ? '...\n(truncated)' : ''}`;

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to get document');
      return {
        success: false,
        error: `Failed to get document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Append text to the end of a document
   */
  async appendText(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.document_id || !params.text) {
        return {
          success: false,
          error: 'Missing required parameters: document_id, text',
        };
      }

      const auth = await this.oauth.authenticate();
      const docs = google.docs({ version: 'v1', auth });

      // Get document to find end index
      const document = await docs.documents.get({
        documentId: params.document_id,
      });

      // Find the end index (last position - 1 for the newline character)
      const endIndex = document.data.body?.content
        ?.reduce((max, item) => Math.max(max, item.endIndex || 0), 0) || 1;

      // Append text at the end with markdown formatting
      const requests = parseMarkdownToRequests(params.text, endIndex - 1);
      await docs.documents.batchUpdate({
        documentId: params.document_id,
        requestBody: {
          requests,
        },
      });

      const title = document.data.title || '(Untitled)';
      const url = `https://docs.google.com/document/d/${params.document_id}/edit`;

      let output = `✅ Text appended to "${title}"\n\n`;
      output += `📝 Added: ${params.text.substring(0, 100)}${params.text.length > 100 ? '...' : ''}\n`;
      output += `🔗 Link: ${url}\n`;

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to append text');
      return {
        success: false,
        error: `Failed to append text: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Insert text at a specific position
   */
  async insertText(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.document_id || !params.text || params.index === undefined) {
        return {
          success: false,
          error: 'Missing required parameters: document_id, text, index',
        };
      }

      const auth = await this.oauth.authenticate();
      const docs = google.docs({ version: 'v1', auth });

      // Get document info
      const document = await docs.documents.get({
        documentId: params.document_id,
      });

      // Insert text at specified index with markdown formatting
      const requests = parseMarkdownToRequests(params.text, params.index);
      await docs.documents.batchUpdate({
        documentId: params.document_id,
        requestBody: {
          requests,
        },
      });

      const title = document.data.title || '(Untitled)';
      const url = `https://docs.google.com/document/d/${params.document_id}/edit`;

      let output = `✅ Text inserted into "${title}"\n\n`;
      output += `📝 Inserted at position ${params.index}: ${params.text.substring(0, 100)}${params.text.length > 100 ? '...' : ''}\n`;
      output += `🔗 Link: ${url}\n`;

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to insert text');
      return {
        success: false,
        error: `Failed to insert text: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Batch update document (advanced operations)
   */
  async updateDocument(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.document_id || !params.requests) {
        return {
          success: false,
          error: 'Missing required parameters: document_id, requests',
        };
      }

      const auth = await this.oauth.authenticate();
      const docs = google.docs({ version: 'v1', auth });

      // Execute batch update
      await docs.documents.batchUpdate({
        documentId: params.document_id,
        requestBody: {
          requests: params.requests,
        },
      });

      const document = await docs.documents.get({
        documentId: params.document_id,
      });

      const title = document.data.title || '(Untitled)';
      const url = `https://docs.google.com/document/d/${params.document_id}/edit`;

      let output = `✅ Document "${title}" updated successfully\n\n`;
      output += `📝 Applied ${params.requests.length} update(s)\n`;
      output += `🔗 Link: ${url}\n`;

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to update document');
      return {
        success: false,
        error: `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * List user's Google Docs
   */
  async listDocuments(params: InputSchema): Promise<ToolResult> {
    try {
      const auth = await this.oauth.authenticate();
      const drive = google.drive({ version: 'v3', auth });

      // Build query for Google Docs
      let query = "mimeType='application/vnd.google-apps.document' and trashed=false";
      
      if (params.query) {
        query += ` and name contains '${params.query}'`;
      }

      const response = await drive.files.list({
        q: query,
        pageSize: params.max_results,
        orderBy: `${params.order_by} desc`,
        fields: 'files(id, name, createdTime, modifiedTime, webViewLink, owners)',
      });

      const files = response.data.files || [];

      if (files.length === 0) {
        return {
          success: true,
          output: params.query 
            ? `🔍 No documents found matching "${params.query}"`
            : '📄 No documents found',
        };
      }

      let output = params.query
        ? `🔍 Found ${files.length} document(s) matching "${params.query}":\n\n`
        : `📄 Found ${files.length} document(s):\n\n`;

      files.forEach((file, index) => {
        output += `${index + 1}. **${file.name}**\n`;
        if (file.modifiedTime) {
          output += `   🕒 Modified: ${new Date(file.modifiedTime).toLocaleString()}\n`;
        }
        if (file.owners && file.owners.length > 0) {
          output += `   👤 Owner: ${file.owners[0].displayName || file.owners[0].emailAddress}\n`;
        }
        output += `   🔗 Link: ${file.webViewLink}\n`;
        output += `   🆔 ID: ${file.id}\n`;
        output += '\n';
      });

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to list documents');
      return {
        success: false,
        error: `Failed to list documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
  const client = new GoogleDocsClient();

  switch (parsed.action) {
    case 'create_document':
      return client.createDocument(parsed);
    
    case 'get_document':
      return client.getDocument(parsed);
    
    case 'append_text':
      return client.appendText(parsed);
    
    case 'insert_text':
      return client.insertText(parsed);
    
    case 'update_document':
      return client.updateDocument(parsed);
    
    case 'list_documents':
      return client.listDocuments(parsed);
    
    default:
      return {
        success: false,
        error: `Unknown action: ${parsed.action}`,
      };
  }
}

/**
 * Google Docs Tool
 */
export const googleDocsTool: Tool = {
  name: 'google_docs',
  description: `Manage Google Docs documents.

Actions available:
- create_document: Create a new Google Doc
- get_document: Get document content
- append_text: Append text to the end of a document
- insert_text: Insert text at a specific position
- update_document: Batch update document (advanced)
- list_documents: List user's Google Docs

Requirements:
- Google OAuth credentials must be configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- User must authenticate via browser on first use
- Automatically uses Google Drive API for document listing

Examples:
- Create document: {action: "create_document", title: "My Notes", content: "Hello World"}
- List documents: {action: "list_documents", max_results: 10}
- Append text: {action: "append_text", document_id: "abc123", text: "New paragraph"}
- Search documents: {action: "list_documents", query: "assignment"}`,
  inputSchema,
  execute,
};
