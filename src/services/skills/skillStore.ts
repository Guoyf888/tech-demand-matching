import { Skill } from '@/types';

const STORAGE_KEY = 'skills';

export const skillStore = {
  getAll(): Skill[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save(skill: Skill) {
    const skills = this.getAll();
    const index = skills.findIndex((s) => s.id === skill.id);
    if (index >= 0) {
      skills[index] = skill;
    } else {
      skills.push(skill);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  },

  delete(id: string) {
    const skills = this.getAll().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  },

  toggleEnabled(id: string) {
    const skills = this.getAll();
    const skill = skills.find((s) => s.id === id);
    if (skill) {
      skill.enabled = !skill.enabled;
      this.save(skill);
    }
  },
};
