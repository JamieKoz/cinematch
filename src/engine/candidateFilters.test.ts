import { describe, expect, it } from "vitest";
import { createDefaultProfile } from "./profile";
import { passesAiDeckConstraints, passesCandidateConstraints, prepareSwipeCandidatePool } from "./candidateFilters";
import { createInitialAnswers } from "../state/machine";
import type { Title } from "../types";

function title(overrides: Partial<Title> = {}): Title {
  return {
    id: "x",
    name: "Test",
    type: "movie",
    runtimeMinutes: 100,
    genres: ["comedy"],
    moods: ["light"],
    language: "en",
    providers: ["netflix"],
    popularity: 0.5,
    releaseYear: 2022,
    overview: "Overview",
    ...overrides
  };
}

describe("passesAiDeckConstraints", () => {
  it("ignores release window that full candidate checks use", () => {
    const answers = createInitialAnswers({ releaseWindow: "2020s" });
    expect(passesAiDeckConstraints(title({ releaseYear: 1999 }), answers)).toBe(true);
    expect(passesCandidateConstraints(title({ releaseYear: 1999 }), answers)).toBe(false);
  });

  it("still blocks hard exclusion genres and preferred type", () => {
    const ex = createInitialAnswers({ hardExclusions: ["horror"] });
    expect(passesAiDeckConstraints(title({ genres: ["horror"] }), ex)).toBe(false);
    const typeAns = createInitialAnswers({ preferredType: "movie" });
    expect(passesAiDeckConstraints(title({ type: "series" }), typeAns)).toBe(false);
  });
});

describe("passesCandidateConstraints", () => {
  it("blocks hardExclusions genres", () => {
    const answers = createInitialAnswers({ hardExclusions: ["horror"] });
    expect(passesCandidateConstraints(title({ genres: ["horror"] }), answers)).toBe(false);
    expect(passesCandidateConstraints(title({ genres: ["comedy"] }), answers)).toBe(true);
  });

  it("enforces provider overlap when providers requested", () => {
    const answers = createInitialAnswers({ providers: ["netflix"] });
    expect(passesCandidateConstraints(title({ providers: ["hulu"] }), answers)).toBe(false);
    expect(passesCandidateConstraints(title({ providers: ["netflix"] }), answers)).toBe(true);
  });

  it("enforces preferred type", () => {
    const answers = createInitialAnswers({ preferredType: "series" });
    expect(passesCandidateConstraints(title({ type: "movie" }), answers)).toBe(false);
  });
});

describe("prepareSwipeCandidatePool", () => {
  it("drops rejected titles when enough remain", () => {
    const profile = createDefaultProfile();
    profile.rejectedIds = ["bad"];
    const catalog = [title({ id: "bad" }), ...Array.from({ length: 15 }, (_, i) => title({ id: `ok-${i}` }))];
    const pool = prepareSwipeCandidatePool(catalog, createInitialAnswers(), profile);
    expect(pool.some((t) => t.id === "bad")).toBe(false);
  });
});
