import { Skill } from '@/types';
import { skillStore } from './skillStore';

export const builtInSkills: Skill[] = [
  {
    id: 'skill_find-skills',
    name: 'find-skills',
    description: '搜索和发现其他可用的AI技能，帮助用户找到适合特定任务的技能',
    version: '1.0.0',
    enabled: true,
    icon: '🔍',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    pinned: true,
    isBuiltIn: true,
  },
  {
    id: 'skill_creator',
    name: 'Skill Creator',
    description: '创建新的AI技能，帮助用户自定义开发专属技能',
    version: '1.0.0',
    enabled: true,
    icon: '🛠️',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    pinned: true,
    isBuiltIn: true,
  },
  {
    id: 'skill_summarize',
    name: 'summarize',
    description: '快速总结长文本、文档、会议记录等内容为简洁摘要',
    version: '1.0.0',
    enabled: true,
    icon: '📝',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    pinned: true,
    isBuiltIn: true,
  },
  {
    id: 'skill_supermemory',
    name: 'Supermemory',
    description: '强大的记忆能力，跨对话记住用户偏好、历史交互和重要上下文',
    version: '1.0.0',
    enabled: true,
    icon: '🧠',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    pinned: true,
    isBuiltIn: true,
  },
  {
    id: 'skill_deep-research',
    name: 'deep-research',
    description: '深度研究能力，对复杂主题进行深入分析和多角度调研',
    version: '1.0.0',
    enabled: true,
    icon: '🔬',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    pinned: true,
    isBuiltIn: true,
  },
  {
    id: 'skill_search',
    name: '智能搜索',
    description: '搜索网络、文档和历史记录',
    version: '1.0.0',
    enabled: true,
    icon: '🔍',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
  },
  {
    id: 'skill_document',
    name: '文档处理',
    description: '解析PDF、Word、Markdown文档',
    version: '1.0.0',
    enabled: true,
    icon: '📄',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
  },
  {
    id: 'skill_code',
    name: '代码助手',
    description: '代码审查、生成、解释',
    version: '1.0.0',
    enabled: true,
    icon: '💻',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
  },
  {
    id: 'skill_analysis',
    name: '数据分析',
    description: '数据分析、可视化、报告生成',
    version: '1.0.0',
    enabled: true,
    icon: '📊',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
  },
  {
    id: 'skill_notification',
    name: '消息推送',
    description: '邮件、短信、API推送通知',
    version: '1.0.0',
    enabled: false,
    icon: '🔔',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
  },
];

export function getBuiltInSkills(): Skill[] {
  const stored = skillStore.getAll();
  if (stored.length === 0) {
    builtInSkills.forEach((s) => skillStore.save(s));
    return builtInSkills;
  }
  return stored;
}
