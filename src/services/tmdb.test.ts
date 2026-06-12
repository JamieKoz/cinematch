import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultProfile } from "../engine/profile";
import { createInitialAnswers } from "../state/machine";
import { strictSearchMatch, type TmdbSearchResult } from "./tmdb";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

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

describe("resolveAiSuggestionsToTitles", () => {
  it("uses tmdb_id directly without calling search", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/genre/movie/list") || url.includes("/genre/tv/list")) {
        return jsonResponse({ genres: [] });
      }
      if (url.includes("/movie/155")) {
        return jsonResponse({
          title: "The Dark Knight",
          overview: "Batman faces the Joker.",
          poster_path: "/dark-knight.jpg",
          genres: [{ id: 28, name: "Action" }],
          vote_average: 9,
          runtime: 152,
          credits: { cast: [{ name: "Christian Bale" }] },
          "watch/providers": {
            results: {
              AU: {
                flatrate: [{ provider_id: 8, provider_name: "Netflix" }]
              }
            }
          },
          external_ids: { imdb_id: "tt0468569" }
        });
      }
      if (url.includes("/search/multi")) {
        throw new Error("search should not be called when tmdb_id is provided");
      }
      return jsonResponse({}, false);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { resolveAiSuggestionsToTitles } = await import("./tmdb");

    const [title] = await resolveAiSuggestionsToTitles(
      [{ name: "The Dark Knight", type: "movie", tmdb_id: 155, reason: "Prestige thriller." }],
      createInitialAnswers({ providers: ["netflix"] }),
      createDefaultProfile(),
      1,
      "AU"
    );

    expect(title?.id).toBe("tmdb-movie-155");
    expect(title?.name).toBe("The Dark Knight");
    expect(title?.imdbId).toBe("tt0468569");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/search/multi"))).toBe(false);
  });

  it("uses best-match TMDB details to fill synthetic fallback genres", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/genre/movie/list")) {
        return jsonResponse({ genres: [] });
      }
      if (url.includes("/genre/tv/list")) {
        return jsonResponse({
          genres: [
            { id: 10759, name: "Action & Adventure" },
            { id: 18, name: "Drama" }
          ]
        });
      }
      if (url.includes("/search/multi")) {
        return jsonResponse({
          results: [
            {
              id: 73375,
              media_type: "tv",
              name: "Tom Clancy's Jack Ryan",
              poster_path: "/jack.jpg",
              overview: "An analyst is pulled into the field.",
              first_air_date: "2018-08-31",
              genre_ids: [10759, 18],
              vote_average: 7.7
            }
          ]
        });
      }
      if (url.includes("/tv/73375")) {
        return jsonResponse({
          overview: "CIA analyst Jack Ryan uncovers suspicious transactions.",
          poster_path: "/jack-detail.jpg",
          genres: [
            { id: 10759, name: "Action & Adventure" },
            { id: 18, name: "Drama" }
          ],
          vote_average: 7.7,
          episode_run_time: [45],
          credits: { cast: [{ name: "John Krasinski" }] },
          "watch/providers": {
            results: {
              AU: {
                flatrate: [{ provider_id: 119, provider_name: "Amazon Prime Video" }]
              }
            }
          },
          external_ids: { imdb_id: "tt5057054" }
        });
      }
      return jsonResponse({}, false);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { resolveAiSuggestionsToTitles } = await import("./tmdb");

    const [title] = await resolveAiSuggestionsToTitles(
      [{ name: "Jack Ryan", type: "series", reason: "Action thriller on Prime." }],
      createInitialAnswers({ providers: ["prime"] }),
      createDefaultProfile(),
      1,
      "AU"
    );

    expect(title?.name).toBe("Tom Clancy's Jack Ryan");
    expect(title?.genres).toEqual(["Action & Adventure", "Drama"]);
    expect(title?.providers).toEqual(["prime"]);
    expect(title?.runtimeMinutes).toBe(45);
  });
});

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body
  } as Response;
}
