/**
 * Tool mention definitions for @mention autocomplete
 * Defines available tools that can be mentioned to incentivize agent usage
 */

export interface ToolMention {
  name: string;
  description: string;
  icon: string;
  capabilities: string[];
  usage: string;
}

/**
 * Available tools for @mention
 * These tools can be mentioned to signal to the agent which tools to use
 */
export const MENTIONABLE_TOOLS: ToolMention[] = [
  {
    name: 'canvas',
    description: 'Canvas LMS integration',
    icon: '📚',
    capabilities: [
      'List your courses',
      'Get assignments and due dates',
      'View grades',
      'Check announcements',
      'Access course materials',
    ],
    usage: 'Mention @canvas when asking about your courses, assignments, or grades',
  },
  {
    name: 'deepwiki',
    description: 'GitHub repo documentation',
    icon: '📖',
    capabilities: [
      'Read documentation for any public GitHub repo',
      'Ask questions about open source projects',
      'Understand library APIs',
      'Learn from code examples',
    ],
    usage: 'Mention @deepwiki when learning about GitHub repositories or libraries',
  },
  {
    name: 'websearch',
    description: 'Web search',
    icon: '🔍',
    capabilities: [
      'Search the web for information',
      'Find recent articles and resources',
      'Look up documentation',
      'Research topics',
    ],
    usage: 'Mention @websearch when you need current information from the web',
  },
  {
    name: 'googlecal',
    description: 'Google Calendar',
    icon: '📅',
    capabilities: [
      'View your schedule and events',
      'Create new calendar events',
      'Update existing events',
      'Check upcoming deadlines',
      'Find available time slots',
    ],
    usage: 'Mention @googlecal when asking about your schedule or calendar',
  },
  {
    name: 'googledocs',
    description: 'Google Docs',
    icon: '📝',
    capabilities: [
      'Create new documents',
      'Read document content',
      'Update existing documents',
      'Search your documents',
      'Organize notes and assignments',
    ],
    usage: 'Mention @googledocs when working with documents or notes',
  },
  {
    name: 'gmail',
    description: 'Gmail',
    icon: '📧',
    capabilities: [
      'List and read email messages',
      'Send new emails',
      'Search messages with Gmail syntax',
      'Mark messages as read/unread',
      'Delete messages',
      'Organize inbox',
    ],
    usage: 'Mention @gmail when working with emails or inbox management',
  },
  {
    name: 'googledrive',
    description: 'Google Drive',
    icon: '📁',
    capabilities: [
      'List and search files',
      'Get file metadata and details',
      'Download file content',
      'Read PDF documents',
      'Filter by file type or folder',
      'Access shared files',
    ],
    usage: 'Mention @googledrive when working with files or documents in Drive',
  },
];

/**
 * Get tool by name
 */
export function getToolByName(name: string): ToolMention | undefined {
  return MENTIONABLE_TOOLS.find(tool => tool.name.toLowerCase() === name.toLowerCase());
}

/**
 * Filter tools based on query
 */
export function filterTools(query: string): ToolMention[] {
  if (!query) {
    return MENTIONABLE_TOOLS;
  }

  const lowerQuery = query.toLowerCase();
  return MENTIONABLE_TOOLS.filter(tool =>
    tool.name.toLowerCase().includes(lowerQuery) ||
    tool.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Format tool description for agent context
 * This is what gets added to the prompt when a tool is mentioned
 */
export function formatToolForContext(tool: ToolMention): string {
  return `
Tool Available: ${tool.icon} ${tool.name}

Description: ${tool.description}

Capabilities:
${tool.capabilities.map(cap => `- ${cap}`).join('\n')}

Usage: ${tool.usage}

You can use the ${tool.name}_* tools to help the user with ${tool.name}-related tasks.
`.trim();
}

/**
 * Get all tool names for parser validation
 */
export function getAllToolNames(): string[] {
  return MENTIONABLE_TOOLS.map(tool => tool.name);
}
