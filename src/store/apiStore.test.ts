import { beforeEach, describe, expect, it, vi } from 'vitest';
import { secretStore } from '@/utils/secretStore';
import { useApiStore } from './apiStore';

vi.mock('@/utils/secretStore', () => ({ secretStore: { save: vi.fn() } }));

describe('legacy API configuration migration', () => {
  beforeEach(() => { vi.mocked(secretStore.save).mockReset(); });

  it('only strips legacy secrets after the asynchronous transfer succeeds', async () => {
    let complete!: () => void;
    vi.mocked(secretStore.save).mockReturnValue(new Promise<void>((resolve) => { complete = resolve; }));
    const state = { configs: { openai: { apiKey: 'migration-fixture', modelId: 'test' } } };
    const migration = useApiStore.persist.getOptions().migrate!(state, 1);
    expect(state.configs.openai.apiKey).toBe('migration-fixture');
    complete();
    await migration;
    expect(state.configs.openai).toEqual({ modelId: 'test' });
  });

  it('retains the migration source on failure', async () => {
    vi.mocked(secretStore.save).mockRejectedValue(new Error('keychain unavailable'));
    const state = { configs: { openai: { apiKey: 'migration-fixture', modelId: 'test' } } };
    await expect(useApiStore.persist.getOptions().migrate!(state, 1)).rejects.toThrow('keychain unavailable');
    expect(state.configs.openai.apiKey).toBe('migration-fixture');
  });
});
