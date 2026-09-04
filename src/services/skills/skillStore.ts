import { Skill } from '@/types';

const STORAGE_KEY = 'skills';
const LEGACY_STORAGE_KEY = 'hermes-skills';

function readSkills(storageKey: string): Skill[] {
  const data = localStorage.getItem(storageKey);
  if (!data) return [];

  try {
    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((skill): skill is Skill => (
      typeof skill === 'object'
      && skill !== null
      && typeof (skill as Partial<Skill>).id === 'string'
      && (skill as Partial<Skill>).id!.length > 0
    ));
  } catch {
    return [];
  }
}

export const skillStore = {
  getAll(): Skill[] {
    const merged = new Map<string, Skill>();
    for (const skill of readSkills(LEGACY_STORAGE_KEY)) merged.set(skill.id, skill);
    for (const skill of readSkills(STORAGE_KEY)) merged.set(skill.id, skill);
    return Array.from(merged.values());
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
    const legacySkills = readSkills(LEGACY_STORAGE_KEY).filter((s) => s.id !== id);
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacySkills));
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
