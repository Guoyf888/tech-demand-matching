import { Demand } from '@/types';

interface DemandListProps {
  demands: Demand[];
  onSelect: (demand: Demand) => void;
  selectedId?: string;
}

export function DemandList({ demands, onSelect, selectedId }: DemandListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="text-lg font-semibold">我的需求 ({demands.length})</h3>
      </div>

      <div className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
        {demands.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无需求，点击上方输入框添加
          </div>
        ) : (
          demands.map((demand) => (
            <button
              key={demand.id}
              onClick={() => onSelect(demand)}
              className={`w-full text-left p-4 transition-colors ${
                selectedId === demand.id
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{demand.title}</h4>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {demand.content}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {demand.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    demand.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : demand.status === 'analyzing'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {demand.status === 'completed'
                    ? '已完成'
                    : demand.status === 'analyzing'
                    ? '分析中'
                    : '草稿'}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
