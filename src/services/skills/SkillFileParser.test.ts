import { describe, expect, it } from 'vitest';
import { parseSkillFile } from './SkillFileParser';

describe('SkillFileParser Hermes v0.19 compatibility', () => {
  it('imports a BOM-prefixed skill with a 1024-character description and nested tags', () => {
    const description = 'a'.repeat(700);
    const source = `\uFEFF---\nname: long-description-skill\ndescription: "${description}"\nversion: 1.0.0\nmetadata:\n  hermes:\n    tags: [research, local-search]\n---\n\n# Skill\n\nRun the local search workflow.`;

    const result = parseSkillFile('SKILL.md', source);

    expect(result.success).toBe(true);
    expect(result.data?.description).toBe(description);
    expect(result.data?.triggers).toEqual(expect.arrayContaining(['research', 'local-search']));
    expect(result.data?.content).toBe('# Skill\n\nRun the local search workflow.');
  });
});
