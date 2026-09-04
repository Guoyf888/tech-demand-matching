import type { ResourceManagementFields } from '@/types';

type ManagedResource = ResourceManagementFields & {
  createdAt?: string;
  updatedAt?: string;
};

export const UNGROUPED_VALUE = '__ungrouped__';

export function normalizeResourceGroup(group?: string): string {
  return group?.trim() || '';
}

export function collectResourceGroups(items: ResourceManagementFields[]): string[] {
  return Array.from(new Set(
    items
      .map((item) => normalizeResourceGroup(item.group))
      .filter(Boolean),
  )).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function resourceTimestamp(item: ManagedResource): number {
  const value = item.updatedAt || item.createdAt || '';
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function compareManagedResources(a: ManagedResource, b: ManagedResource): number {
  if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
  if (Boolean(a.starred) !== Boolean(b.starred)) return a.starred ? -1 : 1;
  return resourceTimestamp(b) - resourceTimestamp(a);
}

export function sortManagedResources<T extends ManagedResource>(items: T[]): T[] {
  return [...items].sort(compareManagedResources);
}
