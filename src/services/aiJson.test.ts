import { describe, expect, it } from "vitest";
import {
  parseGeneratePayload,
  parseRerankPayload,
  safeParseJson,
  validateRerankPermutation
} from "./aiJson";

describe("safeParseJson", () => {
  it("parses normal JSON", () => {
    expect(safeParseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("extracts JSON from markdown fences", () => {
    const raw = "```json\n{\"orderedIds\":[\"x\"]}\n```";
    expect(safeParseJson(raw)).toEqual({ orderedIds: ["x"] });
  });

  it("recovers object substring when outer text exists", () => {
    const raw = 'Here you go: {"suggestions":[{"name":"Inception","type":"movie"}]} thanks';
    expect(safeParseJson(raw)).toEqual({ suggestions: [{ name: "Inception", type: "movie" }] });
  });

  it("returns null for invalid content", () => {
    expect(safeParseJson("not json")).toBeNull();
  });
});

describe("parseRerankPayload", () => {
  it("accepts ordered string ids", () => {
    expect(parseRerankPayload({ orderedIds: ["a", "b"] })).toEqual({ orderedIds: ["a", "b"] });
  });

  it("rejects non-arrays", () => {
    expect(parseRerankPayload({ orderedIds: "no" })).toBeNull();
  });
});

describe("validateRerankPermutation", () => {
  const cands = [{ id: "a" }, { id: "b" }];

  it("accepts a valid permutation", () => {
    expect(validateRerankPermutation(["b", "a"], cands)).toEqual(["b", "a"]);
  });

  it("rejects duplicates", () => {
    expect(validateRerankPermutation(["a", "a"], cands)).toBeNull();
  });

  it("rejects unknown ids", () => {
    expect(validateRerankPermutation(["a", "z"], cands)).toBeNull();
  });

  it("rejects missing ids", () => {
    expect(validateRerankPermutation(["a"], cands)).toBeNull();
  });

  it("rejects duplicate candidate ids in input list", () => {
    expect(validateRerankPermutation(["a", "b"], [{ id: "a" }, { id: "a" }])).toBeNull();
  });
});

describe("parseGeneratePayload", () => {
  it("parses valid suggestions", () => {
    const parsed = parseGeneratePayload({
      suggestions: [
        { name: "  The Matrix ", type: "movie", reason: " test " },
        { name: "Bad", type: "other" },
        { name: "Severance", type: "series" }
      ]
    });
    expect(parsed).toEqual([
      { name: "The Matrix", type: "movie", reason: "test" },
      { name: "Severance", type: "series", reason: undefined }
    ]);
  });

  it("returns null for bad shapes", () => {
    expect(parseGeneratePayload({ suggestions: "nope" })).toBeNull();
    expect(parseGeneratePayload(null)).toBeNull();
  });
});
