/**
 * Skill File Parser
 *
 * Parses .skill files in various formats:
 * 1. JSON format (.skill.json)
 * 2. YAML-like frontmatter format (.skill.md)
 * 3. Native .skill format (simple key-value)
 *
 * Error handling with friendly Chinese messages
 */

import { Skill, SkillAction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { parseSkillFrontmatter } from './skillFrontmatter';

// Skill file metadata
export interface SkillFileMeta {
  name: string;
  description: string;
  version: string;
  icon?: string;
  author?: string;
  group?: string;
  triggers?: string[];
  actions?: Array<{
    name: string;
    description: string;
    command?: string;
  }>;
  commands?: string[];
  content?: string;
  instructions?: string;
  // For OpenClaw compatibility
  emoji?: string;
  tags?: string[];
  required_env?: string[];
  required_bins?: string[];
}

// Parse error with context
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

/**
 * Validate skill file metadata
 */
function validateSkillMeta(meta: Partial<SkillFileMeta>): string[] {
  const errors: string[] = [];

  if (!meta.name || meta.name.trim() === '') {
    errors.push('技能名称不能为空');
  } else if (meta.name.length > 50) {
    errors.push('技能名称不能超过50个字符');
  }

  if (!meta.description || meta.description.trim() === '') {
    errors.push('技能描述不能为空');
  } else if (meta.description.length > 1024) {
    errors.push('技能描述不能超过1024个字符');
  }

  if (meta.version && !/^\d+\.\d+\.\d+$/.test(meta.version)) {
    errors.push('版本号格式错误，应为 x.y.z 格式（如 1.0.0）');
  }

  return errors;
}

/**
 * Detect icon from name or metadata
 */
function detectIcon(name: string, meta: Partial<SkillFileMeta>): string {
  const iconEmojis = ['📦', '🔧', '💻', '📊', '🤖', '🧠', '🔬', '⚡', '🎨', '🚀', '🛠️', '📝', '🔍', '💡', '⚙️', '🌐', '📱', '🔒', '📈', '🎯'];

  // Priority: explicit icon > name-based detection > default
  if (meta.icon) return meta.icon;

  const nameLower = name.toLowerCase();
  if (nameLower.includes('code')) return '💻';
  if (nameLower.includes('data') || nameLower.includes('分析')) return '📊';
  if (nameLower.includes('ai') || nameLower.includes('智能')) return '🤖';
  if (nameLower.includes('research') || nameLower.includes('研究')) return '🔬';
  if (nameLower.includes('plan') || nameLower.includes('规划')) return '📝';
  if (nameLower.includes('test') || nameLower.includes('测试')) return '🧪';
  if (nameLower.includes('debug')) return '🔧';
  if (nameLower.includes('github')) return '🐙';
  if (nameLower.includes('slack') || nameLower.includes('discord')) return '💬';
  if (nameLower.includes('spotify') || nameLower.includes('music')) return '🎵';
  if (nameLower.includes('weather')) return '🌤️';
  if (nameLower.includes('summarize') || nameLower.includes('总结')) return '🧾';
  if (nameLower.includes('task') || nameLower.includes('任务')) return '✅';
  if (nameLower.includes('note')) return '📝';
  if (nameLower.includes('memory')) return '🧠';
  if (nameLower.includes('web') || nameLower.includes('api')) return '🌐';
  if (nameLower.includes('security') || nameLower.includes('安全')) return '🔒';

  // Default based on hash
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return iconEmojis[hash % iconEmojis.length];
}

/**
 * Detect skill group from name and content
 */
function detectGroup(name: string, content: string, meta: Partial<SkillFileMeta>): string | undefined {
  const text = `${name} ${content} ${meta.tags?.join(' ') || ''}`.toLowerCase();

  const groupKeywords: Record<string, string[]> = {
    '开发工具': ['code', 'build', 'git', 'github', 'debug', 'test', 'deploy', 'docker', 'coding', '编程', '开发'],
    '数据分析': ['analysis', 'analyze', 'research', 'summarize', 'extract', 'report', 'data', '分析', '研究', '统计'],
    '效率工具': ['task', 'todo', 'schedule', 'reminder', 'automation', 'workflow', '任务', '效率', '自动化'],
    '通信协作': ['slack', 'discord', 'message', 'chat', 'email', 'notification', '消息', '通知', '协作'],
    '多媒体': ['video', 'audio', 'spotify', 'youtube', 'transcribe', 'image', '视频', '音频', '图片'],
    '系统集成': ['system', 'terminal', 'shell', 'api', 'integration', '系统', '集成', '终端'],
  };

  for (const [group, keywords] of Object.entries(groupKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      return group;
    }
  }

  return '其他';
}

/**
 * Parse JSON format skill file with enhanced error handling
 */
function parseJSONSkill(content: string): ParseResult<Partial<SkillFileMeta>> {
  try {
    // 尝试自动修复常见的JSON格式问题
    let processedContent = content.trim();

    // 修复尾部多余逗号 (trailing commas)
    processedContent = processedContent.replace(/,(\s*[}\]])/g, '$1');

    // 修复单引号为双引号（简单情况）
    // 注意：这个修复比较基础，复杂情况可能无效

    const data = JSON.parse(processedContent);

    if (typeof data !== 'object' || data === null) {
      return { success: false, error: 'JSON格式错误：根对象无效，必须是对象或数组' };
    }

    return {
      success: true,
      data: {
        name: data.name || data.title || '',
        description: data.description || data.desc || '',
        version: data.version || '1.0.0',
        icon: data.icon || data.emoji,
        author: data.author,
        group: data.group || data.category,
        triggers: data.triggers || data.trigger_phrases || data.keywords,
        actions: data.actions,
        commands: data.commands,
        content: data.content || data.instructions,
        tags: data.tags,
        required_env: data.required_env || data.dependencies?.env,
        required_bins: data.required_bins || data.dependencies?.bins,
      },
    };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : '未知错误';

    // 提供更具体的JSON错误诊断
    let detailedError = errorMsg;

    if (errorMsg.includes('Unexpected token')) {
      const match = errorMsg.match(/Unexpected token (.+) at position (\d+)/);
      if (match) {
        detailedError = `JSON语法错误：发现了意外的字符 "${match[1]}"\n可能原因：\n- 缺少引号闭合\n- 存在非法字符（如单引号、注释）\n- 括号或逗号位置错误`;
      } else {
        detailedError = `JSON语法错误：发现了意外的字符\n常见问题：\n- 属性名必须使用双引号\n- 字符串值必须使用双引号\n- 不能包含JavaScript注释\n- 尾部不能有多余逗号`;
      }
    } else if (errorMsg.includes('Unexpected end')) {
      detailedError = `JSON语法错误：JSON字符串不完整\n可能原因：\n- 引号或括号未正确闭合\n- 文件被截断`;
    } else if (errorMsg.includes('Unexpected number')) {
      detailedError = `JSON语法错误：发现了意外的数字\n可能原因：\n- 数字格式不正确\n- 缺少引号`;
    } else if (errorMsg.includes('Unexpected string')) {
      detailedError = `JSON语法错误：发现了意外的字符串\n可能原因：\n- 属性名未使用双引号\n- 字符串值未使用双引号`;
    } else if (errorMsg.includes('Unexpected boolean')) {
      detailedError = `JSON语法错误：发现了意外的值\n可能原因：\n- true/false/null 拼写错误\n- 缺少引号`;
    }

    return { success: false, error: detailedError };
  }
}

/**
 * Parse YAML-like frontmatter format with improved error handling
 */
function parseFrontmatterSkill(content: string): ParseResult<Partial<SkillFileMeta>> {
  interface RawSkillMeta extends Partial<SkillFileMeta> {
    metadata?: {
      hermes?: { tags?: string[] };
      openclaw?: {
        emoji?: string;
        requires?: { bins?: string[]; env?: string[] };
        triggers?: string[];
        tags?: string[];
      };
    };
    prerequisites?: { commands?: string[]; env_vars?: string[] };
    required_environment_variables?: Array<{ name: string; optional?: boolean }>;
  }

  const parsed = parseSkillFrontmatter(content, {} as RawSkillMeta);
  if (!parsed.hasFrontmatter) {
    return parseSimpleKeyValueSkill(content);
  }
  if (parsed.error) {
    return { success: false, error: parsed.error };
  }

  const raw = parsed.metadata;
  if (!raw.name || !raw.name.trim()) {
    return {
      success: false,
      error: 'Frontmatter中缺少必填字段：name（技能名称）\n\n请确保frontmatter包含：\n---\nname: 您的技能名称\ndescription: 技能描述\n---'
    };
  }

  const hermesTags = raw.metadata?.hermes?.tags || [];
  const openClawTags = raw.metadata?.openclaw?.tags || [];
  const tags = raw.tags || [...hermesTags, ...openClawTags];
  const requiredEnv = [
    ...(raw.required_env || []),
    ...(raw.prerequisites?.env_vars || []),
    ...(raw.metadata?.openclaw?.requires?.env || []),
    ...(raw.required_environment_variables || [])
      .filter(variable => !variable.optional)
      .map(variable => variable.name),
  ];
  const requiredBins = [
    ...(raw.required_bins || []),
    ...(raw.prerequisites?.commands || []),
    ...(raw.metadata?.openclaw?.requires?.bins || []),
  ];

  return {
    success: true,
    data: {
      ...raw,
      name: raw.name,
      description: raw.description || parsed.content.slice(0, 200),
      version: raw.version || '1.0.0',
      icon: raw.icon || raw.emoji || raw.metadata?.openclaw?.emoji,
      triggers: raw.triggers || raw.metadata?.openclaw?.triggers || tags,
      content: parsed.content,
      tags: Array.from(new Set(tags)),
      required_env: Array.from(new Set(requiredEnv)),
      required_bins: Array.from(new Set(requiredBins)),
    },
  };
}

/**
 * Parse simple key-value format (no frontmatter)
 */
function parseSimpleKeyValueSkill(content: string): ParseResult<Partial<SkillFileMeta>> {
  const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  const meta: Partial<SkillFileMeta> = {};
  const contentLines: string[] = [];

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();

      switch (key) {
        case 'name':
          meta.name = value;
          break;
        case 'description':
        case 'desc':
          meta.description = value;
          break;
        case 'version':
          meta.version = value;
          break;
        case 'icon':
          meta.icon = value;
          break;
        case 'author':
          meta.author = value;
          break;
        case 'group':
        case 'category':
          meta.group = value;
          break;
        case 'triggers':
        case 'trigger':
          meta.triggers = value.split(',').map(s => s.trim()).filter(Boolean);
          break;
        default:
          contentLines.push(line);
      }
    } else {
      contentLines.push(line);
    }
  }

  if (!meta.name && contentLines.length > 0) {
    // First non-key-value line might be the name
    meta.name = contentLines[0].slice(0, 50);
    contentLines.shift();
  }

  if (!meta.description && contentLines.length > 0) {
    meta.description = contentLines.join(' ').slice(0, 200);
  }

  meta.content = contentLines.join('\n');

  return { success: true, data: meta };
}

/**
 * Extract trigger phrases from content
 */
function extractTriggersFromContent(content: string): string[] {
  const triggers: string[] = [];

  // Look for "When to use" section
  const triggerMatch = content.match(/##?\s*When to use.*?(?=##?\s|\n\n|$)/is);
  if (triggerMatch) {
    const section = triggerMatch[0];
    // Extract quoted phrases
    const quotes = section.match(/"([^"]+)"/g);
    if (quotes) {
      triggers.push(...quotes.map(q => q.replace(/"/g, '').trim()).filter(t => t.length > 2));
    }
    // Extract bullet points
    const bullets = section.match(/[-*]\s*([^-*]+)/g);
    if (bullets) {
      triggers.push(...bullets.map(b => b.replace(/^[-*]\s*/, '').trim()).filter(t => t.length > 2 && t.length < 100));
    }
  }

  // Look for "Triggers" section
  const triggersMatch = content.match(/##?\s*Triggers.*?(?=##?\s|\n\n|$)/is);
  if (triggersMatch) {
    const lines = triggersMatch[0].split('\n').filter(l => l.trim() && !l.startsWith('#'));
    for (const line of lines) {
      const trimmed = line.replace(/^[-*]\s*/, '').trim();
      if (trimmed.length > 2 && trimmed.length < 100) {
        triggers.push(trimmed);
      }
    }
  }

  // Deduplicate
  return [...new Set(triggers)];
}

/**
 * Convert SkillFileMeta to Skill
 */
function convertToSkill(meta: Partial<SkillFileMeta>, fileContent: string): Skill {
  const name = meta.name || '未命名技能';
  const icon = detectIcon(name, meta);
  const group = detectGroup(name, fileContent, meta);
  const triggers = meta.triggers || extractTriggersFromContent(fileContent);

  const actions: SkillAction[] = (meta.actions || triggers.slice(0, 3)).map((action, idx) => {
    if (typeof action === 'string') {
      return {
        id: `action_${idx}`,
        name: action.length > 30 ? action.slice(0, 30) + '...' : action,
        description: action,
      };
    }
    return {
      id: `action_${idx}`,
      name: action.name || `操作${idx + 1}`,
      description: action.description || action.name || '',
    };
  });

  return {
    id: `skill_${uuidv4().slice(0, 8)}`,
    name,
    description: meta.description || '',
    version: meta.version || '1.0.0',
    enabled: true,
    icon,
    actions,
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group,
    pinned: false,
    isBuiltIn: false,
    source: 'hermes',
    content: meta.content || meta.instructions || fileContent,
    triggers,
    prerequisites: {
      bins: meta.required_bins,
      env: meta.required_env,
    },
  };
}

/**
 * Main parse function for .skill files
 */
export function parseSkillFile(filename: string, content: string): ParseResult<Skill> {
  const ext = filename.split('.').pop()?.toLowerCase();

  let metaResult: ParseResult<Partial<SkillFileMeta>>;

  // Determine file format by extension
  if (ext === 'json' || filename.endsWith('.skill.json')) {
    metaResult = parseJSONSkill(content);
  } else if (ext === 'md' || ext === 'markdown' || filename.endsWith('.skill.md')) {
    metaResult = parseFrontmatterSkill(content);
  } else if (ext === 'skill') {
    // Try frontmatter first, then JSON, then key-value
    if (content.trim().startsWith('---')) {
      metaResult = parseFrontmatterSkill(content);
    } else if (content.trim().startsWith('{')) {
      metaResult = parseJSONSkill(content);
    } else {
      metaResult = parseSimpleKeyValueSkill(content);
    }
  } else {
    // Try to auto-detect format
    if (content.trim().startsWith('{')) {
      metaResult = parseJSONSkill(content);
    } else if (content.trim().startsWith('---')) {
      metaResult = parseFrontmatterSkill(content);
    } else {
      metaResult = parseSimpleKeyValueSkill(content);
    }
  }

  if (!metaResult.success) {
    return {
      success: false,
      error: `解析失败：${metaResult.error}`,
      warnings: metaResult.warnings,
    };
  }

  // Validate required fields
  if (!metaResult.data) {
    return {
      success: false,
      error: '解析结果为空',
      warnings: metaResult.warnings,
    };
  }

  const validationErrors = validateSkillMeta(metaResult.data);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: `技能文件验证失败：\n${validationErrors.join('\n')}`,
      warnings: metaResult.warnings,
    };
  }

  const skill = convertToSkill(metaResult.data, content);

  return {
    success: true,
    data: skill,
    warnings: metaResult.warnings,
  };
}

/**
 * Validate a skill file before import with enhanced diagnostics
 */
export function validateSkillFile(content: string): ParseResult<{ valid: boolean; preview?: Partial<SkillFileMeta> }> {
  const trimmed = content.trim();

  if (!trimmed) {
    return { success: false, error: '文件内容为空' };
  }

  try {
    // Try JSON format first
    if (trimmed.startsWith('{')) {
      const jsonResult = parseJSONSkill(content);
      if (jsonResult.success) {
        return { success: true, data: { valid: true, preview: jsonResult.data } };
      }
      // JSON parsing failed - return the detailed error
      return { success: false, error: jsonResult.error };
    }

    // Try frontmatter format
    if (trimmed.startsWith('---') || trimmed.includes('---')) {
      const fmResult = parseFrontmatterSkill(content);
      if (fmResult.success) {
        return { success: true, data: { valid: true, preview: fmResult.data } };
      }
      // Frontmatter parsing failed - return the detailed error
      return { success: false, error: fmResult.error };
    }

    // Try simple key-value format
    const kvResult = parseSimpleKeyValueSkill(content);
    if (kvResult.success && kvResult.data && kvResult.data.name) {
      return { success: true, data: { valid: true, preview: kvResult.data } };
    }

    // All formats failed
    return {
      success: false,
      error: '无法识别的文件格式\n\n请确保您的文件是以下格式之一：\n1. JSON格式：以 { 开头，包含 name 和 description 字段\n2. Markdown格式：以 --- 开头和结尾的frontmatter块\n3. 简单格式：name: xxx 作为第一行'
    };
  } catch (e) {
    return {
      success: false,
      error: `文件验证失败：${e instanceof Error ? e.message : '未知错误'}`,
    };
  }
}

/**
 * Generate a sample .skill file template
 */
export function generateSampleSkillFile(): string {
  return `{
  "name": "示例技能",
  "description": "这是一个示例技能的描述，说明技能的功能和用途",
  "version": "1.0.0",
  "icon": "💡",
  "author": "技能开发者",
  "group": "开发工具",
  "triggers": ["使用示例", "运行技能", "触发示例"],
  "tags": ["示例", "模板", "开发"],
  "required_bins": [],
  "required_env": [],
  "content": "## When to use\\n\\n使用这个技能的示例场景：\\n\\n- 需要执行某个特定任务时\\n- 自动化工作流程时\\n\\n## Actions\\n\\n- default: 执行默认操作\\n\\n## Instructions\\n\\n这里是技能的具体执行指令..."
}`;
}
