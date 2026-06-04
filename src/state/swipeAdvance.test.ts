import { describe, expect, it } from "vitest";
import { phaseAfterDeckExhausted, resultFromSingleKeep } from "./swipeAdvance";

describe("phaseAfterDeckExhausted", () => {
  it("showdown when two or more keeps", () => {
    expect(phaseAfterDeckExhausted(["a", "b"], [])).toBe("showdown");
  });

  it("result when exactly one keep", () => {
    expect(phaseAfterDeckExhausted(["a"], ["b", "c"])).toBe("result");
  });

  it("questions when no keeps", () => {
    expect(phaseAfterDeckExhausted([], ["a", "b"])).toBe("questions");
  });
});

describe("resultFromSingleKeep", () => {
  it("picks the lone keeper as winner and last pass as backup", () => {
    expect(resultFromSingleKeep(["win"], ["p1", "p2"])).toEqual({
      winnerId: "win",
      backupId: "p2"
    });
  });
});
