import { describe, expect, it } from 'vitest';
import {
  collectResourceGroups,
  normalizeResourceGroup,
  sortManagedResources,
} from './resourceManagement';

describe('resource management helpers', () => {
  it('normalizes and de-duplicates groups', () => {
    expect(normalizeResourceGroup(' 重点跟进 ')).toBe('重点跟进');
    expect(collectResourceGroups([
      { group: '重点跟进' },
      { group: ' 重点跟进 ' },
      { group: '待评估' },
      {},
    ])).toEqual(['待评估', '重点跟进']);
  });

  it('orders pinned and starred resources before recent resources', () => {
    const sorted = sortManagedResources([
      { id: 'recent', updatedAt: '2026-07-28T10:00:00.000Z' },
      { id: 'starred', starred: true, updatedAt: '2026-07-20T10:00:00.000Z' },
      { id: 'pinned', pinned: true, updatedAt: '2026-07-10T10:00:00.000Z' },
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['pinned', 'starred', 'recent']);
  });
});
