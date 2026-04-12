import { describe, expect, it } from "vitest";
import { strictSearchMatch, type TmdbSearchResult } from "./tmdb";

describe("strictSearchMatch", () => {
  it("requires exact normalized title and correct media type", () => {
    const results: TmdbSearchResult[] = [
      { id: 1, media_type: "movie", title: "The Matrix", poster_path: "/m.jpg" },
      { id: 2, media_type: "tv", name: "The Matrix", poster_path: null }
    ];
    expect(strictSearchMatch(results, "The Matrix", "movie")?.id).toBe(1);
    expect(strictSearchMatch(results, "The Matrix", "series")?.id).toBe(2);
    expect(strictSearchMatch(results, "Matrix", "movie")).toBeNull();
  });
});
