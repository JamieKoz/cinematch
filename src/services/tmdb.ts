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
  genre_ids?: number[];
  vote_average?: number;
}

const API_BASE = "https://api.themoviedb.org/3";
let genreLookupPromise: Promise<Map<number, string>> | null = null;

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
  const genreLookup = await getGenreLookup(token);

  const enriched = await Promise.all(
    titles.map(async (title) => {
      const results = await searchTmdbTitle(title.name);
      const best = findBestMatch(results, title);
      if (!best) return title;

      const year = parseYear(best.release_date ?? best.first_air_date);
      const details = await fetchTmdbDetails(best.media_type, best.id, token);
      const genresFromSearch = (best.genre_ids ?? []).map((id) => genreLookup.get(id)).filter((name): name is string => Boolean(name));
      const genres = details?.genres?.length ? details.genres : genresFromSearch;
      const cast = details?.cast?.length ? details.cast : undefined;
      const rating = details?.voteAverage ?? best.vote_average ?? title.rating;
      const runtimeMinutes = details?.runtimeMinutes ?? title.runtimeMinutes;

      return {
        ...title,
        posterPath: best.poster_path ?? title.posterPath,
        overview: details?.overview?.trim() || best.overview?.trim() || title.overview,
        releaseYear: year ?? title.releaseYear,
        genres: genres.length ? genres : title.genres,
        cast,
        rating,
        runtimeMinutes
      };
    })
  );

  return enriched;
}

function findBestMatch(results: TmdbSearchResult[], title: Title): TmdbSearchResult | null {
  if (results.length === 0) return null;
  const expectedMediaType = title.type === "series" ? "tv" : "movie";
  const filtered = results.filter((result) => result.media_type === "movie" || result.media_type === "tv");
  if (filtered.length === 0) return null;
  const normalizedTarget = normalize(title.name);

  const exact = filtered.find((result) => {
    const candidateName = result.title ?? result.name ?? "";
    return result.media_type === expectedMediaType && normalize(candidateName) === normalizedTarget;
  });
  if (exact) return exact;

  const sameType = filtered.find((result) => result.media_type === expectedMediaType && Boolean(result.poster_path));
  if (sameType) return sameType;

  return filtered.find((result) => Boolean(result.poster_path)) ?? filtered[0] ?? null;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseYear(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

interface TmdbDetailResponse {
  overview?: string;
  genres?: Array<{ id: number; name: string }>;
  vote_average?: number;
  runtime?: number;
  episode_run_time?: number[];
  credits?: { cast?: Array<{ name?: string }> };
}

interface TmdbDetailSummary {
  overview?: string;
  genres: string[];
  cast?: string[];
  voteAverage?: number;
  runtimeMinutes?: number;
}

async function fetchTmdbDetails(
  mediaType: "movie" | "tv" | "person" | undefined,
  id: number,
  token: string
): Promise<TmdbDetailSummary | null> {
  if (mediaType !== "movie" && mediaType !== "tv") return null;

  const response = await fetch(`${API_BASE}/${mediaType}/${id}?append_to_response=credits`, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json"
    }
  });

  if (!response.ok) return null;

  const data = (await response.json()) as TmdbDetailResponse;
  const genres = (data.genres ?? []).map((genre) => genre.name).filter(Boolean);
  const cast = (data.credits?.cast ?? [])
    .map((entry) => entry.name?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 5);

  const runtimeMinutes = mediaType === "movie"
    ? data.runtime
    : data.episode_run_time?.length
      ? data.episode_run_time[0]
      : undefined;

  return {
    overview: data.overview,
    genres,
    cast: cast.length ? cast : undefined,
    voteAverage: data.vote_average,
    runtimeMinutes
  };
}

async function getGenreLookup(token: string): Promise<Map<number, string>> {
  if (genreLookupPromise) return genreLookupPromise;

  genreLookupPromise = (async () => {
    const [movieRes, tvRes] = await Promise.all([
      fetch(`${API_BASE}/genre/movie/list`, {
        headers: { Authorization: `Bearer ${token}`, accept: "application/json" }
      }),
      fetch(`${API_BASE}/genre/tv/list`, {
        headers: { Authorization: `Bearer ${token}`, accept: "application/json" }
      })
    ]);

    const lookup = new Map<number, string>();
    if (movieRes.ok) {
      const movieData = (await movieRes.json()) as { genres?: Array<{ id: number; name: string }> };
      for (const genre of movieData.genres ?? []) {
        lookup.set(genre.id, genre.name);
      }
    }
    if (tvRes.ok) {
      const tvData = (await tvRes.json()) as { genres?: Array<{ id: number; name: string }> };
      for (const genre of tvData.genres ?? []) {
        lookup.set(genre.id, genre.name);
      }
    }
    return lookup;
  })();

  return genreLookupPromise;
}
