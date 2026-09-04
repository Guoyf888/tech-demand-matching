import { parseDocument } from 'yaml';

const MAX_FRONTMATTER_CHARS = 64 * 1024;

export interface ParsedSkillFrontmatter<T extends object> {
  metadata: T;
  content: string;
  hasFrontmatter: boolean;
  error?: string;
}

function parseSimpleFrontmatter(source: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of source.split(/\r?\n/)) {
    if (/^\s/.test(line)) continue;
    const colonIndex = line.indexOf(':');
    if (colonIndex <= 0) continue;
    result[line.slice(0, colonIndex).trim()] = line.slice(colonIndex + 1).trim();
  }
  return result;
}

/**
 * Parse Hermes/OpenClaw SKILL.md frontmatter with full nested YAML support.
 * Hermes v0.19 treats a leading UTF-8 BOM as an editor artifact, so it is
 * removed only when it appears at the start of the document.
 */
export function parseSkillFrontmatter<T extends object>(
  source: string,
  defaults: T
): ParsedSkillFrontmatter<T> {
  const content = source.startsWith('\uFEFF') ? source.slice(1) : source;
  const openingFence = content.match(/^---[ \t]*\r?\n/);

  if (!openingFence) {
    return { metadata: { ...defaults }, content: source, hasFrontmatter: false };
  }

  const yamlStart = openingFence[0].length;
  const closingFence = /\r?\n---[ \t]*(?:\r?\n|$)/g;
  closingFence.lastIndex = yamlStart;
  const match = closingFence.exec(content);

  if (!match) {
    return {
      metadata: { ...defaults },
      content: source,
      hasFrontmatter: true,
      error: 'Frontmatter 缺少结束标记 ---',
    };
  }

  const yamlSource = content.slice(yamlStart, match.index);
  const body = content.slice(match.index + match[0].length).trim();

  if (yamlSource.length > MAX_FRONTMATTER_CHARS) {
    return {
      metadata: { ...defaults },
      content: body,
      hasFrontmatter: true,
      error: 'Frontmatter 超过 64 KiB 限制',
    };
  }

  try {
    const document = parseDocument(yamlSource, {
      prettyErrors: false,
      schema: 'core',
      uniqueKeys: true,
    });
    if (document.errors.length > 0) {
      throw document.errors[0];
    }

    const parsed = document.toJS({ maxAliasCount: 50 });
    const metadata = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};

    return {
      metadata: { ...defaults, ...metadata },
      content: body,
      hasFrontmatter: true,
    };
  } catch (error) {
    return {
      metadata: { ...defaults, ...parseSimpleFrontmatter(yamlSource) },
      content: body,
      hasFrontmatter: true,
      error: error instanceof Error ? error.message : 'Frontmatter YAML 解析失败',
    };
  }
}
