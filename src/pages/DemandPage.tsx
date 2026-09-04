import { useState, useCallback, useEffect } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { DemandInput } from '@/components/demand/DemandInput';
import { DemandList } from '@/components/demand/DemandList';
import { AnalysisReport } from '@/components/demand/AnalysisReport';
import { demandStorage } from '@/services/storage/demandStorage';
import { Demand } from '@/types';
import { useThemeColors } from '@/store/themeStore';
import { sortManagedResources } from '@/utils/resourceManagement';
import { ArrowLeft, FileSearch, Plus } from 'lucide-react';

export function DemandPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'draft'>('all');
  const [demands, setDemands] = useState<Demand[]>(() => {
    return sortManagedResources(demandStorage.getAll());
  });
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [draftToResume, setDraftToResume] = useState<{ title: string; content: string } | null>(null);
  const [view, setView] = useState<'browse' | 'create'>('browse');

  const themeColors = useThemeColors();

  useEffect(() => {
    if (!selectedDemand && demands.length > 0 && view === 'browse') setSelectedDemand(demands[0]);
  }, [demands, selectedDemand, view]);

  const handleDemandCreated = useCallback((demand: Demand) => {
    setDemands(prev => {
      const updated = prev.filter((d) => d.id !== demand.id);
      return sortManagedResources([demand, ...updated]);
    });
    setSelectedDemand(demand);
    setDraftToResume(null);
    if (demand.status !== 'analyzing') setView('browse');
  }, []);

  const handleResumeDraft = useCallback((demand: Demand) => {
    setDraftToResume({ title: demand.title, content: demand.content });
    setSelectedDemand(null);
    setView('create');
  }, []);

  const handleDraftResumed = useCallback(() => {
    setSelectedDemand(null);
  }, []);

  const handleDemandUpdated = useCallback((updatedDemand: Demand) => {
    setDemands((current) => sortManagedResources(
      current.map((demand) => demand.id === updatedDemand.id ? updatedDemand : demand),
    ));
    setSelectedDemand((current) => current?.id === updatedDemand.id ? updatedDemand : current);
  }, []);

  const handleDemandDeleted = useCallback((id: string) => {
    const remaining = sortManagedResources(demandStorage.getAll());
    setDemands(remaining);
    setSelectedDemand((current) => current?.id === id ? remaining[0] || null : current);
  }, []);

  const handleDemandsReplaced = useCallback((updatedDemands: Demand[]) => {
    const sorted = sortManagedResources(updatedDemands);
    setDemands(sorted);
    setSelectedDemand((current) => current ? sorted.find((demand) => demand.id === current.id) || sorted[0] || null : sorted[0] || null);
  }, []);

  const statusItems = [
    { key: 'all' as const, label: '全部', count: demands.length },
    { key: 'completed' as const, label: '已分析', count: demands.filter((demand) => demand.status === 'completed').length },
    { key: 'processing' as const, label: '分析中', count: demands.filter((demand) => demand.status === 'analyzing').length },
    { key: 'draft' as const, label: '草稿', count: demands.filter((demand) => demand.status === 'draft').length },
  ];

  return (
    <div className="workspace-page resource-workspace demand-page flex flex-col h-full" style={{ minHeight: 0 }}>
      <Breadcrumb />
      <div className="resource-page-header">
        <div>
          <h1 style={{ color: themeColors?.text }}>我的需求</h1>
          <span style={{ color: themeColors?.textHint }}>{demands.length} 项需求</span>
        </div>
        <button type="button" className={view === 'create' ? 'workspace-form-action is-secondary' : 'workspace-form-action is-primary'} onClick={() => { setView(view === 'create' ? 'browse' : 'create'); if (view === 'browse') { setDraftToResume(null); setSelectedDemand(null); } }}>
          {view === 'create' ? <ArrowLeft size={16} /> : <Plus size={16} />}
          {view === 'create' ? '返回需求库' : '新建或导入需求'}
        </button>
      </div>

      {view === 'browse' && (
        <div className="resource-filter-bar" role="group" aria-label="需求状态筛选">
          {statusItems.map((item) => (
            <button key={item.key} type="button" aria-pressed={statusFilter === item.key} onClick={() => { setStatusFilter(item.key); setSelectedDemand(null); }} className={statusFilter === item.key ? 'is-active' : ''} style={{ color: statusFilter === item.key ? themeColors?.primary : themeColors?.textSecondary }}>
              <span>{item.label}</span><strong>{item.count}</strong>
            </button>
          ))}
        </div>
      )}

      {view === 'create' ? (
        <div className="resource-create-view">
          <DemandInput onDemandCreated={handleDemandCreated} draftToResume={draftToResume} onDraftResumed={handleDraftResumed} />
        </div>
      ) : (
        <div className="resource-browser-grid">
          <aside className="resource-master-pane">
              <DemandList
                demands={demands}
                statusFilter={statusFilter}
                selectedId={selectedDemand?.id}
                onSelect={(d) => {
                  setSelectedDemand(d);
                  setDraftToResume(null);
                }}
                onResumeDraft={handleResumeDraft}
                onDemandUpdated={handleDemandUpdated}
                onDemandDeleted={handleDemandDeleted}
                onDemandsReplaced={handleDemandsReplaced}
              />
          </aside>
          <main className="resource-detail-pane" style={{ backgroundColor: themeColors?.surface, border: `1px solid ${themeColors?.border}` }}>
            {selectedDemand ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="pb-4 mb-4" style={{ borderBottom: `1px solid ${themeColors?.border}` }}>
                  <div className="flex items-center gap-3 mb-3">
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
              <div className="resource-empty-state" style={{ color: themeColors?.textHint }}>
                <FileSearch size={34} strokeWidth={1.5} />
                <p>选择一项需求查看分析报告</p>
                {demands.length === 0 && (
                  <button type="button" className="workspace-form-action is-primary" onClick={() => setView('create')}><Plus size={16} />新建需求</button>
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
