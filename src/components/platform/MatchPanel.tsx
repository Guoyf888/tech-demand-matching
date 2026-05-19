import { useState, useEffect } from 'react';
import { demandStorage } from '@/services/storage/demandStorage';
import { techStorage } from '@/services/storage/techStorage';
import { findMatches } from '@/services/matching';
import { Demand, TechResult } from '@/types';
import { themes, useThemeStore } from '@/store/themeStore';
import { FileText, Lightbulb, Handshake, Filter, ChevronDown } from 'lucide-react';

interface MatchResult {
  demand: Demand;
  tech: TechResult;
  score: number;
  reason: string;
}

function getScoreLevel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: '优秀', color: '#22c55e' };
  if (score >= 70) return { label: '良好', color: '#3b82f6' };
  return { label: '一般', color: '#f59e0b' };
}

function getSuggestedCooperation(demand: Demand, tech: TechResult): string {
  const text = `${demand.content} ${tech.content} ${tech.summary || ''}`;
  if (/合作研发|联合开发|共同研发/.test(text)) return '合作研发';
  if (/技术许可|许可授权|授权/.test(text)) return '技术许可';
  if (/技术咨询|顾问|咨询/.test(text)) return '技术咨询';
  return '技术转让';
}

function extractCommonKeywords(demand: Demand, tech: TechResult): string[] {
  const demandWords = new Set(
    [...demand.tags, ...(demand.content || '').split(/[\s,，、;；.。]+/).filter(w => w.length > 1)]
      .map(w => w.toLowerCase())
  );
  const techWords = new Set(
    [...tech.tags, ...(tech.content || '').split(/[\s,，、;；.。]+/).filter(w => w.length > 1)]
      .map(w => w.toLowerCase())
  );
  const common: string[] = [];
  for (const w of demandWords) {
    if (techWords.has(w) && !common.includes(w)) common.push(w);
  }
  return common.slice(0, 5);
}

export function MatchPanel() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [progress, setProgress] = useState(0);
  const [demandCount, setDemandCount] = useState(0);
  const [techCount, setTechCount] = useState(0);
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [showFilter, setShowFilter] = useState(false);

  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  // 加载统计
  useEffect(() => {
    const demands = demandStorage.getAll().filter(d => d.status === 'completed');
    const techs = techStorage.getAll().filter(t => t.status === 'completed');
    setDemandCount(demands.length);
    setTechCount(techs.length);
  }, []);

  const handleMatch = async () => {
    setIsMatching(true);
    setProgress(0);

    // 模拟进度
    const progressTimer = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 15, 90));
    }, 800);

    try {
      const demands = demandStorage.getAll();
      const techResults = techStorage.getAll();
      const results = await findMatches(demands, techResults);
      setProgress(100);
      setMatches(results);
      setHasRun(true);
      setDemandCount(demands.filter(d => d.status === 'completed').length);
      setTechCount(techResults.filter(t => t.status === 'completed').length);
    } finally {
      clearInterval(progressTimer);
      setIsMatching(false);
    }
  };

  const filteredMatches = matches.filter(m => m.score >= filterMinScore);

  return (
    <div className="space-y-6">
      {/* 顶部统计 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '技术需求', count: demandCount, icon: <FileText size={20} />, color: themeColors?.primary },
          { label: '科技成果', count: techCount, icon: <Lightbulb size={20} />, color: themeColors?.success },
          { label: '匹配结果', count: matches.length, icon: <Handshake size={20} />, color: themeColors?.warning },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              backgroundColor: themeColors?.surface,
              border: `1px solid ${themeColors?.border}`,
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: stat.color + '15', color: stat.color }}
            >
              {stat.icon}
            </div>
            <div>
              <span className="text-2xl font-bold block" style={{ color: themeColors?.text }}>{stat.count}</span>
              <span className="text-xs" style={{ color: themeColors?.textHint }}>{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <h2
          className="text-xl font-bold"
          style={{ color: themeColors?.text }}
        >
          供需智能匹配
        </h2>
        <div className="flex items-center gap-2">
          {hasRun && (
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all"
              style={{
                backgroundColor: showFilter ? themeColors?.primaryLight : themeColors?.surface,
                borderColor: showFilter ? themeColors?.primary : themeColors?.border,
                color: showFilter ? themeColors?.primary : themeColors?.textSecondary,
              }}
            >
              <Filter size={14} />
              <span>筛选</span>
              <ChevronDown size={14} className={`transition-transform ${showFilter ? 'rotate-180' : ''}`} />
            </button>
          )}
          <button
            onClick={handleMatch}
            disabled={isMatching}
            className="btn-primary px-6"
          >
            {isMatching ? '匹配中...' : '开始匹配'}
          </button>
        </div>
      </div>

      {/* 进度条 */}
      {isMatching && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: themeColors?.textSecondary }}>正在进行智能匹配分析...</span>
            <span className="text-sm font-medium" style={{ color: themeColors?.primary }}>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: themeColors?.border }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${themeColors?.primary}80, ${themeColors?.primary})`,
              }}
            />
          </div>
        </div>
      )}

      {/* 筛选区 */}
      {showFilter && (
        <div
          className="rounded-xl p-4 animate-fade-in"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium" style={{ color: themeColors?.text }}>最低匹配度：</span>
            <div className="flex gap-2">
              {[0, 50, 60, 70, 80].map(val => (
                <button
                  key={val}
                  onClick={() => setFilterMinScore(val)}
                  className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    backgroundColor: filterMinScore === val ? themeColors?.primary + '20' : themeColors?.surfaceHover,
                    color: filterMinScore === val ? themeColors?.primary : themeColors?.textSecondary,
                    border: `1px solid ${filterMinScore === val ? themeColors?.primary + '40' : 'transparent'}`,
                  }}
                >
                  {val === 0 ? '全部' : `${val}%+`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 匹配结果 */}
      {!hasRun ? (
        <div
          className="text-center p-12 rounded-xl"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <span className="text-5xl block mb-4">🔗</span>
          <p
            className="text-base font-medium"
            style={{ color: themeColors?.text }}
          >
            点击"开始匹配"进行需求方与技术方的智能匹配
          </p>
          <p
            className="text-sm mt-2"
            style={{ color: themeColors?.textHint }}
          >
            系统将基于AI分析，从行业、技术领域、关键词等多维度进行匹配评估
          </p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div
          className="text-center p-12 rounded-xl"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <span className="text-5xl block mb-4">📭</span>
          <p
            className="text-base font-medium"
            style={{ color: themeColors?.text }}
          >
            {matches.length === 0 ? '暂无匹配结果' : '没有符合筛选条件的匹配'}
          </p>
          <p
            className="text-sm mt-2"
            style={{ color: themeColors?.textHint }}
          >
            {matches.length === 0
              ? '请确保有已分析完成的需求和技术成果'
              : '请尝试降低筛选条件'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match, index) => {
            const level = getScoreLevel(match.score);
            const commonKeywords = extractCommonKeywords(match.demand, match.tech);
            const cooperation = getSuggestedCooperation(match.demand, match.tech);

            return (
              <div
                key={index}
                className="rounded-xl p-6 transition-all hover:shadow-md"
                style={{
                  backgroundColor: themeColors?.surface,
                  border: `1px solid ${themeColors?.border}`,
                }}
              >
                {/* 匹配头部 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-3xl font-bold"
                      style={{ color: themeColors?.primary }}
                    >
                      {match.score}%
                    </span>
                    <div>
                      <span className="text-sm" style={{ color: themeColors?.textSecondary }}>匹配度</span>
                      <span
                        className="ml-2 px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: level.color + '18',
                          color: level.color,
                        }}
                      >
                        {level.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: themeColors?.primary + '10',
                        color: themeColors?.primary,
                      }}
                    >
                      建议：{cooperation}
                    </span>
                  </div>
                </div>

                {/* 双栏对比 */}
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: themeColors?.surfaceHover }}
                  >
                    <h4
                      className="font-semibold text-sm mb-2 flex items-center gap-1.5"
                      style={{ color: themeColors?.textSecondary }}
                    >
                      <FileText size={14} />
                      <span>需求方</span>
                    </h4>
                    <p
                      className="font-medium mb-2"
                      style={{ color: themeColors?.text }}
                    >
                      {match.demand.title}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
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

                  <div
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: themeColors?.surfaceHover }}
                  >
                    <h4
                      className="font-semibold text-sm mb-2 flex items-center gap-1.5"
                      style={{ color: themeColors?.textSecondary }}
                    >
                      <Lightbulb size={14} />
                      <span>技术方</span>
                    </h4>
                    <p
                      className="font-medium mb-2"
                      style={{ color: themeColors?.text }}
                    >
                      {match.tech.title}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
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

                {/* 共同关键词 */}
                {commonKeywords.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs font-medium mr-2" style={{ color: themeColors?.textHint }}>匹配关键词：</span>
                    <div className="inline-flex gap-1.5 flex-wrap mt-1">
                      {commonKeywords.map(kw => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: themeColors?.warning + '15',
                            color: themeColors?.warning,
                          }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 匹配理由 */}
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: themeColors?.surfaceHover,
                  }}
                >
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: themeColors?.textSecondary }}
                  >
                    {match.reason}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
