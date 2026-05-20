import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MatchPanel } from '@/components/platform/MatchPanel';
import { themes, useThemeStore } from '@/store/themeStore';

export function PlatformPage() {
  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  return (
    <div className="flex flex-col h-full gap-4" style={{ minHeight: 0 }}>
      <Breadcrumb />
      {/* 匹配引擎标题 */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: themeColors?.primary }}>
          🎯
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: themeColors?.text }}>智能供需匹配引擎</h2>
          <p className="text-xs" style={{ color: themeColors?.textHint }}>基于AI的多维度技术供需匹配分析</p>
        </div>
      </div>
      <div
        className="flex-1 rounded-xl p-6 overflow-y-auto"
        style={{
          backgroundColor: themeColors?.surface,
          border: `1px solid ${themeColors?.border}`,
          minHeight: 0,
        }}
      >
        <MatchPanel />
      </div>
    </div>
  );
}
