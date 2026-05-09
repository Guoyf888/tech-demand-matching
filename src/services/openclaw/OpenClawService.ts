/**
 * OpenClaw Service
 *
 * Unified skill management integrating:
 * - OpenClaw SKILL.md format
 * - Hermes Agent skill format
 * - Native skill format
 *
 * Provides skill discovery, parsing, and execution dispatching
 */

import { Skill, SkillAction } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// OpenClaw skill metadata structure
export interface OpenClawSkillMeta {
  name: string;
  description: string;
  homepage?: string;
  metadata?: {
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
      triggers?: string[];
      tags?: string[];
    };
    hermes?: {
      tags?: string[];
      related_skills?: string[];
    };
  };
}

// Parse YAML frontmatter from SKILL.md (supports both Hermes and OpenClaw formats)
function parseFrontmatter(content: string): { metadata: OpenClawSkillMeta; content: string } {
  const lines = content.split('\n');
  let frontmatterEnd = -1;
  const metadata: OpenClawSkillMeta = { name: '', description: '' };

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

        // Handle YAML array format
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1);
        }

        // Handle YAML object/block
        if (value === '' || value === '{' || value.startsWith('{')) {
          // Try to parse multi-line YAML block
          const blockLines = lines.slice(i + 1);
          let blockEnd = -1;
          for (let j = 0; j < blockLines.length; j++) {
            if (blockLines[j].match(/^\s*}/) || blockLines[j].match(/^\s+\w+:/)) {
              // Continue until we hit a line that looks like a new top-level key
              if (blockLines[j].match(/^\s{0,2}\w/) && !blockLines[j].startsWith('  ') && !blockLines[j].startsWith('\t')) {
                blockEnd = j;
                break;
              }
            }
          }
          if (blockEnd > 0) {
            i += blockEnd;
          }
        }

        switch (key) {
          case 'name':
          case 'description':
          case 'homepage':
            (metadata as unknown as Record<string, unknown>)[key] = value;
            break;
          case 'metadata':
            // Parse metadata block
            try {
              const metaContent = lines.slice(i + 1).join('\n');
              // Handle OpenClaw metadata with nested openclaw object
              const openclawMatch = metaContent.match(/openclaw:\s*\n([\s\S]*?)(?=^\w|\n---)/m);
              const hermesMatch = metaContent.match(/hermes:\s*\n([\s\S]*?)(?=^\w|\n---)/m);

              const parsedMeta: Record<string, unknown> = {};

              if (openclawMatch) {
                const openclawData: Record<string, unknown> = {};
                openclawMatch[1].split('\n').forEach((metaLine: string) => {
                  const [k, ...vParts] = metaLine.split(':');
                  if (k && vParts.length) {
                    const v = vParts.join(':').trim();
                    openclawData[k.trim()] = v;
                  }
                });
                parsedMeta.openclaw = openclawData;
              }

              if (hermesMatch) {
                const hermesData: Record<string, unknown> = {};
                hermesMatch[1].split('\n').forEach((metaLine: string) => {
                  const [k, ...vParts] = metaLine.split(':');
                  if (k && vParts.length) {
                    const v = vParts.join(':').trim();
                    hermesData[k.trim()] = v;
                  }
                });
                parsedMeta.hermes = hermesData;
              }

              metadata.metadata = parsedMeta as OpenClawSkillMeta['metadata'];
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

// Detect icon from OpenClaw metadata or content
function detectIcon(metadata: OpenClawSkillMeta, content: string, filename: string): string {
  // First priority: OpenClaw metadata emoji
  if (metadata.metadata?.openclaw?.emoji) {
    return metadata.metadata.openclaw.emoji;
  }

  const iconEmojis = ['📦', '🔧', '💻', '📊', '🤖', '🧠', '🔬', '⚡', '🎨', '🚀', '🛠️', '📝', '🔍', '💡', '⚙️'];

  // Check filename for hints
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
  if (nameLower.includes('spotify')) return '🎵';
  if (nameLower.includes('weather')) return '🌤️';
  if (nameLower.includes('summarize')) return '🧾';
  if (nameLower.includes('task')) return '✅';
  if (nameLower.includes('note')) return '📝';
  if (nameLower.includes('memory')) return '🧠';

  // Check content for patterns
  const contentLower = content.toLowerCase();
  if (contentLower.includes('python') || contentLower.includes('javascript') || contentLower.includes('typescript')) return '💻';
  if (contentLower.includes('analysis') || contentLower.includes('analytics')) return '📊';
  if (contentLower.includes('model') || contentLower.includes('training')) return '🤖';
  if (contentLower.includes('github') || contentLower.includes('git')) return '🐙';
  if (contentLower.includes('discord')) return '💬';
  if (contentLower.includes('spotify')) return '🎵';
  if (contentLower.includes('summarize') || contentLower.includes('summary')) return '🧾';

  // Default based on hash
  const hash = content.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return iconEmojis[hash % iconEmojis.length];
}

// Extract trigger phrases from OpenClaw skill content
function extractTriggers(content: string): string[] {
  const triggers: string[] = [];

  // Look for "trigger phrases" section
  const triggerMatch = content.match(/##?\s*When to use.*?##?\s*(?:Quick|Usage)/is);
  if (triggerMatch) {
    const section = triggerMatch[0];
    // Extract quoted phrases
    const quotes = section.match(/"([^"]+)"/g);
    if (quotes) {
      triggers.push(...quotes.map(q => q.replace(/"/g, '')));
    }
    // Extract bullet points
    const bullets = section.match(/[-*]\s*([^-*]+)/g);
    if (bullets) {
      triggers.push(...bullets.map(b => b.replace(/^[-*]\s*/, '').trim()).filter(t => t.length > 3 && t.length < 100));
    }
  }

  return triggers;
}

// Parse a skill file (supports OpenClaw, Hermes, and native formats)
export async function parseSkillFile(filename: string, content: string): Promise<Skill | null> {
  try {
    let skillData: Partial<OpenClawSkillMeta & { content: string }> = {};
    let skillContent = content;

    const ext = filename.split('.').pop()?.toLowerCase();
    const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

    if (ext === 'json') {
      // Handle skill.json / manifest.json format
      try {
        const json = JSON.parse(content);
        skillData = {
          name: json.name || baseName,
          description: json.description || '',
          homepage: json.homepage,
          metadata: json.metadata,
        };
        skillContent = json.content || json.instructions || json.markdown || content;
      } catch {
        return null;
      }
    } else if (ext === 'md' || filename.toLowerCase() === 'skill.md') {
      // Handle SKILL.md format (both OpenClaw and Hermes)
      const { metadata, content: parsedContent } = parseFrontmatter(content);
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
    const icon = detectIcon(skillData as OpenClawSkillMeta, skillContent, filename);
    const triggers = extractTriggers(skillContent);

    // Create skill actions from triggers
    const actions: SkillAction[] = triggers.slice(0, 5).map((trigger, idx) => ({
      id: `action_${idx}`,
      name: trigger.length > 30 ? trigger.slice(0, 30) + '...' : trigger,
      description: trigger,
    }));

    return {
      id: skillId,
      name: skillData.name,
      description: skillData.description,
      version: skillData.metadata?.hermes?.tags ? '1.0.0' : '1.0.0',
      enabled: true,
      icon,
      actions,
      metadata: {
        createdAt: new Date().toISOString(),
        usageCount: 0,
        successRate: 0,
      },
      isBuiltIn: false,
      group: detectSkillGroup(skillContent),
      source: 'openclaw', // Mark as OpenClaw skill
      content: skillContent,
      triggers,
      prerequisites: skillData.metadata?.openclaw?.requires,
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

// OpenClaw Service class
export class OpenClawService {
  private skills: Map<string, Skill> = new Map();

  constructor() {
    this.loadBuiltInSkills();
  }

  // Load built-in OpenClaw skills
  private async loadBuiltInSkills() {
    // Built-in OpenClaw skills are loaded from the bundled skills
    const builtInSkills = this.getBuiltInOpenClawSkills();
    for (const skill of builtInSkills) {
      this.skills.set(skill.id, skill);
    }
  }

  // Get built-in OpenClaw skills (hardcoded for now)
  private getBuiltInOpenClawSkills(): Skill[] {
    return [
      {
        id: 'openclaw-summarize',
        name: 'summarize',
        description: 'Summarize or extract text/transcripts from URLs, podcasts, and local files',
        version: '1.0.0',
        enabled: true,
        icon: '🧾',
        actions: [
          { id: 'summ-1', name: 'Summarize URL', description: 'Summarize a URL' },
          { id: 'summ-2', name: 'Summarize File', description: 'Summarize a local file' },
          { id: 'summ-3', name: 'YouTube Transcript', description: 'Extract YouTube transcript' },
        ],
        metadata: { createdAt: new Date().toISOString(), usageCount: 0, successRate: 0 },
        isBuiltIn: true,
        group: '数据分析',
        source: 'openclaw',
        triggers: ['summarize this', 'what\'s this about', 'extract transcript', 'summarize URL'],
      },
      {
        id: 'openclaw-github',
        name: 'github',
        description: 'GitHub operations - issues, PRs, repos, and workflows',
        version: '1.0.0',
        enabled: true,
        icon: '🐙',
        actions: [
          { id: 'gh-1', name: 'Search Issues', description: 'Search GitHub issues' },
          { id: 'gh-2', name: 'Create PR', description: 'Create pull request' },
          { id: 'gh-3', name: 'Review Code', description: 'Review code changes' },
        ],
        metadata: { createdAt: new Date().toISOString(), usageCount: 0, successRate: 0 },
        isBuiltIn: true,
        group: '开发工具',
        source: 'openclaw',
        triggers: ['github', 'search issues', 'create pull request', 'review code'],
      },
      {
        id: 'openclaw-discord',
        name: 'discord',
        description: 'Discord messaging and server management',
        version: '1.0.0',
        enabled: true,
        icon: '💬',
        actions: [
          { id: 'disc-1', name: 'Send Message', description: 'Send Discord message' },
          { id: 'disc-2', name: 'List Channels', description: 'List Discord channels' },
        ],
        metadata: { createdAt: new Date().toISOString(), usageCount: 0, successRate: 0 },
        isBuiltIn: true,
        group: '通信协作',
        source: 'openclaw',
        triggers: ['discord', 'send message', 'slack message'],
      },
      {
        id: 'openclaw-spotify',
        name: 'spotify-player',
        description: 'Spotify playback control and music search',
        version: '1.0.0',
        enabled: true,
        icon: '🎵',
        actions: [
          { id: 'spot-1', name: 'Play Music', description: 'Play music on Spotify' },
          { id: 'spot-2', name: 'Search Track', description: 'Search for a track' },
        ],
        metadata: { createdAt: new Date().toISOString(), usageCount: 0, successRate: 0 },
        isBuiltIn: true,
        group: '多媒体',
        source: 'openclaw',
        triggers: ['spotify', 'play music', 'search song'],
      },
      {
        id: 'openclaw-taskflow',
        name: 'taskflow',
        description: 'Task and workflow automation',
        version: '1.0.0',
        enabled: true,
        icon: '✅',
        actions: [
          { id: 'task-1', name: 'Create Task', description: 'Create a new task' },
          { id: 'task-2', name: 'List Tasks', description: 'List all tasks' },
        ],
        metadata: { createdAt: new Date().toISOString(), usageCount: 0, successRate: 0 },
        isBuiltIn: true,
        group: '效率工具',
        source: 'openclaw',
        triggers: ['task', 'todo', 'workflow', 'automation'],
      },
      {
        id: 'openclaw-weather',
        name: 'weather',
        description: 'Weather information and forecasts',
        version: '1.0.0',
        enabled: true,
        icon: '🌤️',
        actions: [
          { id: 'weather-1', name: 'Current Weather', description: 'Get current weather' },
          { id: 'weather-2', name: 'Forecast', description: 'Get weather forecast' },
        ],
        metadata: { createdAt: new Date().toISOString(), usageCount: 0, successRate: 0 },
        isBuiltIn: true,
        group: '效率工具',
        source: 'openclaw',
        triggers: ['weather', 'forecast', 'temperature'],
      },
      {
        id: 'openclaw-notion',
        name: 'notion',
        description: 'Notion workspace integration for notes and databases',
        version: '1.0.0',
        enabled: true,
        icon: '📝',
        actions: [
          { id: 'notion-1', name: 'Create Page', description: 'Create a Notion page' },
          { id: 'notion-2', name: 'Query Database', description: 'Query a Notion database' },
        ],
        metadata: { createdAt: new Date().toISOString(), usageCount: 0, successRate: 0 },
        isBuiltIn: true,
        group: '效率工具',
        source: 'openclaw',
        triggers: ['notion', 'create note', 'database'],
      },
      {
        id: 'openclaw-coding-agent',
        name: 'coding-agent',
        description: 'Advanced coding agent for complex development tasks',
        version: '1.0.0',
        enabled: true,
        icon: '💻',
        actions: [
          { id: 'code-1', name: 'Generate Code', description: 'Generate code' },
          { id: 'code-2', name: 'Refactor', description: 'Refactor code' },
          { id: 'code-3', name: 'Debug', description: 'Debug code' },
        ],
        metadata: { createdAt: new Date().toISOString(), usageCount: 0, successRate: 0 },
        isBuiltIn: true,
        group: '开发工具',
        source: 'openclaw',
        triggers: ['code', 'programming', 'development', 'refactor', 'debug'],
      },
    ];
  }

  // Get all skills
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  // Get skill by ID
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  // Get skill by name
  getSkillByName(name: string): Skill | undefined {
    return Array.from(this.skills.values()).find(s => s.name.toLowerCase() === name.toLowerCase());
  }

  // Get skills by group
  getSkillsByGroup(group: string): Skill[] {
    return Array.from(this.skills.values()).filter(s => s.group === group);
  }

  // Get OpenClaw skills
  getOpenClawSkills(): Skill[] {
    return Array.from(this.skills.values()).filter(s => s.source === 'openclaw');
  }

  // Register a new skill
  registerSkill(skill: Skill) {
    this.skills.set(skill.id, skill);
  }

  // Find matching skill by trigger phrase
  findSkillByTrigger(trigger: string): Skill | undefined {
    const triggerLower = trigger.toLowerCase();
    return Array.from(this.skills.values()).find(skill =>
      skill.triggers?.some(t => triggerLower.includes(t.toLowerCase()))
    );
  }

  // Execute a skill (dispatch to appropriate handler)
  async executeSkill(skillId: string, params: Record<string, unknown>): Promise<{ success: boolean; output?: string; error?: string }> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return { success: false, error: `Skill not found: ${skillId}` };
    }

    // Simulate skill execution for now
    // In a full implementation, this would call the actual skill handler
    return {
      success: true,
      output: `[OpenClaw Skill: ${skill.name}]\n\nExecuting skill with params: ${JSON.stringify(params)}\n\nSkill description: ${skill.description}\n\nThis is a simulated execution. In full integration, this would execute the actual skill commands.`
    };
  }
}

// Singleton instance
let openClawServiceInstance: OpenClawService | null = null;

export function getOpenClawService(): OpenClawService {
  if (!openClawServiceInstance) {
    openClawServiceInstance = new OpenClawService();
  }
  return openClawServiceInstance;
}

export default OpenClawService;
