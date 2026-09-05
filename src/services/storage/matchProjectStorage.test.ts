import { beforeEach, describe, expect, it, vi } from 'vitest';
import { matchProjectStorage } from './matchProjectStorage';

describe('matchProjectStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-05T09:00:00.000Z'));
  });

  it('creates one project per demand and technology pair', () => {
    const input = {
      demandId: 'demand-1',
      demandTitle: '低碳改造需求',
      techId: 'tech-1',
      techTitle: '余热回收技术',
      score: 86,
      sourceRunId: 'run-1',
      nextAction: '安排技术澄清会',
    };

    const created = matchProjectStorage.create(input);
    const duplicate = matchProjectStorage.create({ ...input, sourceRunId: 'run-2' });

    expect(matchProjectStorage.getAll()).toHaveLength(1);
    expect(duplicate).toEqual(created);
    expect(created).toMatchObject({
      id: 'demand-1::tech-1',
      stage: 'contacting',
      nextAction: '安排技术澄清会',
      createdAt: '2026-09-05T09:00:00.000Z',
    });
  });

  it('updates project progress fields without changing its source snapshot', () => {
    const created = matchProjectStorage.create({
      demandId: 'demand-1',
      demandTitle: '低碳改造需求',
      techId: 'tech-1',
      techTitle: '余热回收技术',
      score: 86,
      sourceRunId: 'run-1',
    });
    vi.setSystemTime(new Date('2026-09-06T09:00:00.000Z'));

    const updated = matchProjectStorage.update(created.id, {
      stage: 'validating',
      owner: '张经理',
      nextAction: '补充能耗基线',
      dueDate: '2026-09-12',
      note: '现场数据待企业提供',
    });

    expect(updated).toMatchObject({
      demandTitle: '低碳改造需求',
      score: 86,
      stage: 'validating',
      owner: '张经理',
      updatedAt: '2026-09-06T09:00:00.000Z',
    });
  });

  it('ignores malformed persisted projects', () => {
    localStorage.setItem('match_projects', JSON.stringify([{ id: 'broken' }]));
    expect(matchProjectStorage.getAll()).toEqual([]);
  });
});

