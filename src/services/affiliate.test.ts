import { afterEach, describe, expect, it, vi } from "vitest";

describe("buildWatchUrl", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("uses Amazon when title is on Prime and tag is configured", async () => {
    vi.stubEnv("VITE_AMAZON_ASSOCIATE_TAG", "couchpick-20");
    const { buildWatchUrl, watchDestination } = await import("./affiliate");
    const title = { name: "Interstellar", releaseYear: 2014, providers: ["prime"] };

    expect(watchDestination(title)).toBe("amazon");
    expect(buildWatchUrl(title)).toBe(
      "https://www.amazon.com/s?k=Interstellar%202014&i=instant-video&tag=couchpick-20"
    );
  });

  it("falls back to JustWatch when Prime has no affiliate tag", async () => {
    vi.stubEnv("VITE_AMAZON_ASSOCIATE_TAG", "");
    const { buildWatchUrl, watchDestination } = await import("./affiliate");
    const title = { name: "Interstellar", releaseYear: 2014, providers: ["prime"] };

    expect(watchDestination(title)).toBe("justwatch");
    expect(buildWatchUrl(title)).toBe("https://www.justwatch.com/us/search?q=Interstellar%202014");
  });

  it("uses JustWatch for non-Prime providers", async () => {
    vi.stubEnv("VITE_AMAZON_ASSOCIATE_TAG", "couchpick-20");
    const { buildWatchUrl } = await import("./affiliate");
    expect(
      buildWatchUrl({ name: "Dune", releaseYear: 2021, providers: ["max"] })
    ).toBe("https://www.justwatch.com/us/search?q=Dune%202021");
  });
});
