import { trackEvent } from "./analytics";

/** Amazon Associates tag (set `VITE_AMAZON_ASSOCIATE_TAG` at build time, e.g. `yourtag-20`). */
export const AMAZON_TAG = (import.meta.env.VITE_AMAZON_ASSOCIATE_TAG ?? "").trim();

export type WatchDestination = "amazon" | "justwatch";

export interface WatchLinkTitle {
  name: string;
  releaseYear: number;
  providers: string[];
}

export function watchDestination(title: WatchLinkTitle): WatchDestination {
  if (title.providers.includes("prime") && AMAZON_TAG.length > 0) return "amazon";
  return "justwatch";
}

export function buildWatchUrl(title: WatchLinkTitle): string {
  const query = encodeURIComponent(`${title.name} ${title.releaseYear}`);

  if (watchDestination(title) === "amazon") {
    return `https://www.amazon.com/s?k=${query}&i=instant-video&tag=${encodeURIComponent(AMAZON_TAG)}`;
  }

  return `https://www.justwatch.com/us/search?q=${query}`;
}

export function trackWatchClick(title: WatchLinkTitle, destination: WatchDestination): void {
  trackEvent("watch_now_click", {
    destination,
    has_prime: title.providers.includes("prime"),
    provider: title.providers[0] ?? "unknown",
    title: title.name,
    year: title.releaseYear
  });
}

export function openWatchUrl(title: WatchLinkTitle): void {
  const destination = watchDestination(title);
  const url = buildWatchUrl(title);
  trackWatchClick(title, destination);
  window.open(url, "_blank", "noopener,noreferrer");
}
