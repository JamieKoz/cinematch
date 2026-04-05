import type { Title } from "../types";

export function ShowdownDetailsModal({
  title,
  onClose
}: {
  title: Title;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-white/20 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">
            {title.name} ({title.releaseYear})
          </h3>
          <button
            className="rounded-full border border-white/25 bg-zinc-800/70 px-2 py-1 text-sm transition hover:bg-zinc-700/80"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-300">
          {title.type} {title.runtimeMinutes}m
          {typeof title.rating === "number" ? ` - ${title.rating.toFixed(1)}★` : ""}
        </p>
        <p className="mt-3 text-sm text-zinc-100">{title.overview}</p>
        <p className="mt-3 text-sm text-zinc-300">Genres: {title.genres.join(", ")}</p>
        {title.cast?.length ? <p className="mt-1 text-sm text-zinc-300">Cast: {title.cast.join(", ")}</p> : null}
      </div>
    </div>
  );
}
