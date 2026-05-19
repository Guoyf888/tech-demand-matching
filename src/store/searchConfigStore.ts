/**
 * 搜索服务配置存储
 * 管理各种搜索提供商的API配置
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { encodeData, decodeData } from '@/utils/encryptedStorage';

const STORAGE_KEY = 'search-config-storage';

const obfuscatedStorage: Storage = {
  getItem(key: string): string | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const decoded = decodeData(raw);
    return decoded || raw;
  },
  setItem(key: string, value: string): void {
    localStorage.setItem(key, encodeData(value));
  },
  removeItem(key: string): void {
    localStorage.removeItem(key);
  },
  get length() { return localStorage.length; },
  clear(): void { localStorage.clear(); },
  key(index: number): string | null { return localStorage.key(index); },
};

// 搜索提供商配置
export interface SearchProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  enabled?: boolean;
}

type ProviderName = 'tavily' | 'duckduckgo' | 'brave' | 'exasearch';

interface ProvidersConfig {
  tavily: SearchProviderConfig;
  duckduckgo: SearchProviderConfig;
  brave: SearchProviderConfig;
  exasearch: SearchProviderConfig;
}

interface SearchConfigState {
  // 活跃的搜索提供商
  activeProvider: ProviderName | 'mock';

  // 各提供商配置
  providers: ProvidersConfig;

  // 设置活跃提供商
  setActiveProvider: (provider: ProviderName | 'mock') => void;

  // 更新提供商配置
  setProviderConfig: (provider: ProviderName, config: SearchProviderConfig) => void;

  // 获取活跃提供商的配置
  getActiveConfig: () => SearchProviderConfig;
}

export const useSearchConfigStore = create<SearchConfigState>()(
  persist(
    (set, get) => ({
      activeProvider: 'mock' as const, // 默认使用模拟模式

      providers: {
        tavily: {
          apiKey: '',
          baseUrl: 'https://api.tavily.com',
          enabled: true,
        },
        duckduckgo: {
          apiKey: '',
          baseUrl: '',
          enabled: true,
        },
        brave: {
          apiKey: '',
          baseUrl: 'https://api.search.brave.com',
          enabled: true,
        },
        exasearch: {
          apiKey: '',
          baseUrl: 'https://api.exa.ai',
          enabled: true,
        },
      } as ProvidersConfig,

      setActiveProvider: (provider) => set({ activeProvider: provider }),

      setProviderConfig: (provider, config) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: { ...state.providers[provider], ...config },
          },
        })),

      getActiveConfig: () => {
        const state = get();
        return state.providers[state.activeProvider as ProviderName] || {};
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => obfuscatedStorage),
    }
  )
);

export default useSearchConfigStore;
