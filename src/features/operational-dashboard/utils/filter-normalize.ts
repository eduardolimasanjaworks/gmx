/**
 * @module operational-dashboard/utils/filter-normalize
 * @purpose Seleção vazia = todos selecionados (regra de negócio do dashboard).
 */

export function emptyMeansAll<T>(selected: T[], all: T[]): T[] {
  if (selected.length === 0) return [...all];
  return selected;
}

export function toggleInList<T>(list: T[], item: T): T[] {
  const idx = list.indexOf(item);
  if (idx >= 0) {
    const next = [...list];
    next.splice(idx, 1);
    return next;
  }
  return [...list, item];
}
