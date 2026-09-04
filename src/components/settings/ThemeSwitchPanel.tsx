import { useState } from 'react';
import { useApiStore, ALL_PROVIDERS } from '@/store/apiStore';
import { useThemeColors, useThemeStore, Theme } from '@/store/themeStore';
import { Check, Monitor, Moon, Sun, Trash2, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ThemeOption {
  id: Theme;
  name: string;
  icon: LucideIcon;
  description: string;
  preview: { background: string; surface: string; accent: string; text: string };
}

const themeOptions: ThemeOption[] = [
  {
    id: 'volcano-white',
    name: '科技浅蓝',
    icon: Sun,
    description: '明亮、清晰的科技蓝工作台',
    preview: { background: '#eef6ff', surface: '#ffffff', accent: '#1685f8', text: '#16324f' },
  },
  {
    id: 'tech-blue',
    name: '深海蓝',
    icon: Waves,
    description: '高对比度的深蓝科技界面',
    preview: { background: '#0a1929', surface: '#173a5e', accent: '#00d4ff', text: '#ffffff' },
  },
  {
    id: 'star-black',
    name: '星空黑',
    icon: Moon,
    description: '柔和的深色界面，适合夜间使用',
    preview: { background: '#0f172a', surface: '#1e293b', accent: '#60a5fa', text: '#f1f5f9' },
  },
  {
    id: 'system',
    name: '系统跟随',
    icon: Monitor,
    description: '自动跟随系统主题设置',
    preview: { background: '#e5e7eb', surface: '#ffffff', accent: '#3b82f6', text: '#334155' },
  },
];

export function ThemeSwitchPanel() {
  const { theme: currentThemeName, setTheme } = useThemeStore();
  const themeColors = useThemeColors();

  return (
    <div className="space-y-4">
      <div className="theme-option-grid">
        {themeOptions.map((option) => {
          const OptionIcon = option.icon;
          return (
          <button
            key={option.id}
            onClick={() => setTheme(option.id)}
            className="relative p-4 rounded-xl border-2 transition-all text-left hover:scale-[1.02]"
            style={{
              borderColor: currentThemeName === option.id
                ? themeColors?.primary
                : themeColors?.border,
              backgroundColor: themeColors?.surface,
            }}
          >
            <div
              className="w-full h-16 rounded-lg mb-3 flex items-center justify-center"
              style={{ backgroundColor: option.preview.background }}
            >
              <div
                className="w-4/5 h-10 rounded-md flex items-center gap-2 px-2"
                style={{ backgroundColor: option.preview.surface }}
              >
                <div
                  className="w-2 h-7 rounded-sm"
                  style={{ backgroundColor: option.preview.accent }}
                />
                <div className="flex-1 space-y-1.5">
                  <div className="w-3/4 h-1.5 rounded" style={{ backgroundColor: option.preview.text, opacity: 0.75 }} />
                  <div className="w-1/2 h-1.5 rounded" style={{ backgroundColor: option.preview.text, opacity: 0.25 }} />
                </div>
              </div>
            </div>

            {currentThemeName === option.id && (
              <div
                className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: themeColors?.primary }}
              >
                <Check size={13} strokeWidth={2.5} aria-hidden="true" />
              </div>
            )}

            <div className="flex items-center gap-2 mb-1">
              <OptionIcon size={17} style={{ color: themeColors.primary }} aria-hidden="true" />
              <span
                className="font-medium"
                style={{ color: themeColors?.text }}
              >
                {option.name}
              </span>
            </div>

            <p
              className="text-xs"
              style={{ color: themeColors?.textHint }}
            >
              {option.description}
            </p>
          </button>
          );
        })}
      </div>

      {/* Current Theme Info */}
      <div
        className="p-3 rounded-lg flex items-center justify-between"
        style={{
          backgroundColor: themeColors?.backgroundAlt,
          border: `1px solid ${themeColors?.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: themeColors?.textSecondary }}>
            当前主题：
          </span>
          <span
            className="font-medium"
            style={{ color: themeColors?.text }}
          >
          {themeOptions.find((o) => o.id === currentThemeName)?.name || '科技浅蓝'}
          </span>
        </div>
        <span
          className="text-xs px-2 py-1 rounded"
          style={{
            backgroundColor: themeColors?.primaryLight,
            color: themeColors?.primary,
          }}
        >
          已应用
        </span>
      </div>
    </div>
  );
}

/**
 * 重置所有设置为默认值
 */
export function ResetSettingsButton() {
  const { setTheme } = useThemeStore();
  const apiStore = useApiStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const themeColors = useThemeColors();

  const handleReset = () => {
    // 重置主题
    setTheme('volcano-white');
    // 重置API配置（清除所有提供商的配置）
    ALL_PROVIDERS.forEach((p) => apiStore.setConfig(p, null));
    apiStore.setActiveProvider('openai');

    // 清除本地存储中的相关数据
    localStorage.removeItem('chat-storage');
    localStorage.removeItem('demands');
    localStorage.removeItem('tech_results');

    setShowConfirm(false);
    alert('已恢复所有设置为默认值');
  };

  if (showConfirm) {
    return (
      <div
        className="p-4 rounded-lg border-2"
        style={{
          borderColor: themeColors?.error,
          backgroundColor: themeColors?.error + '10',
        }}
      >
        <p
          className="mb-3 font-medium"
          style={{ color: themeColors?.text }}
        >
          确定要恢复所有设置吗？
        </p>
        <p
          className="mb-4 text-sm"
          style={{ color: themeColors?.textSecondary }}
        >
          这将重置主题、API配置和所有本地数据。此操作不可撤销。
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: themeColors?.error }}
          >
            确认重置
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: themeColors?.surface,
              color: themeColors?.text,
              border: `1px solid ${themeColors?.border}`,
            }}
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="w-full px-4 py-3 rounded-lg font-medium transition-all hover:scale-[1.01]"
      style={{
        backgroundColor: themeColors?.error + '15',
        color: themeColors?.error,
        border: `1px solid ${themeColors?.error}40`,
      }}
    >
      <span className="inline-flex items-center justify-center gap-2">
        <Trash2 size={16} aria-hidden="true" />
        恢复默认设置
      </span>
    </button>
  );
}
