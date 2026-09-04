import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MatchPanel } from '@/components/platform/MatchPanel';
import { useThemeColors } from '@/store/themeStore';
import { Target } from 'lucide-react';

export function PlatformPage() {
  const themeColors = useThemeColors();

  return (
    <div className="flex flex-col h-full gap-4" style={{ minHeight: 0 }}>
      <Breadcrumb />
      {/* 专业匹配工作台标题 */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: themeColors?.primary }}>
          <Target size={18} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: themeColors?.text }}>专业匹配工作台</h2>
          <p className="text-xs" style={{ color: themeColors?.textHint }}>候选评估、证据解释、人工复核与批次留痕</p>
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
