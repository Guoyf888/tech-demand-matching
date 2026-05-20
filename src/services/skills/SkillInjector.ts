/**
 * SkillInjector - 3-tier 技能注入器
 *
 * TypeScript 移植自 OpenHuman 的 inject.rs
 *
 * 匹配优先级：
 * Tier 1: @ 提及（强制注入，忽略 user-invocable）
 * Tier 2: 自动匹配（description 子串 > tag 全词 > name 全词）
 * Tier 3: 不匹配（跳过）
 *
 * 注入上限：8KB（DEFAULT_MAX_INJECTION_BYTES）
 * 格式：[SKILL:name]...[/SKILL] 块
 */

import type { Skill } from '@/types';

// ============================================
// Types
// ============================================

export enum MatchReason {
  AtMention = 'at_mention',
  DescriptionSubstring = 'description_substring',
  TagMatch = 'tag_match',
  NameMatch = 'name_match',
}

export interface SkillMatch {
  skill: Skill;
  reason: MatchReason;
  mentionIndex: number; // @ 提及在消息中的位置，自动匹配为 Infinity
}

export interface SkillDecision {
  name: string;
  matched: boolean;
  reason: string;
  injectedBytes: number;
  truncated: boolean;
}

export interface Injection {
  rendered: string;
  injectedBytes: number;
  truncated: boolean;
  decisions: SkillDecision[];
}

// ============================================
// Constants
// ============================================

const DEFAULT_MAX_INJECTION_BYTES = 8 * 1024; // 8KB

// ============================================
// Utility Functions (移植自 OpenHuman inject.rs)
// ============================================

/**
 * 名称标准化：小写，合并连续的 -/_ 为空格为单个 -
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-_\s]+/g, '-')
    .replace(/-+$/, '');
}

/**
 * 提取 @ 提及（排除 email 格式）
 */
function extractMentions(userMessage: string): Array<[string, number]> {
  const mentions: Array<[string, number]> = [];
  const regex = /(?:^|[^a-zA-Z0-9_])@([\w][\w-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(userMessage)) !== null) {
    const name = match[1];
    const index = match.index + match[0].length - name.length;
    mentions.push([name, index]);
  }
  return mentions;
}

/**
 * 全词匹配（不用正则，移植自 OpenHuman contains_whole_word）
 */
function containsWholeWord(haystack: string, needle: string): boolean {
  if (needle.length === 0) return false;
  const lowerHaystack = haystack.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  let idx = lowerHaystack.indexOf(lowerNeedle);
  while (idx !== -1) {
    const before = idx === 0 ? '' : lowerHaystack[idx - 1];
    const after = idx + lowerNeedle.length >= lowerHaystack.length
      ? ''
      : lowerHaystack[idx + lowerNeedle.length];
    const isWordChar = (c: string) => /[a-z0-9_@-]/i.test(c);
    if (!isWordChar(before) && !isWordChar(after)) {
      return true;
    }
    idx = lowerHaystack.indexOf(lowerNeedle, idx + 1);
  }
  return false;
}

// ============================================
// Core Matching (3-tier cascade)
// ============================================

/**
 * 匹配技能到用户消息（移植自 OpenHuman match_skills）
 */
export function matchSkills(skills: Skill[], userMessage: string): SkillMatch[] {
  const matches: SkillMatch[] = [];
  const lowerMessage = userMessage.toLowerCase();

  // Tier 1: @ 提及
  const mentions = extractMentions(userMessage);
  for (const [mentionedName, position] of mentions) {
    const normalizedMention = normalize(mentionedName);
    for (const skill of skills) {
      if (normalize(skill.name) === normalizedMention) {
        matches.push({ skill, reason: MatchReason.AtMention, mentionIndex: position });
        break;
      }
    }
  }

  // Tier 2: 自动匹配（跳过已通过 @ 提及匹配的技能）
  const atMentionedNames = new Set(matches.map(m => m.skill.name));
  for (const skill of skills) {
    if (atMentionedNames.has(skill.name)) continue;

    let matched = false;

    // 2a. Description 子串匹配
    if (skill.description && lowerMessage.includes(skill.description.toLowerCase())) {
      matches.push({ skill, reason: MatchReason.DescriptionSubstring, mentionIndex: Infinity });
      matched = true;
    }

    // 2b. Tag 全词匹配
    if (!matched && skill.triggers) {
      for (const tag of skill.triggers) {
        if (containsWholeWord(lowerMessage, tag)) {
          matches.push({ skill, reason: MatchReason.TagMatch, mentionIndex: Infinity });
          matched = true;
          break;
        }
      }
    }

    // 2c. Name 全词匹配（名称 > 2 字符）
    if (!matched && skill.name.length > 2) {
      if (containsWholeWord(lowerMessage, skill.name)) {
        matches.push({ skill, reason: MatchReason.NameMatch, mentionIndex: Infinity });
      }
    }
  }

  // 排序：@ 提及按位置，自动匹配按 description 长度降序
  matches.sort((a, b) => {
    if (a.mentionIndex !== Infinity && b.mentionIndex !== Infinity) {
      return a.mentionIndex - b.mentionIndex;
    }
    if (a.mentionIndex !== Infinity) return -1;
    if (b.mentionIndex !== Infinity) return 1;
    // 按 description 长度降序（更长的 description 更具体）
    return (b.skill.description?.length || 0) - (a.skill.description?.length || 0);
  });

  return matches;
}

// ============================================
// Injection Rendering
// ============================================

/**
 * 渲染注入块（[SKILL:name]...[/SKILL]），带 8KB 预算截断
 */
export function renderInjection(
  matches: SkillMatch[],
  maxBytes: number = DEFAULT_MAX_INJECTION_BYTES,
  bodyResolver: (skill: Skill) => string | null
): Injection {
  const decisions: SkillDecision[] = [];
  let rendered = '';
  let remainingBytes = maxBytes;
  let truncated = false;

  for (const match of matches) {
    const body = bodyResolver(match.skill);
    if (!body) {
      decisions.push({
        name: match.skill.name,
        matched: true,
        reason: match.reason,
        injectedBytes: 0,
        truncated: false,
      });
      continue;
    }

    const header = `[SKILL:${match.skill.name}]\n`;
    const footer = '\n[/SKILL]\n';
    const fullBlock = header + body + footer;
    const fullBytes = new TextEncoder().encode(fullBlock).length;

    if (fullBytes <= remainingBytes) {
      // 完整注入
      rendered += fullBlock;
      remainingBytes -= fullBytes;
      decisions.push({
        name: match.skill.name,
        matched: true,
        reason: match.reason,
        injectedBytes: fullBytes,
        truncated: false,
      });
    } else if (remainingBytes > new TextEncoder().encode(header + footer).length + 50) {
      // 截断注入
      const availableForBody = remainingBytes
        - new TextEncoder().encode(header).length
        - new TextEncoder().encode('\n[/SKILL:truncated]\n').length;
      const truncatedBody = truncateToByteBoundary(body, availableForBody);
      rendered += header + truncatedBody + '\n[/SKILL:truncated]\n';
      const injectedBytes = new TextEncoder().encode(header + truncatedBody + '\n[/SKILL:truncated]\n').length;
      remainingBytes -= injectedBytes;
      truncated = true;
      decisions.push({
        name: match.skill.name,
        matched: true,
        reason: match.reason,
        injectedBytes,
        truncated: true,
      });
    } else {
      // 预算耗尽
      decisions.push({
        name: match.skill.name,
        matched: true,
        reason: match.reason,
        injectedBytes: 0,
        truncated: false,
      });
    }

    if (remainingBytes <= 0) break;
  }

  return {
    rendered: rendered.trim(),
    injectedBytes: maxBytes - remainingBytes,
    truncated,
    decisions,
  };
}

/**
 * 按 UTF-8 字节边界截断字符串
 */
function truncateToByteBoundary(text: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  if (bytes.length <= maxBytes) return text;

  // 从 maxBytes 处向前找到有效的 UTF-8 边界
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0xC0) === 0x80) end--;
  return new TextDecoder().decode(bytes.slice(0, end));
}

// ============================================
// Public API
// ============================================

/**
 * 主入口：将匹配的技能注入到用户消息上下文中
 */
export function inject(
  skills: Skill[],
  userMessage: string,
  maxBytes?: number
): Injection {
  const matches = matchSkills(skills, userMessage);
  return renderInjection(matches, maxBytes, (skill) => skill.content || null);
}

/**
 * 单例导出
 */
export const skillInjector = { inject, matchSkills, renderInjection };
