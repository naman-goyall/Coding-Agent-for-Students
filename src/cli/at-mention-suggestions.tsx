/**
 * At-mention autocomplete suggestions component
 * Shows files, directories, and tools when user types @
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { FileEntry } from '../utils/file-scanner.js';
import { type ToolMention, MENTIONABLE_TOOLS, filterTools } from './tool-mentions.js';

// Re-export for convenience
export { MENTIONABLE_TOOLS, filterTools };
export type { ToolMention };

export interface AtMentionSuggestionsProps {
  files: FileEntry[];
  tools: ToolMention[];
  selectedIndex: number;
  query: string;
}

/**
 * Combine and sort file and tool suggestions
 */
export function combineSuggestions(
  files: FileEntry[],
  tools: ToolMention[],
  maxResults: number = 15
): Array<{ type: 'file' | 'directory' | 'tool'; data: FileEntry | ToolMention }> {
  const combined: Array<{ type: 'file' | 'directory' | 'tool'; data: FileEntry | ToolMention }> = [];

  // Add tools first (they're usually what users want)
  for (const tool of tools) {
    combined.push({ type: 'tool', data: tool });
  }

  // Add files and directories
  for (const file of files) {
    combined.push({ type: file.type, data: file });
  }

  return combined.slice(0, maxResults);
}

/**
 * At-mention suggestions component
 */
export const AtMentionSuggestions: React.FC<AtMentionSuggestionsProps> = ({
  files,
  tools,
  selectedIndex,
}) => {
  const suggestions = combineSuggestions(files, tools);

  if (suggestions.length === 0) {
    return (
      <Box paddingLeft={1}>
        <Text color="gray">No matches found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingLeft={1}>
      {suggestions.map((suggestion, index) => {
        const isSelected = index === selectedIndex;

        if (suggestion.type === 'tool') {
          const tool = suggestion.data as ToolMention;
          return (
            <Box key={`tool-${tool.name}`} flexDirection="column">
              <Box>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {tool.icon} {tool.name.padEnd(16)}
                </Text>
                <Text color="gray">{tool.description}</Text>
              </Box>
              {isSelected && (
                <Box paddingLeft={2}>
                  <Text color="gray" dimColor>
                    {tool.capabilities.slice(0, 2).join(' • ')}
                  </Text>
                </Box>
              )}
            </Box>
          );
        } else {
          const file = suggestion.data as FileEntry;
          const icon = suggestion.type === 'directory' ? '📁' : '📄';
          const displayPath = suggestion.type === 'directory' ? `${file.path}/` : file.path;

          return (
            <Box key={`file-${file.path}`}>
              <Text color={isSelected ? 'cyan' : 'white'}>
                {icon} {displayPath}
              </Text>
            </Box>
          );
        }
      })}
    </Box>
  );
};
