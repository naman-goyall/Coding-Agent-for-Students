/**
 * PDF Utilities
 * 
 * Provides utilities for downloading and reading PDF files from URLs
 */

import { logger } from './logger.js';

/**
 * Check if pdf-parse is available
 */
export function isPdfParseAvailable(): boolean {
  try {
    require.resolve('pdf-parse');
    return true;
  } catch {
    return false;
  }
}

/**
 * Download PDF from URL and extract text
 */
export async function readPdfFromUrl(url: string): Promise<{
  success: boolean;
  text?: string;
  pages?: number;
  error?: string;
}> {
  try {
    // Check if pdf-parse is installed
    if (!isPdfParseAvailable()) {
      return {
        success: false,
        error: 'PDF parsing requires the "pdf-parse" package. Install it with: npm install pdf-parse',
      };
    }

    logger.debug(`Downloading PDF from: ${url}`);

    // Download PDF
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }

    // Get content type
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('pdf')) {
      logger.warn(`Content-Type is not PDF: ${contentType}`);
    }

    // Get PDF buffer
    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    logger.debug(`Downloaded PDF: ${pdfBuffer.length} bytes`);

    // Parse PDF
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(pdfBuffer);

    return {
      success: true,
      text: pdfData.text,
      pages: pdfData.numpages,
    };
  } catch (error) {
    logger.error(error as Error, 'Failed to read PDF from URL');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
