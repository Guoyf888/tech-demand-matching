import { TechResult } from '@/types';
import { themes, useThemeStore } from '@/store/themeStore';

interface TechResultListProps {
  results: TechResult[];
  onSelect: (result: TechResult) => void;
  selectedId?: string;
}

export function TechResultList({ results, onSelect, selectedId }: TechResultListProps) {
  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  return (
    <div
      className="rounded-xl shadow-sm flex flex-col"
      style={{
        backgroundColor: themeColors?.surface,
        border: `1px solid ${themeColors?.border}`,
      }}
    >
      <div
        className="p-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${themeColors?.border}` }}
      >
        <h3
          className="text-lg font-semibold"
          style={{ color: themeColors?.text }}
        >
          我的成果 ({results.length})
        </h3>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: '384px', minHeight: 0 }}
      >
        {results.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{ color: themeColors?.textHint }}
          >
            暂无成果，尝试上传第一个技术成果吧
          </div>
        ) : (
          results.map((result, index) => (
            <button
              key={result.id}
              onClick={() => onSelect(result)}
              className="w-full text-left p-4 transition-all relative group"
              style={{
                backgroundColor: selectedId === result.id
                  ? themeColors?.primaryLight
                  : 'transparent',
                color: selectedId === result.id
                  ? themeColors?.primary
                  : themeColors?.text,
                borderBottom: index < results.length - 1
                  ? `1px solid ${themeColors?.border}`
                  : 'none',
              }}
            >
              {/* 选中指示器 */}
              {selectedId === result.id && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: themeColors?.primary }}
                />
              )}

              {/* Hover效果 */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  backgroundColor: selectedId === result.id
                    ? 'transparent'
                    : themeColors?.surfaceHover,
                }}
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className="font-medium truncate flex-1"
                    style={{ color: selectedId === result.id
                      ? themeColors?.primary
                      : themeColors?.text }}
                  >
                    {result.title}
                  </h4>
                  {result.status === 'processing' && (
                    <span
                      className="px-2 py-0.5 rounded text-xs flex-shrink-0 animate-pulse"
                      style={{
                        backgroundColor: themeColors?.primary,
                        color: '#fff',
                      }}
                    >
                      分析中
                    </span>
                  )}
                </div>

                {result.summary && (
                  <p
                    className="text-sm mt-1 line-clamp-2"
                    style={{ color: themeColors?.textSecondary }}
                  >
                    {result.summary}
                  </p>
                )}

                {result.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {result.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: themeColors?.primaryLight,
                          color: themeColors?.primary,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {result.tags.length > 3 && (
                      <span
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ color: themeColors?.textHint }}
                      >
                        +{result.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div
                  className="text-xs mt-2"
                  style={{ color: themeColors?.textHint }}
                >
                  {new Date(result.createdAt).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
