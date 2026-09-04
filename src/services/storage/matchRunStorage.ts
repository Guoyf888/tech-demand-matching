export type MatchRunStatus = 'completed' | 'partial' | 'failed' | 'not_configured' | 'no_candidates';

export interface MatchDimensionScores {
  technicalFit?: number;
  scenarioFit?: number;
  maturityFit?: number;
  deliveryFit?: number;
}

export interface MatchRunSnapshot {
  demandId: string;
  demandTitle: string;
  demandTags: string[];
  techId: string;
  techTitle: string;
  techTags: string[];
  score: number;
  reason: string;
  dimensions?: MatchDimensionScores;
  strengths?: string[];
  risks?: string[];
  nextStep?: string;
}

export interface MatchRunAudit {
  id: string;
  status: MatchRunStatus;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  provider?: string;
  modelId?: string;
  demandCount: number;
  techCount: number;
  candidateCount: number;
  evaluatedCount: number;
  failedCount: number;
  matchCount: number;
  selectedDemandId?: string;
  selectedDemandTitle?: string;
  results?: MatchRunSnapshot[];
  error?: string;
}

const STORAGE_KEY = 'match_runs';
const MAX_RUNS = 50;

function isMatchRunAudit(value: unknown): value is MatchRunAudit {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MatchRunAudit>;
  return typeof candidate.id === 'string'
    && typeof candidate.status === 'string'
    && typeof candidate.startedAt === 'string'
    && typeof candidate.completedAt === 'string';
}

export const matchRunStorage = {
  getAll(): MatchRunAudit[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isMatchRunAudit) : [];
    } catch {
      return [];
    }
  },

  save(run: MatchRunAudit): void {
    const runs = [run, ...this.getAll().filter((item) => item.id !== run.id)].slice(0, MAX_RUNS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  },
};
