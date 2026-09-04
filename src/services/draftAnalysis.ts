import { NATIONAL_ECONOMIC_INDUSTRY_PROMPT, isNationalEconomicIndustry } from '@/config/industries';
import {
  buildDocumentChatContent,
  extractIndustryTags,
  extractTechTags,
  type ParsedDocument,
} from '@/services/documentParser';
import { apiGateway } from '@/services/api/gateway';
import { scientificSkillService } from '@/services/skills/scientificSkills';
import type { Demand, TechResult } from '@/types';

type AiResponse = Record<string, unknown>;

function parseJsonObject(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = codeBlock?.[1] ?? trimmed.slice(
    Math.max(0, trimmed.indexOf('{')),
    trimmed.lastIndexOf('}') + 1,
  );

  if (!candidate || candidate === '}') {
    throw new Error('AI 返回内容中未找到可解析的 JSON 数据');
  }

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    throw new Error('AI 返回的分析结果格式异常，请稍后重试');
  }
}

function getResponseContent(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    throw new Error('AI 响应格式异常');
  }

  const response = payload as AiResponse;
  const choices = response.choices;
  if (Array.isArray(choices)) {
    const firstChoice = choices[0] as AiResponse | undefined;
    const message = firstChoice?.message as AiResponse | undefined;
    if (typeof message?.content === 'string' && message.content.trim()) return message.content;
  }

  const content = response.content;
  if (Array.isArray(content)) {
    const firstContent = content[0] as AiResponse | undefined;
    if (typeof firstContent?.text === 'string' && firstContent.text.trim()) return firstContent.text;
  }

  const output = response.output as AiResponse | undefined;
  const outputChoices = output?.choices;
  if (Array.isArray(outputChoices)) {
    const firstChoice = outputChoices[0] as AiResponse | undefined;
    const message = firstChoice?.message as AiResponse | undefined;
    if (typeof message?.content === 'string' && message.content.trim()) return message.content;
  }
  if (typeof output?.text === 'string' && output.text.trim()) return output.text;

  const candidates = response.candidates;
  if (Array.isArray(candidates)) {
    const firstCandidate = candidates[0] as AiResponse | undefined;
    const candidateContent = firstCandidate?.content as AiResponse | undefined;
    const parts = candidateContent?.parts;
    if (Array.isArray(parts)) {
      const text = parts
        .map((part) => (part as AiResponse | undefined)?.text)
        .filter((part): part is string => typeof part === 'string')
        .join('\n')
        .trim();
      if (text) return text;
    }
  }

  throw new Error('AI 响应中缺少分析内容');
}

function getTags(title: string, content: string, analysis: Record<string, unknown>): string[] {
  const source = `${title}\n${content}`;
  const inferredIndustries = extractIndustryTags(source);
  const selectedIndustry = isNationalEconomicIndustry(analysis.industry)
    ? [analysis.industry]
    : inferredIndustries;
  const aiTags = Array.isArray(analysis.tags)
    ? analysis.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];

  return Array.from(new Set([
    ...selectedIndustry,
    ...aiTags,
    ...extractTechTags(source),
  ])).slice(0, 6);
}

function asBoundedNumber(value: unknown, min: number, max: number): number | undefined {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue)
    ? Math.min(max, Math.max(min, Math.round(numericValue)))
    : undefined;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function assertDraftContent(title: string, content: string): void {
  if (!title.trim() || !content.trim()) {
    throw new Error('草稿缺少完整的标题或详情，无法提交分析');
  }
}

export async function validateDraftAnalysisConfiguration(): Promise<void> {
  const validation = await apiGateway.validateConfig();
  if (!validation.valid) throw new Error(validation.error || 'AI 分析服务暂不可用');
}

export async function analyzeDemandDraft(draft: Demand): Promise<Demand> {
  assertDraftContent(draft.title, draft.content);
  const scientificContext = scientificSkillService.buildContext(
    `${draft.title}\n${draft.content}`,
    'demand',
  );
  const response = await apiGateway.chat({
    messages: [
      {
        role: 'system',
        content: `你是一名专业 AI 技术经理人。请分析以下技术需求：
1. 从以下国民经济行业门类中选择最匹配的一项作为 industry：${NATIONAL_ECONOMIC_INDUSTRY_PROMPT}
2. 提取技术关键词和标签（最多 5 个，不要重复 industry）
3. 分析需求的核心技术方向
4. 给出简短的技术研发建议
分析时区分事实、推断与待验证假设，并参考以下科研技能方法论：${scientificContext.rendered}

请直接返回 JSON（不要使用 Markdown 代码块）：
{"industry":"制造业","tags":["标签1","标签2"],"industryAnalysis":"行业分析","techRoadmap":"技术路线","suggestions":"创新建议"}`,
      },
      { role: 'user', content: `需求标题：${draft.title}\n\n需求详情：${draft.content}` },
    ],
  });
  const analysis = parseJsonObject(getResponseContent(await response.json()));

  return {
    ...draft,
    tags: getTags(draft.title, draft.content, analysis),
    status: 'completed',
    analysis: {
      enterpriseInfo: '基于您输入的需求分析',
      industryAnalysis: asString(analysis.industryAnalysis, '暂无行业分析'),
      techRoadmap: asString(analysis.techRoadmap, '暂无技术路线'),
      suggestions: asString(analysis.suggestions, '暂无建议'),
      skills: scientificContext.skills.map((skill) => skill.name),
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function analyzeTechDraft(
  draft: TechResult,
  documentContext?: ParsedDocument | null,
): Promise<TechResult> {
  assertDraftContent(draft.title, draft.content);
  const scientificContext = scientificSkillService.buildContext(
    `${draft.title}\n${draft.content}`,
    'result',
  );
  const response = await apiGateway.chat({
    messages: [
      {
        role: 'system',
        content: `你是一名专业 AI 技术经理人。请分析以下技术成果：
1. 从以下国民经济行业门类中选择最匹配的一项作为 industry：${NATIONAL_ECONOMIC_INDUSTRY_PROMPT}
2. 提取技术关键词和标签（最多 5 个，不要重复 industry）
3. 用通俗易懂的语言提炼成果概要（50-200 字）
4. 评估创新性（0-100）、技术成熟度（TRL 1-9）和市场价值（0-100）
5. 说明证据质量、应用边界，并给出 3 项下一步验证建议
评估时区分已有证据、合理推断与待验证结论，并参考以下科研技能方法论：${scientificContext.rendered}

请直接返回 JSON（不要使用 Markdown 代码块）：
{"industry":"制造业","tags":["标签1","标签2"],"summary":"成果概要","innovationScore":75,"trl":5,"marketScore":70,"evidenceAssessment":"当前证据及其局限","applicationBoundaries":"适用条件和不适用范围","validationSuggestions":["建议1","建议2","建议3"]}`,
      },
      {
        role: 'user',
        content: buildDocumentChatContent(
          `技术成果标题：${draft.title}\n\n技术成果详情：${draft.content}`,
          documentContext,
        ),
      },
    ],
  });
  const analysis = parseJsonObject(getResponseContent(await response.json()));

  return {
    ...draft,
    tags: getTags(draft.title, draft.content, analysis),
    summary: asString(analysis.summary, draft.summary || ''),
    status: 'completed',
    error: undefined,
    analysis: {
      innovationScore: asBoundedNumber(analysis.innovationScore, 0, 100),
      trl: asBoundedNumber(analysis.trl, 1, 9),
      marketScore: asBoundedNumber(analysis.marketScore, 0, 100),
      evidenceAssessment: asString(analysis.evidenceAssessment, ''),
      applicationBoundaries: asString(analysis.applicationBoundaries, ''),
      validationSuggestions: Array.isArray(analysis.validationSuggestions)
        ? analysis.validationSuggestions.filter((item): item is string => typeof item === 'string').slice(0, 5)
        : [],
      skills: scientificContext.skills.map((skill) => skill.name),
    },
    updatedAt: new Date().toISOString(),
  };
}
