import { parseTmdbCatalogId } from "./tmdbWatchProviders";
import type { Title } from "../types";

export function titleShareUrl(title: Title): string | undefined {
  const parsed = parseTmdbCatalogId(title.id);
  if (!parsed) return undefined;
  const segment = parsed.mediaType === "movie" ? "movie" : "tv";
  return `https://www.themoviedb.org/${segment}/${parsed.tmdbId}`;
}

export function buildTitleSharePayload(title: Title): ShareData {
  const shareText = `${title.name} (${title.releaseYear})`;
  const url = titleShareUrl(title);
  return {
    title: "Sententia pick",
    text: `Check out this pick: ${shareText}`,
    ...(url ? { url } : {})
  };
}

export function isShareCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
