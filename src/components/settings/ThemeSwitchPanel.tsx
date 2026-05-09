import { useState } from 'react';
import { useApiStore } from '@/store/apiStore';
import { themes, useThemeStore, Theme } from '@/store/themeStore';

interface ThemeOption {
  id: Theme;
  name: string;
  icon: string;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    id: 'volcano-white',
    name: '火山白',
    icon: '☀️',
    description: '明亮的浅色界面，适合白天使用',
  },
  {
    id: 'star-black',
    name: '星空黑',
    icon: '🌙',
    description: '柔和的深色界面，适合夜间使用',
  },
  {
    id: 'system',
    name: '系统跟随',
    icon: '💻',
    description: '自动跟随系统主题设置',
  },
];

export function ThemeSwitchPanel() {
  const { theme: currentThemeName, setTheme } = useThemeStore();
  const effectiveTheme = currentThemeName === 'system' ? 'volcano-white' : currentThemeName;
  const themeColors = themes[effectiveTheme as keyof typeof themes]?.colors;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {themeOptions.map((option) => (
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
            {/* Theme Preview */}
            <div
              className="w-full h-16 rounded-lg mb-3 flex items-center justify-center"
              style={{
                backgroundColor: option.id === 'volcano-white' || option.id === 'berry-pink' ? '#FFFFFF' : '#1E1E1E',
              }}
            >
              <div className="text-center">
                <div
                  className="w-8 h-8 rounded-full mx-auto mb-1"
                  style={{
                    backgroundColor: option.id === 'volcano-white' ? '#0ea5e9' : '#60a5fa',
                  }}
                />
                <div
                  className="w-12 h-2 rounded"
                  style={{
                    backgroundColor: option.id === 'volcano-white' || option.id === 'berry-pink' ? '#333333' : '#FFFFFF',
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>

            {/* Selected indicator */}
            {currentThemeName === option.id && (
              <div
                className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: themeColors?.primary }}
              >
                ✓
              </div>
            )}

            {/* Theme Name */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{option.icon}</span>
              <span
                className="font-medium"
                style={{ color: themeColors?.text }}
              >
                {option.name}
              </span>
            </div>

            {/* Description */}
            <p
              className="text-xs"
              style={{ color: themeColors?.textHint }}
            >
              {option.description}
            </p>
          </button>
        ))}
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
            {themeOptions.find((o) => o.id === currentThemeName)?.name || '火山白'}
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

  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  const handleReset = () => {
    // 重置主题
    setTheme('volcano-white');

    // 重置API配置（清除所有提供商的配置）
    const providers = ['openai', 'claude', 'gemini', 'ernie', 'qwen', 'zhipu', 'minimax', 'kimi', 'openrouter', 'custom'] as const;
    providers.forEach((p) => apiStore.setConfig(p, null));
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
      🗑️ 恢复默认设置
    </button>
  );
}
