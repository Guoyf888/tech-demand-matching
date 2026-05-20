import { useState, useCallback } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { DemandInput } from '@/components/demand/DemandInput';
import { DemandList } from '@/components/demand/DemandList';
import { AnalysisReport } from '@/components/demand/AnalysisReport';
import { demandStorage } from '@/services/storage/demandStorage';
import { Demand } from '@/types';
import { themes, useThemeStore } from '@/store/themeStore';

export function DemandPage() {
  const [demands, setDemands] = useState<Demand[]>(() => {
    return demandStorage.getAll().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [draftToResume, setDraftToResume] = useState<{ title: string; content: string } | null>(null);

  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  const handleDemandCreated = useCallback((demand: Demand) => {
    setDemands(prev => {
      const updated = prev.filter((d) => d.id !== demand.id);
      return [demand, ...updated].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
    setSelectedDemand(demand);
    setDraftToResume(null);
  }, []);

  const handleResumeDraft = useCallback((demand: Demand) => {
    setDraftToResume({ title: demand.title, content: demand.content });
    setSelectedDemand(null);
  }, []);

  const handleDraftResumed = useCallback(() => {
    setSelectedDemand(null);
  }, []);

  const handleDemandsChange = useCallback(() => {
    const all = demandStorage.getAll().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setDemands(all);
  }, []);

  return (
    <div className="flex flex-col h-full gap-4" style={{ minHeight: 0 }}>
      <Breadcrumb />
      {/* 需求统计概览 */}
      <div className="flex gap-3 flex-shrink-0">
        {[
          { label: '全部需求', count: demands.length, color: themeColors?.primary },
          { label: '草稿', count: demands.filter(d => d.status === 'draft').length, color: themeColors?.warning },
          { label: '已完成', count: demands.filter(d => d.status === 'completed').length, color: themeColors?.success },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: item.color + '15', color: item.color }}>
            <span className="font-bold text-sm">{item.count}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-1 overflow-hidden gap-4" style={{ minHeight: 0 }}>
        <div className="flex-1 flex gap-4 overflow-hidden" style={{ minHeight: 0 }}>
          {/* 左侧：输入区和列表 */}
          <div
            className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto"
            style={{ minHeight: 0 }}
          >
            <DemandInput
              onDemandCreated={handleDemandCreated}
              draftToResume={draftToResume}
              onDraftResumed={handleDraftResumed}
            />
            <DemandList
              demands={demands}
              selectedId={selectedDemand?.id}
              onSelect={(d) => {
                setSelectedDemand(d);
                setDraftToResume(null);
              }}
              onResumeDraft={handleResumeDraft}
              onDemandsChange={handleDemandsChange}
            />
          </div>

          {/* 右侧：详情/报告区 */}
          <div
            className="flex-1 overflow-hidden rounded-xl"
            style={{
              backgroundColor: themeColors?.surface,
              border: `1px solid ${themeColors?.border}`,
              minHeight: 0,
            }}
          >
            {selectedDemand ? (
              <div className="h-full overflow-y-auto p-6">
                {/* Header */}
                <div
                  className="pb-4 mb-4"
                  style={{ borderBottom: `1px solid ${themeColors?.border}` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => setSelectedDemand(null)}
                      className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:scale-[0.98]"
                      style={{
                        backgroundColor: themeColors?.surfaceHover,
                        color: themeColors?.textSecondary,
                      }}
                    >
                      ← 返回列表
                    </button>
                    {selectedDemand.status === 'draft' && (
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: themeColors?.warning + '20',
                          color: themeColors?.warning,
                        }}
                      >
                        📝 草稿
                      </span>
                    )}
                    {selectedDemand.status === 'analyzing' && (
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-medium animate-pulse"
                        style={{
                          backgroundColor: themeColors?.primary + '20',
                          color: themeColors?.primary,
                        }}
                      >
                        ⏳ 分析中
                      </span>
                    )}
                  </div>
                  <h2
                    className="text-xl font-bold break-words leading-tight"
                    style={{ color: themeColors?.text }}
                  >
                    {selectedDemand.title || '未命名需求'}
                  </h2>
                  <p
                    className="text-xs mt-2"
                    style={{ color: themeColors?.textHint }}
                  >
                    创建于 {new Date(selectedDemand.createdAt).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Analysis Report */}
                <AnalysisReport demand={selectedDemand} />
              </div>
            ) : (
              <div
                className="h-full flex flex-col items-center justify-center gap-4"
                style={{ color: themeColors?.textHint }}
              >
                <span className="text-5xl">📊</span>
                <p className="text-base">选择一个需求查看分析报告</p>
                {draftToResume && (
                  <p
                    className="text-sm animate-fade-in"
                    style={{ color: themeColors?.primary }}
                  >
                    正在编辑草稿，请填写完成后提交分析
                  </p>
                )}
                {demands.length === 0 && (
                  <p className="text-sm">在左侧输入技术需求开始使用</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
