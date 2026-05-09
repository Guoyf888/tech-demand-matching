import { useApiStore } from '@/store/apiStore';
import { themes, useThemeStore } from '@/store/themeStore';

export function Footer() {
  const { configs, activeProvider } = useApiStore();
  
  const currentConfig = configs[activeProvider];

  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  return (
    <footer
      className="px-4 py-2 text-xs"
      style={{
        backgroundColor: themeColors?.surface,
        borderTop: `1px solid ${themeColors?.border}`,
        color: themeColors?.textSecondary,
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            {currentConfig?.apiKey ? '✅' : '⚠️'} 已连接 {activeProvider.toUpperCase()}
          </span>
          <span className="flex items-center gap-1">
            🔑 {currentConfig?.apiKey ? 'API已配置' : 'API未配置'}
          </span>
          <span>📦 本地存储</span>
        </div>
        <div>
          <span>v1.0.0 | 技术需求智能对接系统</span>
        </div>
      </div>
    </footer>
  );
}
