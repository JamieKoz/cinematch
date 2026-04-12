import { describe, expect, it } from "vitest";
import { DECK_SIZE, fillDeckFromSources } from "./machine";

describe("fillDeckFromSources", () => {
  it("pads with fallback ids up to DECK_SIZE", () => {
    const primary = ["a", "b", "c"];
    const fallback = ["d", "e", "f", "g", "h", "i", "j", "k"];
    expect(fillDeckFromSources(primary, fallback)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
      "i",
      "j"
    ]);
  });

  it("dedupes across primary and fallback", () => {
    expect(fillDeckFromSources(["a", "b", "a"], ["b", "c", "d"], 5)).toEqual(["a", "b", "c", "d"]);
  });

  it("respects custom size", () => {
    expect(fillDeckFromSources(["x"], ["y", "z"], 2)).toEqual(["x", "y"]);
  });

  it("uses DECK_SIZE by default", () => {
    const primary = Array.from({ length: 3 }, (_, i) => `p${i}`);
    const fallback = Array.from({ length: 20 }, (_, i) => `f${i}`);
    expect(fillDeckFromSources(primary, fallback)).toHaveLength(DECK_SIZE);
  });
});
