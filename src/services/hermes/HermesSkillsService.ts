/**
 * Hermes Skills Service - 兼容 hermes-agent v0.19.0 技能系统
 *
 * 支持:
 * - Hermes SKILL.md格式 (YAML frontmatter)
 * - OpenClaw SKILL.md格式
 * - Slash命令调用 (/skill-name)
 * - 渐进式披露架构
 * - 外部技能目录扩展
 */

import { Skill } from '@/types';
import { parseSkillFrontmatter } from '@/services/skills/skillFrontmatter';

// 平台映射
const PLATFORM_MAP: Record<string, string> = {
  macos: 'darwin',
  linux: 'linux',
  windows: 'win32',
};

// Skill readiness status
export enum SkillReadinessStatus {
  AVAILABLE = 'available',
  SETUP_NEEDED = 'setup_needed',
  UNSUPPORTED = 'unsupported',
}

// Skill metadata (hermes-agent格式)
export interface HermesSkillMeta {
  name: string;
  description: string;
  version?: string;
  author?: string;
  license?: string;
  platforms?: string[];
  environments?: string[];
  tags?: string[];
  prerequisites?: {
    env_vars?: string[];
    commands?: string[];
  };
  compatibility?: string;
  metadata?: {
    hermes?: {
      tags?: string[];
      related_skills?: string[];
      fallback_for_toolsets?: string[];
      requires_toolsets?: string[];
      fallback_for_tools?: string[];
      requires_tools?: string[];
      config?: Array<{
        key: string;
        description: string;
        default?: string;
        prompt?: string;
      }>;
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
      triggers?: string[];
      tags?: string[];
    };
  };
  setup?: {
    help?: string;
    collect_secrets?: Array<{
      env_var: string;
      prompt: string;
      provider_url?: string;
      secret?: boolean;
    }>;
  };
  required_environment_variables?: Array<{
    name: string;
    prompt?: string;
    help?: string;
    required_for?: string;
    optional?: boolean;
  }>;
  required_credential_files?: Array<{
    path: string;
    description?: string;
  }>;
}

// Skill文件信息
export interface SkillFileInfo {
  name: string;
  description: string;
  path: string;
  skillDir: string;
  readiness: SkillReadinessStatus;
  content: string;
  rawContent: string;
  metadata: HermesSkillMeta;
  linkedFiles?: Record<string, string[]>;
}

// 解析YAML frontmatter
function parseFrontmatter(content: string): { metadata: HermesSkillMeta; content: string } {
  const parsed = parseSkillFrontmatter(content, { name: '', description: '' } as HermesSkillMeta);
  return { metadata: parsed.metadata, content: parsed.content };
}

// 检查平台兼容性
function skillMatchesPlatform(frontmatter: HermesSkillMeta): boolean {
  const platforms = frontmatter.platforms;
  if (!platforms || platforms.length === 0) return true;

  const currentPlatform = navigator.platform.toLowerCase();
  for (const platform of platforms) {
    const normalized = platform.toLowerCase().trim();
    const mapped = PLATFORM_MAP[normalized] || normalized;
    if (currentPlatform.startsWith(mapped)) return true;
  }
  return false;
}

// 检测图标
function detectIcon(metadata: HermesSkillMeta, content: string, filename: string): string {
  const iconEmojis = ['📦', '🔧', '💻', '📊', '🤖', '🧠', '🔬', '⚡', '🎨', '🚀', '🛠️', '📝', '🔍', '💡', '⚙️'];

  // OpenClaw emoji优先
  if (metadata.metadata?.openclaw?.emoji) {
    return metadata.metadata.openclaw.emoji;
  }

  const nameLower = filename.toLowerCase();
  if (nameLower.includes('code')) return '💻';
  if (nameLower.includes('data')) return '📊';
  if (nameLower.includes('ai') || nameLower.includes('ml')) return '🤖';
  if (nameLower.includes('research')) return '🔬';
  if (nameLower.includes('plan')) return '📝';
  if (nameLower.includes('test')) return '🧪';
  if (nameLower.includes('debug')) return '🔧';
  if (nameLower.includes('github')) return '🐙';
  if (nameLower.includes('comic')) return '🎨';
  if (nameLower.includes('infographic')) return '📊';
  if (nameLower.includes('video')) return '🎬';
  if (nameLower.includes('music') || nameLower.includes('audio')) return '🎵';
  if (nameLower.includes('weather')) return '🌤️';
  if (nameLower.includes('summarize')) return '🧾';
  if (nameLower.includes('task')) return '✅';
  if (nameLower.includes('note')) return '📝';
  if (nameLower.includes('memory')) return '🧠';
  if (nameLower.includes('policy')) return '📋';
  if (nameLower.includes('industry')) return '🔗';
  if (nameLower.includes('tech')) return '🔮';

  const contentLower = content.toLowerCase();
  if (contentLower.includes('python') || contentLower.includes('javascript')) return '💻';
  if (contentLower.includes('analysis') || contentLower.includes('analytics')) return '📊';
  if (contentLower.includes('model') || contentLower.includes('training')) return '🤖';
  if (contentLower.includes('github') || contentLower.includes('git')) return '🐙';

  const hash = content.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return iconEmojis[hash % iconEmojis.length];
}

// 提取触发词
function extractTriggers(content: string, metadata: HermesSkillMeta): string[] {
  const triggers: string[] = [];

  // 从OpenClaw metadata提取
  if (metadata.metadata?.openclaw?.triggers) {
    triggers.push(...metadata.metadata.openclaw.triggers);
  }

  // 从"When to use"部分提取
  const triggerMatch = content.match(/##?\s*When to use.*?##?\s*(?:Quick|Usage|Workflow)/is);
  if (triggerMatch) {
    const section = triggerMatch[0];
    const quotes = section.match(/"([^"]+)"/g);
    if (quotes) {
      triggers.push(...quotes.map(q => q.replace(/"/g, '')));
    }
    const bullets = section.match(/[-*]\s*([^-*]+)/g);
    if (bullets) {
      triggers.push(...bullets
        .map(b => b.replace(/^[-*]\s*/, '').trim())
        .filter(t => t.length > 3 && t.length < 100));
    }
  }

  return [...new Set(triggers)].slice(0, 10);
}

// 转换为统一Skill格式
function convertToSkill(
  skillInfo: SkillFileInfo
): Skill {
  const { metadata, content } = skillInfo;
  const triggers = extractTriggers(content, metadata);

  return {
    id: `hermes-${skillInfo.name.toLowerCase().replace(/\s+/g, '-')}`.slice(0, 50),
    name: metadata.name || skillInfo.name,
    description: metadata.description || skillInfo.description,
    version: metadata.version || '1.0.0',
    enabled: true,
    icon: detectIcon(metadata, content, skillInfo.name),
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
    isBuiltIn: true,
    group: detectGroup(content),
    source: 'hermes',
    content: content,
    triggers: triggers,
    author: metadata.author,
    prerequisites: metadata.prerequisites ? {
      bins: metadata.prerequisites.commands,
      env: metadata.prerequisites.env_vars,
    } : undefined,
  };
}

// 检测技能分组
function detectGroup(content: string): string | undefined {
  const contentLower = content.toLowerCase();

  const groupKeywords: Record<string, string[]> = {
    '创意工具': ['comic', 'infographic', 'design', 'creative', 'art', 'image'],
    '开发工具': ['code', 'build', 'git', 'github', 'debug', 'test', 'deploy', 'docker', 'software'],
    '数据分析': ['analysis', 'research', 'summarize', 'extract', 'report', 'data'],
    '效率工具': ['task', 'todo', 'schedule', 'reminder', 'automation', 'workflow'],
    '通信协作': ['slack', 'discord', 'message', 'chat', 'email', 'notification'],
    '多媒体': ['video', 'audio', 'spotify', 'youtube', 'transcribe'],
    '系统集成': ['system', 'terminal', 'shell', 'api', 'integration'],
    'AI技术': ['ai', 'llm', 'model', 'training', 'ml', 'nlp'],
    '政策服务': ['policy', 'government', 'regulation'],
    '产业链': ['industry', 'chain', 'supply', 'manufacturing'],
    '企业服务': ['company', 'enterprise', 'business', 'management'],
  };

  for (const [group, keywords] of Object.entries(groupKeywords)) {
    if (keywords.some(kw => contentLower.includes(kw))) {
      return group;
    }
  }

  return '其他工具';
}

// Hermes Skills Service
export class HermesSkillsService {
  private skills: Map<string, Skill> = new Map();
  private skillCommands: Map<string, SkillFileInfo> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.initializeSkills();
  }

  // 初始化技能系统
  private async initializeSkills(): Promise<void> {
    if (this.initialized) return;

    // 注册内置Hermes Skills（模拟hermes-agent的技能目录）
    this.registerBuiltInSkills();

    // 扫描外部技能目录（如果有）
    await this.scanExternalSkills();

    this.initialized = true;
  }

  // 注册内置Hermes Skills
  private registerBuiltInSkills(): void {
    // 核心hermes-agent技能 - 对应hermes-agent-main/skills目录
    const builtInSkills: SkillFileInfo[] = [
      // Creative skills
      {
        name: 'baoyu-comic',
        description: '知识漫画生成器 - 创建教育性、知识性漫画，支持多种艺术风格',
        path: 'creative/baoyu-comic/SKILL.md',
        skillDir: 'creative/baoyu-comic',
        readiness: SkillReadinessStatus.AVAILABLE,
        content: this.getBaoyuComicContent(),
        rawContent: '',
        metadata: {
          name: 'baoyu-comic',
          description: '知识漫画生成器 - 创建教育性、知识性漫画，支持多种艺术风格',
          version: '1.56.1',
          author: '宝玉 (JimLiu)',
          license: 'MIT',
          metadata: {
            hermes: {
              tags: ['comic', 'knowledge-comic', 'creative', 'image-generation'],
            },
          },
        },
      },
      {
        name: 'baoyu-infographic',
        description: '信息图表生成器 - 创建专业的信息图表，支持21种布局和21种视觉风格',
        path: 'creative/baoyu-infographic/SKILL.md',
        skillDir: 'creative/baoyu-infographic',
        readiness: SkillReadinessStatus.AVAILABLE,
        content: this.getBaoyuInfographicContent(),
        rawContent: '',
        metadata: {
          name: 'baoyu-infographic',
          description: '信息图表生成器 - 创建专业的信息图表',
          version: '1.0.0',
          metadata: {
            hermes: {
              tags: ['infographic', 'visual', 'creative'],
            },
          },
        },
      },
      // Research skills
      {
        name: 'research-paper',
        description: '研究论文辅助 - 帮助撰写、润色和分析研究论文',
        path: 'research/research-paper/SKILL.md',
        skillDir: 'research/research-paper',
        readiness: SkillReadinessStatus.AVAILABLE,
        content: this.getResearchPaperContent(),
        rawContent: '',
        metadata: {
          name: 'research-paper',
          description: '研究论文辅助 - 论文撰写、润色、分析',
          metadata: {
            hermes: {
              tags: ['research', 'paper', 'academic'],
            },
          },
        },
      },
      // Tech matching skills
      {
        name: 'tech-demand-analysis',
        description: '技术需求分析 - 深度分析技术需求的背景、目标、可行性',
        path: 'research/tech-demand/SKILL.md',
        skillDir: 'research/tech-demand',
        readiness: SkillReadinessStatus.AVAILABLE,
        content: this.getTechDemandAnalysisContent(),
        rawContent: '',
        metadata: {
          name: 'tech-demand-analysis',
          description: '技术需求分析 - 深度分析技术需求的背景、目标、可行性',
          metadata: {
            hermes: {
              tags: ['analysis', 'demand', 'tech'],
            },
          },
        },
      },
      {
        name: 'tech-result-analysis',
        description: '技术成果分析 - 评估技术成果的创新性、成熟度、市场价值',
        path: 'research/tech-result/SKILL.md',
        skillDir: 'research/tech-result',
        readiness: SkillReadinessStatus.AVAILABLE,
        content: this.getTechResultAnalysisContent(),
        rawContent: '',
        metadata: {
          name: 'tech-result-analysis',
          description: '技术成果分析 - 评估技术成果的创新性、成熟度、市场价值',
          metadata: {
            hermes: {
              tags: ['analysis', 'result', 'tech'],
            },
          },
        },
      },
      {
        name: 'demand-result-matching',
        description: '需求成果智能匹配 - 在技术成果和技术需求之间进行双向匹配',
        path: 'research/matching/SKILL.md',
        skillDir: 'research/matching',
        readiness: SkillReadinessStatus.AVAILABLE,
        content: this.getDemandResultMatchingContent(),
        rawContent: '',
        metadata: {
          name: 'demand-result-matching',
          description: '需求成果智能匹配 - 双向匹配技术供需',
          metadata: {
            hermes: {
              tags: ['matching', 'demand', 'result'],
            },
          },
        },
      },
      // Policy skills
      {
        name: 'policy-qa',
        description: '政策智能问答 - 解答科技政策相关问题',
        path: 'research/policy/SKILL.md',
        skillDir: 'research/policy',
        readiness: SkillReadinessStatus.AVAILABLE,
        content: this.getPolicyQAContent(),
        rawContent: '',
        metadata: {
          name: 'policy-qa',
          description: '政策智能问答 - 科技创新政策咨询',
          metadata: {
            hermes: {
              tags: ['policy', 'qa', 'government'],
            },
          },
        },
      },
      {
        name: 'industry-chain-analysis',
        description: '产业链分析 - 分析产业链结构与关键环节',
        path: 'research/industry-chain/SKILL.md',
        skillDir: 'research/industry-chain',
        readiness: SkillReadinessStatus.AVAILABLE,
        content: this.getIndustryChainContent(),
        rawContent: '',
        metadata: {
          name: 'industry-chain-analysis',
          description: '产业链分析 - 分析产业链结构与关键环节',
          metadata: {
            hermes: {
              tags: ['industry', 'chain', 'analysis'],
            },
          },
        },
      },
    ];

    // 注册技能和slash命令
    for (const skillInfo of builtInSkills) {
      const skill = convertToSkill(skillInfo);
      this.skills.set(skill.id, skill);

      // 注册slash命令
      const cmdName = `/${skill.name.toLowerCase().replace(/\s+/g, '-')}`;
      this.skillCommands.set(cmdName, skillInfo);
    }
  }

  // 扫描外部技能目录
  private async scanExternalSkills(): Promise<void> {
    // TODO: 实现外部技能目录扫描
    // 格式: config.yaml 中 skills.external_dirs
  }

  // 获取所有技能
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  // 获取技能
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  // 按名称获取技能
  getSkillByName(name: string): Skill | undefined {
    return Array.from(this.skills.values()).find(
      s => s.name.toLowerCase() === name.toLowerCase()
    );
  }

  // 获取所有slash命令
  getSkillCommands(): Map<string, SkillFileInfo> {
    return this.skillCommands;
  }

  // 解析slash命令
  resolveSkillCommand(command: string): SkillFileInfo | undefined {
    // 支持斜线格式
    const cmdKey = command.startsWith('/') ? command : `/${command}`;
    return this.skillCommands.get(cmdKey);
  }

  // 获取技能内容
  getSkillContent(skillName: string): string | undefined {
    const skill = this.getSkillByName(skillName);
    return skill?.content;
  }

  // 通过触发词查找技能
  findSkillByTrigger(trigger: string): Skill | undefined {
    const triggerLower = trigger.toLowerCase();
    return Array.from(this.skills.values()).find(skill =>
      skill.triggers?.some(t => triggerLower.includes(t.toLowerCase()))
    );
  }

  // 执行技能 - 通过LLM真正执行
  async executeSkill(skillName: string, params: Record<string, unknown> = {}): Promise<{ success: boolean; output?: string; error?: string }> {
    const skill = this.getSkillByName(skillName);
    if (!skill) {
      return { success: false, error: `Hermes skill not found: ${skillName}` };
    }
    if (!skill.content) {
      return { success: false, error: `Skill has no content: ${skillName}` };
    }
    const systemPrompt = skill.content.slice(0, 8192);
    const userMessage = (params.query as string) || (params.task as string) || skill.description;
    try {
      const { claudeChat } = await import('@/services/claudeCode');
      const result = await claudeChat(userMessage, [], { systemPrompt });
      if (result.success && result.output) {
        return { success: true, output: result.output };
      }
      return { success: false, error: result.error || 'LLM execution failed' };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  // 获取分组技能
  getSkillsByGroup(group: string): Skill[] {
    return Array.from(this.skills.values()).filter(s => s.group === group);
  }

  // 获取分组列表
  getGroups(): string[] {
    const groups = new Set<string>();
    for (const skill of this.skills.values()) {
      if (skill.group) groups.add(skill.group);
    }
    return Array.from(groups);
  }

  // 技能技能内容

  private getBaoyuComicContent(): string {
    return `# 知识漫画生成器

## 功能说明
创建原创知识漫画，支持灵活的 Art Style × Tone 组合。

## 触发条件
当用户要求创建知识/教育漫画、生平漫画、教程漫画，或使用"知识漫画"、"Logicomix风格"等术语时激活。

## 支持选项
- **艺术风格**: ligne-claire (默认), manga, realistic, ink-brush, chalk, minimalist
- **色调**: neutral (默认), warm, dramatic, romantic, energetic, vintage, action
- **布局**: standard (默认), cinematic, dense, splash, mixed, webtoon, four-panel
- **画幅比**: 3:4 (默认竖屏), 4:3 (横屏), 16:9 (宽屏)
- **语言**: auto (默认), zh, en, ja 等

## 工作流程
1. 内容分析与提炼
2. 风格与选项确认
3. 生成故事板 + 角色设定
4. 生成图像提示词
5. 生成图像

## 输出格式
\`\`\`
comic/{topic-slug}/
├── source-{slug}.md      # 原始内容
├── analysis.md           # 内容分析
├── storyboard.md         # 故事板
├── characters/           # 角色设定
├── prompts/             # 生成提示词
└── *.png                # 生成的图像
\`\`\``;
  }

  private getBaoyuInfographicContent(): string {
    return `# 信息图表生成器

## 功能说明
创建专业的21种布局×21种视觉风格信息图表。

## 触发条件
当用户要求创建信息图表、数据可视化、教学图表时激活。

## 支持布局
- Bento Grid, Dashboard, Funnel, Hub-Spoke, Timeline
- Comparison Matrix, Venn Diagram, Tree Branching
- Isometric Map, Periodic Table, Winding Roadmap 等

## 支持风格
- Corporate Memphis, Bold Graphic, Hand-Drawn
- Chalkboard, Cyberpunk Neon, Morandi Journal
- Kawaii, IKEA Manual, Pixel Art 等

## 工作流程
1. 内容结构分析
2. 布局×风格推荐
3. 生成图表
4. 输出图像`;
  }

  private getResearchPaperContent(): string {
    return `# 研究论文辅助

## 功能说明
帮助撰写、润色和分析研究论文。

## 触发条件
当用户提供论文主题、摘要或要求润色时激活。

## 支持服务
- 论文结构规划
- 摘要/引言/结论撰写
- 语言润色
- 格式规范检查
- 引用格式转换

## 输出
结构化的论文内容或修改建议。`;
  }

  private getTechDemandAnalysisContent(): string {
    return `# 技术需求分析

## 功能说明
深度分析技术需求的背景、目标、可行性和实现路径。

## 触发条件
当用户提供技术需求、项目描述或问题陈述时激活。

## 分析维度
1. **需求背景**
   - 行业现状与痛点
   - 技术发展趋势

2. **需求目标**
   - 核心功能需求
   - 性能指标要求
   - 约束条件

3. **可行性分析**
   - 技术可行性评估
   - 资源需求分析
   - 风险识别

4. **实现路径**
   - 技术路线图
   - 里程碑规划
   - 团队能力建议

## 输出格式
\`\`\`
# 技术需求分析报告

## 一、需求概述
[需求背景与目标]

## 二、技术可行性
[技术分析]

## 三、实现方案
[建议的技术路线]

## 四、资源估算
[人力、时间、成本]

## 五、风险评估
[主要风险与应对]

## 六、建议行动计划
[下一步工作]
\`\`\``;
  }

  private getTechResultAnalysisContent(): string {
    return `# 技术成果分析

## 功能说明
评估技术成果的创新性、成熟度、市场价值和应用前景。

## 触发条件
当用户提供技术成果描述、专利、论文或产品说明时激活。

## 分析维度
1. **创新性评估**
   - 核心技术亮点
   - 与现有技术对比
   - 专利保护分析

2. **成熟度评估**
   - 技术就绪水平 (TRL)
   - 原型/实验/量产状态
   - 验证完整性

3. **市场价值**
   - 目标市场分析
   - 竞争优势
   - 潜在应用场景

4. **转化建议**
   - 产业化路径
   - 合作模式建议
   - 资源需求

## 输出格式
\`\`\`
# 技术成果分析报告

## 一、成果概述
[技术描述与核心创新点]

## 二、创新性评估
[与现有技术的对比分析]

## 三、成熟度评估
[TRL等级及依据]

## 四、市场价值分析
[应用场景与市场规模]

## 五、转化建议
[产业化路径与合作模式]
\`\`\``;
  }

  private getDemandResultMatchingContent(): string {
    return `# 需求成果智能匹配

## 功能说明
在技术成果和技术需求之间进行双向智能匹配。

## 触发条件
当用户提供需求描述+成果描述，或要求匹配时激活。

## 匹配流程
1. **需求解析**
   - 核心技术需求
   - 关键指标
   - 约束条件

2. **成果解析**
   - 技术能力描述
   - 成熟度水平
   - 适用场景

3. **匹配评估**
   - 匹配度评分 (0-100)
   - 匹配亮点
   - 差异分析

4. **合作建议**
   - 合作模式
   - 落地路径
   - 风险提示

## 输出格式
\`\`\`
# 技术供需匹配分析

## 一、需求分析
[技术需求核心要点]

## 二、成果分析
[技术成果特点与优势]

## 三、匹配度评估
[评分与理由]

## 四、匹配亮点
[高度匹配的3-5个点]

## 五、合作建议
[合作模式与实施建议]
\`\`\``;
  }

  private getPolicyQAContent(): string {
    return `# 政策智能问答

## 功能说明
解答科技创新政策相关问题，支持政策检索和申报指导。

## 触发条件
当用户询问政策、补贴、资质认定等问题时激活。

## 支持问题类型
- 创新基金申报条件
- 高新企业认定政策
- 研发费用加计扣除
- 人才引进政策
- 园区扶持政策

## 输出格式
\`\`\`
**一、政策依据**
[政策名称和文号]

**二、核心条款**
[政策要点]

**三、适用条件**
[企业需满足的条件]

**四、支持方式**
[资金、税收、资质]

**五、申报建议**
[关键点和注意事项]
\`\`\``;
  }

  private getIndustryChainContent(): string {
    return `# 产业链分析

## 功能说明
分析产业链结构、上中下游关键环节和代表性企业。

## 触发条件
当用户提供行业/产业名称，要求分析产业链时激活。

## 分析维度
1. **产业链全景**
   - 上游原材料/基础环节
   - 中游核心制造/研发
   - 下游应用/服务

2. **核心企业分析**
   - 龙头企业的市场地位
   - 技术优势分析

3. **技术壁垒**
   - 行业核心技术
   - 进入门槛

4. **发展趋势**
   - 技术发展方向
   - 市场前景

## 输出格式
\`\`\`
# [行业] 产业链分析报告

## 一、产业链全景图
[上中下游结构]

## 二、上游分析
[原材料/基础环节]

## 三、中游分析
[核心制造/研发]

## 四、下游分析
[应用/服务]

## 五、核心企业
[代表性企业分析]

## 六、技术壁垒
[行业技术门槛]

## 七、发展趋势
[技术方向与市场前景]
\`\`\``;
  }

  // 获取统计数据
  getStats() {
    const skills = this.getAllSkills();
    const groups = this.getGroups();

    return {
      total: skills.length,
      groups: groups.length,
      byGroup: groups.map(g => ({
        name: g,
        count: this.getSkillsByGroup(g).length,
      })),
    };
  }
}

// 单例实例
let hermesSkillsServiceInstance: HermesSkillsService | null = null;

export function getHermesSkillsService(): HermesSkillsService {
  if (!hermesSkillsServiceInstance) {
    hermesSkillsServiceInstance = new HermesSkillsService();
  }
  return hermesSkillsServiceInstance;
}

// 导出工具函数供外部使用
export { parseFrontmatter, skillMatchesPlatform };

export default HermesSkillsService;
