/**
 * 首页 - 全屏AI对话
 */
import { AIAgentChat } from '@/components/agent/AIAgentChat';
import { themes, useThemeStore } from '@/store/themeStore';

export function HomePage() {
  const { theme } = useThemeStore();
  const currentTheme = theme === 'system' ? 'volcano-white' : theme;
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  return (
    <div
      className="h-full p-4"
      style={{
        backgroundColor: themeColors?.background,
      }}
    >
      <AIAgentChat />
    </div>
  );
}
