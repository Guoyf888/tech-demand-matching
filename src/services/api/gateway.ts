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

  private buildRequest(provider: string, apiKey: string, baseUrl: string, modelId: string, options: ChatCompletionOptions) {
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
        endpoint = `${baseUrl}/v1/chat/completions`;
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

      case 'custom':
        endpoint = `${baseUrl}/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;

      default:
        throw new Error(`不支持的 provider: ${provider}`);
    }

    return { endpoint, headers, body };
  }

  async chat(options: ChatCompletionOptions): Promise<Response> {
    if (!this.config) {
      throw new Error('API未配置，请先在设置中配置API Key');
    }

    const { provider, apiKey, baseUrl, modelId } = this.config;

    if (!baseUrl) {
      throw new Error(`${provider} 的 API地址未配置`);
    }

    if (!modelId) {
      throw new Error('模型ID未配置');
    }

    try {
      const { endpoint, headers, body } = this.buildRequest(provider, apiKey, baseUrl, modelId, options);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorMessage = `请求失败: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // ignore JSON parse error
        }
        throw new Error(errorMessage);
      }

      return response;
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('network')) {
        throw new Error(`网络连接失败，请检查：\n1. 您的网络是否正常\n2. API地址(${baseUrl})是否可访问\n3. 是否需要代理`);
      }
      throw error;
    }
  }
}

export const apiGateway = new ApiGateway();
