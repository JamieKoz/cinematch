import { describe, expect, it } from "vitest";
import type { Title } from "../types";
import { buildTitleSharePayload, titleShareUrl } from "./shareTitle";

function title(overrides: Partial<Title> = {}): Title {
  return {
    id: "tmdb-movie-155",
    name: "The Dark Knight",
    type: "movie",
    runtimeMinutes: 152,
    genres: [],
    moods: [],
    language: "en",
    providers: [],
    popularity: 0.9,
    releaseYear: 2008,
    overview: "",
    ...overrides
  };
}

describe("titleShareUrl", () => {
  it("builds a TMDB movie link from catalog ids", () => {
    expect(titleShareUrl(title())).toBe("https://www.themoviedb.org/movie/155");
  });

  it("builds a TMDB series link", () => {
    expect(titleShareUrl(title({ id: "tmdb-tv-1399", type: "series" }))).toBe(
      "https://www.themoviedb.org/tv/1399"
    );
  });

  it("returns undefined for non-tmdb ids", () => {
    expect(titleShareUrl(title({ id: "mock-1" }))).toBeUndefined();
  });
});

describe("buildTitleSharePayload", () => {
  it("includes title, text, and url for share sheets", () => {
    expect(buildTitleSharePayload(title())).toEqual({
      title: "Sententia pick",
      text: "Check out this pick: The Dark Knight (2008)",
      url: "https://www.themoviedb.org/movie/155"
    });
  });
});
