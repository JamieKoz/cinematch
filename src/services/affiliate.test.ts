import { afterEach, describe, expect, it, vi } from "vitest";

describe("buildWatchUrl", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("deep-links to Prime Video detail when primeVideoGti is present", async () => {
    vi.stubEnv("VITE_AMAZON_ASSOCIATE_TAG", "sententia-20");
    vi.stubEnv("VITE_AMAZON_TAG_AU", "");
    const { buildWatchUrl } = await import("./affiliate");

    const title = {
      id: "whatever",
      name: "Interstellar",
      releaseYear: 2014,
      providers: ["prime"],
      primeVideoGti: "amzn1.dv.gti.ABC123-DEF456"
    };

    expect(buildWatchUrl(title, "US")).toBe(
      "https://www.primevideo.com/detail?gti=amzn1.dv.gti.ABC123-DEF456&linkCode=xm2&tag=sententia-20"
    );
  });

  it("falls back to JustWatch when a Prime title has no GTI (no media type known)", async () => {
    vi.stubEnv("VITE_AMAZON_ASSOCIATE_TAG", "sententia-20");
    vi.stubEnv("VITE_AMAZON_TAG_AU", "");
    const { buildWatchUrl, watchDestination } = await import("./affiliate");
    // When type is unknown, JustWatch uses keyword search rather than a title slug.
    const title = { name: "Interstellar", releaseYear: 2014, providers: ["prime"] };

    expect(watchDestination(title, "US")).toBe("amazon");
    expect(buildWatchUrl(title, "US")).toBe(
      "https://www.justwatch.com/us/search?q=Interstellar%202014"
    );
  });

  it("uses AU Amazon host and tag when region is AU and primeVideoGti is present", async () => {
    vi.stubEnv("VITE_AMAZON_ASSOCIATE_TAG", "");
    vi.stubEnv("VITE_AMAZON_TAG_AU", "sententiaau-20");
    const { buildWatchUrl, watchDestination } = await import("./affiliate");
    const title = {
      name: "Interstellar",
      releaseYear: 2014,
      providers: ["prime"],
      primeVideoGti: "amzn1.dv.gti.ABC123-DEF456"
    };

    expect(watchDestination(title, "AU")).toBe("amazon");
    expect(buildWatchUrl(title, "AU")).toBe(
      "https://www.primevideo.com/detail?gti=amzn1.dv.gti.ABC123-DEF456&linkCode=xm2&tag=sententiaau-20"
    );
  });

  it("falls back to JustWatch for Prime titles without a GTI", async () => {
    vi.stubEnv("VITE_AMAZON_TAG_AU", "justau2tuk-22");
    const { buildWatchUrl, watchDestination } = await import("./affiliate");
    const title = { name: "Tom Clancy's Jack Ryan", type: "series" as const, releaseYear: 2018, providers: ["prime"] };

    expect(watchDestination(title, "AU")).toBe("amazon");
    expect(buildWatchUrl(title, "AU")).toBe(
      "https://www.justwatch.com/au/tv-show/tom-clancys-jack-ryan"
    );
  });

  it("falls back to JustWatch when Prime has no GTI and no affiliate tag", async () => {
    vi.stubEnv("VITE_AMAZON_ASSOCIATE_TAG", "");
    vi.stubEnv("VITE_AMAZON_TAG_US", "");
    vi.stubEnv("VITE_AMAZON_TAG_AU", "");
    const { buildWatchUrl, watchDestination } = await import("./affiliate");
    const title = { name: "Interstellar", type: "movie" as const, releaseYear: 2014, providers: ["prime"] };

    expect(watchDestination(title, "AU")).toBe("amazon");
    expect(buildWatchUrl(title, "AU")).toBe("https://www.justwatch.com/au/movie/interstellar");
  });

  it("uses JustWatch title pages for non-Prime movies and series", async () => {
    vi.stubEnv("VITE_AMAZON_ASSOCIATE_TAG", "sententia-20");
    const { buildWatchUrl } = await import("./affiliate");
    expect(buildWatchUrl({ name: "Patriot", type: "series", releaseYear: 2015, providers: [] }, "AU")).toBe(
      "https://www.justwatch.com/au/tv-show/patriot"
    );
    expect(buildWatchUrl({ name: "The Bourne Supremacy", type: "movie", releaseYear: 2004, providers: [] }, "AU")).toBe(
      "https://www.justwatch.com/au/movie/the-bourne-supremacy"
    );
  });

  it("uses JustWatch search when media type is unavailable", async () => {
    vi.stubEnv("VITE_AMAZON_ASSOCIATE_TAG", "sententia-20");
    const { buildWatchUrl } = await import("./affiliate");
    expect(buildWatchUrl({ name: "Dune", releaseYear: 2021, providers: ["max"] }, "GB")).toBe(
      "https://www.justwatch.com/uk/search?q=Dune%202021"
    );
  });
});
