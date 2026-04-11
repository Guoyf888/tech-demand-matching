import { ApiConfigPanel } from '@/components/settings/ApiConfigPanel';
import { themes, useThemeStore } from '@/store/themeStore';

export function SettingsPage() {
  const { theme } = useThemeStore();
  const currentTheme = theme === 'system' ? 'volcano-white' : theme;
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6" style={{ color: themeColors?.text }}>设置</h2>

      <div
        className="rounded-xl p-6 mb-6"
        style={{
          backgroundColor: themeColors?.surface,
          border: `1px solid ${themeColors?.border}`,
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors?.text }}>大模型 API 配置</h3>
        <ApiConfigPanel />
      </div>

      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: themeColors?.surface,
          border: `1px solid ${themeColors?.border}`,
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors?.text }}>关于</h3>
        <p style={{ color: themeColors?.textSecondary }}>
          技术需求智能对接系统 v1.0.0
          <br />
          基于 Tauri + React 构建
          <br />
          <br />
          支持企业（需求方）、高校/科研院所（技术方）、服务机构（平台方）三方技术需求对接
        </p>
      </div>
    </div>
  );
}
