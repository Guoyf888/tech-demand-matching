import { TechResult } from '@/types';

const STORAGE_KEY = 'tech_results';

export const techStorage = {
  getAll(): TechResult[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      const parsed: unknown = JSON.parse(data);
      return Array.isArray(parsed) ? parsed as TechResult[] : [];
    } catch {
      return [];
    }
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

  replaceAll(results: TechResult[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  },

  renameGroup(currentName: string, nextName: string): TechResult[] {
    const now = new Date().toISOString();
    const results = this.getAll().map((result) => result.group?.trim() === currentName
      ? { ...result, group: nextName.trim(), updatedAt: now }
      : result);
    this.replaceAll(results);
    return results;
  },

  delete(id: string) {
    const results = this.getAll().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  },

  generateId(): string {
    return `tech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
};
