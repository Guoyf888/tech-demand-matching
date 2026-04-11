import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { TechUpload } from '@/components/tech/TechUpload';
import { TechResultList } from '@/components/tech/TechResultList';
import { TechDetail } from '@/components/tech/TechDetail';
import { techStorage } from '@/services/storage/techStorage';
import { TechResult } from '@/types';
import { themes, useThemeStore } from '@/store/themeStore';

export function TechPage() {
  const [results, setResults] = useState<TechResult[]>(() => techStorage.getAll());
  const [selectedResult, setSelectedResult] = useState<TechResult | null>(null);
  const { theme } = useThemeStore();
  const currentTheme = theme === 'system' ? 'volcano-white' : theme;
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  const handleUploaded = (result: TechResult) => {
    const updated = results.filter((r) => r.id !== result.id);
    setResults([...updated, result]);
    setSelectedResult(result);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <Breadcrumb />
      <div className="flex flex-1 overflow-hidden gap-4">
        <Sidebar
          activeMenu={selectedResult?.title || '上传成果'}
          onMenuChange={() => {}}
        />
        <div className="flex-1 flex gap-4 overflow-hidden">
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
                <TechDetail result={selectedResult} />
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
                选择一个技术成果查看详情
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
