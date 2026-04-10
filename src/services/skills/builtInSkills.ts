import { Skill } from '@/types';
import { skillStore } from './skillStore';

export const builtInSkills: Skill[] = [
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
