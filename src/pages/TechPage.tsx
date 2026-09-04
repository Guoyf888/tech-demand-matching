import { useState, useEffect } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { TechUpload } from '@/components/tech/TechUpload';
import { TechResultList } from '@/components/tech/TechResultList';
import { TechDetail } from '@/components/tech/TechDetail';
import { techStorage } from '@/services/storage/techStorage';
import { TechResult } from '@/types';
import { useThemeColors } from '@/store/themeStore';
import { sortManagedResources } from '@/utils/resourceManagement';
import { ArrowLeft, FilePlus2, FileSearch } from 'lucide-react';

export function TechPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'draft'>('all');
  const [results, setResults] = useState<TechResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<TechResult | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [view, setView] = useState<'browse' | 'create'>('browse');

  const themeColors = useThemeColors();

  // 初始化加载成果列表
  useEffect(() => {
    const sortedResults = sortManagedResources(techStorage.getAll());
    setResults(sortedResults);
    // 如果有成果，默认选中第一个
    if (sortedResults.length > 0 && !selectedResult) {
      setSelectedResult(sortedResults[0]);
    }
    setIsLoaded(true);
  }, []);

  const handleUploaded = (result: TechResult) => {
    setResults((prev) => {
      const updated = prev.filter((r) => r.id !== result.id);
      return sortManagedResources([result, ...updated]);
    });
    setSelectedResult(result);
    setView('browse');
  };

  const handleResultUpdated = (updatedResult: TechResult) => {
    setResults((current) => sortManagedResources(
      current.map((result) => result.id === updatedResult.id ? updatedResult : result),
    ));
    setSelectedResult((current) => current?.id === updatedResult.id ? updatedResult : current);
  };

  const handleResultDeleted = (id: string) => {
    const remaining = sortManagedResources(techStorage.getAll());
    setResults(remaining);
    setSelectedResult((current) => current?.id === id ? remaining[0] || null : current);
  };

  const handleResultsReplaced = (updatedResults: TechResult[]) => {
    const sorted = sortManagedResources(updatedResults);
    setResults(sorted);
    setSelectedResult((current) => current ? sorted.find((result) => result.id === current.id) || sorted[0] || null : sorted[0] || null);
  };

  const statusItems = [
    { key: 'all' as const, label: '全部', count: results.length },
    { key: 'completed' as const, label: '已分析', count: results.filter((result) => result.status === 'completed').length },
    { key: 'processing' as const, label: '分析中', count: results.filter((result) => result.status === 'processing').length },
    { key: 'draft' as const, label: '草稿', count: results.filter((result) => result.status === 'draft').length },
  ];

  return (
    <div className="workspace-page resource-workspace tech-page flex flex-col h-full" style={{ minHeight: 0 }}>
      <Breadcrumb />
      <div className="resource-page-header">
        <div>
          <h1 style={{ color: themeColors?.text }}>我的成果</h1>
          <span style={{ color: themeColors?.textHint }}>{results.length} 项成果</span>
        </div>
        <button type="button" className={view === 'create' ? 'workspace-form-action is-secondary' : 'workspace-form-action is-primary'} onClick={() => setView(view === 'create' ? 'browse' : 'create')}>
          {view === 'create' ? <ArrowLeft size={16} /> : <FilePlus2 size={16} />}
          {view === 'create' ? '返回成果库' : '新建或导入成果'}
        </button>
      </div>

      {view === 'browse' && (
        <div className="resource-filter-bar" role="group" aria-label="成果状态筛选">
          {statusItems.map((item) => (
            <button key={item.key} type="button" aria-pressed={statusFilter === item.key} onClick={() => { setStatusFilter(item.key); setSelectedResult(null); }} className={statusFilter === item.key ? 'is-active' : ''} style={{ color: statusFilter === item.key ? themeColors?.primary : themeColors?.textSecondary }}>
              <span>{item.label}</span><strong>{item.count}</strong>
            </button>
          ))}
        </div>
      )}

      {view === 'create' ? (
        <div className="resource-create-view">
          <TechUpload onUploaded={handleUploaded} />
        </div>
      ) : (
        <div className="resource-browser-grid">
          <aside className="resource-master-pane">
            <TechResultList
              results={results}
              statusFilter={statusFilter}
              selectedId={selectedResult?.id}
              onSelect={setSelectedResult}
              onResultUpdated={handleResultUpdated}
              onResultDeleted={handleResultDeleted}
              onResultsReplaced={handleResultsReplaced}
            />
          </aside>
          <main className="resource-detail-pane" style={{ backgroundColor: themeColors?.surface, border: `1px solid ${themeColors?.border}` }}>
            {selectedResult ? (
              <TechDetail result={selectedResult} />
            ) : (
              <div className="resource-empty-state" style={{ color: themeColors?.textHint }}>
                <FileSearch size={34} strokeWidth={1.5} />
                <p>选择一项成果查看详情</p>
                {isLoaded && results.length === 0 && (
                  <button type="button" className="workspace-form-action is-primary" onClick={() => setView('create')}><FilePlus2 size={16} />新建成果</button>
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
