// Pokédex list filters. Module state, so they survive opening a Pokémon and coming back.

export type StatusFilter = 'all' | 'missing' | 'recruited';
export type SortOrder = 'family' | 'dex' | 'name';

export const filters = $state({
  query: '',
  status: 'all' as StatusFilter,
  type: '',
  sort: 'family' as SortOrder,
});

export function clearFilters(): void {
  filters.query = '';
  filters.status = 'all';
  filters.type = '';
}
