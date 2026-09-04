import { beforeEach, describe, expect, it } from 'vitest';
import { backup } from './backup';

describe('business data backup', () => {
  beforeEach(() => localStorage.clear());

  it('exports the active skill, Hermes memory, and matching audit keys', () => {
    localStorage.setItem('skills', JSON.stringify([{ id: 'skill-1' }]));
    localStorage.setItem('hermes-skills', JSON.stringify([{ id: 'legacy-skill' }]));
    localStorage.setItem('hermes-session-memory-v1', JSON.stringify({ version: 1, sessions: [] }));
    localStorage.setItem('match_runs', JSON.stringify([{ id: 'run-1' }]));
    localStorage.setItem('match_reviews', JSON.stringify([{ id: 'demand-1::tech-1' }]));

    const bundle = backup.export();

    expect(bundle.data).toMatchObject({
      skills: [{ id: 'skill-1' }],
      'hermes-skills': [{ id: 'legacy-skill' }],
      'hermes-session-memory-v1': { version: 1, sessions: [] },
      match_runs: [{ id: 'run-1' }],
      match_reviews: [{ id: 'demand-1::tech-1' }],
    });
    expect(bundle.data).not.toHaveProperty('skills_storage');
    expect(bundle.data).not.toHaveProperty('skills_hermes');
  });
});
