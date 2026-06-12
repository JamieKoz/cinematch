import { ApiGateError } from "./apiErrors";
import { fetchOpenAiCompletions } from "./aiFetch";
import { extractStreamingGenerateSuggestions } from "./aiJson";
import type { AiSuggestedTitle } from "./aiTypes";

const OPENAI_COMPLETIONS_URL = "/api/openai/chat/completions";

export interface StreamGenerateOptions {
  signal?: AbortSignal;
  maxSuggestions?: number;
}

export async function* readOpenAiSseContentDeltas(
  response: Response
): AsyncGenerator<string, void, void> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let pending = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      pending += decoder.decode(value, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        let parsed: unknown;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        const choices = (parsed as { choices?: Array<{ delta?: { content?: unknown } }> }).choices;
        const delta = choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          yield delta;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function streamGenerateSuggestionsWithAi(
  body: Record<string, unknown>,
  onSuggestion: (suggestion: AiSuggestedTitle) => void | Promise<void>,
  options: StreamGenerateOptions = {}
): Promise<number> {
  const response = await fetchOpenAiCompletions(
    OPENAI_COMPLETIONS_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, stream: true })
    },
    options.signal
  );

  if (!response.ok) {
    throw new Error(`OpenAI stream HTTP ${response.status}`);
  }

  let buffer = "";
  let emittedCount = 0;
  let delivered = 0;
  const seen = new Set<string>();

  try {
    for await (const delta of readOpenAiSseContentDeltas(response)) {
      if (options.signal?.aborted) break;
      buffer += delta;

      const extracted = extractStreamingGenerateSuggestions(buffer, emittedCount);
      emittedCount = extracted.emittedCount;

      for (const suggestion of extracted.suggestions) {
        const key = `${suggestion.name.toLowerCase()}::${suggestion.type}`;
        if (seen.has(key)) continue;
        seen.add(key);
        await onSuggestion(suggestion);
        delivered += 1;
        if (options.maxSuggestions !== undefined && delivered >= options.maxSuggestions) {
          return delivered;
        }
      }
    }
  } catch (error) {
    if (options.signal?.aborted) return delivered;
    throw error;
  }

  return delivered;
}

export function isStreamRecoverableError(error: unknown): boolean {
  if (error instanceof ApiGateError) return false;
  if (error instanceof DOMException && error.name === "AbortError") return false;
  return true;
}
