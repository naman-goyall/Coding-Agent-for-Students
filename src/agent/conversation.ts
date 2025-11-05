import type { Message } from '../types/message.js';

export class ConversationManager {
  private messages: Message[] = [];
  private readonly maxMessages = 100; // Keep reasonable history

  addMessage(message: Message): void {
    this.messages.push(message);
    
    // Simple cleanup: remove old messages if we exceed max
    if (this.messages.length > this.maxMessages) {
      // Keep recent messages only
      this.messages = this.messages.slice(-this.maxMessages);
    }
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  estimateTokens(): number {
    // Rough estimation: 1 token ≈ 4 characters
    const totalChars = this.messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
      return sum + content.length;
    }, 0);
    
    return Math.ceil(totalChars / 4);
  }
}

