import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'volcano-white' | 'star-black' | 'tech-blue' | 'berry-pink' | 'system';

export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    primaryHover: string;
    background: string;
    backgroundAlt: string;
    surface: string;
    surfaceHover: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
  };
}

export const themes: Record<Exclude<Theme, 'system'>, ThemeConfig> = {
  'volcano-white': {
    name: '火山白',
    colors: {
      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      background: '#fafafa',
      backgroundAlt: '#f5f5f5',
      surface: '#ffffff',
      surfaceHover: '#f0f9ff',
      text: '#213547',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      accent: '#f97316',
    },
  },
  'star-black': {
    name: '星空黑',
    colors: {
      primary: '#60a5fa',
      primaryHover: '#3b82f6',
      background: '#0f172a',
      backgroundAlt: '#1e293b',
      surface: '#1e293b',
      surfaceHover: '#334155',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      accent: '#a78bfa',
    },
  },
  'tech-blue': {
    name: '科技蓝',
    colors: {
      primary: '#0066ff',
      primaryHover: '#0052cc',
      background: '#0a1929',
      backgroundAlt: '#132f4c',
      surface: '#173a5e',
      surfaceHover: '#1e4976',
      text: '#ffffff',
      textSecondary: '#8cb4d8',
      border: '#265d97',
      accent: '#00d4ff',
    },
  },
  'berry-pink': {
    name: '冰莓粉',
    colors: {
      primary: '#ec4899',
      primaryHover: '#db2777',
      background: '#fdf2f8',
      backgroundAlt: '#fce7f3',
      surface: '#ffffff',
      surfaceHover: '#fdf2f8',
      text: '#831843',
      textSecondary: '#be185d',
      border: '#f9a8d4',
      accent: '#f472b6',
    },
  },
};

export const useThemeStore = create<{ theme: Theme } & { setTheme: (t: Theme) => void }>()(
  persist(
    (set) => ({
      theme: 'volcano-white',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'theme-storage' }
  )
);
