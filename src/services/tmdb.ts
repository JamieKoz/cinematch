import { passesAiDeckConstraints, passesCandidateConstraints } from "../engine/candidateFilters";
import type { OnboardingAnswers, TasteProfile, Title, TitleType } from "../types";
import { slugify } from "../utils/appState";
import type { AiSuggestedTitle } from "./aiTypes";
import { mapTmdbProvidersToCanonical, resolveTitleProviders } from "./tmdbProviderMap";
import { tmdbWatchRegion } from "../config/regions";
import { fetchWatchProvidersForTmdbId, parseTmdbCatalogId } from "./tmdbWatchProviders";

export function tmdbPosterUrl(posterPath: string | null | undefined, size: "w342" | "w500" = "w500"): string | null {
  if (!posterPath) return null;
  if (/^https?:\/\//i.test(posterPath)) return posterPath;
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
const searchCache = new Map<string, Promise<TmdbSearchResult[]>>();
const detailCache = new Map<string, Promise<TmdbDetailSummary | null>>();
const ENRICH_CONCURRENCY = 4;
const SEARCH_CACHE_MAX_ENTRIES = 200;
const DETAIL_CACHE_MAX_ENTRIES = 400;

export async function searchTmdbTitle(query: string): Promise<TmdbSearchResult[]> {
  const key = query.trim().toLowerCase();
  if (!key) return [];
  let cached = searchCache.get(key);
  if (!cached) {
    cached = (async () => {
      const response = await fetch(`${API_BASE}/search/multi?query=${encodeURIComponent(query)}&include_adult=false`, {
        headers: {
          accept: "application/json"
        }
      });

      if (!response.ok) return [];

      const data = (await response.json()) as { results?: TmdbSearchResult[] };
      return data.results ?? [];
    })();
    setWithLimit(searchCache, key, cached, SEARCH_CACHE_MAX_ENTRIES);
  }
  return cached;
}

export async function enrichTitlesWithTmdb(titles: Title[], watchRegion: string): Promise<Title[]> {
  if (titles.length === 0) return titles;
  const genreLookup = await getGenreLookup();

  const enriched = await mapWithConcurrency(
    titles,
    ENRICH_CONCURRENCY,
    async (title) => {
      const parsed = parseTmdbCatalogId(title.id);
      let mediaType: "movie" | "tv" | undefined = parsed?.mediaType;
      let tmdbId = parsed?.tmdbId;
      let best: TmdbSearchResult | null = null;

      if (!mediaType || tmdbId === undefined) {
        const results = await searchTmdbTitle(title.name);
        best = findBestMatch(results, title);
        if (best?.media_type === "movie" || best?.media_type === "tv") {
          mediaType = best.media_type;
          tmdbId = best.id;
        }
      }

      if (!mediaType || tmdbId === undefined) return title;

      const year = best
        ? parseYear(best.release_date ?? best.first_air_date) ?? title.releaseYear
        : title.releaseYear;
      const details =
        mediaType && tmdbId !== undefined
          ? await fetchTmdbDetails(mediaType, tmdbId, watchRegion)
          : null;
      const genresFromSearch = best
        ? (best.genre_ids ?? []).map((id) => genreLookup.get(id)).filter((name): name is string => Boolean(name))
        : [];
      const genres = details?.genres?.length ? details.genres : genresFromSearch.length ? genresFromSearch : title.genres;
      const cast = details?.cast?.length ? details.cast : title.cast;
      const rating = details?.voteAverage ?? best?.vote_average ?? title.rating;
      const runtimeMinutes = details?.runtimeMinutes ?? title.runtimeMinutes;
      const regionalProviders =
        details?.providers ??
        (mediaType && tmdbId !== undefined
          ? await fetchWatchProvidersForTmdbId(mediaType, tmdbId, watchRegion)
          : []);

      return {
        ...title,
        id:
          mediaType && tmdbId !== undefined ? `tmdb-${mediaType}-${tmdbId}` : title.id,
        posterPath: details?.posterPath ?? best?.poster_path ?? title.posterPath,
        overview: details?.overview?.trim() || best?.overview?.trim() || title.overview,
        releaseYear: year ?? title.releaseYear,
        genres: genres.length ? genres : title.genres,
        cast,
        rating,
        runtimeMinutes,
        imdbId: details?.imdbId,
        youtubeTrailerId: details?.youtubeTrailerId,
        providers: resolveTitleProviders(
          regionalProviders,
          title.providers,
          Boolean(mediaType && tmdbId !== undefined)
        )
      };
    }
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

export function createSyntheticAiTitle(
  suggestion: AiSuggestedTitle,
  answers: OnboardingAnswers,
  ordinal: number
): Title {
  return {
    id: `ai-${ordinal}-${slugify(suggestion.name)}`,
    name: suggestion.name,
    type: suggestion.type,
    runtimeMinutes: suggestion.type === "series" ? 45 : 110,
    genres: [],
    moods: [...(answers.moods ?? [])],
    language: answers.languages?.[0] ?? "en",
    providers: [...(answers.providers ?? [])],
    popularity: 0.6,
    releaseYear: new Date().getFullYear(),
    posterPath: null,
    overview: suggestion.reason?.trim() || "AI-picked for your current vibe."
  };
}

export async function resolveAiSuggestionsToTitles(
  suggestions: AiSuggestedTitle[],
  answers: OnboardingAnswers,
  profile: TasteProfile,
  max: number,
  watchRegion: string
): Promise<Title[]> {
  if (suggestions.length === 0) return [];
  const genreLookup = await getGenreLookup();
  const rejectedIds = new Set(profile.rejectedIds);

  const candidates = await mapWithConcurrency(
    suggestions,
    ENRICH_CONCURRENCY,
    (suggestion, index) =>
      resolveSuggestionToTitle(suggestion, index, {
        answers,
        watchRegion,
        genreLookup,
        rejectedIds
      })
  );

  const used = new Set<string>();
  const resolved: Title[] = [];
  for (const title of candidates) {
    if (!title || used.has(title.id)) continue;
    if (!passesAiDeckConstraints(title, answers) || !passesCandidateConstraints(title, answers)) continue;
    used.add(title.id);
    resolved.push(title);
    if (resolved.length >= max) break;
  }

  return resolved;
}

async function resolveSuggestionToTitle(
  suggestion: AiSuggestedTitle,
  index: number,
  context: {
    answers: OnboardingAnswers;
    watchRegion: string;
    genreLookup: Map<number, string>;
    rejectedIds: Set<string>;
  }
): Promise<Title | null> {
  const { answers, watchRegion, genreLookup, rejectedIds } = context;
  const expectedMediaType = suggestionMediaType(suggestion.type);

  const directId = suggestion.tmdb_id;
  if (directId !== undefined) {
    const catalogId = `tmdb-${expectedMediaType}-${directId}`;
    if (!rejectedIds.has(catalogId)) {
      const fromId = await buildTitleFromTmdbId({
        suggestion,
        answers,
        watchRegion,
        genreLookup,
        mediaType: expectedMediaType,
        tmdbId: directId
      });
      if (fromId) return fromId;
    }
  }

  if (suggestion.imdb_id) {
    const found = await findTmdbByImdbId(suggestion.imdb_id, expectedMediaType);
    if (found) {
      const catalogId = `tmdb-${found.mediaType}-${found.id}`;
      if (!rejectedIds.has(catalogId)) {
        const fromImdb = await buildTitleFromTmdbId({
          suggestion,
          answers,
          watchRegion,
          genreLookup,
          mediaType: found.mediaType,
          tmdbId: found.id
        });
        if (fromImdb) return fromImdb;
      }
    }
  }

  const results = await searchTmdbTitle(suggestion.name);
  const match = strictSearchMatch(results, suggestion.name, suggestion.type);
  let picked: Title | null = null;

  if (match && (match.media_type === "movie" || match.media_type === "tv")) {
    picked = await buildTitleFromTmdbId({
      suggestion,
      answers,
      watchRegion,
      genreLookup,
      mediaType: match.media_type,
      tmdbId: match.id,
      searchMatch: match
    });
    if (picked && rejectedIds.has(picked.id)) picked = null;
  }

  if (!picked) {
    const synthetic = createSyntheticAiTitle(suggestion, answers, index);
    if (passesAiDeckConstraints(synthetic, answers)) {
      const posterHint = findBestMatch(results, synthetic);
      const matchedHint: (TmdbSearchResult & { media_type: "movie" | "tv" }) | null =
        posterHint?.media_type === expectedMediaType
          ? { ...posterHint, media_type: expectedMediaType }
          : null;
      if (matchedHint) {
        picked = await buildTitleFromTmdbId({
          suggestion,
          answers,
          watchRegion,
          genreLookup,
          mediaType: matchedHint.media_type,
          tmdbId: matchedHint.id,
          searchMatch: matchedHint,
          syntheticFallback: synthetic
        });
      } else {
        picked = synthetic;
      }
    }
  } else if (!picked.posterPath) {
    const posterHint = findBestMatch(results, picked);
    if (posterHint?.poster_path) {
      picked = { ...picked, posterPath: posterHint.poster_path };
    }
  }

  return picked;
}

function suggestionMediaType(type: TitleType): "movie" | "tv" {
  return type === "series" ? "tv" : "movie";
}

async function buildTitleFromTmdbId(input: {
  suggestion: AiSuggestedTitle;
  answers: OnboardingAnswers;
  watchRegion: string;
  genreLookup: Map<number, string>;
  mediaType: "movie" | "tv";
  tmdbId: number;
  searchMatch?: TmdbSearchResult;
  syntheticFallback?: Title;
}): Promise<Title | null> {
  const { suggestion, answers, watchRegion, genreLookup, mediaType, tmdbId, searchMatch, syntheticFallback } = input;
  const details = await fetchTmdbDetails(mediaType, tmdbId, watchRegion);
  if (!details) return null;

  const regionalProviders =
    details.providers ?? (await fetchWatchProvidersForTmdbId(mediaType, tmdbId, watchRegion));
  const genresFromSearch = searchMatch
    ? (searchMatch.genre_ids ?? [])
      .map((gid) => genreLookup.get(gid))
      .filter((name): name is string => Boolean(name))
    : [];
  const genres = details.genres?.length ? details.genres : genresFromSearch;
  const resolvedType: TitleType = mediaType === "tv" ? "series" : "movie";
  const displayName = (
    searchMatch?.title ??
    searchMatch?.name ??
    syntheticFallback?.name ??
    suggestion.name
  ).trim();
  const releaseYear =
    parseYear(searchMatch?.release_date ?? searchMatch?.first_air_date) ??
    syntheticFallback?.releaseYear ??
    new Date().getFullYear();

  return {
    id: `tmdb-${mediaType}-${tmdbId}`,
    name: displayName || suggestion.name,
    type: resolvedType,
    runtimeMinutes: details.runtimeMinutes ?? syntheticFallback?.runtimeMinutes ?? (resolvedType === "series" ? 45 : 110),
    genres: genres.length ? genres : syntheticFallback?.genres ?? [],
    moods: syntheticFallback?.moods ?? [...answers.moods],
    language: syntheticFallback?.language ?? answers.languages[0] ?? "en",
    providers: resolveTitleProviders(
      regionalProviders,
      syntheticFallback?.providers ?? answers.providers,
      true
    ),
    popularity:
      typeof searchMatch?.vote_average === "number"
        ? Math.min(1, searchMatch.vote_average / 10)
        : syntheticFallback?.popularity ?? 0.55,
    releaseYear,
    imdbId: details.imdbId ?? suggestion.imdb_id,
    youtubeTrailerId: details.youtubeTrailerId,
    posterPath: details.posterPath ?? searchMatch?.poster_path ?? syntheticFallback?.posterPath ?? null,
    overview:
      details.overview?.trim() ||
      searchMatch?.overview?.trim() ||
      syntheticFallback?.overview ||
      suggestion.reason?.trim() ||
      "",
    rating: details.voteAverage ?? searchMatch?.vote_average ?? syntheticFallback?.rating,
    cast: details.cast
  };
}

interface TmdbFindResponse {
  movie_results?: Array<{ id: number }>;
  tv_results?: Array<{ id: number }>;
}

const imdbFindCache = new Map<string, Promise<{ mediaType: "movie" | "tv"; id: number } | null>>();

async function findTmdbByImdbId(
  imdbId: string,
  expectedMediaType: "movie" | "tv"
): Promise<{ mediaType: "movie" | "tv"; id: number } | null> {
  const key = `${imdbId}:${expectedMediaType}`;
  let cached = imdbFindCache.get(key);
  if (!cached) {
    cached = (async () => {
      const response = await fetch(
        `${API_BASE}/find/${encodeURIComponent(imdbId)}?external_source=imdb_id`,
        { headers: { accept: "application/json" } }
      );
      if (!response.ok) return null;
      const data = (await response.json()) as TmdbFindResponse;
      const bucket = expectedMediaType === "movie" ? data.movie_results : data.tv_results;
      const match = bucket?.find((entry) => typeof entry.id === "number" && entry.id > 0);
      if (!match) return null;
      return { mediaType: expectedMediaType, id: match.id };
    })();
    imdbFindCache.set(key, cached);
  }
  return cached;
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
  poster_path?: string | null;
  genres?: Array<{ id: number; name: string }>;
  vote_average?: number;
  runtime?: number;
  episode_run_time?: number[];
  credits?: { cast?: Array<{ name?: string }> };
}

interface TmdbExternalIdsResponse {
  imdb_id?: string;
}

interface TmdbVideoEntry {
  key?: string;
  site?: string;
  type?: string;
  official?: boolean;
}

interface TmdbVideosResponse {
  results?: TmdbVideoEntry[];
}

interface TmdbDetailSummary {
  overview?: string;
  posterPath?: string | null;
  genres: string[];
  cast?: string[];
  voteAverage?: number;
  runtimeMinutes?: number;
  providers?: string[];
  imdbId?: string;
  youtubeTrailerId?: string;
}

interface TmdbWatchProvidersAppend {
  results?: Record<string, { flatrate?: Array<{ provider_id: number; provider_name: string }> }>;
}

interface TmdbDetailResponseWithProviders extends TmdbDetailResponse {
  "watch/providers"?: TmdbWatchProvidersAppend;
  external_ids?: TmdbExternalIdsResponse;
  videos?: TmdbVideosResponse;
}

async function fetchTmdbDetails(
  mediaType: "movie" | "tv" | "person" | undefined,
  id: number,
  watchRegion?: string
): Promise<TmdbDetailSummary | null> {
  if (mediaType !== "movie" && mediaType !== "tv") return null;
  const cacheKey = `${mediaType}:${id}:${watchRegion ?? "none"}`;
  const cached = detailCache.get(cacheKey);
  if (cached) return cached;

  const task = (async () => {
    const append = watchRegion
      ? "credits,watch/providers,external_ids,videos"
      : "credits,external_ids,videos";
    const response = await fetch(`${API_BASE}/${mediaType}/${id}?append_to_response=${append}`, {
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) return null;

    const data = (await response.json()) as TmdbDetailResponseWithProviders;
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

    let providers: string[] | undefined;
    if (watchRegion) {
      const region = tmdbWatchRegion(watchRegion);
      const bucket = data["watch/providers"]?.results?.[region];
      if (bucket?.flatrate?.length) {
        providers = mapTmdbProvidersToCanonical(bucket.flatrate);
      }
    }

    return {
      overview: data.overview,
      posterPath: data.poster_path ?? null,
      genres,
      cast: cast.length ? cast : undefined,
      voteAverage: data.vote_average,
      runtimeMinutes,
      providers,
      imdbId: data.external_ids?.imdb_id,
      youtubeTrailerId: pickYoutubeTrailerId(data.videos?.results ?? [])
    };
  })();

  setWithLimit(detailCache, cacheKey, task, DETAIL_CACHE_MAX_ENTRIES);
  return task;
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

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  if (values.length === 0) return [];
  const size = Math.max(1, Math.min(concurrency, values.length));
  const out = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const current = nextIndex;
      nextIndex += 1;
      out[current] = await mapper(values[current]!, current);
    }
  }

  await Promise.all(Array.from({ length: size }, () => worker()));
  return out;
}

function pickYoutubeTrailerId(videos: TmdbVideoEntry[]): string | undefined {
  const yt = videos.filter((v) => v.site === "YouTube" && v.key);
  const officialTrailer = yt.find((v) => v.official && v.type === "Trailer");
  const anyTrailer = yt.find((v) => v.type === "Trailer");
  const teaser = yt.find((v) => v.official && v.type === "Teaser");
  return (officialTrailer ?? anyTrailer ?? teaser ?? yt[0])?.key ?? undefined;
}

function setWithLimit<K, V>(map: Map<K, V>, key: K, value: V, maxEntries: number): void {
  map.set(key, value);
  if (map.size <= maxEntries) return;
  const firstKey = map.keys().next().value as K | undefined;
  if (firstKey !== undefined) {
    map.delete(firstKey);
  }
}
