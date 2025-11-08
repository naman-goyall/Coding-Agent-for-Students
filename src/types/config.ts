export interface AgentConfig {
  anthropic: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  canvas?: {
    domain: string;
    accessToken: string;
  };
  notion?: {
    apiKey: string;
    databaseId: string;
  };
  notionNotes?: {
    apiKey: string;
    defaultParentPageId?: string;
  };
  workingDirectory: string;
}

export const DEFAULT_CONFIG: Omit<AgentConfig, 'anthropic'> = {
  workingDirectory: process.cwd(),
};
