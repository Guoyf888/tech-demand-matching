import { ApiConfig, ChatCompletionOptions } from './types';
import { useApiStore } from '@/store/apiStore';
import { ALL_PROVIDERS, type Provider } from '@/config/providers';
import { secretStore } from '@/utils/secretStore';
import { logger } from '@/utils/logger';

const log = logger;

// ============== 重试策略 ==============
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function getRetryAfterMs(response: Response): number | null {
  const ra = response.headers.get('Retry-After');
  if (!ra) return null;
  const seconds = Number(ra);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(ra);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

// ============== Provider 配置选择 ==============

function pickProviderMetadata(
  configs: Record<Provider, { baseUrl?: string; modelId: string } | null>,
  activeProvider: Provider
): { provider: Provider; baseUrl?: string; modelId: string } | null {
  const candidates: Provider[] = [activeProvider, ...ALL_PROVIDERS.filter((p) => p !== activeProvider)];
  for (const p of candidates) {
    const c = configs[p];
    if (c && c.modelId) {
      return { provider: p, baseUrl: c.baseUrl, modelId: c.modelId };
    }
  }
  return null;
}

export class ApiGateway {
  /**
   * 异步获取完整 ApiConfig（包含从 Keychain 取出的 apiKey）
   */
  async getFullConfig(): Promise<ApiConfig | null> {
    const { configs, activeProvider } = useApiStore.getState();
    const meta = pickProviderMetadata(configs, activeProvider);
    if (!meta) return null;
    const apiKey = await secretStore.get(meta.provider);
    if (!apiKey) return null;
    return {
      provider: meta.provider,
      apiKey,
      baseUrl: meta.baseUrl,
      modelId: meta.modelId,
    };
  }

  /**
   * 同步获取不含 apiKey 的元数据（用于 UI 展示）
   */
  getConfigMetadata(): { provider: Provider; baseUrl?: string; modelId: string } | null {
    const { configs, activeProvider } = useApiStore.getState();
    return pickProviderMetadata(configs, activeProvider);
  }

  /**
   * 异步：是否已配置完整的 API（Keychain 中有 apiKey + store 中有 baseUrl/modelId）
   */
  async isConfigured(): Promise<boolean> {
    return (await this.getFullConfig()) !== null;
  }

  /**
   * 异步：当前实际生效的 provider
   */
  async getActiveProvider(): Promise<Provider | null> {
    const config = await this.getFullConfig();
    return config?.provider ?? null;
  }

  buildRequest(provider: string, apiKey: string, baseUrl: string, modelId: string, options: ChatCompletionOptions) {
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
          messages: options.messages.filter((m) => m.role !== 'system').map((message) => ({ ...message, content: mapContentToClaude(message.content) })),
          system: contentAsText(options.messages.find((m) => m.role === 'system')?.content),
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

      case 'gemini':
        // Gemini 使用 query string 传 key
        endpoint = `${baseUrl}/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
        delete headers['Content-Type'];
        headers['x-goog-api-key'] = apiKey;
        body = mapMessagesToGemini(options.messages);
        break;

      default:
        throw new Error(`不支持的 provider: ${provider}`);
    }

    // 流式开关
    if (options.stream && provider !== 'gemini') {
      body.stream = true;
    }

    return { endpoint, headers, body };
  }

  /**
   * 异步验证API配置是否完整
   */
  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    const config = await this.getFullConfig();

    if (!config) {
      return {
        valid: false,
        error: 'API未配置，请先在设置中配置API Key、API地址和模型ID',
      };
    }

    if (!config.apiKey) return { valid: false, error: 'API Key未配置，请在设置中填写API Key' };
    if (!config.baseUrl) return { valid: false, error: 'API地址未配置，请在设置中填写API地址' };
    if (!config.modelId) return { valid: false, error: '模型ID未配置，请在设置中填写模型ID' };

    return { valid: true };
  }

  /**
   * 发送一次请求；带指数退避重试（最多 MAX_RETRIES 次）。
   *
   * 流式模式（options.stream === true）下不重试，避免重复 token 推送造成用户困扰。
   * 流式响应会原样返回 Response，由调用方负责 ReadableStream 解析。
   */
  async chat(options: ChatCompletionOptions, signal?: AbortSignal): Promise<Response> {
    const configValidation = await this.validateConfig();
    if (!configValidation.valid) {
      throw new Error(configValidation.error);
    }

    const config = (await this.getFullConfig())!;
    const { provider, apiKey, modelId } = config;
    const baseUrl = config.baseUrl || '';
    const { endpoint, headers, body } = this.buildRequest(provider, apiKey, baseUrl, modelId, options);

    const isStreaming = !!options.stream;
    const maxAttempts = isStreaming ? 1 : MAX_RETRIES + 1;

    if (import.meta.env.DEV) {
      log.log('api', `${provider} -> ${endpoint}${isStreaming ? ' (stream)' : ''}`);
    }

    let lastError: unknown = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal,
        });

        if (response.ok) return response;

        // 4xx/5xx：尝试解析错误体，决定是否重试
        const errorMessage = await this.extractErrorMessage(response);
        const err = new Error(errorMessage) as Error & { status?: number; retryable?: boolean };
        err.status = response.status;
        err.retryable = isStreaming ? false : RETRYABLE_STATUS.has(response.status);

        if (!err.retryable || attempt === maxAttempts - 1) {
          throw err;
        }

        const backoff = getRetryAfterMs(response) ?? BASE_BACKOFF_MS * Math.pow(2, attempt);
        log.warn('api', `${provider} ${response.status}, retry in ${backoff}ms (${attempt + 1}/${maxAttempts})`);
        await sleep(backoff, signal);
        lastError = err;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        if (error instanceof TypeError && error.message.includes('fetch')) {
          const wrapped = new Error(
            `网络连接失败，请检查：\n1. 您的网络是否正常\n2. API地址(${baseUrl})是否可访问\n3. 是否需要代理`
          ) as Error & { retryable?: boolean };
          wrapped.retryable = !isStreaming;
          if (!wrapped.retryable || attempt === maxAttempts - 1) throw wrapped;
          const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
          log.warn('api', `network error, retry in ${backoff}ms (${attempt + 1}/${maxAttempts})`);
          await sleep(backoff, signal);
          lastError = wrapped;
          continue;
        }
        throw error;
      }
    }
    throw (lastError instanceof Error ? lastError : new Error('请求失败'));
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    let errorMessage = `请求失败 (${response.status}): ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error?.message) errorMessage = errorData.error.message;
      else if (errorData.error?.code)
        errorMessage = `${errorData.error.code}: ${errorData.error.message || errorData.error.type || '未知错误'}`;
      else if (typeof errorData.error === 'string') errorMessage = errorData.error;
      else if (errorData.message) errorMessage = errorData.message;
    } catch {
      // 非 JSON 响应体
    }
    if (response.status === 401) return 'API密钥无效或已过期，请检查设置中的API Key';
    if (response.status === 403) return 'API访问被拒绝，请检查API Key是否有权限';
    if (response.status === 429) return 'API请求频率超限，请稍后重试';
    if (response.status >= 500) return 'API服务器错误，请稍后重试';
    return errorMessage;
  }
}

/**
 * Gemini 的 messages 格式转换
 * Gemini 接受 contents[].parts[].text，不支持 system / assistant 角色
 */
function mapMessagesToGemini(messages: ChatCompletionOptions['messages']): Record<string, unknown> {
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: mapContentToGemini(m.content),
    }));
  const systemInstruction = contentAsText(messages.find((m) => m.role === 'system')?.content);
  return systemInstruction
    ? { contents, systemInstruction: { parts: [{ text: systemInstruction }] } }
    : { contents };
}

function contentAsText(content: ChatCompletionOptions['messages'][number]['content'] | undefined): string | undefined {
  if (content === undefined) return undefined;
  if (typeof content === 'string') return content;
  return content.filter((part) => part.type === 'text').map((part) => part.text).join('\n');
}

function parseDataUrl(url: string): { mimeType: string; data: string } | null {
  const match = url.match(/^data:([^;,]+);base64,(.+)$/);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

function mapContentToGemini(content: ChatCompletionOptions['messages'][number]['content']): Record<string, unknown>[] {
  if (typeof content === 'string') return [{ text: content }];
  return content.map((part) => {
    if (part.type === 'text') return { text: part.text };
    const image = parseDataUrl(part.image_url.url);
    return image ? { inlineData: image } : { text: '[图片无法读取]' };
  });
}

function mapContentToClaude(content: ChatCompletionOptions['messages'][number]['content']): string | Record<string, unknown>[] {
  if (typeof content === 'string') return content;
  return content.map((part) => {
    if (part.type === 'text') return { type: 'text', text: part.text };
    const image = parseDataUrl(part.image_url.url);
    return image
      ? { type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.data } }
      : { type: 'text', text: '[图片无法读取]' };
  });
}

export const apiGateway = new ApiGateway();

/**
 * 流式聊天结果 - 异步可迭代的文本片段序列
 */
export interface StreamChatHandle {
  [Symbol.asyncIterator](): AsyncIterator<string>;
  abort(): void;
}

/**
 * 流式调用 chat API。
 *
 * 对 OpenAI 兼容协议（包括 minimax / qwen / kimi / openrouter / mimo / sensenova / custom /
 * zhipu / ernie）解析 SSE data: {...} 中的 choices[0].delta.content。
 * Claude 协议格式不同，按非流式兼容方式处理（一次性返回全部内容）。
 * Gemini 当前由 gateway 内置为非流式通道，调用方应改用 chat()。
 */
export function streamChat(
  options: ChatCompletionOptions,
  signal?: AbortSignal
): StreamChatHandle {
  const ctrl = new AbortController();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }

  const iterator = (async function* () {
    const configValidation = await apiGateway.validateConfig();
    if (!configValidation.valid) throw new Error(configValidation.error);
    const config = (await apiGateway.getFullConfig())!;
    const { provider, apiKey, modelId } = config;
    const baseUrl = config.baseUrl || '';

    const { endpoint, headers, body } = apiGateway.buildRequest(
      provider, apiKey, baseUrl, modelId,
      { ...options, stream: true }
    );

    if (provider === 'claude' || provider === 'gemini') {
      // 退路：使用非流式通道拿到完整响应后一次性 yield
      const response = await apiGateway.chat(options, ctrl.signal);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content
        ?? data.content?.[0]?.text
        ?? '';
      if (content) yield content;
      return;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    if (!response.ok || !response.body) {
      let msg = `流式请求失败 (${response.status})`;
      try {
        const errorData = await response.json();
        msg = errorData.error?.message || errorData.message || msg;
      } catch { /* ignore */ }
      throw new Error(msg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // 按双换行切分 SSE event
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const evt of events) {
          for (const line of evt.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content
                ?? parsed.choices?.[0]?.message?.content
                ?? '';
              if (delta) yield delta;
            } catch {
              // 非 JSON 数据（如部分代理返回的原始文本片段）原样透传
              if (data) yield data;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  })();

  return {
    [Symbol.asyncIterator]() { return iterator; },
    abort() { ctrl.abort(); },
  };
}
