import { tmdbPosterUrl } from "../services/tmdb";
import type { GroupHistoryEntry, SavedPickEntry, SoloHistoryEntry, WatchedTitleEntry } from "../services/storage";
import type { Title } from "../types";

function titleName(title?: Title): string {
  if (!title) return "None yet";
  return `${title.name} (${title.releaseYear})`;
}

export function LibraryPanel({
  saved,
  watched,
  history,
  soloHistory,
  onOpenTitle,
  onToggleSave,
  onSetSeenReaction,
  mode = "library"
}: {
  saved: SavedPickEntry[];
  watched: WatchedTitleEntry[];
  history: GroupHistoryEntry[];
  soloHistory: SoloHistoryEntry[];
  onOpenTitle: (title: Title) => void;
  onToggleSave: (title: Title) => void;
  onSetSeenReaction: (titleId: string, reaction?: "up" | "down") => void;
  mode?: "library" | "history";
}) {
  if (mode === "history") {
    return (
      <section className="profile-panel-enter rounded-2xl bg-zinc-900/35 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-100">Timeline</h3>
          <span className="rounded-full border border-white/15 bg-zinc-900/60 px-2 py-0.5 text-[11px] text-zinc-300">
            {soloHistory.length + history.length} entries
          </span>
        </div>
        <div className="space-y-3">
          {soloHistory.length === 0 && history.length === 0 ? (
            <p className="text-xs text-zinc-400">
              Your session results will appear here after each round. The more you use Sententia, the better your
              suggestions become.
            </p>
          ) : null}
          {soloHistory.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-white/15 bg-zinc-950/45 px-3 py-2.5 text-sm transition hover:border-white/25 hover:bg-zinc-950/60">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Solo pick</p>
              <button className="mt-1 text-left text-zinc-100 hover:underline active:opacity-70 transition-opacity" onClick={() => onOpenTitle(entry.winner)}>
                {titleName(entry.winner)}
              </button>
              <p className="mt-1 text-xs text-zinc-400">{new Date(entry.recordedAt).toLocaleString()}</p>
            </article>
          ))}
          {history.map((entry) => (
            <article key={entry.roomCode} className="rounded-xl border border-white/15 bg-zinc-950/45 px-3 py-2.5 text-sm text-zinc-300 transition hover:border-white/25 hover:bg-zinc-950/60">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Room {entry.roomCode}</p>
              <p>You: {titleName(entry.myPick)}</p>
              {entry.partnerPick ? <p>Partner: {titleName(entry.partnerPick)}</p> : null}
              {entry.sharedCompromise ? <p>Shared: {titleName(entry.sharedCompromise)}</p> : null}
            </article>
          ))}
        </div>
      </section>
    );
  }

  const STAGGER = ["", "poster-tile-enter-d1", "poster-tile-enter-d2", "poster-tile-enter-d3", "poster-tile-enter-d4", "poster-tile-enter-d5", "poster-tile-enter-d6"] as const;
  const stagger = (i: number) => STAGGER[Math.min(i, STAGGER.length - 1)];

  return (
    <section className="profile-panel-enter rounded-2xl bg-zinc-900/35 p-4">
      <div className="rounded-2xl border border-white/10 bg-zinc-950/35 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-100">Saved picks</h3>
          <span className="rounded-full border border-white/15 bg-zinc-900/60 px-2 py-0.5 text-[11px] text-zinc-300">
            {saved.length}
          </span>
        </div>
        {saved.length === 0 ? <p className="mt-2 text-xs text-zinc-400">Save titles from results to build your watchlist.</p> : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((entry, i) => (
            <PosterTile
              key={entry.title.id}
              title={entry.title}
              actionLabel="Remove"
              onAction={() => onToggleSave(entry.title)}
              onOpenTitle={onOpenTitle}
              enterClass={stagger(i)}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/35 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-100">Reactions</h3>
          <span className="rounded-full border border-white/15 bg-zinc-900/60 px-2 py-0.5 text-[11px] text-zinc-300">
            {watched.length}
          </span>
        </div>
        {watched.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-400">
            Use thumbs up/down from results to track what you liked and disliked.
          </p>
        ) : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {watched.map((entry, i) => (
            <PosterTile
              key={entry.title.id}
              title={entry.title}
              onOpenTitle={onOpenTitle}
              reaction={entry.reaction}
              onSetReaction={(reaction) => onSetSeenReaction(entry.title.id, reaction)}
              enterClass={stagger(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PosterTile({
  title,
  onOpenTitle,
  actionLabel,
  onAction,
  reaction,
  onSetReaction,
  enterClass = ""
}: {
  title: Title;
  onOpenTitle: (title: Title) => void;
  actionLabel?: string;
  onAction?: () => void;
  reaction?: "up" | "down";
  onSetReaction?: (reaction?: "up" | "down") => void;
  enterClass?: string;
}) {
  const poster = tmdbPosterUrl(title.posterPath, "w342");
  return (
    <article className={`poster-tile-enter poster-tile-hover ${enterClass} rounded-xl border border-white/15 bg-zinc-950/55 p-3`}>
      <button className="block w-full text-left active:opacity-75 transition-opacity" onClick={() => onOpenTitle(title)}>
        <div className="mx-auto h-40 w-28 overflow-hidden rounded-lg border border-white/10 bg-zinc-900/50 sm:h-44 sm:w-28">
          {poster ? (
            <img src={poster} alt={`${title.name} poster`} className="h-full w-full object-cover object-center" />
          ) : (
            <span className="grid h-full w-full place-items-center text-2xl font-semibold text-zinc-200">
              {title.name.slice(0, 1)}
            </span>
          )}
        </div>
        <p className="mt-2 truncate text-sm font-medium text-zinc-100">
          {title.name} ({title.releaseYear})
        </p>
      </button>
      {onSetReaction ? (
        <div className="mt-2 flex items-center gap-2">
          <button
            className={`grid h-7 w-7 place-items-center rounded-full border text-sm transition active:scale-90 ${
              reaction === "up"
                ? "border-emerald-300/80 bg-emerald-700/50 text-emerald-100 scale-110"
                : "border-emerald-300/55 bg-emerald-900/35 text-emerald-100 hover:bg-emerald-800/60 hover:scale-105"
            }`}
            onClick={() => onSetReaction(reaction === "up" ? undefined : "up")}
            aria-label="Thumbs up"
            aria-pressed={reaction === "up"}
          >
            👍
          </button>
          <button
            className={`grid h-7 w-7 place-items-center rounded-full border text-sm transition active:scale-90 ${
              reaction === "down"
                ? "border-rose-300/80 bg-rose-700/50 text-rose-100 scale-110"
                : "border-rose-300/55 bg-rose-900/35 text-rose-100 hover:bg-rose-800/60 hover:scale-105"
            }`}
            onClick={() => onSetReaction(reaction === "down" ? undefined : "down")}
            aria-label="Thumbs down"
            aria-pressed={reaction === "down"}
          >
            👎
          </button>
        </div>
      ) : null}
      {actionLabel && onAction ? (
        <button
          className="mt-2 w-full rounded-full border border-white/20 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-800/70 active:scale-95"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}
