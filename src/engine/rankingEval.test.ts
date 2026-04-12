import { describe, expect, it } from "vitest";
import { MOCK_TITLES } from "../data/mockTitles";
import { createDefaultProfile } from "./profile";
import { rankTitles } from "./scoring";
import { createInitialAnswers } from "../state/machine";

describe("onboarding-to-ranking regression", () => {
  it("ranks crime titles after non-crime when crime is hard-excluded", () => {
    const answers = createInitialAnswers({ hardExclusions: ["crime"] });
    const profile = createDefaultProfile();
    const ordered = rankTitles(MOCK_TITLES, answers, profile);
    const firstCrimeIndex = ordered.findIndex((t) => t.genres.includes("crime"));
    const lastNonCrimeIndex = ordered.map((t, i) => (t.genres.includes("crime") ? -1 : i)).filter((i) => i >= 0).pop();
    if (firstCrimeIndex >= 0 && lastNonCrimeIndex !== undefined) {
      expect(firstCrimeIndex).toBeGreaterThan(lastNonCrimeIndex);
    }
  });

  it("prefers matching moods when set", () => {
    const answers = createInitialAnswers({ moods: ["light"] });
    const profile = createDefaultProfile();
    const ordered = rankTitles(MOCK_TITLES, answers, profile);
    const top = ordered[0];
    expect(top?.moods.includes("light") || top?.moods.includes("feel-good")).toBe(true);
  });
});
