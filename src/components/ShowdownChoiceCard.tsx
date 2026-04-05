import { tmdbPosterUrl } from "../services/tmdb";
import type { Title } from "../types";

export function ShowdownChoiceCard({
  title,
  onPick,
  onShowMore
}: {
  title: Title;
  onPick: () => void;
  onShowMore: () => void;
}) {
  const poster = tmdbPosterUrl(title.posterPath);
  return (
    <div className="rounded-2xl p-2 sm:p-3">
      <button
        className="mx-auto block w-full max-w-[140px] sm:max-w-[170px] overflow-hidden rounded-xl border border-transparent bg-zinc-800/70 aspect-[2/3] transition hover:border-emerald-300/70 hover:shadow-lg hover:shadow-emerald-900/35"
        onClick={onPick}
        aria-label={`Pick ${title.name}`}
      >
        {poster ? (
          <img className="h-full w-full object-cover object-center" src={poster} alt={`${title.name} poster`} draggable={false} />
        ) : (
          <span className="grid h-full w-full place-items-center text-3xl font-semibold">{title.name.slice(0, 1)}</span>
        )}
      </button>
      <p className="mt-2 line-clamp-2 text-center text-sm font-medium text-zinc-100">
        {title.name} ({title.releaseYear})
      </p>
      <div className="mt-2 grid gap-2">
        <button
          className="rounded-full border border-emerald-300/65 bg-emerald-900/35 px-3 py-1.5 text-xs text-emerald-200 transition hover:bg-emerald-800/55"
          onClick={onPick}
        >
          Pick this
        </button>
        <button
          className="rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800/75"
          onClick={onShowMore}
        >
          Show more
        </button>
      </div>
    </div>
  );
}
