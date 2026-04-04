import type { Title } from "../types";

export function tmdbPosterUrl(posterPath: string | null | undefined, size: "w342" | "w500" = "w500"): string | null {
  if (!posterPath) return null;
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

export interface TmdbSearchResult {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  poster_path?: string | null;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
}

const API_BASE = "https://api.themoviedb.org/3";

export async function searchTmdbTitle(query: string): Promise<TmdbSearchResult[]> {
  const token = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN as string | undefined;
  if (!token) return [];

  const response = await fetch(`${API_BASE}/search/multi?query=${encodeURIComponent(query)}&include_adult=false`, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json"
    }
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { results?: TmdbSearchResult[] };
  return data.results ?? [];
}

export async function enrichTitlesWithTmdb(titles: Title[]): Promise<Title[]> {
  const token = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN as string | undefined;
  if (!token || titles.length === 0) return titles;

  const enriched = await Promise.all(
    titles.map(async (title) => {
      const results = await searchTmdbTitle(title.name);
      const best = findBestMatch(results, title);
      if (!best) return title;

      const year = parseYear(best.release_date ?? best.first_air_date);
      return {
        ...title,
        posterPath: best.poster_path ?? title.posterPath,
        overview: best.overview?.trim() || title.overview,
        releaseYear: year ?? title.releaseYear
      };
    })
  );

  return enriched;
}

function findBestMatch(results: TmdbSearchResult[], title: Title): TmdbSearchResult | null {
  if (results.length === 0) return null;
  const expectedMediaType = title.type === "series" ? "tv" : "movie";
  const normalizedTarget = normalize(title.name);

  const exact = results.find((result) => {
    const candidateName = result.title ?? result.name ?? "";
    return result.media_type === expectedMediaType && normalize(candidateName) === normalizedTarget;
  });
  if (exact) return exact;

  const sameType = results.find((result) => result.media_type === expectedMediaType && Boolean(result.poster_path));
  if (sameType) return sameType;

  return results.find((result) => Boolean(result.poster_path)) ?? results[0] ?? null;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseYear(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}
