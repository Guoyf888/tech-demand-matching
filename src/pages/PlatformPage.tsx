import { useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MatchPanel } from '@/components/platform/MatchPanel';
import { MatchProjectBoard } from '@/components/platform/MatchProjectBoard';
import { useThemeColors } from '@/store/themeStore';
import { FolderKanban, Target } from 'lucide-react';

export function PlatformPage() {
  const [activeView, setActiveView] = useState<'matching' | 'projects'>('matching');
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
          <h2 className="text-base font-bold" style={{ color: themeColors?.text }}>专业匹配与项目推进台</h2>
          <p className="text-xs" style={{ color: themeColors?.textHint }}>从候选研判、人工复核到对接项目持续推进</p>
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
        <div className="flex gap-2 mb-5" role="tablist" aria-label="专业匹配工作台视图">
          <button type="button" role="tab" aria-selected={activeView === 'matching'} onClick={() => setActiveView('matching')} className="px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2" style={{ backgroundColor: activeView === 'matching' ? themeColors.primary : themeColors.background, color: activeView === 'matching' ? '#fff' : themeColors.textSecondary, border: `1px solid ${activeView === 'matching' ? themeColors.primary : themeColors.border}` }}><Target size={15} />匹配评估</button>
          <button type="button" role="tab" aria-selected={activeView === 'projects'} onClick={() => setActiveView('projects')} className="px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2" style={{ backgroundColor: activeView === 'projects' ? themeColors.primary : themeColors.background, color: activeView === 'projects' ? '#fff' : themeColors.textSecondary, border: `1px solid ${activeView === 'projects' ? themeColors.primary : themeColors.border}` }}><FolderKanban size={15} />项目推进</button>
        </div>
        {activeView === 'matching'
          ? <MatchPanel onOpenProjects={() => setActiveView('projects')} />
          : <MatchProjectBoard />}
      </div>
    </div>
  );
}
