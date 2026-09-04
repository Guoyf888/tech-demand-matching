import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Demand, TechResult } from '@/types';

const gatewayMocks = vi.hoisted(() => ({
  validateConfig: vi.fn(),
  chat: vi.fn(),
}));

vi.mock('@/services/api/gateway', () => ({
  apiGateway: gatewayMocks,
}));

vi.mock('@/services/documentParser', () => ({
  buildDocumentChatContent: (content: string) => content,
  extractIndustryTags: () => ['制造业'],
  extractTechTags: () => ['智能制造'],
}));

vi.mock('@/services/skills/scientificSkills', () => ({
  scientificSkillService: {
    buildContext: () => ({
      rendered: '使用证据分级方法',
      skills: [{ name: 'scientific-critical-thinking' }],
      truncated: false,
    }),
  },
}));

import {
  analyzeDemandDraft,
  analyzeTechDraft,
  validateDraftAnalysisConfiguration,
} from './draftAnalysis';

const demandDraft: Demand = {
  id: 'demand-1',
  title: '智能产线升级',
  content: '需要改造现有生产线并提升质量检测效率。',
  tags: [],
  status: 'draft',
  createdAt: '2026-07-29T00:00:00.000Z',
  updatedAt: '2026-07-29T00:00:00.000Z',
};

const techDraft: TechResult = {
  id: 'tech-1',
  title: '机器视觉检测系统',
  content: '已完成样机测试，可识别多类表面缺陷。',
  summary: '',
  tags: [],
  teamMembers: [],
  documents: [],
  status: 'draft',
  createdAt: '2026-07-29T00:00:00.000Z',
  updatedAt: '2026-07-29T00:00:00.000Z',
};

describe('draft analysis', () => {
  beforeEach(() => {
    gatewayMocks.validateConfig.mockReset();
    gatewayMocks.chat.mockReset();
    gatewayMocks.validateConfig.mockResolvedValue({ valid: true });
  });

  it('turns a demand draft into a completed analysis', async () => {
    gatewayMocks.chat.mockResolvedValue({
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              industry: '制造业',
              tags: ['机器视觉'],
              industryAnalysis: '制造业质量检测需求持续增长。',
              techRoadmap: '先完成数据采集，再训练和验证模型。',
              suggestions: '建立误检和漏检基准。',
            }),
          },
        }],
      }),
    });

    const result = await analyzeDemandDraft(demandDraft);

    expect(result.status).toBe('completed');
    expect(result.tags).toEqual(['制造业', '机器视觉', '智能制造']);
    expect(result.analysis).toMatchObject({
      industryAnalysis: '制造业质量检测需求持续增长。',
      skills: ['scientific-critical-thinking'],
    });
  });

  it('parses a Gemini result response and bounds numeric scores', async () => {
    gatewayMocks.chat.mockResolvedValue({
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: `\`\`\`json\n${JSON.stringify({
                industry: '制造业',
                tags: ['机器视觉'],
                summary: '面向产线的自动缺陷检测成果。',
                innovationScore: 108,
                trl: 6,
                marketScore: 82,
                evidenceAssessment: '已有样机测试证据。',
                applicationBoundaries: '需要稳定光照条件。',
                validationSuggestions: ['扩大样本量', '开展现场测试', '核验误检率'],
              })}\n\`\`\``,
            }],
          },
        }],
      }),
    });

    const result = await analyzeTechDraft(techDraft);

    expect(result.status).toBe('completed');
    expect(result.summary).toBe('面向产线的自动缺陷检测成果。');
    expect(result.analysis).toMatchObject({
      innovationScore: 100,
      trl: 6,
      marketScore: 82,
      validationSuggestions: ['扩大样本量', '开展现场测试', '核验误检率'],
    });
  });

  it('reports an unavailable analysis configuration before submission', async () => {
    gatewayMocks.validateConfig.mockResolvedValue({
      valid: false,
      error: 'API未配置',
    });

    await expect(validateDraftAnalysisConfiguration()).rejects.toThrow('API未配置');
  });

  it('rejects a malformed tech analysis instead of marking it completed', async () => {
    gatewayMocks.chat.mockResolvedValue({
      json: async () => ({
        choices: [{ message: { content: '无法生成结构化结果' } }],
      }),
    });

    await expect(analyzeTechDraft(techDraft)).rejects.toThrow('未找到可解析的 JSON');
  });
});
