import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SessionState, Title } from "../types";
import { catalogForSessionDraft, persistSessionDraftIfNeeded } from "./sessionDraft";
import { loadSessionDraft } from "./storage";

const storage = vi.hoisted(() => {
  const map = new Map<string, string>();
  return {
    map,
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
    removeItem: (key: string) => map.delete(key)
  };
});

vi.stubGlobal("window", {
  localStorage: {
    getItem: (key: string) => storage.getItem(key),
    setItem: (key: string, value: string) => storage.setItem(key, value),
    removeItem: (key: string) => storage.removeItem(key)
  }
});

vi.mock("./persistenceBridge", () => ({
  syncSessionDraftRemote: vi.fn(),
  clearSessionDraftRemote: vi.fn()
}));

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

describe("persistSessionDraftIfNeeded", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("keeps an existing draft after reload when session returns to questions with a new id", () => {
    const catalog = [title("a"), title("b")];
    persistSessionDraftIfNeeded(session({ sessionId: "old-session" }), catalog);

    persistSessionDraftIfNeeded(
      session({ phase: "questions", sessionId: "new-session", deck: [], deckCursor: 0 }),
      catalog
    );

    expect(loadSessionDraft()?.session.sessionId).toBe("old-session");
  });

  it("clears the draft when the same session returns to questions", () => {
    const catalog = [title("a"), title("b")];
    persistSessionDraftIfNeeded(session({ sessionId: "same-session" }), catalog);

    persistSessionDraftIfNeeded(
      session({ phase: "questions", sessionId: "same-session", deck: [], deckCursor: 0 }),
      catalog
    );

    expect(loadSessionDraft()).toBeNull();
  });

  it("clears the draft when the session reaches result", () => {
    const catalog = [title("a"), title("b")];
    persistSessionDraftIfNeeded(session({ sessionId: "s1" }), catalog);

    persistSessionDraftIfNeeded(
      session({
        phase: "result",
        sessionId: "s1",
        winnerId: "a",
        backupId: "b",
        showdownQueue: ["a", "b"]
      }),
      catalog
    );

    expect(loadSessionDraft()).toBeNull();
  });
});
