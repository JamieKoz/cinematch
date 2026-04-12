import type { AiSuggestedTitle } from "./aiTypes";

export function safeParseJson(content: string): unknown | null {
  const stripped = stripCodeFence(content.trim());
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function stripCodeFence(raw: string): string {
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(raw);
  return fence ? fence[1].trim() : raw;
}

export function parseRerankPayload(parsed: unknown): { orderedIds: string[] } | null {
  if (!parsed || typeof parsed !== "object") return null;
  const orderedIds = (parsed as { orderedIds?: unknown }).orderedIds;
  if (!Array.isArray(orderedIds)) return null;
  const ids: string[] = [];
  for (const entry of orderedIds) {
    if (typeof entry === "string" && entry.trim()) ids.push(entry.trim());
  }
  return { orderedIds: ids };
}

export function validateRerankPermutation(orderedIds: string[], candidates: { id: string }[]): string[] | null {
  const universe = new Set(candidates.map((c) => c.id));
  if (universe.size !== candidates.length) return null;

  const seen = new Set<string>();
  for (const id of orderedIds) {
    if (!universe.has(id) || seen.has(id)) return null;
    seen.add(id);
  }
  if (seen.size !== universe.size || orderedIds.length !== universe.size) return null;
  return orderedIds;
}

export function parseGeneratePayload(parsed: unknown): AiSuggestedTitle[] | null {
  if (!parsed || typeof parsed !== "object") return null;
  const raw = (parsed as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(raw)) return null;

  const out: AiSuggestedTitle[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const typeRaw = rec.type;
    const type = typeRaw === "series" ? "series" : typeRaw === "movie" ? "movie" : undefined;
    const reason = typeof rec.reason === "string" ? rec.reason.trim() : undefined;
    if (!name || !type) continue;
    out.push({ name, type, reason: reason || undefined });
  }
  return out;
}
