export function parseTmdbIdFromCatalogId(id: string): number | null {
  const match = id.match(/^tmdb-(?:movie|tv)-(\d+)$/);
  if (!match) return null;
  const tmdbId = Number(match[1]);
  return Number.isFinite(tmdbId) ? tmdbId : null;
}
