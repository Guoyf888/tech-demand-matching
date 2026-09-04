/**
 * Provider 单点配置 - 所有需要枚举 LLM Provider 的地方都从这里取
 *
 * 任何 UI（设置面板、侧边栏、聊天模式选择器）、Store、Gateway
 * 都通过 ALL_PROVIDERS 取值，新增 Provider 只需修改本文件。
 */

export const ALL_PROVIDERS = [
  'openai',
  'claude',
  'gemini',
  'ernie',
  'qwen',
  'zhipu',
  'minimax',
  'kimi',
  'openrouter',
  'mimo',
  'sensenova',
  'custom',
] as const;

export type Provider = (typeof ALL_PROVIDERS)[number];

export const DEFAULT_ACTIVE_PROVIDER: Provider = 'openai';

export interface ProviderMeta {
  id: Provider;
  name: string;
  baseUrl?: string;
  defaultModel?: string;
  placeholder?: string;
}

/**
 * UI 显示用的元数据。
 * baseUrl 缺失的（如 gemini）走 Provider 内置的 endpoint 模板。
 */
export const PROVIDER_META: Record<Provider, ProviderMeta> = {
  openai: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com', defaultModel: 'gpt-3.5-turbo', placeholder: 'sk-...' },
  claude: { id: 'claude', name: 'Claude', baseUrl: 'https://api.anthropic.com', defaultModel: 'claude-3-5-sonnet-20241022', placeholder: 'sk-ant-...' },
  qwen: { id: 'qwen', name: '阿里Qwen', baseUrl: 'https://dashscope.aliyuncs.com', defaultModel: 'qwen-turbo', placeholder: 'API Key' },
  ernie: { id: 'ernie', name: '百度文心', baseUrl: 'https://qianfan.baidubce.com', defaultModel: 'ernie-4.0-8k', placeholder: 'API Key' },
  zhipu: { id: 'zhipu', name: '智谱GLM', baseUrl: 'https://open.bigmodel.cn', defaultModel: 'glm-4-flash', placeholder: 'API Key' },
  minimax: { id: 'minimax', name: 'MiniMax', baseUrl: 'https://api.minimax.chat', defaultModel: 'abab6.5s-chat', placeholder: 'API Key' },
  kimi: { id: 'kimi', name: 'Kimi', baseUrl: 'https://api.moonshot.cn', defaultModel: 'moonshot-v1-8k', placeholder: 'API Key' },
  mimo: { id: 'mimo', name: '小米MiMo', baseUrl: 'https://api.xiaomi.com', defaultModel: 'MiMo-7B', placeholder: 'API Key' },
  sensenova: { id: 'sensenova', name: '商汤日日新', baseUrl: 'https://api.sensenova.cn', defaultModel: 'SenseChat-5', placeholder: 'API Key' },
  openrouter: { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai', defaultModel: 'openai/gpt-3.5-turbo', placeholder: 'sk-or-...' },
  gemini: { id: 'gemini', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'gemini-1.5-flash', placeholder: 'API Key' },
  custom: { id: 'custom', name: '自定义', placeholder: 'API Key' },
};

/**
 * 构造 configs 的零值模板，apiStore 等场景用
 */
export function emptyProviderConfigs(): Record<Provider, null> {
  return Object.fromEntries(ALL_PROVIDERS.map((p) => [p, null])) as Record<Provider, null>;
}
