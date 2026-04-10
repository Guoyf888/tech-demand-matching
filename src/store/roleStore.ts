import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'demand' | 'tech' | 'platform';

interface RoleState {
  currentRole: Role;
  setRole: (role: Role) => void;
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      currentRole: 'demand',
      setRole: (role) => set({ currentRole: role }),
    }),
    {
      name: 'role-storage',
    }
  )
);
