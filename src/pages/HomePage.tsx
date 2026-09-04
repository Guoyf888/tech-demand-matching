/**
 * 首页 - 全屏AI对话
 */
import { AIAgentChat } from '@/components/agent/AIAgentChat';
import { useThemeColors } from '@/store/themeStore';

export function HomePage() {
  const themeColors = useThemeColors();

  return (
    <div
      className="home-page"
      style={{
        backgroundColor: themeColors?.background,
      }}
    >
      <AIAgentChat />
    </div>
  );
}
