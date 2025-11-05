import type { MessageParam, ContentBlock } from '@anthropic-ai/sdk/resources/messages.js';

export type Message = MessageParam;

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export { ContentBlock };

