import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentController } from '../agent/controller.js';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'file_change';
  content: string;
  toolName?: string;
  fileName?: string;
  lineChanges?: string;
}

interface ChatUIProps {
  agent: AgentController;
}

export const ChatUI: React.FC<ChatUIProps> = ({ agent }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content:
        'Welcome to School Agent. Type your question and press Enter. Press Ctrl+C to exit.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentToolUse, setCurrentToolUse] = useState<string | null>(null);

  useInput((inputChar, key) => {
    if (isProcessing) return;

    if (key.return) {
      if (input.trim()) {
        handleSubmit(input.trim());
        setInput('');
      }
    } else if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
    } else if (!key.ctrl && !key.meta && inputChar) {
      setInput(prev => prev + inputChar);
    }
  });

  const parseFileChanges = (result: string, toolName: string): Array<{fileName: string, lineChanges: string}> => {
    const changes: Array<{fileName: string, lineChanges: string}> = [];
    
    // Match patterns for different tools
    if (toolName === 'write_file' || toolName === 'edit_file' || toolName === 'search_replace') {
      // Look for file paths and change counts
      const fileMatch = result.match(/(?:Modified|Created|Edited|Updated)\s+(.+?)(?:\n|:)/);
      const changesMatch = result.match(/\+(\d+)\s+-(\d+)/);
      
      if (fileMatch) {
        const fileName = fileMatch[1].trim();
        let lineChanges = '';
        
        if (changesMatch) {
          const added = parseInt(changesMatch[1]);
          const removed = parseInt(changesMatch[2]);
          lineChanges = `+${added} -${removed}`;
        } else {
          // Check for just "Created" with size
          const sizeMatch = result.match(/Size:\s+(\d+)\s+bytes/);
          if (sizeMatch && result.includes('Created')) {
            lineChanges = '+' + Math.ceil(parseInt(sizeMatch[1]) / 50); // Rough line estimate
          }
        }
        
        changes.push({ fileName, lineChanges });
      }
    } else if (toolName === 'apply_patch') {
      const fileMatch = result.match(/Applied patch to\s+(.+?)(?:\n|$)/);
      const changesMatch = result.match(/Changes:\s+\+(\d+)\s+-(\d+)/);
      
      if (fileMatch && changesMatch) {
        changes.push({
          fileName: fileMatch[1].trim(),
          lineChanges: `+${changesMatch[1]} -${changesMatch[2]}`,
        });
      }
    }
    
    return changes;
  };

  const handleSubmit = async (userMessage: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    try {
      let assistantMessage = '';
      let currentAssistantIndex = -1;

      // Stream response
      for await (const chunk of agent.chat(userMessage)) {
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
          setMessages(prev => [
            ...prev,
            {
              role: 'tool',
              content: `Using ${chunk.toolName}...`,
              toolName: chunk.toolName,
            },
          ]);
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
            // Update the last tool message
            const lastToolIndex = newMessages.findLastIndex(m => m.role === 'tool');
            if (lastToolIndex !== -1) {
              newMessages[lastToolIndex].content = `✓ ${newMessages[lastToolIndex].toolName} completed`;
            }
            
            // Add file change notifications
            if (fileChanges.length > 0) {
              fileChanges.forEach(change => {
                newMessages.push({
                  role: 'file_change',
                  content: change.fileName,
                  fileName: change.fileName,
                  lineChanges: change.lineChanges,
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
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" padding={1} marginBottom={1}>
        <Text bold color="cyan">
          School Agent
        </Text>
        <Text dimColor> | </Text>
        <Text dimColor>Claude Sonnet 4.5</Text>
        <Text dimColor> | </Text>
        <Text dimColor>~{agent.getTokenEstimate()} tokens</Text>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, i) => (
          <MessageDisplay key={i} message={msg} />
        ))}
      </Box>

      {/* Status indicator */}
      {isProcessing && (
        <Box marginBottom={1}>
          {currentToolUse ? (
            <Text color="yellow">Executing: {currentToolUse}...</Text>
          ) : (
            <Text color="yellow">Thinking...</Text>
          )}
        </Box>
      )}

      {/* Input area */}
      {!isProcessing && (
        <Box>
          <Text color="green" bold>
            →{' '}
          </Text>
          <Text>{input}</Text>
          <Text dimColor>█</Text>
        </Box>
      )}
    </Box>
  );
};

interface MessageDisplayProps {
  message: Message;
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ message }) => {
  const getColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'green';
      case 'assistant':
        return 'white';
      case 'system':
        return 'gray';
      case 'tool':
        return 'yellow';
      case 'file_change':
        return 'green';
      default:
        return 'white';
    }
  };

  const getPrefix = (role: string) => {
    switch (role) {
      case 'user':
        return 'You: ';
      case 'assistant':
        return 'Agent: ';
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

  // Special rendering for file changes
  if (message.role === 'file_change') {
    return (
      <Box marginBottom={0}>
        <Text color="green" bold>{message.fileName}</Text>
        {message.lineChanges && (
          <Text color="green"> {message.lineChanges}</Text>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color={getColor(message.role)}>
          {getPrefix(message.role)}
        </Text>
      </Box>
      <Box paddingLeft={2}>
        <Text color={getColor(message.role)}>{message.content}</Text>
      </Box>
    </Box>
  );
};
