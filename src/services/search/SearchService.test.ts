import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ISearchProvider } from './types';

const store = vi.hoisted(() => ({ getState: vi.fn() }));

vi.mock('@/store/searchConfigStore', () => ({
  useSearchConfigStore: { getState: store.getState },
}));

import { SearchService } from './SearchService';
import { MockSearchProvider } from './providers/MockSearchProvider';

describe('SearchService data provenance', () => {
  beforeEach(() => {
    store.getState.mockReset();
    store.getState.mockReturnValue({ activeProvider: 'tavily' });
  });

  it('returns a real provider failure instead of silently replacing it with mock data', async () => {
    const service = new SearchService();
    const realProvider: ISearchProvider = {
      name: 'tavily',
      supportsAdvancedSearch: true,
      isConfigured: () => true,
      search: vi.fn().mockResolvedValue({
        success: false,
        results: [],
        error: 'network unavailable',
        provider: 'tavily',
        query: 'Hermes',
      }),
      researchCompany: vi.fn().mockResolvedValue({
        companyName: 'Example',
        news: [],
        industryNews: [],
      }),
    };
    const mockProvider: ISearchProvider = {
      name: 'mock',
      supportsAdvancedSearch: false,
      isConfigured: () => true,
      search: vi.fn().mockResolvedValue({
        success: true,
        results: [{ title: 'fake', url: 'https://example.com', snippet: 'fake' }],
        provider: 'mock',
        query: 'Hermes',
        isMock: true,
      }),
      researchCompany: vi.fn().mockResolvedValue({
        companyName: 'Example',
        news: [],
        industryNews: [],
        isMock: true,
      }),
    };
    service.registerProvider(realProvider);
    service.registerProvider(mockProvider);

    const result = await service.search({ query: 'Hermes' });

    expect(result.success).toBe(false);
    expect(result.provider).toBe('tavily');
    expect(result.error).toBe('network unavailable');
    expect(mockProvider.search).not.toHaveBeenCalled();
  });

  it('labels explicitly selected mock results as demo data', async () => {
    const provider = new MockSearchProvider();

    const result = await provider.search({ query: 'Hermes', numResults: 1 });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('mock');
    expect(result.isMock).toBe(true);
  });
});
