import { ApiConfig, ChatCompletionOptions } from './types';

export class ApiGateway {
  private config: ApiConfig | null = null;

  setConfig(config: ApiConfig) {
    this.config = config;
  }

  getConfig(): ApiConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0;
  }

  async chat(options: ChatCompletionOptions): Promise<Response> {
    if (!this.config) {
      throw new Error('API未配置');
    }

    const { provider, apiKey, baseUrl, modelId } = this.config;

    let endpoint = '';
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let body: Record<string, unknown> = {
      model: modelId,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    };

    switch (provider) {
      case 'openai':
      case 'custom':
        endpoint = `${baseUrl}/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;

      case 'claude':
        endpoint = `${baseUrl}/v1/messages`;
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        delete headers['Content-Type'];
        body = {
          model: modelId,
          messages: options.messages.filter((m) => m.role !== 'system'),
          system: options.messages.find((m) => m.role === 'system')?.content,
          max_tokens: options.maxTokens ?? 2048,
          temperature: options.temperature ?? 0.7,
        };
        break;

      case 'qwen':
        endpoint = `${baseUrl}/api/v1/services/aigc/text-generation/generation`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = {
          model: modelId,
          input: { messages: options.messages },
          parameters: { temperature: options.temperature ?? 0.7, max_tokens: options.maxTokens ?? 2048 },
        };
        break;

      case 'ernie':
        endpoint = `${baseUrl}/v3.1/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = { model: modelId, messages: options.messages };
        break;

      case 'zhipu':
        endpoint = `${baseUrl}/api/paulin/v1/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;

      case 'minimax':
        endpoint = `${baseUrl}/v1/text/chatcompletion_v2`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = { model: modelId, messages: options.messages };
        break;

      case 'kimi':
        endpoint = `${baseUrl}/v1/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;

      case 'openrouter':
        endpoint = `${baseUrl}/api/v1/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['HTTP-Referer'] = 'https://tech-demand-matching.app';
        headers['X-Title'] = 'Tech Demand Matching';
        break;

      default:
        throw new Error(`不支持的 provider: ${provider}`);
    }

    return fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }
}

export const apiGateway = new ApiGateway();
