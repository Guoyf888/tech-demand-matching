import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Provider, ApiConfig } from '@/services/api/types';
import { encodeData, decodeData } from '@/utils/encryptedStorage';

const STORAGE_KEY = 'api-config-storage';

const obfuscatedStorage: Storage = {
  getItem(key: string): string | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    // Try decoding; if it's legacy plaintext, return as-is
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
  clear(): void { localStorage.removeItem(STORAGE_KEY); },
  key(index: number): string | null { return localStorage.key(index); },
};

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
        mimo: null,
        sensenova: null,
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
      name: STORAGE_KEY,
      storage: createJSONStorage(() => obfuscatedStorage),
    }
  )
);
