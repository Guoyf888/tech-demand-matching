import { beforeEach, describe, expect, it } from 'vitest';
import { getBuiltInSkills } from './builtInSkills';
import { skillStore } from './skillStore';
import type { Skill } from '@/types';

function customSkill(id: string, name = id): Skill {
  return {
    id,
    name,
    description: `${name} description`,
    version: '1.0.0',
    enabled: true,
    icon: 'x',
    actions: [],
    metadata: {
      createdAt: '2026-08-13T00:00:00.000Z',
      usageCount: 0,
      successRate: 0,
    },
  };
}

describe('skillStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads legacy ZIP-imported skills alongside canonical skills', () => {
    localStorage.setItem('hermes-skills', JSON.stringify([customSkill('legacy')]));
    localStorage.setItem('skills', JSON.stringify([customSkill('canonical')]));

    expect(skillStore.getAll().map((skill) => skill.id)).toEqual(['legacy', 'canonical']);
  });

  it('deletes a skill from both canonical and legacy storage', () => {
    localStorage.setItem('hermes-skills', JSON.stringify([customSkill('legacy')]));

    skillStore.delete('legacy');

    expect(skillStore.getAll()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('hermes-skills') || '[]')).toEqual([]);
  });

  it('ignores malformed persisted skill data', () => {
    localStorage.setItem('skills', '{not-json');

    expect(skillStore.getAll()).toEqual([]);
  });

  it('ignores persisted array entries without a skill id', () => {
    localStorage.setItem('skills', JSON.stringify([null, { name: 'missing id' }]));

    expect(skillStore.getAll()).toEqual([]);
  });

  it('keeps built-in skills available when storage only contains custom skills', () => {
    localStorage.setItem('skills', JSON.stringify([customSkill('custom-only')]));

    const skills = getBuiltInSkills();

    expect(skills.some((skill) => skill.id === 'custom-only')).toBe(true);
    expect(skills.some((skill) => skill.isBuiltIn)).toBe(true);
  });
});
