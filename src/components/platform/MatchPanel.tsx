import { useState, useEffect } from 'react';
import { demandStorage } from '@/services/storage/demandStorage';
import { techStorage } from '@/services/storage/techStorage';
import { findMatches } from '@/services/matching';
import { Demand, TechResult } from '@/types';

interface MatchResult {
  demand: Demand;
  tech: TechResult;
  score: number;
  reason: string;
}

export function MatchPanel() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const handleMatch = async () => {
    setIsMatching(true);
    try {
      const demands = demandStorage.getAll();
      const techResults = techStorage.getAll();
      const results = await findMatches(demands, techResults);
      setMatches(results);
      setHasRun(true);
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">智能匹配</h2>
        <button
          onClick={handleMatch}
          disabled={isMatching}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {isMatching ? '匹配中...' : '开始匹配'}
        </button>
      </div>

      {!hasRun ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500">点击"开始匹配"进行需求方与技术方的智能匹配</p>
          <p className="text-sm text-gray-400 mt-2">
            请确保需求方和技术方都有已分析完成的内容
          </p>
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500">暂无匹配结果</p>
          <p className="text-sm text-gray-400 mt-2">
            请确保有已分析的需求和技术成果
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-2xl font-bold text-primary-600">
                    {match.score}%
                  </span>
                  <span className="ml-2 text-gray-500">匹配度</span>
                </div>
                <button className="px-4 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                  查看详情
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm text-gray-500 mb-2">
                    需求方
                  </h4>
                  <p className="font-medium">{match.demand.title}</p>
                  <div className="flex gap-2 mt-2">
                    {match.demand.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-gray-500 mb-2">
                    技术方
                  </h4>
                  <p className="font-medium">{match.tech.title}</p>
                  <div className="flex gap-2 mt-2">
                    {match.tech.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {match.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
