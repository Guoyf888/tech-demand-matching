export type Provider = 'openai' | 'claude' | 'gemini' | 'ernie' | 'qwen' | 'zhipu' | 'minimax' | 'kimi' | 'openrouter' | 'custom';

export interface ModelConfig {
  id: string;
  name: string;
  provider: Provider;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  supportsVision?: boolean;
  supportsStreaming?: boolean;
}

export interface TokenUsage {
  used: number;
  limit: number;
  resetAt?: Date;
}

export interface ApiConfig {
  provider: Provider;
  apiKey: string;
  baseUrl?: string;
  modelId: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}
