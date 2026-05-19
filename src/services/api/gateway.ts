import { ApiConfig, ChatCompletionOptions, Provider } from './types';
import { useApiStore } from '@/store/apiStore';

export class ApiGateway {
  // Get config from store, prioritizing the active provider
  private getConfigFromStore(): ApiConfig | null {
    const state = useApiStore.getState();
    const { configs, activeProvider } = state;

    // First check if active provider has config
    if (configs[activeProvider]) {
      const config = configs[activeProvider];
      // Validate that the config has required fields
      if (config && config.apiKey && config.baseUrl && config.modelId) {
        return config;
      }
    }

    // Otherwise find the first provider that has a complete config
    const providers: Provider[] = ['minimax', 'openai', 'claude', 'qwen', 'ernie', 'zhipu', 'kimi', 'openrouter', 'gemini', 'custom', 'mimo', 'sensenova'];
    for (const provider of providers) {
      const config = configs[provider];
      if (config && config.apiKey && config.baseUrl && config.modelId) {
        return config;
      }
    }

    return null;
  }

  getConfig(): ApiConfig | null {
    return this.getConfigFromStore();
  }

  isConfigured(): boolean {
    return this.getConfigFromStore() !== null;
  }

  getActiveProvider(): Provider | null {
    const state = useApiStore.getState();
    const { configs, activeProvider } = state;

    if (configs[activeProvider]) {
      const config = configs[activeProvider];
      if (config && config.apiKey && config.baseUrl && config.modelId) {
        return activeProvider;
      }
    }

    // Find first configured provider
    const providers: Provider[] = ['minimax', 'openai', 'claude', 'qwen', 'ernie', 'zhipu', 'kimi', 'openrouter', 'gemini', 'custom', 'mimo', 'sensenova'];
    for (const provider of providers) {
      const config = configs[provider];
      if (config && config.apiKey && config.baseUrl && config.modelId) {
        return provider;
      }
    }

    return null;
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

      case 'mimo':
        endpoint = `${baseUrl}/v1/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;

      case 'sensenova':
        endpoint = `${baseUrl}/v1/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;

      default:
        throw new Error(`不支持的 provider: ${provider}`);
    }

    return { endpoint, headers, body };
  }

  /**
   * 验证API配置是否完整
   */
  validateConfig(): { valid: boolean; error?: string } {
    const config = this.getConfigFromStore();

    if (!config) {
      return {
        valid: false,
        error: 'API未配置，请先在设置中配置API Key、API地址和模型ID'
      };
    }

    if (!config.apiKey) {
      return {
        valid: false,
        error: 'API Key未配置，请在设置中填写API Key'
      };
    }

    if (!config.baseUrl) {
      return {
        valid: false,
        error: 'API地址未配置，请在设置中填写API地址'
      };
    }

    if (!config.modelId) {
      return {
        valid: false,
        error: '模型ID未配置，请在设置中填写模型ID'
      };
    }

    return { valid: true };
  }

  async chat(options: ChatCompletionOptions): Promise<Response> {
    // 验证配置
    const configValidation = this.validateConfig();
    if (!configValidation.valid) {
      throw new Error(configValidation.error);
    }

    const config = this.getConfigFromStore()!;
    const { provider, apiKey, modelId } = config;
    const baseUrl = config.baseUrl || '';

    try {
      const { endpoint, headers, body } = this.buildRequest(provider, apiKey, baseUrl, modelId, options);

      // 记录请求日志（调试用）
      if (import.meta.env.DEV) {
        console.log(`[API请求] ${provider} -> ${endpoint}`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      // 处理HTTP错误
      if (!response.ok) {
        let errorMessage = `请求失败 (${response.status}): ${response.statusText}`;

        try {
          const errorData = await response.json();

          // 尝试从各种API错误格式中提取错误信息
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error?.code) {
            errorMessage = `${errorData.error.code}: ${errorData.error.message || errorData.error.type || '未知错误'}`;
          } else if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }

          // 特定状态码的错误提示
          if (response.status === 401) {
            errorMessage = 'API密钥无效或已过期，请检查设置中的API Key';
          } else if (response.status === 403) {
            errorMessage = 'API访问被拒绝，请检查API Key是否有权限';
          } else if (response.status === 429) {
            errorMessage = 'API请求频率超限，请稍后重试';
          } else if (response.status >= 500) {
            errorMessage = 'API服务器错误，请稍后重试';
          }
        } catch {
          // 响应不是JSON格式，使用默认错误信息
          if (response.status === 401) {
            errorMessage = 'API密钥无效或已过期，请检查设置中的API Key';
          } else if (response.status === 403) {
            errorMessage = 'API访问被拒绝，请检查API Key是否有权限';
          } else if (response.status === 429) {
            errorMessage = 'API请求频率超限，请稍后重试';
          }
        }

        throw new Error(errorMessage);
      }

      return response;
    } catch (error: any) {
      // 处理网络错误
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`网络连接失败，请检查：\n1. 您的网络是否正常\n2. API地址(${baseUrl})是否可访问\n3. 是否需要代理`);
      }

      // 保留原始错误信息
      throw error;
    }
  }
}

export const apiGateway = new ApiGateway();
