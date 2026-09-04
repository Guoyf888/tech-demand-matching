import { useEffect, useMemo, useState } from 'react';
import { demandStorage } from '@/services/storage/demandStorage';
import { techStorage } from '@/services/storage/techStorage';
import { runMatching, type MatchResult } from '@/services/matching';
import {
  matchRunStorage,
  type MatchDimensionScores,
  type MatchRunAudit,
  type MatchRunSnapshot,
} from '@/services/storage/matchRunStorage';
import {
  matchReviewStorage,
  type MatchReview,
  type MatchReviewDecision,
} from '@/services/storage/matchReviewStorage';
import type { Demand, TechResult } from '@/types';
import { useThemeColors } from '@/store/themeStore';
import {
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Handshake,
  History,
  Lightbulb,
  PlayCircle,
  ShieldAlert,
  XCircle,
} from 'lucide-react';

interface WorkbenchMatch {
  demandId: string;
  demandTitle: string;
  demandTags: string[];
  techId: string;
  techTitle: string;
  techTags: string[];
  score: number;
  reason: string;
  dimensions?: MatchDimensionScores;
  strengths?: string[];
  risks?: string[];
  nextStep?: string;
}

const DIMENSION_LABELS: Array<[keyof MatchDimensionScores, string]> = [
  ['technicalFit', '技术能力'],
  ['scenarioFit', '应用场景'],
  ['maturityFit', '成熟条件'],
  ['deliveryFit', '交付可行'],
];

const DECISION_LABELS: Record<MatchReviewDecision, string> = {
  pending: '待复核',
  approved: '已认可',
  rejected: '已驳回',
};

function pairKey(demandId: string, techId: string): string {
  return `${demandId}::${techId}`;
}

function fromMatch(match: MatchResult): WorkbenchMatch {
  return {
    demandId: match.demand.id,
    demandTitle: match.demand.title,
    demandTags: match.demand.tags,
    techId: match.tech.id,
    techTitle: match.tech.title,
    techTags: match.tech.tags,
    score: match.score,
    reason: match.reason,
    dimensions: match.dimensions,
    strengths: match.strengths,
    risks: match.risks,
    nextStep: match.nextStep,
  };
}

function fromSnapshot(snapshot: MatchRunSnapshot): WorkbenchMatch {
  return { ...snapshot };
}

function getScoreLevel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: '优先对接', color: '#16a34a' };
  if (score >= 70) return { label: '建议复核', color: '#2563eb' };
  if (score >= 50) return { label: '补充核验', color: '#d97706' };
  return { label: '低匹配', color: '#64748b' };
}

function formatRunTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MatchPanel() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [techResults, setTechResults] = useState<TechResult[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState('');
  const [results, setResults] = useState<WorkbenchMatch[]>([]);
  const [activeRun, setActiveRun] = useState<MatchRunAudit | null>(null);
  const [runs, setRuns] = useState<MatchRunAudit[]>([]);
  const [reviews, setReviews] = useState<Record<string, MatchReview>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [isMatching, setIsMatching] = useState(false);
  const [unexpectedError, setUnexpectedError] = useState<string | null>(null);
  const [filterMinScore, setFilterMinScore] = useState(50);
  const [decisionFilter, setDecisionFilter] = useState<'all' | MatchReviewDecision>('all');
  const themeColors = useThemeColors();

  useEffect(() => {
    const completedDemands = demandStorage.getAll().filter((item) => item.status === 'completed');
    const completedTechs = techStorage.getAll().filter((item) => item.status === 'completed');
    const storedReviews = matchReviewStorage.getAll();
    setDemands(completedDemands);
    setTechResults(completedTechs);
    setSelectedDemandId((current) => current || completedDemands[0]?.id || '');
    setRuns(matchRunStorage.getAll());
    setReviews(Object.fromEntries(storedReviews.map((review) => [review.id, review])));
  }, []);

  const visibleResults = useMemo(() => results.filter((result) => {
    if (result.score < filterMinScore) return false;
    const decision = reviews[pairKey(result.demandId, result.techId)]?.decision || 'pending';
    return decisionFilter === 'all' || decision === decisionFilter;
  }), [decisionFilter, filterMinScore, results, reviews]);

  const reviewStats = useMemo(() => results.reduce((stats, result) => {
    const decision = reviews[pairKey(result.demandId, result.techId)]?.decision || 'pending';
    stats[decision] += 1;
    return stats;
  }, { pending: 0, approved: 0, rejected: 0 }), [results, reviews]);

  const averageScore = results.length > 0
    ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length)
    : 0;

  const handleMatch = async () => {
    if (!selectedDemandId) return;
    setIsMatching(true);
    setUnexpectedError(null);

    try {
      const run = await runMatching(demands, techResults, {
        demandId: selectedDemandId,
        minScore: 0,
      });
      setResults(run.matches.map(fromMatch));
      setActiveRun(run);
      setRuns(matchRunStorage.getAll());
    } catch (error) {
      const message = error instanceof Error ? error.message : '匹配过程出现未知错误';
      setResults([]);
      setActiveRun(null);
      setUnexpectedError(message);
    } finally {
      setIsMatching(false);
    }
  };

  const openRun = (run: MatchRunAudit) => {
    setActiveRun(run);
    setResults((run.results || []).map(fromSnapshot));
    setUnexpectedError(null);
    if (run.selectedDemandId) setSelectedDemandId(run.selectedDemandId);
  };

  const saveReview = (result: WorkbenchMatch, decision: MatchReviewDecision) => {
    if (!activeRun) return;
    const key = pairKey(result.demandId, result.techId);
    const saved = matchReviewStorage.save({
      demandId: result.demandId,
      techId: result.techId,
      runId: activeRun.id,
      decision,
      note: noteDrafts[key] ?? reviews[key]?.note ?? '',
    });
    setReviews((current) => ({ ...current, [key]: saved }));
  };

  const runStatusLabel = activeRun?.status === 'failed' ? '匹配执行失败'
    : activeRun?.status === 'not_configured' ? '匹配服务未配置'
      : activeRun?.status === 'partial' ? '匹配部分完成'
        : activeRun?.status === 'no_candidates' ? '没有可评估的候选组合'
          : activeRun ? `匹配完成，共评估 ${activeRun.evaluatedCount} 个候选` : '';
  const runHasError = activeRun?.status === 'failed' || activeRun?.status === 'not_configured';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: '可用需求', value: demands.length, icon: FileText, color: themeColors.primary },
          { label: '可用成果', value: techResults.length, icon: Lightbulb, color: themeColors.success },
          { label: '本批候选', value: results.length, icon: Handshake, color: themeColors.info },
          { label: '已认可', value: reviewStats.approved, icon: CheckCircle2, color: themeColors.success },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: themeColors.surface, border: `1px solid ${themeColors.border}` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18`, color }}>
              <Icon size={20} aria-hidden="true" />
            </div>
            <div>
              <span className="text-2xl font-bold block" style={{ color: themeColors.text }}>{value}</span>
              <span className="text-xs" style={{ color: themeColors.textHint }}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-xl p-4" style={{ backgroundColor: themeColors.surface, border: `1px solid ${themeColors.border}` }}>
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <label className="flex-1 min-w-0">
            <span className="text-xs font-medium block mb-2" style={{ color: themeColors.textSecondary }}>当前技术需求</span>
            <select value={selectedDemandId} onChange={(event) => { setSelectedDemandId(event.target.value); setResults([]); setActiveRun(null); }} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: themeColors.background, border: `1px solid ${themeColors.border}`, color: themeColors.text }}>
              {demands.length === 0 && <option value="">暂无已完成分析的需求</option>}
              {demands.map((demand) => <option key={demand.id} value={demand.id}>{demand.title}</option>)}
            </select>
          </label>

          <div className="flex flex-wrap items-end gap-3">
            <label>
              <span className="text-xs font-medium block mb-2" style={{ color: themeColors.textSecondary }}>最低展示分</span>
              <select value={filterMinScore} onChange={(event) => setFilterMinScore(Number(event.target.value))} className="rounded-lg px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: themeColors.background, border: `1px solid ${themeColors.border}`, color: themeColors.text }}>
                {[0, 50, 60, 70, 80].map((score) => <option key={score} value={score}>{score === 0 ? '全部' : `${score} 分以上`}</option>)}
              </select>
            </label>
            <label>
              <span className="text-xs font-medium block mb-2" style={{ color: themeColors.textSecondary }}>复核状态</span>
              <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value as 'all' | MatchReviewDecision)} className="rounded-lg px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: themeColors.background, border: `1px solid ${themeColors.border}`, color: themeColors.text }}>
                <option value="all">全部状态</option>
                <option value="pending">待复核</option>
                <option value="approved">已认可</option>
                <option value="rejected">已驳回</option>
              </select>
            </label>
            <button onClick={handleMatch} disabled={isMatching || !selectedDemandId || techResults.length === 0} className="btn-primary px-5 py-2.5 flex items-center gap-2 disabled:opacity-50">
              <PlayCircle size={16} aria-hidden="true" />
              {isMatching ? '正在评估候选…' : '生成专业匹配'}
            </button>
          </div>
        </div>
      </section>

      {isMatching && <div className="animate-pulse rounded-lg px-4 py-3 text-sm" style={{ color: themeColors.primary, backgroundColor: themeColors.primaryLight }}>正在逐项评估技术能力、应用场景、成熟条件与交付可行性；完成前不显示估算百分比。</div>}

      {(activeRun || unexpectedError) && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ color: runHasError || unexpectedError ? themeColors.error : activeRun?.status === 'partial' ? themeColors.warning : themeColors.textSecondary, backgroundColor: runHasError || unexpectedError ? themeColors.errorLight : activeRun?.status === 'partial' ? themeColors.warningLight : themeColors.background, border: `1px solid ${runHasError || unexpectedError ? themeColors.error : activeRun?.status === 'partial' ? themeColors.warning : themeColors.border}` }}>
          <div className="font-medium">{unexpectedError ? '匹配执行异常' : runStatusLabel}</div>
          {(unexpectedError || activeRun?.error) && <div className="mt-1">{unexpectedError || activeRun?.error}</div>}
          {activeRun && <div className="mt-1 text-xs opacity-80">候选 {activeRun.candidateCount} · 有效评估 {activeRun.evaluatedCount} · 失败 {activeRun.failedCount}{activeRun.provider && ` · ${activeRun.provider}/${activeRun.modelId || '默认模型'}`}{` · ${activeRun.durationMs}ms`}</div>}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          {activeRun && results.length > 0 && <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: themeColors.textSecondary }}><span className="inline-flex items-center gap-1"><Filter size={13} />展示 {visibleResults.length}/{results.length}</span><span>平均匹配度 {averageScore}</span><span>待复核 {reviewStats.pending}</span><span>已认可 {reviewStats.approved}</span><span>已驳回 {reviewStats.rejected}</span></div>}

          {!activeRun ? (
            <div className="text-center p-12 rounded-xl" style={{ backgroundColor: themeColors.surface, border: `1px solid ${themeColors.border}` }}>
              <Handshake size={42} className="mx-auto mb-4" style={{ color: themeColors.primary }} aria-hidden="true" />
              <p className="font-medium" style={{ color: themeColors.text }}>选择一个需求，生成可复核的专业匹配清单</p>
              <p className="text-sm mt-2" style={{ color: themeColors.textHint }}>系统结论是辅助研判，不替代技术尽调、知识产权核验和商务决策。</p>
            </div>
          ) : visibleResults.length === 0 ? (
            <div className="text-center p-10 rounded-xl" style={{ backgroundColor: themeColors.surface, border: `1px solid ${themeColors.border}` }}>
              <ShieldAlert size={38} className="mx-auto mb-3" style={{ color: themeColors.textHint }} aria-hidden="true" />
              <p className="font-medium" style={{ color: themeColors.text }}>{results.length === 0 ? '本批次没有可展示的匹配结果' : '没有符合当前筛选条件的结果'}</p>
              <p className="text-sm mt-2" style={{ color: themeColors.textHint }}>{activeRun.error || '可调整最低分或复核状态筛选条件。'}</p>
            </div>
          ) : visibleResults.map((result) => {
            const key = pairKey(result.demandId, result.techId);
            const review = reviews[key];
            const decision = review?.decision || 'pending';
            const level = getScoreLevel(result.score);
            return (
              <article key={key} className="rounded-xl p-5" style={{ backgroundColor: themeColors.surface, border: `1px solid ${decision === 'approved' ? themeColors.success : decision === 'rejected' ? themeColors.error : themeColors.border}` }}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div><div className="flex items-center gap-2 mb-1"><span className="text-3xl font-bold" style={{ color: level.color }}>{result.score}</span><span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${level.color}18`, color: level.color }}>{level.label}</span><span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>{DECISION_LABELS[decision]}</span></div><p className="text-xs" style={{ color: themeColors.textHint }}>综合匹配度 / 100</p></div>
                  <div className="text-right min-w-0"><p className="font-semibold truncate" style={{ color: themeColors.text }}>{result.techTitle}</p><p className="text-xs mt-1 truncate" style={{ color: themeColors.textHint }}>对应需求：{result.demandTitle}</p></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold mb-2" style={{ color: themeColors.textSecondary }}>可解释评分</h4>
                      {result.dimensions && Object.values(result.dimensions).some((value) => value !== undefined) ? <div className="space-y-2">{DIMENSION_LABELS.map(([field, label]) => { const value = result.dimensions?.[field]; return <div key={field} className="grid grid-cols-[64px_1fr_32px] gap-2 items-center text-xs"><span style={{ color: themeColors.textHint }}>{label}</span><div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: themeColors.background }}><div className="h-full rounded-full" style={{ width: `${value || 0}%`, backgroundColor: themeColors.primary }} /></div><span className="text-right" style={{ color: themeColors.textSecondary }}>{value ?? '—'}</span></div>; })}</div> : <p className="text-xs" style={{ color: themeColors.textHint }}>本次模型未返回分项评分，请人工补充核验。</p>}
                    </div>
                    <div><h4 className="text-xs font-semibold mb-1" style={{ color: themeColors.textSecondary }}>综合判断</h4><p className="text-sm leading-relaxed" style={{ color: themeColors.textSecondary }}>{result.reason || '模型未提供判断理由。'}</p></div>
                    {result.nextStep && <div className="rounded-lg p-3" style={{ backgroundColor: themeColors.primaryLight }}><h4 className="text-xs font-semibold mb-1" style={{ color: themeColors.primary }}>建议下一步</h4><p className="text-sm" style={{ color: themeColors.textSecondary }}>{result.nextStep}</p></div>}
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-lg p-3" style={{ backgroundColor: themeColors.successLight }}><h4 className="text-xs font-semibold mb-2" style={{ color: themeColors.success }}>匹配依据</h4>{result.strengths?.length ? <ul className="space-y-1 text-sm" style={{ color: themeColors.textSecondary }}>{result.strengths.map((item) => <li key={item}>• {item}</li>)}</ul> : <p className="text-xs" style={{ color: themeColors.textHint }}>未提供明确依据，需人工核验。</p>}</div>
                    <div className="rounded-lg p-3" style={{ backgroundColor: themeColors.warningLight }}><h4 className="text-xs font-semibold mb-2" style={{ color: themeColors.warning }}>风险与缺口</h4>{result.risks?.length ? <ul className="space-y-1 text-sm" style={{ color: themeColors.textSecondary }}>{result.risks.map((item) => <li key={item}>• {item}</li>)}</ul> : <p className="text-xs" style={{ color: themeColors.textHint }}>模型未列出风险，不代表不存在风险。</p>}</div>
                  </div>
                </div>

                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${themeColors.border}` }}>
                  <label className="text-xs font-medium block mb-2" style={{ color: themeColors.textSecondary }}>复核备注</label>
                  <textarea rows={2} value={noteDrafts[key] ?? review?.note ?? ''} onChange={(event) => setNoteDrafts((current) => ({ ...current, [key]: event.target.value }))} placeholder="记录待核验材料、沟通结论或驳回原因" className="w-full rounded-lg px-3 py-2 text-sm resize-y outline-none" style={{ backgroundColor: themeColors.background, border: `1px solid ${themeColors.border}`, color: themeColors.text }} />
                  <div className="flex flex-wrap justify-end gap-2 mt-3">
                    <button onClick={() => saveReview(result, 'pending')} className="px-3 py-2 rounded-lg text-xs inline-flex items-center gap-1.5" style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary, border: `1px solid ${themeColors.border}` }}><Clock3 size={14} />待复核</button>
                    <button onClick={() => saveReview(result, 'rejected')} className="px-3 py-2 rounded-lg text-xs inline-flex items-center gap-1.5" style={{ backgroundColor: themeColors.errorLight, color: themeColors.error, border: `1px solid ${themeColors.error}40` }}><XCircle size={14} />驳回</button>
                    <button onClick={() => saveReview(result, 'approved')} className="px-3 py-2 rounded-lg text-xs inline-flex items-center gap-1.5" style={{ backgroundColor: themeColors.successLight, color: themeColors.success, border: `1px solid ${themeColors.success}40` }}><CheckCircle2 size={14} />认可进入对接</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="rounded-xl p-4 xl:sticky xl:top-0" style={{ backgroundColor: themeColors.surface, border: `1px solid ${themeColors.border}` }}>
          <div className="flex items-center gap-2 mb-3"><History size={16} style={{ color: themeColors.primary }} aria-hidden="true" /><h3 className="font-semibold text-sm" style={{ color: themeColors.text }}>运行记录</h3></div>
          {runs.length === 0 ? <p className="text-xs" style={{ color: themeColors.textHint }}>尚无匹配批次记录。</p> : <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">{runs.slice(0, 12).map((run) => <button key={run.id} onClick={() => openRun(run)} className="w-full text-left rounded-lg p-3 transition-colors" style={{ backgroundColor: activeRun?.id === run.id ? themeColors.primaryLight : themeColors.background, border: `1px solid ${activeRun?.id === run.id ? themeColors.primary : themeColors.border}` }}><span className="text-xs font-medium block truncate" style={{ color: themeColors.text }}>{run.selectedDemandTitle || '全部需求批次'}</span><span className="text-[11px] block mt-1" style={{ color: themeColors.textHint }}>{formatRunTime(run.completedAt)} · {run.matchCount} 项结果</span><span className="text-[11px] block mt-1" style={{ color: run.status === 'failed' || run.status === 'not_configured' ? themeColors.error : run.status === 'partial' ? themeColors.warning : themeColors.success }}>{run.status === 'completed' ? '已完成' : run.status === 'partial' ? '部分完成' : run.status === 'no_candidates' ? '无候选' : run.status === 'not_configured' ? '未配置' : '失败'}</span></button>)}</div>}
          <div className="mt-4 pt-3 text-[11px] leading-relaxed" style={{ borderTop: `1px solid ${themeColors.border}`, color: themeColors.textHint }}>匹配记录与人工复核结论保存在本机；API 密钥不进入匹配记录或数据备份。</div>
        </aside>
      </div>
    </div>
  );
}
