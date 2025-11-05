export interface AgentConfig {
  anthropic: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  workingDirectory: string;
}

export const DEFAULT_CONFIG: Omit<AgentConfig, 'anthropic'> = {
  workingDirectory: process.cwd(),
};

