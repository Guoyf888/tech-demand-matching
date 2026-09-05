export type MatchProjectStage = 'contacting' | 'clarifying' | 'validating' | 'negotiating' | 'signed' | 'closed';
export type MatchProjectDeadlineStatus = 'none' | 'overdue' | 'today' | 'soon' | 'scheduled' | 'closed';

export interface MatchProject {
  id: string;
  demandId: string;
  demandTitle: string;
  techId: string;
  techTitle: string;
  score: number;
  sourceRunId: string;
  stage: MatchProjectStage;
  owner: string;
  nextAction: string;
  dueDate: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMatchProjectInput {
  demandId: string;
  demandTitle: string;
  techId: string;
  techTitle: string;
  score: number;
  sourceRunId: string;
  nextAction?: string;
}

const STORAGE_KEY = 'match_projects';
const MAX_PROJECTS = 500;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function localDateKey(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function dateKeyToUtc(value: string): number | null {
  if (!DATE_KEY_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
    ? timestamp
    : null;
}

export function getMatchProjectDeadlineStatus(
  project: Pick<MatchProject, 'stage' | 'dueDate'>,
  today = localDateKey(),
): MatchProjectDeadlineStatus {
  if (project.stage === 'signed' || project.stage === 'closed') return 'closed';
  const dueTime = dateKeyToUtc(project.dueDate);
  const todayTime = dateKeyToUtc(today);
  if (dueTime === null || todayTime === null) return 'none';
  const daysUntilDue = Math.round((dueTime - todayTime) / 86_400_000);
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue === 0) return 'today';
  if (daysUntilDue <= 3) return 'soon';
  return 'scheduled';
}

export function compareMatchProjectPriority(a: MatchProject, b: MatchProject, today = localDateKey()): number {
  const rank = (project: MatchProject): number => {
    const status = getMatchProjectDeadlineStatus(project, today);
    if (status === 'overdue') return 0;
    if (status === 'today') return 1;
    if (status === 'soon') return 2;
    if (project.stage === 'signed') return 4;
    if (project.stage === 'closed') return 5;
    return 3;
  };
  const rankDiff = rank(a) - rank(b);
  if (rankDiff !== 0) return rankDiff;
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function projectId(demandId: string, techId: string): string {
  return `${demandId}::${techId}`;
}

function isMatchProject(value: unknown): value is MatchProject {
  if (!value || typeof value !== 'object') return false;
  const project = value as Partial<MatchProject>;
  return typeof project.id === 'string'
    && typeof project.demandId === 'string'
    && typeof project.demandTitle === 'string'
    && typeof project.techId === 'string'
    && typeof project.techTitle === 'string'
    && typeof project.score === 'number'
    && typeof project.sourceRunId === 'string'
    && ['contacting', 'clarifying', 'validating', 'negotiating', 'signed', 'closed'].includes(project.stage || '')
    && typeof project.owner === 'string'
    && typeof project.nextAction === 'string'
    && typeof project.dueDate === 'string'
    && typeof project.note === 'string'
    && typeof project.createdAt === 'string'
    && typeof project.updatedAt === 'string';
}

function write(projects: MatchProject[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.slice(0, MAX_PROJECTS)));
}

export const matchProjectStorage = {
  getAll(): MatchProject[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isMatchProject) : [];
    } catch {
      return [];
    }
  },

  getByPair(demandId: string, techId: string): MatchProject | undefined {
    const id = projectId(demandId, techId);
    return this.getAll().find((project) => project.id === id);
  },

  create(input: CreateMatchProjectInput): MatchProject {
    const id = projectId(input.demandId, input.techId);
    const existing = this.getAll().find((project) => project.id === id);
    if (existing) return existing;

    const now = new Date().toISOString();
    const project: MatchProject = {
      ...input,
      id,
      stage: 'contacting',
      owner: '',
      nextAction: input.nextAction || '',
      dueDate: '',
      note: '',
      createdAt: now,
      updatedAt: now,
    };
    write([project, ...this.getAll()]);
    return project;
  },

  update(id: string, changes: Pick<MatchProject, 'stage' | 'owner' | 'nextAction' | 'dueDate' | 'note'>): MatchProject | undefined {
    const projects = this.getAll();
    const current = projects.find((project) => project.id === id);
    if (!current) return undefined;

    const updated: MatchProject = {
      ...current,
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    write([updated, ...projects.filter((project) => project.id !== id)]);
    return updated;
  },
};
