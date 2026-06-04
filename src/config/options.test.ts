import { describe, expect, it } from "vitest";
import { normalizeLanguageCodes, normalizeMoodList } from "./options";

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

describe("normalizeLanguageCodes", () => {
  it("defaults to English when empty", () => {
    expect(normalizeLanguageCodes([])).toEqual(["en"]);
  });

  it("maps legacy any to English default", () => {
    expect(normalizeLanguageCodes(["any"])).toEqual(["en"]);
  });

  it("keeps valid multiselect codes", () => {
    expect(normalizeLanguageCodes(["en", "fr", "ja"])).toEqual(["en", "fr", "ja"]);
  });
});
