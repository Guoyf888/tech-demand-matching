import { describe, expect, it } from 'vitest';
import type { Skill } from '@/types';
import { getSkillPresentation } from './skillPresentation';

function createSkill(patch: Partial<Skill>): Skill {
  return {
    id: 'test',
    name: 'literature-review',
    description: 'Systematic literature review workflow',
    version: '1.0.0',
    enabled: true,
    actions: [],
    metadata: { createdAt: '', usageCount: 0, successRate: 1 },
    ...patch,
  };
}

describe('skillPresentation', () => {
  it('provides Chinese fallback details for English scientific skills', () => {
    const presentation = getSkillPresentation(createSkill({ source: 'scientific' }));
    expect(presentation.shortDescription).toBe('文献研究与评审');
    expect(presentation.domain).toBe('科研方法与写作');
    expect(presentation.explanation).toMatch(/[\u4e00-\u9fff]/);
  });

  it('keeps an existing Chinese description', () => {
    const presentation = getSkillPresentation(createSkill({ description: '用于技术需求归纳与评估', group: '需求分析' }));
    expect(presentation.domain).toBe('需求分析');
    expect(presentation.explanation).toBe('用于技术需求归纳与评估');
  });
});
