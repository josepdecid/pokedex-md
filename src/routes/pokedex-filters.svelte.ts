// Pokédex list filters. Module state, so they survive opening a Pokémon and coming back.

export type StatusFilter = 'all' | 'missing' | 'recruited';
export type SortOrder = 'family' | 'dex' | 'name';

export const filters = $state({
  query: '',
  status: 'all' as StatusFilter,
  type: '',
  sort: 'family' as SortOrder,
});

// Whether the type and sort selects are shown. Hidden by default.
export const filterPanel = $state({ open: false });

export function clearFilters(): void {
  filters.query = '';
  filters.status = 'all';
  filters.type = '';
}
