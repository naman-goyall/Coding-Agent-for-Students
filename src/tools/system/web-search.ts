import { z } from 'zod';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';

const inputSchema = z.object({
  query: z.string().describe('Search query'),
  num_results: z.number().default(5).describe('Number of results to return'),
});

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function duckDuckGoSearch(query: string, numResults: number): Promise<SearchResult[]> {
  try {
    // Use DuckDuckGo HTML search (no API key needed)
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const html = await response.text();

    // Simple HTML parsing for DuckDuckGo results
    const results: SearchResult[] = [];
    const resultRegex =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/g;

    let match;
    let count = 0;
    while ((match = resultRegex.exec(html)) !== null && count < numResults) {
      results.push({
        url: match[1].replace(/^\/\/duckduckgo\.com\/l\/\?.*uddg=/, ''),
        title: match[2].trim(),
        snippet: match[3].trim(),
      });
      count++;
    }

    return results;
  } catch (error) {
    logger.error(error as Error, 'DuckDuckGo search failed');
    throw error;
  }
}

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    const { query, num_results } = params;

    logger.debug(`Searching web for: ${query}`, { num_results });

    const results = await duckDuckGoSearch(query, num_results);

    if (results.length === 0) {
      return {
        success: true,
        output: `No results found for: ${query}`,
      };
    }

    // Format results
    const formattedResults = results
      .map((result, idx) => {
        return `${idx + 1}. **${result.title}**
   URL: ${result.url}
   ${result.snippet}`;
      })
      .join('\n\n');

    return {
      success: true,
      output: `Search results for "${query}":\n\n${formattedResults}`,
    };
  } catch (error) {
    logger.error(error as Error, 'web_search error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during web search',
    };
  }
}

export const webSearchTool: Tool = {
  name: 'web_search',
  description:
    'Search the web for information using DuckDuckGo. Returns titles, URLs, and snippets. Use this to find documentation, tutorials, error solutions, or current information.',
  inputSchema,
  execute,
};

