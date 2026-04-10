import { TechResult } from '@/types';

interface TechResultListProps {
  results: TechResult[];
  onSelect: (result: TechResult) => void;
  selectedId?: string;
}

export function TechResultList({ results, onSelect, selectedId }: TechResultListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="text-lg font-semibold">我的成果 ({results.length})</h3>
      </div>

      <div className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
        {results.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无成果</div>
        ) : (
          results.map((result) => (
            <button
              key={result.id}
              onClick={() => onSelect(result)}
              className={`w-full text-left p-4 transition-colors ${
                selectedId === result.id
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <h4 className="font-medium truncate">{result.title}</h4>
              {result.summary && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {result.summary}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                {result.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
