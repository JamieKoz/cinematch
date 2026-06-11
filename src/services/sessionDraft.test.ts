import { describe, expect, it } from "vitest";
import type { SessionState, Title } from "../types";
import { catalogForSessionDraft } from "./sessionDraft";

function title(id: string): Title {
  return {
    id,
    name: id,
    type: "movie",
    runtimeMinutes: 100,
    genres: [],
    moods: [],
    language: "en",
    providers: [],
    popularity: 0.5,
    releaseYear: 2020,
    overview: ""
  };
}

function session(overrides: Partial<SessionState> = {}): SessionState {
  return {
    phase: "swipe",
    sessionId: "s1",
    answers: {
      moods: [],
      preferredType: "either",
      runtime: "any",
      languages: ["en"],
      releaseWindow: "any",
      customYearRange: null,
      familiarities: [],
      providers: [],
      hardExclusions: [],
      keywords: [],
      usePersonalization: true
    },
    deck: ["a", "b"],
    deckCursor: 1,
    shortlist: ["a"],
    passed: ["x"],
    showdownQueue: [],
    ...overrides
  };
}

describe("catalogForSessionDraft", () => {
  it("keeps only titles referenced by the in-flight session", () => {
    const catalog = [title("a"), title("b"), title("x"), title("unused")];
    const picked = catalogForSessionDraft(session(), catalog);
    expect(picked.map((t) => t.id).sort()).toEqual(["a", "b", "x"]);
  });

  it("includes showdown queue and result ids", () => {
    const catalog = [title("w"), title("b"), title("l"), title("r")];
    const picked = catalogForSessionDraft(
      session({
        phase: "showdown",
        showdownQueue: ["l", "r"],
        winnerId: "w",
        backupId: "b"
      }),
      catalog
    );
    expect(picked.map((t) => t.id).sort()).toEqual(["b", "l", "r", "w"]);
  });
});
