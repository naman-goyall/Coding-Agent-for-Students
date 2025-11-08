import React, { useState } from 'react';
import { Box, Text, useInput, useApp, Static } from 'ink';
import type { AgentController } from '../agent/controller.js';
import { executeSlashCommand, type CommandContext } from './slash-commands.js';
import { CommandSuggestions, getCommandSuggestions } from './command-suggestions.js';
import { AtMentionSuggestions, filterTools } from './at-mention-suggestions.js';
import { getCurrentAtMention, parseAtMentions } from './at-mention-parser.js';
import { getMatchingFiles, type FileEntry } from '../utils/file-scanner.js';
import { buildContextFromMentions, formatMessageWithContext } from '../agent/context-builder.js';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'file_change';
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: string;
  fileName?: string;
  lineChanges?: string;
  diffContent?: string;
  executionTime?: string;
}

interface ChatUIProps {
  agent: AgentController;
}

const SPARKY_ASCII = `
 ███████╗██████╗  █████╗ ██████╗ ██╗  ██╗██╗   ██╗
 ██╔════╝██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝╚██╗ ██╔╝
 ███████╗██████╔╝███████║██████╔╝█████╔╝  ╚████╔╝ 
 ╚════██║██╔═══╝ ██╔══██║██╔══██╗██╔═██╗   ╚██╔╝  
 ███████║██║     ██║  ██║██║  ██║██║  ██╗   ██║   
 ╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
`;

const STARTUP_TIPS = [
  '1. Ask questions, edit files, or run commands.',
  '2. Be specific for the best results.',
  '3. The agent remembers context within your session.',
  '4. Type /help to see available commands (/clear, /exit, etc.).',
  '5. Press Ctrl+C to exit at any time.',
];

export const ChatUI: React.FC<ChatUIProps> = ({ agent }) => {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentToolUse, setCurrentToolUse] = useState<string | null>(null);
  const [totalTokens, setTotalTokens] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [showAtMentions, setShowAtMentions] = useState(false);
  const [atMentionFiles, setAtMentionFiles] = useState<FileEntry[]>([]);
  const [atMentionQuery, setAtMentionQuery] = useState('');

  // Helper function to render input with colored @mentions
  const renderInputWithMentions = (text: string, showCursor: boolean = false) => {
    const mentions = parseAtMentions(text);
    
    if (mentions.length === 0) {
      return (
        <>
          <Text color="#ffffff">{text}</Text>
          {showCursor && <Text color="yellow" bold>█</Text>}
        </>
      );
    }
    
    // Build a single string with all parts to avoid wrapping issues
    // We'll use a Box with inline Text components that wrap properly
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    mentions.forEach((mention, i) => {
      // Add text before mention
      if (mention.startIndex > lastIndex) {
        parts.push(
          <Text key={`text-${i}`} color="#ffffff">
            {text.substring(lastIndex, mention.startIndex)}
          </Text>
        );
      }
      
      // Only color the mention if it's complete (followed by space)
      // Don't color if it's at the end of input (still being typed)
      const isComplete = mention.endIndex < text.length && text[mention.endIndex] === ' ';
      
      // Add colored mention (orange to match theme) only if complete
      parts.push(
        <Text key={`mention-${i}`} color={isComplete ? "#ff8800" : "#ffffff"}>
          {mention.raw}
        </Text>
      );
      
      lastIndex = mention.endIndex;
    });
    
    // Add remaining text after last mention
    if (lastIndex < text.length) {
      parts.push(
        <Text key="text-end" color="#ffffff">
          {text.substring(lastIndex)}
        </Text>
      );
    }
    
    // Add cursor at the end if needed
    if (showCursor) {
      parts.push(
        <Text key="cursor" color="yellow" bold>█</Text>
      );
    }
    
    // Wrap in a Box to handle wrapping properly
    return <Box flexWrap="wrap">{parts}</Box>;
  };

  useInput((inputChar, key) => {
    if (isProcessing) return;

    // Handle escape key to close suggestions
    if (key.escape) {
      if (showSuggestions) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(0);
        return;
      }
    }

    // Handle arrow keys for suggestion navigation (slash commands)
    if (showSuggestions && !showAtMentions) {
      const suggestions = getCommandSuggestions(input);
      
      if (key.upArrow) {
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      
      if (key.downArrow) {
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      // Handle tab or enter to select suggestion
      if (key.tab || key.return) {
        if (suggestions.length > 0) {
          const selected = suggestions[selectedSuggestionIndex];
          setInput(`/${selected.name}`);
          setShowSuggestions(false);
          setSelectedSuggestionIndex(0);
          return;
        }
      }
    }

    // Handle arrow keys for @mention navigation
    if (showAtMentions) {
      const tools = filterTools(atMentionQuery);
      const totalSuggestions = tools.length + atMentionFiles.length;
      
      if (key.upArrow) {
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : totalSuggestions - 1
        );
        return;
      }
      
      if (key.downArrow) {
        setSelectedSuggestionIndex(prev => 
          prev < totalSuggestions - 1 ? prev + 1 : 0
        );
        return;
      }
      
      // Handle tab or enter to select @mention
      if (key.tab || key.return) {
        if (totalSuggestions > 0) {
          const currentMention = getCurrentAtMention(input, input.length);
          if (currentMention) {
            let selectedItem: string;
            
            // Determine if selection is a tool or file
            if (selectedSuggestionIndex < tools.length) {
              // Selected a tool
              selectedItem = tools[selectedSuggestionIndex].name;
            } else {
              // Selected a file
              const fileIndex = selectedSuggestionIndex - tools.length;
              const file = atMentionFiles[fileIndex];
              selectedItem = file.type === 'directory' ? `${file.path}/` : file.path;
            }
            
            // Replace the current @mention with the selected item + space
            const beforeMention = input.substring(0, currentMention.startIndex);
            const afterMention = input.substring(input.length);
            setInput(`${beforeMention}@${selectedItem} ${afterMention}`);
            setShowAtMentions(false);
            setSelectedSuggestionIndex(0);
            return;
          }
        }
      }
    }

    if (key.return) {
      if (input.trim()) {
        handleSubmit(input.trim());
        setInput('');
        setShowSuggestions(false);
        setSelectedSuggestionIndex(0);
      }
    } else if (key.backspace || key.delete) {
      setInput(prev => {
        const newInput = prev.slice(0, -1);
        
        // Show suggestions if we're back to just '/'
        if (newInput === '/') {
          setShowSuggestions(true);
          setSelectedSuggestionIndex(0);
        } else if (newInput === '' || !newInput.startsWith('/')) {
          // Hide suggestions if we delete the forward slash completely
          setShowSuggestions(false);
          setSelectedSuggestionIndex(0);
        }
        
        // Check for @mention
        const currentMention = getCurrentAtMention(newInput, newInput.length);
        if (currentMention) {
          const query = currentMention.text.slice(1); // Remove @
          setAtMentionQuery(query);
          setShowAtMentions(true);
          setSelectedSuggestionIndex(0);
          
          // Fetch matching files
          const workspaceRoot = process.cwd();
          const files = getMatchingFiles(workspaceRoot, query, 10);
          setAtMentionFiles(files);
        } else {
          setShowAtMentions(false);
        }
        
        return newInput;
      });
    } else if (!key.ctrl && !key.meta && inputChar) {
      setInput(prev => {
        const newInput = prev + inputChar;
        
        // Show suggestions when user types forward slash
        if (newInput === '/') {
          setShowSuggestions(true);
          setSelectedSuggestionIndex(0);
        } else if (newInput.startsWith('/') && showSuggestions) {
          // Reset selection when query changes
          setSelectedSuggestionIndex(0);
        }
        
        // Check for @mention
        const currentMention = getCurrentAtMention(newInput, newInput.length);
        if (currentMention) {
          const query = currentMention.text.slice(1); // Remove @
          setAtMentionQuery(query);
          setShowAtMentions(true);
          setSelectedSuggestionIndex(0);
          
          // Fetch matching files
          const workspaceRoot = process.cwd();
          const files = getMatchingFiles(workspaceRoot, query, 10);
          setAtMentionFiles(files);
        } else {
          setShowAtMentions(false);
        }
        
        return newInput;
      });
    }
  });

  const parseFileChanges = (result: string, toolName: string): Array<{fileName: string, lineChanges: string, diffContent?: string}> => {
    const changes: Array<{fileName: string, lineChanges: string, diffContent?: string}> = [];
    
    // Match patterns for different tools
    if (toolName === 'write_file' || toolName === 'edit_file' || toolName === 'search_replace') {
      // Look for file paths and change counts
      const fileMatch = result.match(/(?:Modified|Created|Edited|Updated)\s+file:\s*(.+?)(?:\n|$)/i) ||
                        result.match(/(?:Modified|Created|Edited|Updated)\s+(.+?)(?:\n|:)/);
      const changesMatch = result.match(/\+(\d+)\s+-(\d+)/);
      
      if (fileMatch) {
        const fileName = fileMatch[1].trim().replace(/\s+\(.*?\)$/, '');
        let lineChanges = '';
        
        if (changesMatch) {
          const added = parseInt(changesMatch[1]);
          const removed = parseInt(changesMatch[2]);
          lineChanges = `+${added} -${removed}`;
        } else {
          // Check for just "Created" with size
          const sizeMatch = result.match(/Size:\s+(\d+)\s+bytes/);
          if (sizeMatch && result.includes('Created')) {
            const lines = Math.ceil(parseInt(sizeMatch[1]) / 50);
            lineChanges = '+' + lines;
          }
        }
        
        // Extract diff content
        const diffMatch = result.match(/---[\s\S]*?\+\+\+[\s\S]*?(?=\n\n|\n[A-Z]|$)/);
        const diffContent = diffMatch ? diffMatch[0] : undefined;
        
        changes.push({ fileName, lineChanges, diffContent });
      }
    } else if (toolName === 'apply_patch') {
      const fileMatch = result.match(/Applied patch to\s+(.+?)(?:\n|$)/);
      const changesMatch = result.match(/Changes:\s+\+(\d+)\s+-(\d+)/);
      
      if (fileMatch && changesMatch) {
        const diffMatch = result.match(/---[\s\S]*?\+\+\+[\s\S]*?(?=\n\n|\n[A-Z]|$)/);
        changes.push({
          fileName: fileMatch[1].trim(),
          lineChanges: `+${changesMatch[1]} -${changesMatch[2]}`,
          diffContent: diffMatch ? diffMatch[0] : undefined,
        });
      }
    }
    
    return changes;
  };

  const handleSubmit = async (userMessage: string) => {
    // Check if it's a slash command
    if (userMessage.startsWith('/')) {
      // Show the command as a user message first
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      const commandContext: CommandContext = {
        clearMessages: () => {
          setMessages([]);
          agent.clearHistory();
          setTotalTokens(0);
        },
        exit: () => {
          exit();
        },
        getTokenCount: () => totalTokens,
      };

      const result = executeSlashCommand(userMessage, commandContext);
      
      if (result) {
        if (result.type === 'exit') {
          // Show goodbye message briefly before exiting
          if (result.message) {
            setMessages(prev => [...prev, { role: 'system', content: result.message || '' }]);
          }
          // Exit after a brief delay to show the message
          setTimeout(() => exit(), 500);
          return;
        } else if (result.type === 'clear') {
          // Clear was already executed by the command, just show confirmation
          if (result.message) {
            setMessages([{ role: 'system', content: result.message || '' }]);
          }
          return;
        } else if (result.message) {
          // Show command result
          setMessages(prev => [...prev, { role: 'system', content: result.message || '' }]);
          return;
        }
      }
      return;
    }

    // Regular chat message - check for @mentions and build context
    const workspaceRoot = process.cwd();
    const { context, attachments } = buildContextFromMentions(userMessage, workspaceRoot);
    
    // Format message with context if there are @mentions
    const messageToSend = context ? formatMessageWithContext(userMessage, context) : userMessage;
    
    // Show original user message in UI (without context)
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // If there are attachments, show what was loaded
    if (attachments.length > 0) {
      const attachmentSummary = attachments
        .map(att => {
          if (att.type === 'file') {
            return att.lineRange 
              ? `📄 ${att.path} (lines ${att.lineRange.start}-${att.lineRange.end})`
              : `📄 ${att.path}`;
          } else if (att.type === 'directory') {
            return `📁 ${att.path}`;
          } else if (att.type === 'tool') {
            return `🔧 ${att.toolName}`;
          }
          return '';
        })
        .filter(Boolean)
        .join(', ');
      
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `Loaded: ${attachmentSummary}` 
      }]);
    }
    
    setIsProcessing(true);

    try {
      let assistantMessage = '';
      let currentAssistantIndex = -1;

      // Stream response (send messageToSend which includes context)
      for await (const chunk of agent.chat(messageToSend)) {
        if (chunk.type === 'content' && chunk.content) {
          assistantMessage += chunk.content;
          // Update the assistant message in real-time
          setMessages(prev => {
            const newMessages = [...prev];
            if (currentAssistantIndex === -1) {
              // First content chunk - create assistant message
              newMessages.push({ role: 'assistant', content: assistantMessage });
              currentAssistantIndex = newMessages.length - 1;
            } else {
              // Update existing assistant message
              newMessages[currentAssistantIndex].content = assistantMessage;
            }
            return newMessages;
          });
        } else if (chunk.type === 'tool_use' && chunk.toolName) {
          // Show tool being used
          setCurrentToolUse(chunk.toolName);
          
          // Only add a new tool message if the last message isn't already the same tool
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            const isDuplicateTool = lastMessage?.role === 'tool' && 
                                   lastMessage?.toolName === chunk.toolName &&
                                   !lastMessage?.executionTime; // Not yet completed
            
            if (isDuplicateTool) {
              // Don't add duplicate tool message
              return prev;
            }
            
            return [
              ...prev,
              {
                role: 'tool',
                content: `Using ${chunk.toolName}...`,
                toolName: chunk.toolName,
                toolInput: chunk.toolInput,
              },
            ];
          });
          
          // Reset assistant message for next text block
          assistantMessage = '';
          currentAssistantIndex = -1;
        } else if (chunk.type === 'tool_result') {
          setCurrentToolUse(null);
          const result = chunk.toolResult || '';
          
          // Parse file changes from tool results
          const fileChanges = parseFileChanges(result, chunk.toolName || '');
          
          setMessages(prev => {
            const newMessages = [...prev];
            // Update the last tool message with execution time and output
            const lastToolIndex = newMessages.findLastIndex(m => m.role === 'tool');
            if (lastToolIndex !== -1) {
              // Extract execution time from result if available
              const timeMatch = result.match(/(\d+)s$/);
              newMessages[lastToolIndex].executionTime = timeMatch ? timeMatch[1] + 's' : undefined;
              
              // Store the output for all tools
              const output = result.replace(/\s+\d+s$/, '').trim();
              newMessages[lastToolIndex].toolOutput = output;
            }
            
            // Add file change notifications only for tools that don't show their own content
            // Skip for edit_file and write_file since they show content in their bordered box
            const toolName = chunk.toolName || '';
            const shouldShowFileChanges = toolName !== 'edit_file' && toolName !== 'write_file';
            
            if (fileChanges.length > 0 && shouldShowFileChanges) {
              fileChanges.forEach(change => {
                newMessages.push({
                  role: 'file_change',
                  content: change.fileName,
                  fileName: change.fileName,
                  lineChanges: change.lineChanges,
                  diffContent: change.diffContent,
                });
              });
            }
            
            return newMessages;
          });
        } else if (chunk.type === 'error') {
          setMessages(prev => [
            ...prev,
            { role: 'system', content: `❌ Error: ${chunk.error}` },
          ]);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => [...prev, { role: 'system', content: `❌ Error: ${errorMsg}` }]);
    } finally {
      setIsProcessing(false);
      setCurrentToolUse(null);
      // Update token count after conversation
      setTotalTokens(agent.getTokenEstimate());
    }
  };

  return (
    <Box flexDirection="column">
      {/* Startup Banner - Static, won't re-render */}
      <Static items={[{ id: 'banner' }]}>
        {(item) => (
          <Box key={item.id} flexDirection="column" marginBottom={1}>
            <Text color="yellow" bold>
              {SPARKY_ASCII}
            </Text>
            <Box marginTop={1} marginBottom={1}>
              <Text color="#ffffff" bold>AI coding assistant for students • Powered by Claude Sonnet 4.5</Text>
            </Box>
            <Box flexDirection="column">
              <Text color="#ff8800" bold>Tips for getting started:</Text>
              {STARTUP_TIPS.map((tip, i) => (
                <Text key={i} color="#ffffff">{tip}</Text>
              ))}
            </Box>
          </Box>
        )}
      </Static>

      {/* Messages */}
      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, i) => (
          <MessageDisplay key={i} message={msg} />
        ))}
      </Box>

      {/* Input area with border */}
      <Box flexDirection="column">
        <Box borderStyle="round" borderColor="#ff8800" paddingX={1} marginBottom={1}>
          {isProcessing ? (
            <Box>
              {currentToolUse ? (
                <Text color="#ff8800">Executing: {currentToolUse}...</Text>
              ) : (
                <Text color="#ff8800">Thinking...</Text>
              )}
            </Box>
          ) : (
            <Box>
              <Text color="#ff8800" bold>→ </Text>
              {input.length > 0 ? (
                renderInputWithMentions(input, true)
              ) : (
                <>
                  <Text color="yellow" bold>█</Text>
                  <Text color="gray"> Type your message or /help for commands</Text>
                </>
              )}
            </Box>
          )}
        </Box>
        
        {/* Command Suggestions - below input */}
        {showSuggestions && input.startsWith('/') && !isProcessing && !showAtMentions && (
          <CommandSuggestions 
            query={input} 
            selectedIndex={selectedSuggestionIndex}
          />
        )}
        
        {/* At-mention Suggestions - below input */}
        {showAtMentions && !isProcessing && (
          <AtMentionSuggestions 
            files={atMentionFiles}
            tools={filterTools(atMentionQuery)}
            selectedIndex={selectedSuggestionIndex}
            query={atMentionQuery}
          />
        )}
        
        {/* Status line below input */}
        <Box>
          <Text color="white">{process.cwd()}</Text>
          <Text color="white"> • </Text>
          <Text color="#ff8800" bold>{totalTokens} tokens used</Text>
        </Box>
      </Box>
    </Box>
  );
};

interface MessageDisplayProps {
  message: Message;
}

// Helper function to render file content with line numbers
const renderFileContent = (content: string, maxLines: number = 20) => {
  const lines = content.split('\n');
  const displayLines = lines.slice(0, maxLines);
  const hasMore = lines.length > maxLines;
  
  return (
    <Box flexDirection="column" paddingLeft={3}>
      {displayLines.map((line: string, idx: number) => (
        <Box key={idx}>
          <Text color="gray">{String(idx + 1).padStart(4, ' ')} </Text>
          <Text color="white">{line}</Text>
        </Box>
      ))}
      {hasMore && (
        <Text color="gray">   ... ({lines.length - maxLines} more lines)</Text>
      )}
    </Box>
  );
};

// Helper function to render diff content
const renderDiff = (output: string) => {
  // Extract diff content from the output
  const diffMatch = output.match(/@@[\s\S]*$/m);
  if (!diffMatch) return null;
  
  const diffLines = diffMatch[0].split('\n').slice(0, 30); // Limit to 30 lines
  const hasMore = diffMatch[0].split('\n').length > 30;
  
  return (
    <Box flexDirection="column" paddingLeft={3}>
      {diffLines.map((line: string, idx: number) => {
        let color = 'white';
        
        if (line.startsWith('@@')) {
          color = 'cyan';
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          color = 'green';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          color = 'red';
        } else if (line.startsWith('+++') || line.startsWith('---')) {
          color = 'gray';
        }
        
        return (
          <Box key={idx}>
            <Text color={color as any}>{line}</Text>
          </Box>
        );
      })}
      {hasMore && (
        <Text color="gray">   ... (diff truncated)</Text>
      )}
    </Box>
  );
};

const MessageDisplay: React.FC<MessageDisplayProps> = ({ message }) => {
  const getColor = (role: string) => {
    switch (role) {
      case 'user':
        return '#666666';
      case 'assistant':
        return '#ffffff';
      case 'system':
        return 'gray';
      case 'tool':
        return '#ff8800';
      case 'file_change':
        return '#ff8800';
      default:
        return 'white';
    }
  };

  const getPrefix = (role: string) => {
    switch (role) {
      case 'user':
        return '> ';
      case 'assistant':
        return '✦ ';
      case 'system':
        return '';
      case 'tool':
        return '';
      case 'file_change':
        return '';
      default:
        return '';
    }
  };

  // Special rendering for all tool executions
  if (message.role === 'tool' && message.toolName) {
    // Get a friendly tool name and summary
    const getToolDisplay = (toolName: string, toolInput: any, toolOutput?: string) => {
      switch (toolName) {
        case 'execute_bash':
          return {
            name: 'ExecuteBash',
            summary: toolInput?.command || 'Executed command',
          };
        case 'list_files':
          // Try to count items from the output
          const lines = toolOutput?.split('\n') || [];
          const itemCount = lines.filter(l => l.trim() && !l.includes('Listed')).length;
          return {
            name: 'ListFiles',
            summary: `Listed ${itemCount} item(s).`,
          };
        case 'read_file':
          // Extract file info from output
          const filePath = toolInput?.path || 'file';
          const sizeMatch = toolOutput?.match(/Size: ([^\n]+)/);
          const fileSize = sizeMatch ? sizeMatch[1] : '';
          const lineRangeMatch = toolOutput?.match(/lines (\d+)-(\d+|end)/);
          const lineRange = lineRangeMatch ? ` (lines ${lineRangeMatch[1]}-${lineRangeMatch[2]})` : '';
          
          return {
            name: 'ReadFile',
            summary: fileSize ? `Read ${filePath}${lineRange}\nSize: ${fileSize}` : `Read ${filePath}${lineRange}`,
          };
        case 'write_file':
          const writeFilePath = toolInput?.path || 'file';
          const writeAction = toolOutput?.includes('Created') ? 'Created' : 'Updated';
          const writeSizeMatch = toolOutput?.match(/(\d+) bytes/);
          const writeSize = writeSizeMatch ? writeSizeMatch[1] : '';
          return {
            name: 'WriteFile',
            summary: `${writeAction} ${writeFilePath}${writeSize ? ` (${writeSize} bytes)` : ''}`,
          };
        case 'edit_file':
          const editFilePath = toolInput?.path || 'file';
          const editCount = toolInput?.edits?.length || 0;
          return {
            name: 'EditFile',
            summary: `Applied ${editCount} edit(s) to ${editFilePath}`,
          };
        case 'search_files':
          return {
            name: 'SearchFiles',
            summary: toolInput?.query || 'Searched files',
          };
        case 'canvas':
          const canvasAction = toolInput?.action || 'unknown';
          let canvasSummary = '';
          switch (canvasAction) {
            case 'list_courses':
              canvasSummary = 'Fetching your Canvas courses...';
              break;
            case 'list_assignments':
              const courseName = toolInput?.course_id ? `for course ${toolInput.course_id}` : '';
              canvasSummary = `Listing assignments ${courseName}`;
              break;
            case 'get_assignment':
              canvasSummary = `Getting assignment details (ID: ${toolInput?.assignment_id || 'unknown'})`;
              break;
            default:
              canvasSummary = `Action: ${canvasAction}`;
          }
          return {
            name: 'canvas',
            summary: canvasSummary,
          };
        case 'notion_calendar':
          const notionAction = toolInput?.action || 'unknown';
          let notionSummary = '';
          switch (notionAction) {
            case 'create_event':
              notionSummary = `Creating event: "${toolInput?.title || 'Untitled'}"`;
              if (toolInput?.start_date) {
                notionSummary += `\nDue: ${toolInput.start_date}`;
              }
              break;
            case 'list_events':
              notionSummary = 'Listing calendar events...';
              break;
            case 'get_event':
              notionSummary = `Getting event (ID: ${toolInput?.event_id || 'unknown'})`;
              break;
            case 'update_event':
              notionSummary = `Updating event (ID: ${toolInput?.event_id || 'unknown'})`;
              break;
            case 'delete_event':
              notionSummary = `Deleting event (ID: ${toolInput?.event_id || 'unknown'})`;
              break;
            default:
              notionSummary = `Action: ${notionAction}`;
          }
          return {
            name: 'notion_calendar',
            summary: notionSummary,
          };
        default:
          return {
            name: toolName,
            summary: message.content || 'Executed',
          };
      }
    };

    const { name, summary } = getToolDisplay(message.toolName, message.toolInput, message.toolOutput);
    
    // Split summary into lines for multi-line display
    const summaryLines = summary.split('\n');
    
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box borderStyle="round" borderColor="gray" paddingX={1}>
          <Box flexDirection="column">
            <Box>
              <Text color="green">✓ </Text>
              <Text color="white" bold>{name}</Text>
              {message.toolInput && typeof message.toolInput === 'object' && (
                <>
                  {('path' in message.toolInput) && message.toolName !== 'write_file' && message.toolName !== 'edit_file' && (
                    <Text color="gray"> {message.toolInput.path}</Text>
                  )}
                  {('command' in message.toolInput) && (
                    <Text color="gray"> {message.toolInput.command}</Text>
                  )}
                </>
              )}
            </Box>
            <Box flexDirection="column" paddingLeft={3}>
              {summaryLines.map((line: string, idx: number) => (
                <Text key={idx} color="gray">{line}</Text>
              ))}
            </Box>
            
            {/* Show file content for write_file */}
            {message.toolName === 'write_file' && message.toolInput?.content && (
              <Box flexDirection="column" marginTop={1}>
                {renderFileContent(message.toolInput.content, 10)}
              </Box>
            )}
            
            {/* Show diff for edit_file */}
            {message.toolName === 'edit_file' && message.toolOutput && (
              <Box flexDirection="column" marginTop={1}>
                {renderDiff(message.toolOutput)}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  // Special rendering for file changes
  if (message.role === 'file_change') {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color="green" bold>{message.fileName}</Text>
          {message.lineChanges && (
            <Text color="green"> {message.lineChanges}</Text>
          )}
        </Box>
        {message.diffContent && (
          <Box flexDirection="column" paddingLeft={2}>
            {message.diffContent.split('\n').map((line, idx) => {
              let color = 'white';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                color = 'green';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                color = 'red';
              } else if (line.startsWith('@@')) {
                color = 'cyan';
              } else {
                color = 'gray';
              }
              return (
                <Text key={idx} color={color as any}>
                  {line}
                </Text>
              );
            })}
          </Box>
        )}
      </Box>
    );
  }

  const renderMarkdownText = (text: string, color: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let key = 0;

    lines.forEach((line, lineIndex) => {
      // Add line break for non-first lines
      if (lineIndex > 0) {
        elements.push(<Text key={`br-${key++}`}>{"\n"}</Text>);
      }

      // Check for headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const headerText = headerMatch[2];
        elements.push(
          <Text key={key++} bold color="cyan">
            {headerText}
          </Text>
        );
        return;
      }

      // Check for code blocks
      if (line.startsWith('```')) {
        elements.push(
          <Text key={key++} color="gray" dimColor>
            {line}
          </Text>
        );
        return;
      }

      // Check for list items
      const listMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
      if (listMatch) {
        const indent = listMatch[1];
        const content = listMatch[3];
        elements.push(
          <Text key={key++} color="yellow">
            {indent}• 
          </Text>
        );
        elements.push(...renderInlineMarkdown(content, color, key));
        key += 100; // Increment to avoid key conflicts
        return;
      }

      // Regular line with inline markdown
      if (line.trim()) {
        elements.push(...renderInlineMarkdown(line, color, key));
        key += 100; // Increment to avoid key conflicts
      }
    });

    return <Text color={color as any}>{elements}</Text>;
  };

  const renderInlineMarkdown = (text: string, color: string, startKey: number = 0): JSX.Element[] => {
    const parts: JSX.Element[] = [];
    let key = startKey;

    // Combined regex for bold, italic, and inline code
    const inlineRegex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(~~([^~]+)~~)/g;
    let match;
    let lastIndex = 0;

    while ((match = inlineRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <Text key={key++} color={color as any}>
            {text.substring(lastIndex, match.index)}
          </Text>
        );
      }

      // Determine which pattern matched and render accordingly
      if (match[1]) {
        // Bold **text**
        parts.push(
          <Text key={key++} bold color={color as any}>
            {match[2]}
          </Text>
        );
      } else if (match[3]) {
        // Italic *text*
        parts.push(
          <Text key={key++} italic color={color as any}>
            {match[4]}
          </Text>
        );
      } else if (match[5]) {
        // Inline code `text`
        parts.push(
          <Text key={key++} color="magenta" backgroundColor="black">
            {match[6]}
          </Text>
        );
      } else if (match[7]) {
        // Strikethrough ~~text~~
        parts.push(
          <Text key={key++} strikethrough color={color as any}>
            {match[8]}
          </Text>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <Text key={key++} color={color as any}>
          {text.substring(lastIndex)}
        </Text>
      );
    }

    // If no markdown found, return plain text
    if (parts.length === 0) {
      parts.push(
        <Text key={key} color={color as any}>
          {text}
        </Text>
      );
    }

    return parts;
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={getColor(message.role)}>
          {getPrefix(message.role)}
        </Text>
        {renderMarkdownText(message.content, getColor(message.role))}
      </Box>
    </Box>
  );
};
