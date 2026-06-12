import { describe, expect, it } from "vitest";
import {
  extractMessageTextContent,
  extractStreamingGenerateSuggestions,
  normalizeImdbId,
  parseGeneratePayload,
  parseOptionalPositiveInt,
  parseRerankPayload,
  safeParseJson,
  validateRerankPermutation
} from "./aiJson";

describe("extractMessageTextContent", () => {
  it("accepts plain string content", () => {
    expect(extractMessageTextContent('  {"a":1}  ')).toBe('{"a":1}');
  });

  it("joins OpenAI-style content parts", () => {
    expect(
      extractMessageTextContent([{ type: "text", text: '{"suggestions":' }, { type: "text", text: '[]}' }])
    ).toBe('{"suggestions":[]}');
  });

  it("returns null for empty or unknown shapes", () => {
    expect(extractMessageTextContent("")).toBeNull();
    expect(extractMessageTextContent(null)).toBeNull();
    expect(extractMessageTextContent([{ type: "image_url" }])).toBeNull();
  });
});

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

describe("parseOptionalPositiveInt", () => {
  it("accepts positive integers and rejects invalid values", () => {
    expect(parseOptionalPositiveInt(155)).toBe(155);
    expect(parseOptionalPositiveInt("27205")).toBe(27205);
    expect(parseOptionalPositiveInt(0)).toBeUndefined();
    expect(parseOptionalPositiveInt("nope")).toBeUndefined();
  });
});

describe("normalizeImdbId", () => {
  it("normalizes tt-prefixed and numeric ids", () => {
    expect(normalizeImdbId("tt0468569")).toBe("tt0468569");
    expect(normalizeImdbId(468569)).toBe("tt0468569");
  });
});

describe("extractStreamingGenerateSuggestions", () => {
  it("extracts complete suggestion objects from partial JSON", () => {
    const chunks = [
      '{"suggestions":[{"name":"Inception","type":"movie","tmdb_id":27205,"imdb_id":"tt1375666","reason":"Mind-bending"},',
      '{"name":"Heat","type":"movie","tmdb_id":949,"imdb_id":"tt0113277","reason":"Crime classic"}]}'
    ];
    let buffer = "";
    let emitted = 0;
    const collected: string[] = [];

    for (const chunk of chunks) {
      buffer += chunk;
      const extracted = extractStreamingGenerateSuggestions(buffer, emitted);
      emitted = extracted.emittedCount;
      collected.push(...extracted.suggestions.map((item) => item.name));
    }

    expect(collected).toEqual(["Inception", "Heat"]);
  });
});

describe("parseGeneratePayload", () => {
  it("parses valid suggestions", () => {
    const parsed = parseGeneratePayload({
      suggestions: [
        { name: "  The Matrix ", type: "movie", tmdb_id: 603, imdb_id: "tt0133093", reason: " test " },
        { name: "Bad", type: "other" },
        { name: "Severance", type: "series", imdb_Id: 13623632 }
      ]
    });
    expect(parsed).toEqual([
      { name: "The Matrix", type: "movie", tmdb_id: 603, imdb_id: "tt0133093", reason: "test" },
      { name: "Severance", type: "series", imdb_id: "tt13623632", reason: undefined }
    ]);
  });

  it("returns null for bad shapes", () => {
    expect(parseGeneratePayload({ suggestions: "nope" })).toBeNull();
    expect(parseGeneratePayload(null)).toBeNull();
  });
});
