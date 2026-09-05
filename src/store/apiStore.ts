import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  ALL_PROVIDERS,
  DEFAULT_ACTIVE_PROVIDER,
  emptyProviderConfigs,
  type Provider,
} from '@/config/providers';
import { secretStore } from '@/utils/secretStore';

const STORAGE_KEY = 'api-config-storage';

/**
 * 持久化的 Provider 元数据（不含 apiKey）
 * apiKey 通过 secretStore 单独存取（桌面 OS Keychain，浏览器本地兼容存储）
 */
export interface PersistedProviderConfig {
  baseUrl?: string;
  modelId: string;
}

interface ApiState {
  configs: Record<Provider, PersistedProviderConfig | null>;
  activeProvider: Provider;
  setConfig: (provider: Provider, config: PersistedProviderConfig | null) => void;
  setActiveProvider: (provider: Provider) => void;
  getActiveConfig: () => PersistedProviderConfig | null;
}

export const useApiStore = create<ApiState>()(
  persist(
    (set, get) => ({
      configs: emptyProviderConfigs() as unknown as Record<Provider, PersistedProviderConfig | null>,
      activeProvider: DEFAULT_ACTIVE_PROVIDER,
      setConfig: (provider, config) =>
        set((state) => ({
          configs: { ...state.configs, [provider]: config },
        })),
      setActiveProvider: (provider) => set({ activeProvider: provider }),
      getActiveConfig: () => {
        const state = get();
        return state.configs[state.activeProvider];
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: async (persistedState: unknown) => {
        // v1 -> v2：剥离 apiKey
        if (!persistedState || typeof persistedState !== 'object') return persistedState as ApiState;
        const s = persistedState as { configs?: Record<string, { apiKey?: string; baseUrl?: string; modelId?: string } | null> };
        if (s.configs) {
          // 在迁移过程中，把旧 v1 数据里的 apiKey 同步转移到 secretStore
          for (const [provider, cfg] of Object.entries(s.configs)) {
            if (cfg && typeof cfg.apiKey === 'string' && cfg.apiKey.length > 0) {
              await secretStore.save(provider, cfg.apiKey);
            }
          }
          // 从持久化数据中移除 apiKey 字段
          for (const cfg of Object.values(s.configs)) {
            if (cfg) {
              delete (cfg as { apiKey?: string }).apiKey;
            }
          }
        }
        return persistedState as ApiState;
      },
    }
  )
);

export type { Provider };
export { ALL_PROVIDERS };
