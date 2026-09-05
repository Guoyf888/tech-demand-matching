import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  compareMatchProjectPriority,
  getMatchProjectDeadlineStatus,
  localDateKey,
  matchProjectStorage,
  type MatchProject,
} from './matchProjectStorage';

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

  it('uses the local calendar date and distinguishes deadline urgency', () => {
    expect(localDateKey(new Date(2026, 8, 5, 23, 30))).toBe('2026-09-05');
    const project = { stage: 'validating' as const, dueDate: '2026-09-05' };

    expect(getMatchProjectDeadlineStatus({ ...project, dueDate: '2026-09-04' }, '2026-09-05')).toBe('overdue');
    expect(getMatchProjectDeadlineStatus(project, '2026-09-05')).toBe('today');
    expect(getMatchProjectDeadlineStatus({ ...project, dueDate: '2026-09-08' }, '2026-09-05')).toBe('soon');
    expect(getMatchProjectDeadlineStatus({ ...project, dueDate: '2026-09-09' }, '2026-09-05')).toBe('scheduled');
    expect(getMatchProjectDeadlineStatus({ stage: 'signed', dueDate: '2026-09-04' }, '2026-09-05')).toBe('closed');
  });

  it('sorts actionable deadline risks before normal and closed projects', () => {
    const base: MatchProject = {
      id: 'base',
      demandId: 'demand',
      demandTitle: '需求',
      techId: 'tech',
      techTitle: '成果',
      score: 80,
      sourceRunId: 'run',
      stage: 'validating',
      owner: '',
      nextAction: '',
      dueDate: '',
      note: '',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const projects = [
      { ...base, id: 'signed', stage: 'signed' as const, dueDate: '2026-09-01' },
      { ...base, id: 'normal', dueDate: '2026-09-20' },
      { ...base, id: 'soon', dueDate: '2026-09-07' },
      { ...base, id: 'overdue', dueDate: '2026-09-04' },
    ];

    expect(projects.sort((a, b) => compareMatchProjectPriority(a, b, '2026-09-05')).map((project) => project.id))
      .toEqual(['overdue', 'soon', 'normal', 'signed']);
  });
});
