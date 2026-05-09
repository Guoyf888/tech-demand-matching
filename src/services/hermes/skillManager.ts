/**
 * Unified Skill Manager
 *
 * Handles skill discovery, parsing, and management
 * Supports:
 * - OpenClaw SKILL.md format
 * - Hermes SKILL.md format
 * - skill.json / manifest.json formats
 */

import { Skill } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const SKILLS_STORAGE_KEY = 'hermes-skills';

/**
 * 规范化文本编码为UTF-8
 * 修复因编码导致的乱码问题
 */
export function normalizeEncoding(text: string): string {
  if (!text) return text;

  // 检测是否为有效的UTF-8字符串
  // 如果包含常见的编码错误模式，则进行修复
  try {
    // 首先尝试使用TextDecoder进行UTF-8解码
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: false });

    // 尝试检测GBK/GB2312编码的中文（通过检查是否包含合法的UTF-8序列）
    // 如果不是有效的UTF-8，则尝试其他常见编码
    const testEncode = encoder.encode(text);
    const testDecode = decoder.decode(testEncode);

    // 检查是否有编码问题的迹象
    // 乱码常见模式：锟斤拷、烫烫烫、unicode替换字符等
    if (text.includes('锟斤拷') || text.includes('烫烫烫') || text.includes('\uFFFD')) {
      // 尝试使用GBK解码
      try {
        const gbkDecoder = new TextDecoder('gbk', { fatal: false });
        const bytes = Array.from(text, c => c.charCodeAt(0));
        const uint8Array = new Uint8Array(bytes.filter(b => b < 256));
        const gbkDecoded = gbkDecoder.decode(uint8Array);
        if (gbkDecoded && !gbkDecoded.includes('�')) {
          return gbkDecoded;
        }
      } catch {
        // GBK解码失败
      }
    }

    // 如果检测到可能是GBK编码但被当作Latin-1处理的情况
    const hasHighBytes = /[\x80-\xFF]/.test(text);
    if (hasHighBytes) {
      // 检查是否看起来像双重编码的UTF-8
      const doubleEncoded = /Ã.{2}¥|â€|Ã¢|Ã¨|Ã©|Ã«/.test(text);
      if (doubleEncoded) {
        // 尝试修复双重编码 - 使用Uint8Array代替Buffer
        try {
          const uint8Array = new Uint8Array(text.split('').map(c => c.charCodeAt(0)));
          const utf8Decoder = new TextDecoder('utf-8');
          return utf8Decoder.decode(uint8Array);
        } catch {
          // 如果失败，尝试使用更宽松的方法
          return decodeURIComponent(encodeURIComponent(text));
        }
      }
    }

    return testDecode || text;
  } catch {
    return text;
  }
}

/**
 * 安全解析JSON并规范化编码
 */
function parseJSONWithEncoding(jsonString: string): Record<string, unknown> | null {
  try {
    const normalized = normalizeEncoding(jsonString);
    return JSON.parse(normalized);
  } catch {
    // 如果UTF-8解析失败，尝试原始内容
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }
}

// Hermes Skill metadata
export interface HermesSkillMeta {
  name: string;
  description: string;
  version?: string;
  author?: string;
  license?: string;
  platforms?: string[];
  prerequisites?: {
    env_vars?: string[];
    commands?: string[];
  };
  compatibility?: string;
  metadata?: {
    hermes?: {
      tags?: string[];
      related_skills?: string[];
    };
    openclaw?: {
      emoji?: string;
      requires?: {
        bins?: string[];
        env?: string[];
      };
      install?: Array<{
        id: string;
        kind: string;
        formula?: string;
        bins?: string[];
        label?: string;
      }>;
    };
  };
}

// Parse frontmatter from SKILL.md
function parseFrontmatter(content: string): { metadata: HermesSkillMeta; content: string } {
  const lines = content.split('\n');
  let frontmatterEnd = -1;
  const metadata: HermesSkillMeta = { name: '', description: '' };

  if (lines[0]?.trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        frontmatterEnd = i;
        break;
      }

      const line = lines[i];
      const colonIndex = line.indexOf(':');

      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();

        // Handle YAML array format like: tags: [fine-tuning, llm]
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1);
        }

        // Map common fields
        switch (key) {
          case 'name':
          case 'description':
          case 'version':
          case 'author':
          case 'license':
          case 'platforms':
          case 'compatibility':
            (metadata as unknown as Record<string, unknown>)[key] = value;
            break;
          case 'metadata':
            try {
              const metaContent = lines.slice(i + 1).join('\n');
              const metaMatch = metaContent.match(/hermes:\s*\n([\s\S]*?)(?=^[a-z]|\n---)/m);
              if (metaMatch) {
                const hermesData: Record<string, unknown> = {};
                metaMatch[1].split('\n').forEach((metaLine: string) => {
                  const [k, v] = metaLine.split(':').map(s => s.trim());
                  if (k && v) hermesData[k] = v;
                });
                (metadata as unknown as Record<string, unknown>).metadata = { hermes: hermesData };
              }
            } catch {
              // Ignore metadata parse errors
            }
            break;
        }
      }
    }
  }

  const skillContent = frontmatterEnd >= 0
    ? lines.slice(frontmatterEnd + 1).join('\n').trim()
    : content;

  return { metadata, content: skillContent };
}

// Detect icon from content
function detectIconFromContent(content: string, filename: string): string {
  const iconEmojis = ['📦', '🔧', '💻', '📊', '🤖', '🧠', '🔬', '⚡', '🎨', '🚀', '🛠️', '📝', '🔍', '💡', '⚙️'];

  const nameLower = filename.toLowerCase();
  if (nameLower.includes('code')) return '💻';
  if (nameLower.includes('data')) return '📊';
  if (nameLower.includes('ai') || nameLower.includes('ml')) return '🤖';
  if (nameLower.includes('research')) return '🔬';
  if (nameLower.includes('plan')) return '📝';
  if (nameLower.includes('test')) return '🧪';
  if (nameLower.includes('debug')) return '🔧';
  if (nameLower.includes('github')) return '🐙';
  if (nameLower.includes('slack')) return '💬';
  if (nameLower.includes('discord')) return '💬';
  if (nameLower.includes('spotify')) return '🎵';
  if (nameLower.includes('weather')) return '🌤️';
  if (nameLower.includes('summarize')) return '🧾';
  if (nameLower.includes('task')) return '✅';
  if (nameLower.includes('note')) return '📝';
  if (nameLower.includes('memory')) return '🧠';

  if (content.includes('python') || content.includes('javascript') || content.includes('typescript')) return '💻';
  if (content.includes('analysis') || content.includes('analytics')) return '📊';
  if (content.includes('model') || content.includes('training')) return '🤖';
  if (content.includes('github') || content.includes('git')) return '🐙';

  const hash = content.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return iconEmojis[hash % iconEmojis.length];
}

// Extract trigger phrases from skill content
function extractTriggers(content: string): string[] {
  const triggers: string[] = [];

  const triggerMatch = content.match(/##?\s*When to use.*?##?\s*(?:Quick|Usage)/is);
  if (triggerMatch) {
    const section = triggerMatch[0];
    const quotes = section.match(/"([^"]+)"/g);
    if (quotes) {
      triggers.push(...quotes.map(q => q.replace(/"/g, '')));
    }
    const bullets = section.match(/[-*]\s*([^-*]+)/g);
    if (bullets) {
      triggers.push(...bullets.map(b => b.replace(/^[-*]\s*/, '').trim()).filter(t => t.length > 3 && t.length < 100));
    }
  }

  return triggers;
}

// Parse a skill from various file formats
export async function parseSkillFileInternal(filename: string, content: string): Promise<Skill | null> {
  try {
    // 规范化编码
    const normalizedContent = normalizeEncoding(content);

    let skillData: Partial<HermesSkillMeta & { content: string }> = {};
    let skillContent = normalizedContent;

    const ext = filename.split('.').pop()?.toLowerCase();
    const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

    if (ext === 'json') {
      try {
        const json = parseJSONWithEncoding(normalizedContent);
        if (!json) return null;
        skillData = {
          name: (json.name as string) || baseName,
          description: (json.description as string) || '',
          version: json.version as string | undefined,
          author: json.author as string | undefined,
          license: json.license as string | undefined,
        };
        skillContent = (json.content as string) || (json.instructions as string) || (json.markdown as string) || normalizedContent;
      } catch {
        return null;
      }
    } else if (ext === 'md' || filename.toLowerCase() === 'skill.md') {
      const { metadata, content: parsedContent } = parseFrontmatter(normalizedContent);
      skillData = metadata;
      skillContent = parsedContent;

      if (!skillData.name) {
        skillData.name = baseName;
      }
      if (!skillData.description) {
        const firstLine = skillContent.split('\n').find(l => l.trim() && !l.startsWith('#'));
        if (firstLine) {
          skillData.description = firstLine.trim().slice(0, 200);
        }
      }
    } else {
      skillData = {
        name: baseName,
        description: content.slice(0, 200),
      };
      skillContent = content;
    }

    if (!skillData.name || !skillData.description) {
      return null;
    }

    const skillId = `skill_${uuidv4().slice(0, 8)}`;
    const icon = detectIconFromContent(skillContent, filename);
    const triggers = extractTriggers(skillContent);

    return {
      id: skillId,
      name: skillData.name,
      description: skillData.description,
      version: skillData.version || '1.0.0',
      enabled: true,
      icon,
      actions: triggers.slice(0, 5).map((trigger, idx) => ({
        id: `action_${idx}`,
        name: trigger.length > 30 ? trigger.slice(0, 30) + '...' : trigger,
        description: trigger,
      })),
      metadata: {
        createdAt: new Date().toISOString(),
        usageCount: 0,
        successRate: 0,
      },
      isBuiltIn: false,
      group: detectSkillGroup(skillContent),
      source: 'hermes',
      content: skillContent,
      triggers,
    };
  } catch (error) {
    console.error(`Failed to parse skill file ${filename}:`, error);
    return null;
  }
}

// Detect skill group/category from content
function detectSkillGroup(content: string): string | undefined {
  const contentLower = content.toLowerCase();

  const groupKeywords: Record<string, string[]> = {
    '开发工具': ['code', 'build', 'git', 'github', 'debug', 'test', 'deploy', 'docker'],
    '数据分析': ['analysis', 'analyze', 'research', 'summarize', 'extract', 'report'],
    '效率工具': ['task', 'todo', 'schedule', 'reminder', 'automation', 'workflow'],
    '通信协作': ['slack', 'discord', 'message', 'chat', 'email', 'notification'],
    '多媒体': ['video', 'audio', 'spotify', 'youtube', 'transcribe', 'image'],
    '系统集成': ['system', 'terminal', 'shell', 'api', 'integration'],
  };

  for (const [group, keywords] of Object.entries(groupKeywords)) {
    if (keywords.some(kw => contentLower.includes(kw))) {
      return group;
    }
  }

  return undefined;
}

// Import skills from ZIP file content
export async function importSkillsFromZip(zipContent: ArrayBuffer): Promise<{
  imported: Skill[];
  failed: string[];
}> {
  const imported: Skill[] = [];
  const failed: string[] = [];

  try {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    await zip.loadAsync(zipContent);

    const files = Object.keys(zip.files);

    // Find all skill files (OpenClaw, Hermes, and native formats)
    const skillFiles = files.filter(name => {
      const nameLower = name.toLowerCase();
      return (
        nameLower.endsWith('skill.json') ||
        nameLower.endsWith('manifest.json') ||
        nameLower.endsWith('skill.md') ||
        nameLower === 'skill.md' ||
        (nameLower.includes('skill') && nameLower.endsWith('.md'))
      ) && !nameLower.includes('readme') && !nameLower.includes('changelog');
    });

    // If no skill files found, try to find any JSON or MD file in root
    if (skillFiles.length === 0) {
      const rootFiles = files.filter(name => {
        const nameLower = name.toLowerCase();
        return (
          (nameLower.endsWith('.json') || nameLower.endsWith('.md')) &&
          !nameLower.includes('readme') &&
          !nameLower.includes('changelog') &&
          name.split('/').length <= 2
        );
      });
      skillFiles.push(...rootFiles);
    }

    for (const filename of skillFiles) {
      try {
        const content = await zip.files[filename].async('string');
        const skill = await parseSkillFileInternal(filename, content);

        if (skill) {
          imported.push(skill);
        } else {
          failed.push(filename);
        }
      } catch {
        failed.push(filename);
      }
    }

    // Also look for skills in nested directories (OpenClaw skill structure)
    const directories = [...new Set(
      skillFiles.map(f => f.split('/')[0]).filter(d => d && d !== '.')
    )];

    for (const dir of directories) {
      const nestedFiles = files.filter(name =>
        name.startsWith(dir + '/') &&
        !name.includes('readme') &&
        !name.includes('changelog') &&
        (name.endsWith('.json') || name.endsWith('.md'))
      );

      for (const filename of nestedFiles) {
        try {
          const content = await zip.files[filename].async('string');
          const skill = await parseSkillFileInternal(filename, content);

          if (skill) {
            imported.push(skill);
          }
        } catch {
          failed.push(filename);
        }
      }
    }

  } catch (error) {
    console.error('Failed to process ZIP file:', error);
    throw new Error('无法解析 ZIP 文件');
  }

  return { imported, failed };
}

// Skill storage
export const skillStorage = {
  getAll(): Skill[] {
    const data = localStorage.getItem(SKILLS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save(skill: Skill) {
    const skills = this.getAll();
    const index = skills.findIndex(s => s.id === skill.id);
    if (index >= 0) {
      skills[index] = skill;
    } else {
      skills.push(skill);
    }
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(skills));
  },

  saveAll(skills: Skill[]) {
    const existing = this.getAll();
    const merged = [...existing];

    for (const skill of skills) {
      const index = merged.findIndex(s => s.id === skill.id || s.name === skill.name);
      if (index >= 0) {
        merged[index] = skill;
      } else {
        merged.push(skill);
      }
    }

    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(merged));
  },

  delete(id: string) {
    const skills = this.getAll().filter(s => s.id !== id);
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(skills));
  },

  clear() {
    localStorage.removeItem(SKILLS_STORAGE_KEY);
  }
};

export default skillStorage;
