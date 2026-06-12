import { describe, expect, it } from "vitest";
import { tmdbCacheKey, tmdbCacheTtlSeconds } from "./tmdbCache";

describe("tmdbCacheKey", () => {
  it("builds a stable prefixed key from path and query", () => {
    expect(tmdbCacheKey("/3/movie/155", "?append_to_response=credits")).toBe(
      "tmdb:v1:/3/movie/155?append_to_response=credits"
    );
  });
});

describe("tmdbCacheTtlSeconds", () => {
  it("uses shorter TTL for watch providers and search", () => {
    expect(tmdbCacheTtlSeconds("/3/movie/155/watch/providers")).toBe(86_400);
    expect(tmdbCacheTtlSeconds("/3/search/multi")).toBe(86_400);
  });

  it("uses longer TTL for title details and genre lists", () => {
    expect(tmdbCacheTtlSeconds("/3/movie/155")).toBe(604_800);
    expect(tmdbCacheTtlSeconds("/3/genre/movie/list")).toBe(604_800);
    expect(tmdbCacheTtlSeconds("/3/find/tt0468569")).toBe(604_800);
  });
});
