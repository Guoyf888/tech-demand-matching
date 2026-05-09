import versionLog from '../../../version_log.json';
import { themes, useThemeStore } from '@/store/themeStore';
import { useVersion } from '@/config/versionConfig';

interface VersionEntry {
  version: string;
  update_time: string;
  content: string[];
}

export function AboutPanel() {
  const { versionInfo } = useVersion();
  const effectiveTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[effectiveTheme as keyof typeof themes]?.colors;

  const versions = versionLog as VersionEntry[];

  return (
    <div className="space-y-6">
      {/* 当前版本信息 */}
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: themeColors?.surface,
          border: `1px solid ${themeColors?.border}`,
        }}
      >
        <h3
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: themeColors?.text }}
        >
          ℹ️ 关于
        </h3>
        <div
          className="space-y-2"
          style={{ color: themeColors?.textSecondary }}
        >
          <p
            className="font-medium text-lg"
            style={{ color: themeColors?.primary }}
          >
            技术需求智能对接系统 {versionInfo.version}
          </p>
          <p>更新时间：{versionInfo.updateTime}</p>
          <p className="pt-2">基于 Tauri + React + TypeScript 构建</p>
          <p>集成 Claude Code CLI + Hermes Agent + OpenClaw</p>
          <p
            className="mt-4 pt-4"
            style={{ borderTop: `1px solid ${themeColors?.border}` }}
          >
            支持企业（需求方）、高校/科研院所（技术方）、服务机构（平台方）三方技术需求对接
          </p>
        </div>
      </div>

      {/* 版本更新记录 */}
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: themeColors?.surface,
          border: `1px solid ${themeColors?.border}`,
        }}
      >
        <h3
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: themeColors?.text }}
        >
          📋 版本更新记录
        </h3>
        <div
          className="space-y-4 max-h-96 overflow-y-auto pr-2"
          style={{ color: themeColors?.textSecondary }}
        >
          {versions.map((entry, index) => (
            <div
              key={entry.version}
              className="pb-4"
              style={{
                borderBottom: index < versions.length - 1 ? `1px solid ${themeColors?.border}` : 'none',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="px-2 py-0.5 rounded text-sm font-medium"
                  style={{
                    backgroundColor: themeColors?.primaryLight,
                    color: themeColors?.primary,
                  }}
                >
                  {entry.version}
                </span>
                <span className="text-xs">{entry.update_time}</span>
                {index === 0 && (
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: themeColors?.successLight,
                      color: themeColors?.success,
                    }}
                  >
                    最新
                  </span>
                )}
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {entry.content.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
