/**
 * HTML Parser Utilities
 * 
 * Provides utilities for parsing HTML content and extracting information
 */

export interface ExtractedLink {
  url: string;
  text: string;
  type: 'pdf' | 'doc' | 'other';
}

/**
 * Extract all links from HTML content
 */
export function extractLinksFromHtml(html: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  
  // Regex to match anchor tags: <a href="url">text</a>
  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const url = match[1];
    // Strip HTML tags from link text
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    
    // Determine link type
    let type: 'pdf' | 'doc' | 'other' = 'other';
    const urlLower = url.toLowerCase();
    
    if (urlLower.endsWith('.pdf') || urlLower.includes('.pdf?') || urlLower.includes('/pdf/')) {
      type = 'pdf';
    } else if (urlLower.endsWith('.doc') || urlLower.endsWith('.docx') || 
               urlLower.includes('.doc?') || urlLower.includes('.docx?')) {
      type = 'doc';
    }
    
    links.push({ url, text, type });
  }
  
  return links;
}

/**
 * Extract PDF links from HTML content
 */
export function extractPdfLinks(html: string): ExtractedLink[] {
  const allLinks = extractLinksFromHtml(html);
  return allLinks.filter(link => link.type === 'pdf');
}

/**
 * Strip HTML tags and return plain text
 */
export function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')  // Replace <br> with newlines
    .replace(/<\/p>/gi, '\n\n')      // Replace </p> with double newlines
    .replace(/<[^>]*>/g, '')         // Remove all other HTML tags
    .replace(/&nbsp;/g, ' ')         // Replace &nbsp; with space
    .replace(/&amp;/g, '&')          // Replace &amp; with &
    .replace(/&lt;/g, '<')           // Replace &lt; with <
    .replace(/&gt;/g, '>')           // Replace &gt; with >
    .replace(/&quot;/g, '"')         // Replace &quot; with "
    .trim();
}
