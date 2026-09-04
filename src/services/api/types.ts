import type { Provider } from '@/config/providers';

export type { Provider };

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

/**
 * 持久化的 Provider 配置（不含 apiKey）
 * 与 store/apiStore.ts 中的 PersistedProviderConfig 保持一致
 */
export interface PersistedProviderConfig {
  baseUrl?: string;
  modelId: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatContentPart[];
}

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}
