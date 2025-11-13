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

interface TavilyResponse {
  results: Array<{
    title?: string;
    url?: string;
    content?: string;
    description?: string;
  }>;
}

// Tavily API configuration
let tavilyApiKey: string | null = null;

export function setTavilyApiKey(apiKey: string): void {
  tavilyApiKey = apiKey;
}

async function tavilySearch(query: string, numResults: number): Promise<SearchResult[]> {
  try {
    if (!tavilyApiKey) {
      throw new Error('Tavily API key not configured. Please set TAVILY_API_KEY in your environment or config.');
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: query,
        search_depth: 'basic',
        include_answer: false,
        max_results: numResults,
        include_domains: [],
        exclude_domains: [],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as TavilyResponse;
    
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((result) => ({
      title: result.title || 'Untitled',
      url: result.url || '',
      snippet: result.content || result.description || 'No description available',
    }));
  } catch (error) {
    logger.error(error as Error, 'Tavily search failed');
    throw error;
  }
}

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    const { query, num_results } = params;

    logger.debug(`Searching web for: ${query}`, { num_results });

    const results = await tavilySearch(query, num_results);

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
    'Search the web for information using Tavily API. Returns titles, URLs, and snippets. Use this to find documentation, tutorials, error solutions, or current information. Requires TAVILY_API_KEY to be configured.',
  inputSchema,
  execute,
};

