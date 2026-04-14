import { describe, expect, it } from "vitest";
import { normalizeMoodList } from "./options";

describe("normalizeMoodList", () => {
  it("maps preset-style lowercase tokens", () => {
    expect(normalizeMoodList(["light", "intense"])).toEqual(["light", "intense"]);
  });

  it("maps UI labels to canonical values", () => {
    expect(normalizeMoodList(["Light", "Mind-bending"])).toEqual(["light", "mind-bending"]);
  });

  it("dedupes and drops unknown tokens", () => {
    expect(normalizeMoodList(["light", "Light", "feel-good"])).toEqual(["light"]);
  });
});
