import { Demand, TechResult } from '@/types';
import { apiGateway } from './api/gateway';
import { logger } from '@/utils/logger';
import { jsonrepair } from 'jsonrepair';
import {
  matchRunStorage,
  type MatchRunAudit,
  type MatchRunStatus,
} from './storage/matchRunStorage';

export interface MatchResult {
  demand: Demand;
  tech: TechResult;
  score: number;
  reason: string;
}

export interface MatchingRunResult extends MatchRunAudit {
  matches: MatchResult[];
}

type PairEvaluation =
  | { status: 'matched'; match: MatchResult }
  | { status: 'not_matched' }
  | { status: 'failed'; error: string };

const CONCURRENCY_LIMIT = 5;
const MIN_MATCH_SCORE = 50;
const MATCH_TIMEOUT_MS = 30000;

const log = logger;

/**
 * 从代码块中提取 JSON 字符串
 * 优先匹配 ```json ... ```，其次 ``` ... ```，最后回退到全文首个 { ... }
 */
function extractJsonCandidate(content: string): string | null {
  // 1) 显式 JSON 代码块
  const jsonBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (jsonBlock) {
    return jsonBlock[1].trim();
  }
  // 2) 全文首个 { 到最后一个 } 之间的内容
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }
  return null;
}

export function parseMatchResponse(content: string): { score: number; reason: string } | null {
  const candidate = extractJsonCandidate(content);
  if (!candidate) return null;

  // 优先严格解析；AI 输出不规范时交给成熟解析器修复。
  const tryParse = (raw: string): unknown => {
    try {
      return JSON.parse(raw);
    } catch {
      return JSON.parse(jsonrepair(raw));
    }
  };

  const parsed = tryParse(candidate);
  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as Record<string, unknown>;
  const score = obj.score;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) {
    return null;
  }
  const reason = typeof obj.reason === 'string' ? obj.reason : '';

  return { score: Math.round(score), reason };
}

function sanitizeForPrompt(text: string): string {
  // Truncate and remove common prompt injection patterns
  return text
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '[FILTERED]')
    .replace(/system\s*:\s*/gi, '[FILTERED]')
    .replace(/\bassistant\s*:\s*/gi, '[FILTERED]')
    .slice(0, 2000);
}

async function evaluateSingleMatch(
  demand: Demand,
  tech: TechResult
): Promise<PairEvaluation> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MATCH_TIMEOUT_MS);

  try {
    const response = await apiGateway.chat({
      messages: [
        {
          role: 'system',
          content: `你是一个技术需求匹配评估专家。请严格评估以下需求和成果的匹配度。

<需求>
${sanitizeForPrompt(demand.content)}
标签：${demand.tags.map(sanitizeForPrompt).join(', ')}
</需求>

<成果>
${sanitizeForPrompt(tech.content)}
标签：${tech.tags.map(sanitizeForPrompt).join(', ')}
概要：${sanitizeForPrompt(tech.summary || '')}
</成果>

评估匹配度（0-100），并给出简要理由。
必须以JSON格式返回：{"score": 数字, "reason": "字符串"}`,
        },
        { role: 'user', content: '请评估匹配度' },
      ],
    }, controller.signal);

    clearTimeout(timeout);

    const data = await response.json();
    if (data.choices?.[0]?.message?.content) {
      const result = parseMatchResponse(data.choices[0].message.content);
      if (result && result.score >= MIN_MATCH_SCORE) {
        return {
          status: 'matched',
          match: {
            demand,
            tech,
            score: result.score,
            reason: result.reason,
          },
        };
      }
      if (result) return { status: 'not_matched' };
    }
    return { status: 'failed', error: 'AI 返回的匹配结果格式无效' };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      log.warn('matching', '匹配评估超时', { demandId: demand.id, techId: tech.id });
    } else {
      log.warn('matching', '匹配评估失败', {
        demandId: demand.id,
        techId: tech.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (const task of tasks) {
    const p = task().then((result) => {
      results.push(result);
    });
    const wrapped = p.then(() => { executing.delete(wrapped); });
    executing.add(wrapped);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * 简单的技术领域同义词归一化
 * 命中后用于更宽松的标签预过滤
 */
const SYNONYM_MAP: Record<string, string[]> = {
  ai: ['人工智能', '机器学习', '深度学习', '神经网络', 'ml', 'dl'],
  '5g': ['通信', '网络', '蜂窝'],
  iot: ['物联网', '传感器'],
  ev: ['新能源', '电动汽车', '电池', '充电'],
  finance: ['金融', '银行', '保险', '支付', '风控'],
  medical: ['医疗', '医药', '医院', '诊断', '生物'],
};

function normalizeToken(token: string): string {
  const t = token.toLowerCase();
  for (const [key, syns] of Object.entries(SYNONYM_MAP)) {
    if (t === key || syns.some((s) => t.includes(s.toLowerCase()))) {
      return key;
    }
  }
  return t;
}

/**
 * 预过滤：跳过明显不相关的对
 *
 * 旧版使用单字面匹配，会把"AI"/"人工智能"等同义/上下位词判定为无交集导致误杀。
 * 改为：标签集合经同义词归一化后做交集判断，且只要需求或成果任一有非空标签即视为潜在匹配。
 * 取消对 content 内容的字符切分预过滤，避免再出现"5G"和"通信"被错杀的情况。
 */
function hasKeywordOverlap(demand: Demand, tech: TechResult): boolean {
  const norm = (arr: string[]) =>
    new Set(arr.map(normalizeToken).filter((s) => s.length > 0));

  const demandTags = norm(demand.tags || []);
  const techTags = norm(tech.tags || []);

  // 任一标签为空时不做过滤，交给 LLM 兜底
  if (demandTags.size === 0 || techTags.size === 0) return true;

  for (const tag of demandTags) {
    if (techTags.has(tag)) return true;
  }
  return false;
}

function createRunId(): string {
  return `match_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function finishRun(
  base: Omit<MatchRunAudit, 'status' | 'completedAt' | 'durationMs' | 'evaluatedCount' | 'failedCount' | 'matchCount'>,
  status: MatchRunStatus,
  matches: MatchResult[],
  counts: { evaluatedCount?: number; failedCount?: number } = {},
  error?: string,
): MatchingRunResult {
  const completedAt = new Date().toISOString();
  const result: MatchingRunResult = {
    ...base,
    status,
    completedAt,
    durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(base.startedAt)),
    evaluatedCount: counts.evaluatedCount ?? 0,
    failedCount: counts.failedCount ?? 0,
    matchCount: matches.length,
    error,
    matches,
  };
  const { matches: _matches, ...audit } = result;
  matchRunStorage.save(audit);
  return result;
}

export async function runMatching(
  demands: Demand[],
  techResults: TechResult[]
): Promise<MatchingRunResult> {
  const startedAt = new Date().toISOString();
  const completedDemands = demands.filter((d) => d.status === 'completed');
  const completedTechs = techResults.filter((t) => t.status === 'completed');
  const metadata = apiGateway.getConfigMetadata();
  const base = {
    id: createRunId(),
    startedAt,
    provider: metadata?.provider,
    modelId: metadata?.modelId,
    demandCount: completedDemands.length,
    techCount: completedTechs.length,
    candidateCount: 0,
  };

  if (completedDemands.length === 0 || completedTechs.length === 0) {
    return finishRun(
      base,
      'no_candidates',
      [],
      {},
      '没有已完成分析的需求或技术成果',
    );
  }

  try {
    if (!await apiGateway.isConfigured()) {
      return finishRun(base, 'not_configured', [], {}, 'AI API 尚未完成有效配置');
    }
  } catch (error) {
    return finishRun(
      base,
      'failed',
      [],
      {},
      `读取 AI API 配置失败：${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Build task list with pre-filtering
  const tasks: (() => Promise<PairEvaluation>)[] = [];
  for (const demand of completedDemands) {
    for (const tech of completedTechs) {
      if (!hasKeywordOverlap(demand, tech)) continue;
      tasks.push(() => evaluateSingleMatch(demand, tech));
    }
  }

  const runBase = { ...base, candidateCount: tasks.length };
  if (tasks.length === 0) {
    return finishRun(runBase, 'no_candidates', [], {}, '没有通过标签预筛选的候选组合');
  }

  const results = await runWithConcurrency(tasks, CONCURRENCY_LIMIT);
  const matches = results
    .filter((result): result is Extract<PairEvaluation, { status: 'matched' }> => result.status === 'matched')
    .map((result) => result.match)
    .sort((a, b) => b.score - a.score);
  const failures = results.filter(
    (result): result is Extract<PairEvaluation, { status: 'failed' }> => result.status === 'failed',
  );
  const evaluatedCount = results.length - failures.length;
  const failedCount = failures.length;

  if (failedCount === results.length) {
    return finishRun(
      runBase,
      'failed',
      [],
      { evaluatedCount, failedCount },
      `全部 ${failedCount} 个候选评估失败：${failures[0]?.error || '未知错误'}`,
    );
  }

  if (failedCount > 0) {
    return finishRun(
      runBase,
      'partial',
      matches,
      { evaluatedCount, failedCount },
      `${failedCount} 个候选评估失败，已保留 ${evaluatedCount} 个有效评估结果`,
    );
  }

  return finishRun(runBase, 'completed', matches, { evaluatedCount, failedCount });
}

export async function findMatches(
  demands: Demand[],
  techResults: TechResult[]
): Promise<MatchResult[]> {
  return (await runMatching(demands, techResults)).matches;
}
