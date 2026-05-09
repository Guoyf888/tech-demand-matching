import { ApiConfigPanel } from '@/components/settings/ApiConfigPanel';
import { ThemeSwitchPanel, ResetSettingsButton } from '@/components/settings/ThemeSwitchPanel';
import AboutSettings from '@/components/settings/AboutSettings';
import { themes, useThemeStore } from '@/store/themeStore';

export function SettingsPage() {
  const effectiveTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[effectiveTheme as keyof typeof themes]?.colors;

  return (
    <div
      className="max-w-4xl mx-auto animate-scale-in overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
    >
      <h2
        className="text-xl font-bold mb-6"
        style={{ color: themeColors?.text }}
      >
        设置
      </h2>

      {/* Theme Switch Card */}
      <div
        className="rounded-xl p-6 mb-4"
        style={{
          backgroundColor: themeColors?.surface,
          border: `1px solid ${themeColors?.border}`,
        }}
      >
        <h3
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: themeColors?.text }}
        >
          🎨 主题切换
        </h3>
        <ThemeSwitchPanel />
      </div>

      {/* API Config Card */}
      <div
        className="rounded-xl p-6 mb-4"
        style={{
          backgroundColor: themeColors?.surface,
          border: `1px solid ${themeColors?.border}`,
        }}
      >
        <h3
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: themeColors?.text }}
        >
          🔑 大模型 API 配置
        </h3>
        <ApiConfigPanel />
      </div>

      {/* Reset Settings Card */}
      <div
        className="rounded-xl p-6 mb-4"
        style={{
          backgroundColor: themeColors?.surface,
          border: `1px solid ${themeColors?.border}`,
        }}
      >
        <h3
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: themeColors?.text }}
        >
          🔄 高级设置
        </h3>
        <ResetSettingsButton />
      </div>

      {/* About Settings - 版本信息 */}
      <AboutSettings />
    </div>
  );
}
