// Pokédex list filters. Module state, so they survive opening a Pokémon and coming back.

export type StatusFilter = 'all' | 'missing' | 'recruited';
export type SortOrder = 'dex' | 'name';

export const filters = $state({
  query: '',
  status: 'all' as StatusFilter,
  type: '',
  sort: 'dex' as SortOrder,
});

export function clearFilters(): void {
  filters.query = '';
  filters.status = 'all';
  filters.type = '';
}
