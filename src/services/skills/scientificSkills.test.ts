import { describe, expect, it } from 'vitest';
import { scientificSkillService } from './scientificSkills';

describe('scientific skill service', () => {
  it('loads the project scientific skill collection', () => {
    const skills = scientificSkillService.getAllSkills();
    expect(skills.length).toBeGreaterThanOrEqual(130);
    expect(skills.some((skill) => skill.name === 'scientific-critical-thinking')).toBe(true);
    expect(skills.every((skill) => skill.source === 'scientific' && Boolean(skill.content))).toBe(true);
  });

  it('uses workflow defaults and domain matches within a bounded context', () => {
    const context = scientificSkillService.buildContext(
      '评估这项生物传感器科研成果的实验设计、证据质量和转化风险',
      'result',
      8 * 1024,
    );
    const bytes = new TextEncoder().encode(context.rendered).length;

    expect(context.skills.length).toBeGreaterThan(0);
    expect(context.skills.length).toBeLessThanOrEqual(3);
    expect(context.skills.some((skill) => skill.name === 'scientific-critical-thinking')).toBe(true);
    expect(bytes).toBeLessThanOrEqual(8 * 1024 + 512);
  });
});
