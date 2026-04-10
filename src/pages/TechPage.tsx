import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TechUpload } from '@/components/tech/TechUpload';
import { TechResultList } from '@/components/tech/TechResultList';
import { TechDetail } from '@/components/tech/TechDetail';
import { techStorage } from '@/services/storage/techStorage';
import { TechResult } from '@/types';

export function TechPage() {
  const [results, setResults] = useState<TechResult[]>(() => techStorage.getAll());
  const [selectedResult, setSelectedResult] = useState<TechResult | null>(null);

  const handleUploaded = (result: TechResult) => {
    const updated = results.filter((r) => r.id !== result.id);
    setResults([...updated, result]);
    setSelectedResult(result);
  };

  return (
    <div className="flex h-full">
      <Sidebar
        activeMenu={selectedResult?.title || '上传成果'}
        onMenuChange={() => {}}
      />
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        <div className="w-80 flex flex-col gap-4 overflow-y-auto">
          <TechUpload onUploaded={handleUploaded} />
          <TechResultList
            results={results}
            selectedId={selectedResult?.id}
            onSelect={setSelectedResult}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedResult ? (
            <TechDetail result={selectedResult} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              选择一个技术成果查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
