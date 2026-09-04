/**
 * Theme Store - 主题状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'volcano-white' | 'star-black' | 'tech-blue' | 'berry-pink' | 'system';

export interface ThemeConfig {
  name: string;
  colors: {
    // Primary Colors
    primary: string;
    primaryHover: string;
    primaryLight: string;

    // AI Purple
    aiPurple: string;
    aiPurpleLight: string;

    // Background Colors
    background: string;
    backgroundAlt: string;
    surface: string;
    surfaceHover: string;

    // Text Colors
    text: string;
    textSecondary: string;
    textHint: string;

    // Border Colors
    border: string;
    borderHover: string;

    // Accent Colors
    accent: string;

    // Status Colors
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    danger: string;
    dangerLight: string;
    error: string;
    errorLight: string;

    // Info
    info: string;
    infoLight: string;
  };
  isDark: boolean;
}

export const themes: Record<Exclude<Theme, 'system'>, ThemeConfig> = {
  'volcano-white': {
    name: '科技浅蓝',
    isDark: false,
    colors: {
      primary: '#1685f8',
      primaryHover: '#086ad8',
      primaryLight: '#e6f3ff',
      aiPurple: '#6d6bf3',
      aiPurpleLight: '#eeefff',
      background: '#f2f7fd',
      backgroundAlt: '#eaf3fc',
      surface: '#ffffff',
      surfaceHover: '#f0f7ff',
      text: '#16324f',
      textSecondary: '#58728d',
      textHint: '#8aa0b5',
      border: '#d7e6f5',
      borderHover: '#a8c9ec',
      accent: '#18bfd3',
      success: '#22c55e',
      successLight: '#dcfce7',
      warning: '#f59e0b',
      warningLight: '#fef3c7',
      danger: '#ef4444',
      dangerLight: '#fee2e2',
      error: '#ef4444',
      errorLight: '#fee2e2',
      info: '#3b82f6',
      infoLight: '#dbeafe',
    },
  },
  'star-black': {
    name: '星空黑',
    isDark: true,
    colors: {
      primary: '#60a5fa',
      primaryHover: '#3b82f6',
      primaryLight: '#1e3a5f',
      aiPurple: '#a78bfa',
      aiPurpleLight: '#3d2d4a',
      background: '#0f172a',
      backgroundAlt: '#1e293b',
      surface: '#1e293b',
      surfaceHover: '#334155',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      textHint: '#64748b',
      border: '#334155',
      borderHover: '#475569',
      accent: '#a78bfa',
      success: '#4ade80',
      successLight: '#14532d',
      warning: '#fbbf24',
      warningLight: '#713f12',
      danger: '#f87171',
      dangerLight: '#7f1d1d',
      error: '#f87171',
      errorLight: '#7f1d1d',
      info: '#60a5fa',
      infoLight: '#1e3a5f',
    },
  },
  'tech-blue': {
    name: '科技蓝',
    isDark: true,
    colors: {
      primary: '#0066ff',
      primaryHover: '#0052cc',
      primaryLight: '#001f3f',
      aiPurple: '#00d4ff',
      aiPurpleLight: '#001f3f',
      background: '#0a1929',
      backgroundAlt: '#132f4c',
      surface: '#173a5e',
      surfaceHover: '#1e4976',
      text: '#ffffff',
      textSecondary: '#8cb4d8',
      textHint: '#5c8ab8',
      border: '#265d97',
      borderHover: '#3d7cc9',
      accent: '#00d4ff',
      success: '#00c853',
      successLight: '#002010',
      warning: '#ffab00',
      warningLight: '#332600',
      danger: '#ff5252',
      dangerLight: '#3d0000',
      error: '#ff5252',
      errorLight: '#3d0000',
      info: '#00d4ff',
      infoLight: '#001f3f',
    },
  },
  'berry-pink': {
    name: '冰莓粉',
    isDark: false,
    colors: {
      primary: '#ec4899',
      primaryHover: '#db2777',
      primaryLight: '#fce7f3',
      aiPurple: '#f472b6',
      aiPurpleLight: '#fdf2f8',
      background: '#fdf2f8',
      backgroundAlt: '#fce7f3',
      surface: '#ffffff',
      surfaceHover: '#fdf2f8',
      text: '#831843',
      textSecondary: '#be185d',
      textHint: '#db2777',
      border: '#f9a8d4',
      borderHover: '#f472b6',
      accent: '#f472b6',
      success: '#22c55e',
      successLight: '#dcfce7',
      warning: '#f59e0b',
      warningLight: '#fef3c7',
      danger: '#ec4899',
      dangerLight: '#fce7f3',
      error: '#ec4899',
      errorLight: '#fce7f3',
      info: '#ec4899',
      infoLight: '#fdf2f8',
    },
  },
};

/**
 * 获取实际应用的主题（system模式下根据系统设置返回light或dark）
 */
export function getEffectiveTheme(theme: Theme): Exclude<Theme, 'system'> {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'star-black' : 'volcano-white';
    }
    return 'volcano-white';
  }
  return theme;
}

/**
 * 获取主题配色
 */
export function getThemeColors(theme: Theme): ThemeConfig {
  const effectiveTheme = getEffectiveTheme(theme);
  return themes[effectiveTheme];
}

/**
 * 订阅式 hook：返回当前主题的配色（自动响应主题切换）
 *
 * 调用方应使用此 hook 而非 useThemeStore.getState().getEffectiveTheme()，
 * 后者在 render 阶段不会建立订阅，主题切换时不会触发重渲染。
 */
export function useThemeColors() {
  const theme = useThemeStore((s) => s.theme);
  const effectiveTheme = getEffectiveTheme(theme);
  return themes[effectiveTheme].colors;
}

/**
 * 订阅式 hook：返回当前主题是否为深色模式
 */
export function useThemeIsDark() {
  const theme = useThemeStore((s) => s.theme);
  const effectiveTheme = getEffectiveTheme(theme);
  return themes[effectiveTheme].isDark;
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  getEffectiveTheme: () => Exclude<Theme, 'system'>;
  getThemeColors: () => ThemeConfig;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'volcano-white',

      setTheme: (theme) => set({ theme }),

      getEffectiveTheme: () => {
        const { theme } = get();
        return getEffectiveTheme(theme);
      },

      getThemeColors: () => {
        const { theme } = get();
        return getThemeColors(theme);
      },
    }),
    { name: 'theme-storage' }
  )
);

/**
 * 监听系统主题变化（用于system模式）
 */
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const store = useThemeStore.getState();
    if (store.theme === 'system') {
      useThemeStore.setState({ theme: 'system' });
    }
  });
}
