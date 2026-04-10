import { TechResult } from '@/types';

const STORAGE_KEY = 'tech_results';

export const techStorage = {
  getAll(): TechResult[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save(result: TechResult) {
    const results = this.getAll();
    const index = results.findIndex((r) => r.id === result.id);
    if (index >= 0) {
      results[index] = result;
    } else {
      results.push(result);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  },

  delete(id: string) {
    const results = this.getAll().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  },

  generateId(): string {
    return `tech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
};
