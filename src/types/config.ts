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
  workingDirectory: string;
}

export const DEFAULT_CONFIG: Omit<AgentConfig, 'anthropic'> = {
  workingDirectory: process.cwd(),
};

