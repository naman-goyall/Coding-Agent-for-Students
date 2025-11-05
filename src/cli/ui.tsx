import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentController } from '../agent/controller.js';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolName?: string;
}

interface ChatUIProps {
  agent: AgentController;
}

export const ChatUI: React.FC<ChatUIProps> = ({ agent }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content:
        '🎓 Welcome to School Agent! I can now read your files and search your code. Type your question and press Enter. Press Ctrl+C to exit.',
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
          // Tool results are handled internally - optionally show completion
          setMessages(prev => {
            const newMessages = [...prev];
            // Update the last tool message
            const lastToolIndex = newMessages.findLastIndex(m => m.role === 'tool');
            if (lastToolIndex !== -1) {
              newMessages[lastToolIndex].content = `✓ ${newMessages[lastToolIndex].toolName} completed`;
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
          🎓 School Agent
        </Text>
        <Text dimColor> | </Text>
        <Text dimColor>Claude Sonnet 4.5</Text>
        <Text dimColor> | </Text>
        <Text dimColor>~{agent.getTokenEstimate()} tokens</Text>
        <Text dimColor> | </Text>
        <Text color="green" dimColor>
          📁 File Tools Active
        </Text>
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
            <Text color="yellow">⚙️  Executing: {currentToolUse}...</Text>
          ) : (
            <Text color="yellow">⏳ Thinking...</Text>
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
      default:
        return 'white';
    }
  };

  const getPrefix = (role: string) => {
    switch (role) {
      case 'user':
        return '👤 You: ';
      case 'assistant':
        return '🤖 Agent: ';
      case 'system':
        return 'ℹ️  ';
      case 'tool':
        return '🔧 ';
      default:
        return '';
    }
  };

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
