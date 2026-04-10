import { Demand } from '@/types';

const STORAGE_KEY = 'demands';

export const demandStorage = {
  getAll(): Demand[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save(demand: Demand) {
    const demands = this.getAll();
    const index = demands.findIndex((d) => d.id === demand.id);
    if (index >= 0) {
      demands[index] = demand;
    } else {
      demands.push(demand);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demands));
  },

  delete(id: string) {
    const demands = this.getAll().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demands));
  },

  generateId(): string {
    return `demand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
};
