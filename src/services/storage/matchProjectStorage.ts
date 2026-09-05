export type MatchProjectStage = 'contacting' | 'clarifying' | 'validating' | 'negotiating' | 'signed' | 'closed';

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

