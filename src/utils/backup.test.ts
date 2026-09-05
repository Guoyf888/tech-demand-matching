import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backup } from './backup';

describe('business data backup', () => {
  beforeEach(() => localStorage.clear());
  const bundle = (data: Record<string, unknown>) => JSON.stringify({ schema: 1, app: 'tech-demand-matching', data });

  it('previews without mutation and merges newer, older, tied and new records', () => {
    const existing = [
      { id: 'newer', updatedAt: '2026-09-01', title: 'old' },
      { id: 'older', updatedAt: '2026-09-04', title: 'keep' },
      { id: 'tie', updatedAt: '2026-09-04', title: 'keep' },
      { id: 'undated', title: 'keep' },
    ];
    localStorage.setItem('demands', JSON.stringify(existing));
    const json = bundle({ demands: [
      { id: 'newer', updatedAt: '2026-09-05', title: 'updated' },
      { id: 'older', updatedAt: '2026-09-01', title: 'ignore' },
      { id: 'tie', updatedAt: '2026-09-04', title: 'ignore' },
      { id: 'undated', updatedAt: 'invalid', title: 'ignore' },
      { id: 'added', title: 'new' },
    ] });
    const preview = backup.importFromJSON(json, { dryRun: true });
    expect(preview).toMatchObject({ success: true, added: 1, updated: 1, retained: 3 });
    expect(JSON.parse(localStorage.getItem('demands')!)).toEqual(existing);
    expect(backup.importFromJSON(json)).toEqual(preview);
    expect(JSON.parse(localStorage.getItem('demands')!)).toEqual([
      { id: 'newer', updatedAt: '2026-09-05', title: 'updated' }, ...existing.slice(1), { id: 'added', title: 'new' },
    ]);
  });

  it.each(['null', '[]', '{', '{"app":"tech-demand-matching","schema":0,"data":{}}', '{"app":"tech-demand-matching","schema":1,"data":[]}'])(
    'rejects malformed bundle %s', (json) => {
      expect(backup.importFromJSON(json).success).toBe(false);
      expect(localStorage.length).toBe(0);
    },
  );

  it('validates the entire file before writing any key', () => {
    const result = backup.importFromJSON(bundle({ demands: [{ id: 'valid' }], match_projects: [{ id: 'incomplete' }] }));
    expect(result.success).toBe(false);
    expect(result.restoredKeys).toEqual([]);
    expect(localStorage.length).toBe(0);
  });

  it('restores model configuration arrays that use model instead of id', () => {
    localStorage.setItem('modelConfigs', JSON.stringify([{ model: 'GPT', apiUrl: 'old' }]));
    expect(backup.importFromJSON(bundle({ modelConfigs: [{ model: 'GPT', apiUrl: 'new', apiKey: 'fixture-secret' }] })).success).toBe(true);
    expect(JSON.parse(localStorage.getItem('modelConfigs')!)).toEqual([{ model: 'GPT', apiUrl: 'new' }]);
  });

  it('strips legacy configuration secrets on export and import without rewriting business text', () => {
    const config = { state: { configs: { openai: { apiKey: 'fixture-secret', api_key: 'fixture-secret', accessToken: 'fixture-secret', modelId: 'test' } } } };
    localStorage.setItem('api-config-storage', JSON.stringify(config));
    localStorage.setItem('demands', JSON.stringify([{ id: '1', description: 'original business text' }]));
    expect(backup.toJSON()).not.toContain('fixture-secret');
    expect(backup.toJSON()).toContain('original business text');
    expect(backup.importFromJSON(bundle({ 'api-config-storage': config })).success).toBe(true);
    expect(localStorage.getItem('api-config-storage')).not.toContain('fixture-secret');
    expect(localStorage.getItem('api-config-storage')).toContain('modelId');
  });

  it('reports partial writes explicitly if browser storage is full', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('quota'); });
    try {
      const result = backup.importFromJSON(bundle({ demands: [{ id: '1' }] }));
      expect(result.success).toBe(false);
      expect(result.restoredKeys).toEqual([]);
      expect(result.errors[0]).toContain('写入失败');
    } finally { spy.mockRestore(); }
  });

  it('exports the active skill, Hermes memory, and matching audit keys', () => {
    localStorage.setItem('skills', JSON.stringify([{ id: 'skill-1' }]));
    localStorage.setItem('hermes-skills', JSON.stringify([{ id: 'legacy-skill' }]));
    localStorage.setItem('hermes-session-memory-v1', JSON.stringify({ version: 1, sessions: [] }));
    localStorage.setItem('match_runs', JSON.stringify([{ id: 'run-1' }]));
    localStorage.setItem('match_reviews', JSON.stringify([{ id: 'demand-1::tech-1' }]));
    localStorage.setItem('match_projects', JSON.stringify([{ id: 'project-1' }]));

    const bundle = backup.export();

    expect(bundle.data).toMatchObject({
      skills: [{ id: 'skill-1' }],
      'hermes-skills': [{ id: 'legacy-skill' }],
      'hermes-session-memory-v1': { version: 1, sessions: [] },
      match_runs: [{ id: 'run-1' }],
      match_reviews: [{ id: 'demand-1::tech-1' }],
      match_projects: [{ id: 'project-1' }],
    });
    expect(bundle.data).not.toHaveProperty('skills_storage');
    expect(bundle.data).not.toHaveProperty('skills_hermes');
  });
});
