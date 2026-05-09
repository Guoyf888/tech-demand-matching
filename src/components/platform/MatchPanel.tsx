import { useState } from 'react';
import { demandStorage } from '@/services/storage/demandStorage';
import { techStorage } from '@/services/storage/techStorage';
import { findMatches } from '@/services/matching';
import { Demand, TechResult } from '@/types';
import { themes, useThemeStore } from '@/store/themeStore';

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

  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

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
        <h2
          className="text-2xl font-bold"
          style={{ color: themeColors?.text }}
        >
          智能匹配
        </h2>
        <button
          onClick={handleMatch}
          disabled={isMatching}
          className="btn-primary px-6"
        >
          {isMatching ? '匹配中...' : '开始匹配'}
        </button>
      </div>

      {!hasRun ? (
        <div
          className="text-center p-12 rounded-xl"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <p
            className="text-base"
            style={{ color: themeColors?.textSecondary }}
          >
            点击"开始匹配"进行需求方与技术方的智能匹配
          </p>
          <p
            className="text-sm mt-2"
            style={{ color: themeColors?.textHint }}
          >
            请确保需求方和技术方都有已分析完成的内容
          </p>
        </div>
      ) : matches.length === 0 ? (
        <div
          className="text-center p-12 rounded-xl"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <p
            className="text-base"
            style={{ color: themeColors?.textSecondary }}
          >
            暂无匹配结果
          </p>
          <p
            className="text-sm mt-2"
            style={{ color: themeColors?.textHint }}
          >
            请确保有已分析的需求和技术成果
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match, index) => (
            <div
              key={index}
              className="rounded-xl p-6"
              style={{
                backgroundColor: themeColors?.surface,
                border: `1px solid ${themeColors?.border}`,
              }}
            >
              <div
                className="flex items-start justify-between mb-4"
              >
                <div>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: themeColors?.primary }}
                  >
                    {match.score}%
                  </span>
                  <span
                    className="ml-2"
                    style={{ color: themeColors?.textSecondary }}
                  >
                    匹配度
                  </span>
                </div>
                <button
                  className="px-4 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: themeColors?.primaryLight,
                    color: themeColors?.primary,
                  }}
                >
                  查看详情
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4
                    className="font-semibold text-sm mb-2"
                    style={{ color: themeColors?.textSecondary }}
                  >
                    需求方
                  </h4>
                  <p
                    className="font-medium"
                    style={{ color: themeColors?.text }}
                  >
                    {match.demand.title}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {match.demand.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: themeColors?.primary + '20',
                          color: themeColors?.primary,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4
                    className="font-semibold text-sm mb-2"
                    style={{ color: themeColors?.textSecondary }}
                  >
                    技术方
                  </h4>
                  <p
                    className="font-medium"
                    style={{ color: themeColors?.text }}
                  >
                    {match.tech.title}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {match.tech.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: themeColors?.success + '20',
                          color: themeColors?.success,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="mt-4 p-3 rounded-lg"
                style={{
                  backgroundColor: themeColors?.surfaceHover,
                }}
              >
                <p
                  className="text-sm"
                  style={{ color: themeColors?.textSecondary }}
                >
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
