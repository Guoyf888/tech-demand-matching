export type MatchReviewDecision = 'pending' | 'approved' | 'rejected';

export interface MatchReview {
  id: string;
  demandId: string;
  techId: string;
  runId: string;
  decision: MatchReviewDecision;
  note: string;
  updatedAt: string;
}

const STORAGE_KEY = 'match_reviews';
const MAX_REVIEWS = 500;

function reviewId(demandId: string, techId: string): string {
  return `${demandId}::${techId}`;
}

function isMatchReview(value: unknown): value is MatchReview {
  if (!value || typeof value !== 'object') return false;
  const review = value as Partial<MatchReview>;
  return typeof review.id === 'string'
    && typeof review.demandId === 'string'
    && typeof review.techId === 'string'
    && typeof review.runId === 'string'
    && ['pending', 'approved', 'rejected'].includes(review.decision || '')
    && typeof review.note === 'string'
    && typeof review.updatedAt === 'string';
}

export const matchReviewStorage = {
  getAll(): MatchReview[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isMatchReview) : [];
    } catch {
      return [];
    }
  },

  get(demandId: string, techId: string): MatchReview | undefined {
    const id = reviewId(demandId, techId);
    return this.getAll().find((review) => review.id === id);
  },

  save(input: Omit<MatchReview, 'id' | 'updatedAt'>): MatchReview {
    const review: MatchReview = {
      ...input,
      id: reviewId(input.demandId, input.techId),
      updatedAt: new Date().toISOString(),
    };
    const reviews = [
      review,
      ...this.getAll().filter((item) => item.id !== review.id),
    ].slice(0, MAX_REVIEWS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    return review;
  },
};
