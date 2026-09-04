import { beforeEach, describe, expect, it, vi } from 'vitest';
import { matchReviewStorage } from './matchReviewStorage';

describe('matchReviewStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-05T08:00:00.000Z'));
  });

  it('stores one current review per demand and technology pair', () => {
    matchReviewStorage.save({
      demandId: 'demand-1',
      techId: 'tech-1',
      runId: 'run-1',
      decision: 'pending',
      note: '待核验案例',
    });
    const updated = matchReviewStorage.save({
      demandId: 'demand-1',
      techId: 'tech-1',
      runId: 'run-2',
      decision: 'approved',
      note: '已完成技术澄清',
    });

    expect(matchReviewStorage.getAll()).toHaveLength(1);
    expect(matchReviewStorage.get('demand-1', 'tech-1')).toEqual(updated);
    expect(updated).toMatchObject({
      id: 'demand-1::tech-1',
      runId: 'run-2',
      decision: 'approved',
      updatedAt: '2026-09-05T08:00:00.000Z',
    });
  });

  it('ignores malformed persisted reviews', () => {
    localStorage.setItem('match_reviews', JSON.stringify([{ id: 'broken' }]));
    expect(matchReviewStorage.getAll()).toEqual([]);
  });
});
