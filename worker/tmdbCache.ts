/// <reference types="@cloudflare/workers-types/2023-07-01" />

const CACHE_KEY_PREFIX = "tmdb:v1:";

/** Stable KV key for a proxied TMDB path + query string. */
export function tmdbCacheKey(pathname: string, search: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const query = search.startsWith("?") ? search : search ? `?${search}` : "";
  return `${CACHE_KEY_PREFIX}${path}${query}`;
}

/** TTL seconds — watch providers change more often than static metadata. */
export function tmdbCacheTtlSeconds(pathname: string): number {
  if (/\/watch\/providers$/.test(pathname)) return 86_400; // 1 day
  if (pathname === "/3/search/multi") return 86_400; // 1 day
  if (pathname === "/3/genre/movie/list" || pathname === "/3/genre/tv/list") return 604_800; // 7 days
  if (/^\/3\/find\//.test(pathname)) return 604_800; // 7 days
  if (/^\/3\/(movie|tv)\/\d+$/.test(pathname)) return 604_800; // 7 days
  return 259_200; // 3 days fallback
}

export interface TmdbCachedPayload {
  body: unknown;
  cachedAt: string;
}

export async function readTmdbCache(kv: KVNamespace, key: string): Promise<TmdbCachedPayload | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TmdbCachedPayload;
    if (!parsed || typeof parsed !== "object" || !("body" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeTmdbCache(
  kv: KVNamespace,
  key: string,
  pathname: string,
  body: unknown
): Promise<void> {
  const payload: TmdbCachedPayload = {
    body,
    cachedAt: new Date().toISOString()
  };
  await kv.put(key, JSON.stringify(payload), { expirationTtl: tmdbCacheTtlSeconds(pathname) });
}
