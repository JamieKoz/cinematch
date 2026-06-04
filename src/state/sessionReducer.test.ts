import { describe, expect, it } from "vitest";
import { createInitialAnswers, createSession } from "./machine";
import { sessionReducer } from "./sessionReducer";

describe("sessionReducer", () => {
  it("starts swipe phase with a fresh deck", () => {
    const session = createSession(createInitialAnswers());
    const next = sessionReducer(session, { type: "DECK_READY", deck: ["a", "b", "c"] });
    expect(next.phase).toBe("swipe");
    expect(next.deck).toEqual(["a", "b", "c"]);
    expect(next.deckCursor).toBe(0);
    expect(next.shortlist).toEqual([]);
    expect(next.passed).toEqual([]);
    expect(next.showdownQueue).toEqual([]);
  });

  it("moves to showdown once shortlist target is reached", () => {
    let state = sessionReducer(createSession(createInitialAnswers()), { type: "DECK_READY", deck: ["a", "b", "c", "d", "e"] });
    state = sessionReducer(state, { type: "SWIPE", action: "keep", titleId: "a" });
    state = sessionReducer(state, { type: "SWIPE", action: "keep", titleId: "b" });
    state = sessionReducer(state, { type: "SWIPE", action: "keep", titleId: "c" });
    state = sessionReducer(state, { type: "SWIPE", action: "keep", titleId: "d" });
    state = sessionReducer(state, { type: "SWIPE", action: "keep", titleId: "e" });
    expect(state.phase).toBe("showdown");
    expect(state.showdownQueue).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("goes to result when deck ends with one keep", () => {
    let state = sessionReducer(createSession(createInitialAnswers()), { type: "DECK_READY", deck: ["a", "b"] });
    state = sessionReducer(state, { type: "SWIPE", action: "keep", titleId: "a" });
    state = sessionReducer(state, { type: "SWIPE", action: "pass", titleId: "b" });
    expect(state.phase).toBe("result");
    expect(state.winnerId).toBe("a");
    expect(state.backupId).toBe("b");
  });

  it("advances showdown queue and sets winner", () => {
    const base = createSession(createInitialAnswers());
    const state = {
      ...base,
      phase: "showdown" as const,
      showdownQueue: ["a", "b"]
    };
    const next = sessionReducer(state, { type: "SHOWDOWN_PICK", winnerId: "a", loserId: "b" });
    expect(next.phase).toBe("result");
    expect(next.winnerId).toBe("a");
    expect(next.backupId).toBe("b");
  });
});
