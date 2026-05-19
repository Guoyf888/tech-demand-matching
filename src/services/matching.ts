import { Demand, TechResult } from '@/types';
import { apiGateway } from './api/gateway';

interface MatchResult {
  demand: Demand;
  tech: TechResult;
  score: number;
  reason: string;
}

const CONCURRENCY_LIMIT = 5;
const MIN_MATCH_SCORE = 50;
const MATCH_TIMEOUT_MS = 30000;

function parseMatchResponse(content: string): { score: number; reason: string } | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    const result = JSON.parse(jsonMatch[0]);

    if (
      typeof result.score !== 'number' ||
      result.score < 0 ||
      result.score > 100
    ) {
      return null;
    }

    return {
      score: Math.round(result.score),
      reason: typeof result.reason === 'string' ? result.reason : '',
    };
  } catch {
    return null;
  }
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
): Promise<MatchResult | null> {
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
          demand,
          tech,
          score: result.score,
          reason: result.reason,
        };
      }
    }
    return null;
  } catch (error) {
    clearTimeout(timeout);
    if ((error as Error).name === 'AbortError') {
      console.warn('匹配评估超时:', demand.id, tech.id);
    }
    return null;
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

// Pre-filter: skip pairs with zero keyword overlap
function hasKeywordOverlap(demand: Demand, tech: TechResult): boolean {
  const demandWords = new Set([
    ...demand.tags.map(t => t.toLowerCase()),
    ...(demand.content || '').toLowerCase().split(/[\s,，、;；.。]+/).filter(w => w.length > 1),
  ]);
  const techWords = new Set([
    ...tech.tags.map(t => t.toLowerCase()),
    ...(tech.content || '').toLowerCase().split(/[\s,，、;；.。]+/).filter(w => w.length > 1),
  ]);

  for (const word of demandWords) {
    if (techWords.has(word)) return true;
  }
  return false;
}

export async function findMatches(
  demands: Demand[],
  techResults: TechResult[]
): Promise<MatchResult[]> {
  const completedDemands = demands.filter((d) => d.status === 'completed');
  const completedTechs = techResults.filter((t) => t.status === 'completed');

  if (!apiGateway.isConfigured() || completedDemands.length === 0 || completedTechs.length === 0) {
    return [];
  }

  // Build task list with pre-filtering
  const tasks: (() => Promise<MatchResult | null>)[] = [];
  for (const demand of completedDemands) {
    for (const tech of completedTechs) {
      // Skip pairs with no keyword overlap to reduce API calls
      if (!hasKeywordOverlap(demand, tech)) continue;
      tasks.push(() => evaluateSingleMatch(demand, tech));
    }
  }

  if (tasks.length === 0) return [];

  const results = await runWithConcurrency(tasks, CONCURRENCY_LIMIT);
  const matches = results.filter((r): r is MatchResult => r !== null);

  return matches.sort((a, b) => b.score - a.score);
}
