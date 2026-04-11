import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { DemandInput } from '@/components/demand/DemandInput';
import { DemandList } from '@/components/demand/DemandList';
import { AnalysisReport } from '@/components/demand/AnalysisReport';
import { demandStorage } from '@/services/storage/demandStorage';
import { Demand } from '@/types';
import { themes, useThemeStore } from '@/store/themeStore';

export function DemandPage() {
  const [demands, setDemands] = useState<Demand[]>(() => demandStorage.getAll());
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const { theme } = useThemeStore();
  const currentTheme = theme === 'system' ? 'volcano-white' : theme;
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  const handleDemandCreated = (demand: Demand) => {
    const updated = demands.filter((d) => d.id !== demand.id);
    setDemands([...updated, demand]);
    setSelectedDemand(demand);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <Breadcrumb />
      <div className="flex flex-1 overflow-hidden gap-4">
        <Sidebar
          activeMenu={selectedDemand?.title || '输入需求'}
          onMenuChange={() => {}}
        />
        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className="w-80 flex flex-col gap-4 overflow-y-auto">
            <DemandInput onDemandCreated={handleDemandCreated} />
            <DemandList
              demands={demands}
              selectedId={selectedDemand?.id}
              onSelect={setSelectedDemand}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {selectedDemand ? (
              <div
                className="rounded-xl p-6 h-full"
                style={{
                  backgroundColor: themeColors?.surface,
                  border: `1px solid ${themeColors?.border}`,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Link
                    to="/"
                    className="px-3 py-1 rounded-lg text-sm transition-colors"
                    style={{
                      backgroundColor: themeColors?.surfaceHover,
                      color: themeColors?.text,
                    }}
                  >
                    ← 返回
                  </Link>
                </div>
                <h3 className="text-xl font-bold mb-4" style={{ color: themeColors?.text }}>
                  {selectedDemand.title}
                </h3>
                <AnalysisReport demand={selectedDemand} />
              </div>
            ) : (
              <div
                className="flex items-center justify-center h-full rounded-xl"
                style={{
                  backgroundColor: themeColors?.surface,
                  border: `1px solid ${themeColors?.border}`,
                  color: themeColors?.textSecondary,
                }}
              >
                选择一个需求查看分析报告
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
