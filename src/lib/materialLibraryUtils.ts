import type { MaterialItem } from '../types';

export function calculateMaterialStorageSize(items: MaterialItem[]): number {
  const json = JSON.stringify(items);
  return new TextEncoder().encode(json).byteLength / (1024 * 1024);
}

export function upsertMaterial(items: MaterialItem[], item: MaterialItem): MaterialItem[] {
  const exists = items.some(existing => existing.id === item.id);
  return exists
    ? items.map(existing => existing.id === item.id ? item : existing)
    : [...items, item];
}
