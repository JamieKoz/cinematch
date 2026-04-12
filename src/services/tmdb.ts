import { passesCandidateConstraints } from "../engine/candidateFilters";
import type { OnboardingAnswers, TasteProfile, Title, TitleType } from "../types";
import type { AiSuggestedTitle } from "./aiTypes";

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

const API_BASE = "/api/tmdb/3";
let genreLookupPromise: Promise<Map<number, string>> | null = null;

export async function searchTmdbTitle(query: string): Promise<TmdbSearchResult[]> {
  const response = await fetch(`${API_BASE}/search/multi?query=${encodeURIComponent(query)}&include_adult=false`, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { results?: TmdbSearchResult[] };
  return data.results ?? [];
}

export async function enrichTitlesWithTmdb(titles: Title[]): Promise<Title[]> {
  if (titles.length === 0) return titles;
  const genreLookup = await getGenreLookup();

  const enriched = await Promise.all(
    titles.map(async (title) => {
      const results = await searchTmdbTitle(title.name);
      const best = findBestMatch(results, title);
      if (!best) return title;

      const year = parseYear(best.release_date ?? best.first_air_date);
      const details = await fetchTmdbDetails(best.media_type, best.id);
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

export function strictSearchMatch(results: TmdbSearchResult[], titleName: string, type: TitleType): TmdbSearchResult | null {
  if (results.length === 0) return null;
  const expectedMediaType = type === "series" ? "tv" : "movie";
  const filtered = results.filter((result) => result.media_type === "movie" || result.media_type === "tv");
  if (filtered.length === 0) return null;
  const normalizedTarget = normalize(titleName);

  const exact = filtered.find((result) => {
    const candidateName = result.title ?? result.name ?? "";
    return result.media_type === expectedMediaType && normalize(candidateName) === normalizedTarget;
  });
  return exact ?? null;
}

export async function resolveAiSuggestionsToTitles(
  suggestions: AiSuggestedTitle[],
  answers: OnboardingAnswers,
  profile: TasteProfile,
  max: number
): Promise<Title[]> {
  if (suggestions.length === 0) return [];
  const genreLookup = await getGenreLookup();
  const used = new Set<string>();
  const resolved: Title[] = [];

  for (const suggestion of suggestions) {
    if (resolved.length >= max) break;
    const results = await searchTmdbTitle(suggestion.name);
    const match = strictSearchMatch(results, suggestion.name, suggestion.type);
    if (!match || (match.media_type !== "movie" && match.media_type !== "tv")) continue;

    const media = match.media_type;
    const id = `tmdb-${media}-${match.id}`;
    if (used.has(id)) continue;

    if (profile.rejectedIds.includes(id) || profile.seenIds.includes(id)) continue;

    const details = await fetchTmdbDetails(media, match.id);
    const year = parseYear(match.release_date ?? match.first_air_date);
    const genresFromSearch = (match.genre_ids ?? []).map((gid) => genreLookup.get(gid)).filter((name): name is string => Boolean(name));
    const genres = details?.genres?.length ? details.genres : genresFromSearch;
    const resolvedType: TitleType = media === "tv" ? "series" : "movie";
    const runtimeMinutes = details?.runtimeMinutes ?? (resolvedType === "series" ? 45 : 110);
    const displayName = (match.title ?? match.name ?? suggestion.name).trim();

    const title: Title = {
      id,
      name: displayName,
      type: resolvedType,
      runtimeMinutes: runtimeMinutes ?? (resolvedType === "series" ? 45 : 110),
      genres: genres.length ? genres : [],
      moods: [...(answers.moods ?? [])],
      language: answers.languages?.[0] ?? "en",
      providers: [...(answers.providers ?? [])],
      popularity: typeof match.vote_average === "number" ? Math.min(1, match.vote_average / 10) : 0.55,
      releaseYear: year ?? new Date().getFullYear(),
      posterPath: match.poster_path ?? null,
      overview: details?.overview?.trim() || match.overview?.trim() || suggestion.reason?.trim() || "",
      rating: details?.voteAverage ?? match.vote_average,
      cast: details?.cast
    };

    if (!passesCandidateConstraints(title, answers)) continue;

    used.add(id);
    resolved.push(title);
  }

  return resolved;
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
  id: number
): Promise<TmdbDetailSummary | null> {
  if (mediaType !== "movie" && mediaType !== "tv") return null;

  const response = await fetch(`${API_BASE}/${mediaType}/${id}?append_to_response=credits`, {
    headers: {
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

async function getGenreLookup(): Promise<Map<number, string>> {
  if (genreLookupPromise) return genreLookupPromise;

  genreLookupPromise = (async () => {
    const [movieRes, tvRes] = await Promise.all([
      fetch(`${API_BASE}/genre/movie/list`, {
        headers: { accept: "application/json" }
      }),
      fetch(`${API_BASE}/genre/tv/list`, {
        headers: { accept: "application/json" }
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
