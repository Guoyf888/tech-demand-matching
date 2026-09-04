import { useState, useEffect } from 'react';
import { demandStorage } from '@/services/storage/demandStorage';
import { techStorage } from '@/services/storage/techStorage';
import { runMatching, type MatchingRunResult } from '@/services/matching';
import { Demand, TechResult } from '@/types';
import { useThemeColors } from '@/store/themeStore';
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
  const [lastRun, setLastRun] = useState<MatchingRunResult | null>(null);
  const [unexpectedError, setUnexpectedError] = useState<string | null>(null);
  const [demandCount, setDemandCount] = useState(0);
  const [techCount, setTechCount] = useState(0);
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [showFilter, setShowFilter] = useState(false);

  const themeColors = useThemeColors();

  // 加载统计
  useEffect(() => {
    const demands = demandStorage.getAll().filter(d => d.status === 'completed');
    const techs = techStorage.getAll().filter(t => t.status === 'completed');
    setDemandCount(demands.length);
    setTechCount(techs.length);
  }, []);

  const handleMatch = async () => {
    setIsMatching(true);
    setUnexpectedError(null);

    try {
      const demands = demandStorage.getAll();
      const techResults = techStorage.getAll();
      const run = await runMatching(demands, techResults);
      setMatches(run.matches);
      setLastRun(run);
      setHasRun(true);
      setDemandCount(demands.filter(d => d.status === 'completed').length);
      setTechCount(techResults.filter(t => t.status === 'completed').length);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '匹配过程出现未知错误';
      console.error('匹配失败:', msg);
      setMatches([]);
      setLastRun(null);
      setUnexpectedError(msg);
      setHasRun(true);
    } finally {
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

      {/* 运行状态：不展示虚构百分比 */}
      {isMatching && (
        <div
          className="animate-pulse rounded-lg px-4 py-3 text-sm"
          style={{ color: themeColors?.primary, backgroundColor: themeColors?.primaryLight }}
        >
          正在评估候选组合，完成前不显示估算百分比…
        </div>
      )}

      {lastRun && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            color: lastRun.status === 'failed' || lastRun.status === 'not_configured'
              ? themeColors?.error
              : lastRun.status === 'partial'
                ? themeColors?.warning
                : themeColors?.textSecondary,
            backgroundColor: lastRun.status === 'failed' || lastRun.status === 'not_configured'
              ? themeColors?.error + '12'
              : lastRun.status === 'partial'
                ? themeColors?.warning + '12'
                : themeColors?.surface,
            border: `1px solid ${lastRun.status === 'failed' || lastRun.status === 'not_configured'
              ? themeColors?.error
              : lastRun.status === 'partial'
                ? themeColors?.warning
                : themeColors?.border}`,
          }}
        >
          <div className="font-medium">
            {lastRun.status === 'failed' ? '匹配执行失败'
              : lastRun.status === 'not_configured' ? '匹配服务未配置'
              : lastRun.status === 'partial' ? '匹配部分完成'
              : lastRun.status === 'no_candidates' ? '没有可评估的候选组合'
              : `匹配完成，共得到 ${lastRun.matchCount} 项结果`}
          </div>
          {lastRun.error && <div className="mt-1">{lastRun.error}</div>}
          <div className="mt-1 text-xs opacity-80">
            候选 {lastRun.candidateCount} · 有效评估 {lastRun.evaluatedCount} · 失败 {lastRun.failedCount}
            {lastRun.provider && ` · ${lastRun.provider}/${lastRun.modelId || '默认模型'}`}
            {` · ${lastRun.durationMs}ms`}
          </div>
        </div>
      )}

      {unexpectedError && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            color: themeColors?.error,
            backgroundColor: themeColors?.error + '12',
            border: `1px solid ${themeColors?.error}`,
          }}
        >
          <div className="font-medium">匹配执行异常</div>
          <div className="mt-1">{unexpectedError}</div>
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
            {unexpectedError || lastRun?.status === 'failed' || lastRun?.status === 'not_configured'
              ? '本次匹配未成功完成'
              : lastRun?.status === 'no_candidates'
                ? '没有可评估的候选组合'
              : matches.length === 0 ? '没有达到阈值的匹配结果' : '没有符合筛选条件的匹配'}
          </p>
          <p
            className="text-sm mt-2"
            style={{ color: themeColors?.textHint }}
          >
            {unexpectedError || lastRun?.status === 'failed' || lastRun?.status === 'not_configured'
              ? '请根据上方错误信息修复后重试'
              : lastRun?.status === 'no_candidates'
                ? (lastRun.error || '请先准备已完成分析的需求和技术成果')
              : matches.length === 0
              ? '候选组合已完成评估，但均低于当前匹配阈值'
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
