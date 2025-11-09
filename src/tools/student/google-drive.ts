/**
 * Google Drive Tool
 * 
 * Provides integration with Google Drive for managing files
 * Actions: list_files, get_file, download_file, search_files, read_pdf
 * 
 * Note: To read PDF files, install: npm install pdf-parse
 */

import { z } from 'zod';
import { google } from 'googleapis';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';
import { createGoogleOAuthFromEnv } from '../../auth/google-oauth.js';

// Input schema for the tool
const inputSchema = z.object({
  action: z.enum([
    'list_files',
    'get_file',
    'download_file',
    'search_files',
    'read_pdf',
  ]).describe('The Drive action to perform'),
  
  // File ID (for get, download, read_pdf)
  file_id: z.string().optional().describe('File ID for get/download/read actions'),
  
  // Query parameters (for list/search)
  query: z.string().optional().describe('Search query (Drive search syntax)'),
  max_results: z.number().default(10).describe('Maximum number of files to return'),
  
  // File types filter
  mime_type: z.string().optional().describe('Filter by MIME type (e.g., application/pdf)'),
  
  // Folder filtering
  folder_id: z.string().optional().describe('List files in specific folder'),
  
  // Order by
  order_by: z.string().default('modifiedTime desc').describe('Order by field (e.g., "modifiedTime desc", "name")'),
});

type InputSchema = z.infer<typeof inputSchema>;

/**
 * Google Drive client wrapper
 */
class GoogleDriveClient {
  private oauth: ReturnType<typeof createGoogleOAuthFromEnv>;
  private pdfParseAvailable: boolean = false;
  
  constructor() {
    this.oauth = createGoogleOAuthFromEnv();
    this.checkPdfParse();
  }

  /**
   * Check if pdf-parse is available
   */
  private checkPdfParse() {
    try {
      require.resolve('pdf-parse');
      this.pdfParseAvailable = true;
    } catch {
      this.pdfParseAvailable = false;
    }
  }

  /**
   * List files
   */
  async listFiles(params: InputSchema): Promise<ToolResult> {
    try {
      const auth = await this.oauth.authenticate();
      const drive = google.drive({ version: 'v3', auth });

      // Build query
      let query = params.query || '';
      
      if (params.folder_id) {
        query += (query ? ' and ' : '') + `'${params.folder_id}' in parents`;
      }
      
      if (params.mime_type) {
        query += (query ? ' and ' : '') + `mimeType='${params.mime_type}'`;
      }
      
      // Add "not trashed" by default
      query += (query ? ' and ' : '') + 'trashed=false';

      const response = await drive.files.list({
        pageSize: params.max_results,
        q: query || undefined,
        orderBy: params.order_by,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink, owners)',
      });

      const files = response.data.files || [];
      
      if (files.length === 0) {
        return {
          success: true,
          output: '📁 No files found',
        };
      }

      let output = `📁 Found ${files.length} file(s):\n\n`;
      
      files.forEach((file, index) => {
        const sizeStr = file.size ? this.formatFileSize(parseInt(file.size)) : 'N/A';
        const owner = file.owners?.[0]?.displayName || 'Unknown';
        
        output += `${index + 1}. **${file.name}**\n`;
        output += `   📄 Type: ${this.getMimeTypeLabel(file.mimeType || '')}\n`;
        output += `   📦 Size: ${sizeStr}\n`;
        output += `   👤 Owner: ${owner}\n`;
        output += `   📅 Modified: ${file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : 'N/A'}\n`;
        output += `   🔗 Link: ${file.webViewLink}\n`;
        output += `   🆔 ID: ${file.id}\n`;
        output += '\n';
      });

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to list Drive files');
      return {
        success: false,
        error: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get file metadata
   */
  async getFile(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.file_id) {
        return {
          success: false,
          error: 'file_id is required for get_file action',
        };
      }

      const auth = await this.oauth.authenticate();
      const drive = google.drive({ version: 'v3', auth });

      const response = await drive.files.get({
        fileId: params.file_id,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, description, webViewLink, webContentLink, iconLink, owners, permissions',
      });

      const file = response.data;
      const sizeStr = file.size ? this.formatFileSize(parseInt(file.size)) : 'N/A';
      const owner = file.owners?.[0]?.displayName || 'Unknown';

      let output = `📄 **${file.name}**\n\n`;
      output += `📁 Type: ${this.getMimeTypeLabel(file.mimeType || '')}\n`;
      output += `📦 Size: ${sizeStr}\n`;
      output += `👤 Owner: ${owner}\n`;
      output += `📅 Created: ${file.createdTime ? new Date(file.createdTime).toLocaleString() : 'N/A'}\n`;
      output += `📅 Modified: ${file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : 'N/A'}\n`;
      if (file.description) output += `📝 Description: ${file.description}\n`;
      output += `🔗 View Link: ${file.webViewLink}\n`;
      if (file.webContentLink) output += `📥 Download Link: ${file.webContentLink}\n`;
      output += `🆔 ID: ${file.id}\n`;
      output += `🎨 MIME Type: ${file.mimeType}\n`;

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to get Drive file');
      return {
        success: false,
        error: `Failed to get file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Download file content
   */
  async downloadFile(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.file_id) {
        return {
          success: false,
          error: 'file_id is required for download_file action',
        };
      }

      const auth = await this.oauth.authenticate();
      const drive = google.drive({ version: 'v3', auth });

      // Get file metadata first
      const metadata = await drive.files.get({
        fileId: params.file_id,
        fields: 'name, mimeType, size',
      });

      const response = await drive.files.get(
        {
          fileId: params.file_id,
          alt: 'media',
        },
        { responseType: 'arraybuffer' }
      );

      const content = Buffer.from(response.data as ArrayBuffer);
      const sizeStr = content.length ? this.formatFileSize(content.length) : 'N/A';

      let output = `✅ File downloaded successfully\n\n`;
      output += `📄 Name: ${metadata.data.name}\n`;
      output += `📦 Size: ${sizeStr}\n`;
      output += `📁 Type: ${this.getMimeTypeLabel(metadata.data.mimeType || '')}\n`;
      output += `\n📝 **Content Preview (first 500 chars):**\n`;
      
      // Try to show preview if text-based
      if (metadata.data.mimeType?.startsWith('text/')) {
        const textContent = content.toString('utf-8');
        output += textContent.substring(0, 500);
        if (textContent.length > 500) output += '\n...';
      } else {
        output += `(Binary file - ${content.length} bytes)`;
      }

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to download Drive file');
      return {
        success: false,
        error: `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Search files
   */
  async searchFiles(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.query) {
        return {
          success: false,
          error: 'query is required for search_files action',
        };
      }

      // Build search query
      const searchQuery = `fullText contains '${params.query}' or name contains '${params.query}'`;
      
      return this.listFiles({
        ...params,
        query: searchQuery,
      });
    } catch (error) {
      logger.error(error as Error, 'Failed to search Drive files');
      return {
        success: false,
        error: `Failed to search files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Read PDF file and extract text
   */
  async readPdf(params: InputSchema): Promise<ToolResult> {
    try {
      if (!params.file_id) {
        return {
          success: false,
          error: 'file_id is required for read_pdf action',
        };
      }

      // Check if pdf-parse is installed
      if (!this.pdfParseAvailable) {
        return {
          success: false,
          error: 'PDF parsing requires the "pdf-parse" package. Install it with: npm install pdf-parse',
        };
      }

      const auth = await this.oauth.authenticate();
      const drive = google.drive({ version: 'v3', auth });

      // Get file metadata first
      const metadata = await drive.files.get({
        fileId: params.file_id,
        fields: 'name, mimeType, size',
      });

      // Verify it's a PDF
      if (metadata.data.mimeType !== 'application/pdf') {
        return {
          success: false,
          error: `File is not a PDF. MIME type: ${metadata.data.mimeType}`,
        };
      }

      // Download PDF content
      const response = await drive.files.get(
        {
          fileId: params.file_id,
          alt: 'media',
        },
        { responseType: 'arraybuffer' }
      );

      const pdfBuffer = Buffer.from(response.data as ArrayBuffer);

      // Parse PDF
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(pdfBuffer);

      let output = `📄 **${metadata.data.name}**\n\n`;
      output += `📦 Size: ${this.formatFileSize(pdfBuffer.length)}\n`;
      output += `📑 Pages: ${pdfData.numpages}\n`;
      output += `📝 Characters: ${pdfData.text.length}\n`;
      output += `\n**Extracted Text:**\n\n`;
      output += pdfData.text;

      return {
        success: true,
        output,
      };
    } catch (error) {
      logger.error(error as Error, 'Failed to read PDF from Drive');
      return {
        success: false,
        error: `Failed to read PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get human-readable label for MIME type
   */
  private getMimeTypeLabel(mimeType: string): string {
    const labels: Record<string, string> = {
      'application/pdf': 'PDF Document',
      'application/vnd.google-apps.document': 'Google Doc',
      'application/vnd.google-apps.spreadsheet': 'Google Sheet',
      'application/vnd.google-apps.presentation': 'Google Slides',
      'application/vnd.google-apps.folder': 'Folder',
      'text/plain': 'Text File',
      'image/jpeg': 'JPEG Image',
      'image/png': 'PNG Image',
      'application/zip': 'ZIP Archive',
    };
    return labels[mimeType] || mimeType;
  }
}

/**
 * Execute the tool
 */
async function execute(input: any): Promise<ToolResult> {
  // Parse and validate input to apply defaults
  const parsed = inputSchema.parse(input);
  const client = new GoogleDriveClient();

  switch (parsed.action) {
    case 'list_files':
      return client.listFiles(parsed);
    
    case 'get_file':
      return client.getFile(parsed);
    
    case 'download_file':
      return client.downloadFile(parsed);
    
    case 'search_files':
      return client.searchFiles(parsed);
    
    case 'read_pdf':
      return client.readPdf(parsed);
    
    default:
      return {
        success: false,
        error: `Unknown action: ${parsed.action}`,
      };
  }
}

/**
 * Google Drive Tool
 */
export const googleDriveTool: Tool = {
  name: 'google_drive',
  description: `Manage Google Drive files and read PDF documents.

Actions available:
- list_files: List files in Drive (with optional filters)
- get_file: Get metadata for a specific file
- download_file: Download file content
- search_files: Search for files by name or content
- read_pdf: Extract text from PDF files (requires pdf-parse package)

Drive search operators:
- Filter by folder: {action: "list_files", folder_id: "folder_id_here"}
- Filter by type: {action: "list_files", mime_type: "application/pdf"}
- Search by name/content: {action: "search_files", query: "assignment"}

PDF Reading:
- Install pdf-parse: npm install pdf-parse
- Then use: {action: "read_pdf", file_id: "file_id_here"}
- Returns full extracted text from PDF

Requirements:
- Google OAuth credentials must be configured
- Drive API must be enabled in Google Cloud Console
- For PDF reading: npm install pdf-parse

Examples:
- List PDFs: {action: "list_files", mime_type: "application/pdf", max_results: 20}
- Search files: {action: "search_files", query: "homework"}
- Read PDF: {action: "read_pdf", file_id: "1abc123..."}
- Get file info: {action: "get_file", file_id: "1abc123..."}`,
  inputSchema,
  execute,
};
