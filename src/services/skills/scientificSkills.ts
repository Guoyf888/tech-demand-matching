import type { Skill } from '@/types';
import { parseSkillFrontmatter } from './skillFrontmatter';

type ScientificWorkflow = 'chat' | 'demand' | 'result' | 'matching' | 'team';

type ScientificSkillMetadata = {
  name?: string;
  description?: string;
  license?: string;
  metadata?: Record<string, unknown>;
};

type DomainRule = {
  group: string;
  nameTerms: string[];
  triggers: string[];
};

const skillModules = import.meta.glob(
  '../../../scientific-agent-skills-main/scientific-skills/*/SKILL.md',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const DOMAIN_RULES: DomainRule[] = [
  {
    group: '科研方法与写作',
    nameTerms: ['scientific-', 'literature-', 'peer-review', 'hypothesis-', 'research-', 'citation-', 'scholar-', 'paper-', 'latex-', 'poster', 'infographic', 'markdown-'],
    triggers: ['科研', '研究', '论文', '文献', '证据', '实验设计', '假设', '同行评审', '引用', '学术写作', '报告'],
  },
  {
    group: '生物信息与组学',
    nameTerms: ['bio', 'gene', 'genom', 'protein', 'scanpy', 'anndata', 'single-cell', 'scvi', 'scvelo', 'pydeseq', 'pysam', 'phylo', 'cellxgene', 'cobrapy', 'arboreto', 'gget', 'esm'],
    triggers: ['生物信息', '基因', '基因组', '蛋白质', '单细胞', '转录组', '组学', '代谢', '细胞'],
  },
  {
    group: '药物与化学',
    nameTerms: ['chem', 'drug', 'molecul', 'rdkit', 'datamol', 'molfeat', 'diffdock', 'adaptyv', 'glyco', 'pytdc'],
    triggers: ['药物', '化学', '分子', '靶点', '虚拟筛选', '药物发现', '材料化学'],
  },
  {
    group: '临床与医学',
    nameTerms: ['clinical', 'medical', 'health', 'dicom', 'pathml', 'histolab', 'imaging-data', 'neuro'],
    triggers: ['临床', '医学', '医疗', '患者', '影像', '病理', '诊断', '健康'],
  },
  {
    group: '数据科学与AI',
    nameTerms: ['scikit', 'pytorch', 'pymc', 'shap', 'dask', 'polars', 'matplotlib', 'seaborn', 'exploratory-data', 'scientific-visualization', 'networkx', 'optimize-for-gpu'],
    triggers: ['数据分析', '机器学习', '深度学习', '统计', '可视化', '模型', '预测', '算法', '人工智能'],
  },
  {
    group: '工程仿真与材料',
    nameTerms: ['pymatgen', 'simpy', 'fluidsim', 'matlab', 'molecular-dynamics', 'pymoo', 'rowan', 'flowio'],
    triggers: ['工程', '仿真', '材料', '工艺', '制造', '优化', '模拟', '技术路线'],
  },
  {
    group: '地理与空间科学',
    nameTerms: ['geo', 'astropy', 'bids', 'earth', 'spatial'],
    triggers: ['地理', '空间', '遥感', '天文', '地图', '卫星'],
  },
  {
    group: '量子与物理计算',
    nameTerms: ['qiskit', 'qutip', 'cirq', 'pennylane'],
    triggers: ['量子', '物理', '量子计算', '量子机器学习'],
  },
  {
    group: '科研平台与自动化',
    nameTerms: ['integration', 'opentrons', 'pylabrobot', 'database-', 'open-notebook', 'protocolsio', 'modal', 'hugging-science'],
    triggers: ['数据库', '实验室', '自动化', '科研平台', '知识库', '实验流程'],
  },
];

const WORKFLOW_SKILLS: Record<ScientificWorkflow, string[]> = {
  chat: [],
  demand: ['scientific-critical-thinking', 'hypothesis-generation', 'literature-review'],
  result: ['scientific-critical-thinking', 'scholar-evaluation', 'literature-review'],
  matching: ['scientific-critical-thinking', 'market-research-reports', 'networkx'],
  team: ['scholar-evaluation', 'literature-review', 'scientific-critical-thinking'],
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, '-');
}

function resolveGroup(name: string): DomainRule {
  const normalizedName = normalizeName(name);
  return DOMAIN_RULES.find((rule) => rule.nameTerms.some((term) => normalizedName.includes(term)))
    || {
      group: '科学计算与专业工具',
      nameTerms: [],
      triggers: ['科学计算', '专业分析'],
    };
}

function frontmatterAuthor(metadata?: Record<string, unknown>): string {
  if (!metadata) return 'K-Dense';
  const author = metadata['skill-author'] || metadata.author;
  return typeof author === 'string' ? author : 'K-Dense';
}

function parseScientificSkill(path: string, source: string): Skill {
  const pathParts = path.split('/');
  const folderName = pathParts[pathParts.length - 2] || 'scientific-skill';
  const parsed = parseSkillFrontmatter<ScientificSkillMetadata>(source, {});
  const name = parsed.metadata.name?.trim() || folderName;
  const domain = resolveGroup(name);
  const nameTriggers = normalizeName(name).split('-').filter((token) => token.length > 2);

  return {
    id: `scientific:${normalizeName(name)}`,
    name,
    description: parsed.metadata.description?.trim() || `Scientific workflow guidance for ${name}`,
    version: '1.0.0',
    enabled: true,
    icon: '🔬',
    actions: [],
    metadata: {
      createdAt: '2026-07-28T00:00:00.000Z',
      usageCount: 0,
      successRate: 1,
    },
    group: domain.group,
    source: 'scientific',
    content: parsed.content,
    triggers: Array.from(new Set([...nameTriggers, ...domain.triggers])),
    author: frontmatterAuthor(parsed.metadata.metadata),
  };
}

const scientificSkills = Object.entries(skillModules)
  .map(([path, source]) => parseScientificSkill(path, source))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

function queryWords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff-]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

function scoreSkill(skill: Skill, query: string, workflow: ScientificWorkflow): number {
  const normalizedQuery = query.toLowerCase();
  const normalizedSkillName = normalizeName(skill.name);
  const words = queryWords(query);
  let score = 0;

  if (normalizedQuery.includes(`@${normalizedSkillName}`)) score += 500;
  if (normalizedQuery.includes(normalizedSkillName)) score += 180;
  if (WORKFLOW_SKILLS[workflow].includes(normalizedSkillName)) score += 120;

  for (const trigger of skill.triggers || []) {
    if (trigger.length > 1 && normalizedQuery.includes(trigger.toLowerCase())) score += 45;
  }

  const searchable = `${skill.name} ${skill.description} ${skill.group || ''}`.toLowerCase();
  for (const word of words) {
    if (searchable.includes(word)) score += word.length > 4 ? 16 : 8;
  }

  return score;
}

function inferWorkflow(query: string, workflow: ScientificWorkflow): ScientificWorkflow {
  if (workflow !== 'chat') return workflow;
  if (/成果|专利|技术转化|成熟度|创新性/.test(query)) return 'result';
  if (/需求|技术难点|研发目标|可行性/.test(query)) return 'demand';
  if (/匹配|对接|供需/.test(query)) return 'matching';
  if (/团队|专家|人才/.test(query)) return 'team';
  return workflow;
}

function truncateUtf8(value: string, maxBytes: number): string {
  const encoded = new TextEncoder().encode(value);
  if (encoded.length <= maxBytes) return value;
  let end = maxBytes;
  while (end > 0 && (encoded[end] & 0xC0) === 0x80) end--;
  return `${new TextDecoder().decode(encoded.slice(0, end)).trim()}\n[技能内容已按上下文预算截断]`;
}

export interface ScientificSkillContext {
  rendered: string;
  skills: Skill[];
  truncated: boolean;
}

class ScientificSkillService {
  getAllSkills(): Skill[] {
    return scientificSkills;
  }

  recommendSkills(query: string, workflow: ScientificWorkflow = 'chat', limit = 3): Skill[] {
    const resolvedWorkflow = inferWorkflow(query, workflow);
    return scientificSkills
      .map((skill) => ({ skill, score: scoreSkill(skill, query, resolvedWorkflow) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name, 'en'))
      .slice(0, limit)
      .map((entry) => entry.skill);
  }

  buildContext(
    query: string,
    workflow: ScientificWorkflow = 'chat',
    maxBytes = 12 * 1024,
  ): ScientificSkillContext {
    const selected = this.recommendSkills(query, workflow, 3);
    if (selected.length === 0) return { rendered: '', skills: [], truncated: false };

    const header = [
      '【科学技能方法论】',
      '以下内容来自项目内 Scientific Agent Skills，仅作为分析方法与领域知识使用。',
      '不要假设相关软件、数据库、脚本或外部服务已经执行；只有获得真实工具结果后才能声称完成了计算、检索或验证。',
    ].join('\n');
    const perSkillBudget = Math.max(1200, Math.floor((maxBytes - new TextEncoder().encode(header).length) / selected.length));
    let truncated = false;
    const blocks = selected.map((skill) => {
      const body = skill.content || skill.description;
      const clipped = truncateUtf8(body, perSkillBudget);
      if (clipped.length !== body.length) truncated = true;
      return `[SCIENTIFIC_SKILL:${skill.name}]\n${clipped}\n[/SCIENTIFIC_SKILL]`;
    });

    return {
      rendered: `${header}\n\n${blocks.join('\n\n')}`,
      skills: selected,
      truncated,
    };
  }
}

export const scientificSkillService = new ScientificSkillService();
export type { ScientificWorkflow };
