import { useState, useEffect } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { TechUpload } from '@/components/tech/TechUpload';
import { TechResultList } from '@/components/tech/TechResultList';
import { TechDetail } from '@/components/tech/TechDetail';
import { techStorage } from '@/services/storage/techStorage';
import { TechResult } from '@/types';
import { themes, useThemeStore } from '@/store/themeStore';

export function TechPage() {
  const [results, setResults] = useState<TechResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<TechResult | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  // 初始化加载成果列表
  useEffect(() => {
    const storedResults = techStorage.getAll();
    // 按时间倒序排列
    const sortedResults = storedResults.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
      return [result, ...updated];
    });
    setSelectedResult(result);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <Breadcrumb />
      <div className="flex flex-1 overflow-hidden gap-4">
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* 左侧：上传区和成果列表 */}
          <div
            className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto"
            style={{ minHeight: 0 }}
          >
            <TechUpload onUploaded={handleUploaded} />
            <TechResultList
              results={results}
              selectedId={selectedResult?.id}
              onSelect={setSelectedResult}
            />
          </div>

          {/* 右侧：成果详情 */}
          <div
            className="flex-1 overflow-hidden rounded-xl"
            style={{
              backgroundColor: themeColors?.surface,
              border: `1px solid ${themeColors?.border}`,
            }}
          >
            {selectedResult ? (
              <div className="h-full overflow-y-auto p-6">
                <TechDetail result={selectedResult} />
              </div>
            ) : (
              <div
                className="h-full flex flex-col items-center justify-center gap-4"
                style={{ color: themeColors?.textHint }}
              >
                <span className="text-5xl">📋</span>
                <p className="text-base">选择一个技术成果查看详情</p>
                {isLoaded && results.length === 0 && (
                  <p className="text-sm">上传第一个技术成果开始使用吧</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
