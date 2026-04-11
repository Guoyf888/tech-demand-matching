import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { DemandInput } from '@/components/demand/DemandInput';
import { DemandList } from '@/components/demand/DemandList';
import { AnalysisReport } from '@/components/demand/AnalysisReport';
import { demandStorage } from '@/services/storage/demandStorage';
import { Demand } from '@/types';

export function DemandPage() {
  const [demands, setDemands] = useState<Demand[]>(() => demandStorage.getAll());
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);

  const handleDemandCreated = (demand: Demand) => {
    const updated = demands.filter((d) => d.id !== demand.id);
    setDemands([...updated, demand]);
    setSelectedDemand(demand);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-4">
        <Breadcrumb />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeMenu={selectedDemand?.title || '技术需求输入'}
          onMenuChange={() => {}}
        />
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
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
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Link
                    to="/"
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ← 返回列表
                  </Link>
                </div>
                <h3 className="text-xl font-bold mb-4">{selectedDemand.title}</h3>
                <AnalysisReport demand={selectedDemand} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                选择一个需求查看分析报告
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
