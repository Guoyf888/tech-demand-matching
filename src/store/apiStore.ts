import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Provider, ApiConfig } from '@/services/api/types';

interface ApiState {
  configs: Record<Provider, ApiConfig | null>;
  activeProvider: Provider;
  setConfig: (provider: Provider, config: ApiConfig | null) => void;
  setActiveProvider: (provider: Provider) => void;
  getActiveConfig: () => ApiConfig | null;
}

export const useApiStore = create<ApiState>()(
  persist(
    (set, get) => ({
      configs: {
        openai: null,
        claude: null,
        gemini: null,
        ernie: null,
        qwen: null,
        zhipu: null,
        minimax: null,
        kimi: null,
        openrouter: null,
        custom: null,
      },
      activeProvider: 'openai',
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
      name: 'api-config-storage',
    }
  )
);
