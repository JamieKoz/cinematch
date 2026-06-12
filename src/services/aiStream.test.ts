import { describe, expect, it } from "vitest";
import { readOpenAiSseContentDeltas } from "./aiStream";

describe("readOpenAiSseContentDeltas", () => {
  it("yields content deltas from SSE chunks", async () => {
    const body = [
      'data: {"choices":[{"delta":{"content":"{\\"suggestions\\":["}}]}\n',
      "\n",
      'data: {"choices":[{"delta":{"content":"{\\"name\\":\\"Heat\\"}"}}]}\n',
      "\n",
      "data: [DONE]\n"
    ].join("");

    const response = new Response(body, {
      headers: { "content-type": "text/event-stream" }
    });

    const deltas: string[] = [];
    for await (const delta of readOpenAiSseContentDeltas(response)) {
      deltas.push(delta);
    }

    expect(deltas).toEqual(['{"suggestions":[', '{"name":"Heat"}']);
  });
});
