import { useEffect, useState } from "react";
import { tmdbPosterUrl } from "../services/tmdb";
import type { Title } from "../types";

interface GroupResultEntry {
  label: string;
  title?: Title;
}

export function GroupResultSection(props: {
  personalPicks: GroupResultEntry[];
  overlapTitles: Title[];
  myCompromisePick?: Title;
  partnerCompromisePick?: Title;
  partnerRequestedCompromise: boolean;
  sharedCompromise?: Title;
  compromiseMatched: boolean;
  whySharedPick?: string[];
  isTitleSaved: (titleId: string) => boolean;
  onToggleSaveTitle: (title: Title) => void;
  onReactTitle: (title: Title, reaction?: "up" | "down") => void;
  titleRatings: Record<string, "up" | "down" | undefined>;
  onStartCompromiseShowdown: () => void;
  onWatchNow: (title: Title) => void;
  onWatchTrailer: (title: Title) => void;
  onShowMore: (title: Title) => void;
  onStartAnotherRound: () => void;
}) {
  const {
    personalPicks,
    overlapTitles,
    myCompromisePick,
    partnerCompromisePick,
    partnerRequestedCompromise,
    sharedCompromise,
    compromiseMatched,
    whySharedPick,
    isTitleSaved,
    onToggleSaveTitle,
    onReactTitle,
    titleRatings,
    onStartCompromiseShowdown,
    onWatchNow,
    onWatchTrailer,
    onShowMore,
    onStartAnotherRound
  } = props;
  const myTitle = personalPicks[0]?.title;
  const partnerTitle = personalPicks[1]?.title;
  const picksDiffer = Boolean(myTitle && partnerTitle && myTitle.id !== partnerTitle.id);
  const hasOverlap = overlapTitles.length > 0;
  const canRunCompromise = overlapTitles.length >= 2;
  const waitingForPartnerCompromise = Boolean(myCompromisePick && !sharedCompromise && canRunCompromise);
  const shouldPromptCompromiseJoin = Boolean(
    partnerRequestedCompromise && !myCompromisePick && !sharedCompromise && canRunCompromise
  );
  const [showCompromiseInviteModal, setShowCompromiseInviteModal] = useState(false);
  const [dismissedCompromiseInvite, setDismissedCompromiseInvite] = useState(false);

  useEffect(() => {
    if (!shouldPromptCompromiseJoin) {
      setShowCompromiseInviteModal(false);
      setDismissedCompromiseInvite(false);
      return;
    }
    if (!dismissedCompromiseInvite) {
      setShowCompromiseInviteModal(true);
    }
  }, [shouldPromptCompromiseJoin, dismissedCompromiseInvite]);

  const overlapCopy = picksDiffer
    ? "Although you had different choices, you both liked:"
    : "You both liked:";

  return (
    <section className="rounded-3xl border border-white/20 p-5 shadow-2xl backdrop-blur-lg">
      <h2 className="text-xl font-semibold text-white">Tonight&apos;s result</h2>
      {sharedCompromise ? (
        <div className="mt-4 rounded-2xl border border-violet-300/35 bg-violet-950/25 p-4">
          <p className="text-sm font-medium text-violet-100">
            {compromiseMatched ? "You both landed on this pick" : "Shared compromise pick"}
          </p>
          <div className="mx-auto mt-3 block w-full max-w-[180px] overflow-hidden rounded-xl border border-white/15 bg-zinc-800/70 aspect-[2/3]">
            {tmdbPosterUrl(sharedCompromise.posterPath) ? (
              <img
                className="h-full w-full object-cover object-center"
                src={tmdbPosterUrl(sharedCompromise.posterPath)!}
                alt={`${sharedCompromise.name} poster`}
                draggable={false}
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-3xl font-semibold text-zinc-100">
                {sharedCompromise.name.slice(0, 1)}
              </span>
            )}
          </div>
          <p className="mt-3 text-center text-sm font-medium text-zinc-100">
            {sharedCompromise.name} ({sharedCompromise.releaseYear})
          </p>
          {whySharedPick?.length ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-violet-100">
              {whySharedPick.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 grid gap-2">
            <button
              className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-violet-900/35 transition hover:brightness-110 active:scale-95 active:brightness-95"
              onClick={() => onWatchNow(sharedCompromise)}
            >
              Watch now
            </button>
            <button
              className="rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800/75 active:scale-95"
              onClick={() => onWatchTrailer(sharedCompromise)}
            >
              Watch trailer
            </button>
            <button
              className="rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800/75 active:scale-95"
              onClick={() => onShowMore(sharedCompromise)}
            >
              Show more
            </button>
            <button
              className="rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800/75 active:scale-95"
              onClick={() => onToggleSaveTitle(sharedCompromise)}
            >
              {isTitleSaved(sharedCompromise.id) ? "Saved in watchlist" : "Save for later"}
            </button>
            <SeenReactionButton
              title={sharedCompromise}
              existingReaction={titleRatings[sharedCompromise.id]}
              onReact={onReactTitle}
            />
          </div>
          {(myCompromisePick || partnerCompromisePick) && !compromiseMatched ? (
            <p className="mt-3 text-xs text-zinc-300">
              Your compromise suggestion: {myCompromisePick?.name ?? "—"} | Partner suggestion:{" "}
              {partnerCompromisePick?.name ?? "—"}
            </p>
          ) : null}
        </div>
      ) : hasOverlap ? (
        <div className="mt-4 rounded-2xl border border-violet-300/35 bg-violet-950/25 p-4">
          <p className="text-sm font-medium text-violet-100">{overlapCopy}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {overlapTitles.slice(0, 6).map((title) => (
              <PosterThumb key={title.id} title={title} size="large" />
            ))}
          </div>
          {canRunCompromise ? (
            <button
              className="mt-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-violet-900/35 transition hover:brightness-110 active:scale-95 active:brightness-95"
              onClick={() => {
                setShowCompromiseInviteModal(false);
                setDismissedCompromiseInvite(false);
                onStartCompromiseShowdown();
              }}
            >
              {shouldPromptCompromiseJoin ? "Partner wants to decide now" : "Decide together"}
            </button>
          ) : null}
          {waitingForPartnerCompromise ? (
            <p className="mt-3 text-xs text-zinc-300">
              You picked <span className="text-zinc-100">{myCompromisePick?.name ?? "—"}</span>. Waiting for your partner
              to finish decide together.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/15 bg-zinc-900/45 p-4">
          <p className="text-sm font-medium text-zinc-100">No match this round</p>
          <p className="mt-2 text-sm text-zinc-300">No overlap yet, but here&apos;s what each of you leaned toward.</p>
        </div>
      )}

      {(hasOverlap || sharedCompromise) ? (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-zinc-400">What each of you leaned toward</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {personalPicks.map((entry) => (
              <article key={entry.label} className="rounded-xl border border-white/15 bg-zinc-900/45 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-400">{entry.label}</p>
                {entry.title ? (
                  <div className="mt-3 flex items-center flex-col justify-center gap-3">
                    <div className="h-32 w-24 overflow-hidden rounded-lg border border-white/20 bg-zinc-900/60">
                      {tmdbPosterUrl(entry.title.posterPath) ? (
                        <img
                          src={tmdbPosterUrl(entry.title.posterPath)!}
                          alt={`${entry.title.name} poster`}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-sm font-semibold text-zinc-100">
                          {entry.title.name.slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                      <p className="truncate text-base font-medium text-zinc-100">
                        {entry.title.name} ({entry.title.releaseYear})
                      </p>
                      <button
                        className="mt-2 rounded-full border border-white/25 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-100 transition hover:bg-zinc-800/75 active:scale-95"
                        onClick={() => onShowMore(entry.title!)}
                      >
                        Show more
                      </button>
                      <button
                        className="mt-2 rounded-full border border-white/25 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-100 transition hover:bg-zinc-800/75 active:scale-95"
                        onClick={() => onWatchTrailer(entry.title!)}
                      >
                        Watch trailer
                      </button>
                      <SeenReactionButton
                        title={entry.title}
                        existingReaction={titleRatings[entry.title.id]}
                        onReact={onReactTitle}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-400">No final pick available.</p>
                )}
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {personalPicks.map((entry) => (
            <article key={entry.label} className="rounded-2xl border border-white/15 bg-zinc-900/45 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">{entry.label}</p>
              {entry.title ? (
                <>
                  <div className="mx-auto mt-3 block w-full max-w-[170px] overflow-hidden rounded-xl border border-white/15 bg-zinc-800/70 aspect-[2/3]">
                    {tmdbPosterUrl(entry.title.posterPath) ? (
                      <img
                        className="h-full w-full object-cover object-center"
                        src={tmdbPosterUrl(entry.title.posterPath)!}
                        alt={`${entry.title.name} poster`}
                        draggable={false}
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-3xl font-semibold text-zinc-100">
                        {entry.title.name.slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-center text-sm font-medium text-zinc-100">
                    {entry.title.name} ({entry.title.releaseYear})
                  </p>
                  <div className="mt-3 grid gap-2">
                    <button
                      className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-violet-900/35 transition hover:brightness-110 active:scale-95 active:brightness-95"
                      onClick={() => onWatchNow(entry.title!)}
                    >
                      Watch now
                    </button>
                    <button
                      className="rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800/75 active:scale-95"
                      onClick={() => onWatchTrailer(entry.title!)}
                    >
                      Watch trailer
                    </button>
                    <button
                      className="rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800/75 active:scale-95"
                      onClick={() => onShowMore(entry.title!)}
                    >
                      Show more
                    </button>
                    <button
                      className="rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800/75 active:scale-95"
                      onClick={() => onToggleSaveTitle(entry.title!)}
                    >
                      {isTitleSaved(entry.title!.id) ? "Saved in watchlist" : "Save for later"}
                    </button>
                    <SeenReactionButton
                      title={entry.title}
                      existingReaction={titleRatings[entry.title.id]}
                      onReact={onReactTitle}
                    />
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">No final pick available.</p>
              )}
            </article>
          ))}
        </div>
      )}

      <button
        className="mt-5 rounded-full border border-white/30 bg-zinc-900/60 px-4 py-2 text-sm transition hover:border-white/50 hover:bg-zinc-800/75 active:scale-95"
        onClick={onStartAnotherRound}
      >
        Start another round
      </button>

      {showCompromiseInviteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur">
            <h3 className="text-lg font-semibold text-white">Partner wants to decide together</h3>
            <p className="mt-2 text-sm text-zinc-300">
              They started a compromise showdown from your shared likes. Want to join now?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-violet-900/35 transition hover:brightness-110 active:scale-95 active:brightness-95"
                onClick={() => {
                  setShowCompromiseInviteModal(false);
                  setDismissedCompromiseInvite(false);
                  onStartCompromiseShowdown();
                }}
              >
                Join now
              </button>
              <button
                className="rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800/75 active:scale-95"
                onClick={() => {
                  setShowCompromiseInviteModal(false);
                  setDismissedCompromiseInvite(true);
                }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SeenReactionButton({
  title,
  existingReaction,
  onReact
}: {
  title: Title;
  existingReaction?: "up" | "down";
  onReact: (title: Title, reaction?: "up" | "down") => void;
}) {
  const [open, setOpen] = useState(false);

  if (existingReaction && !open) {
    return (
      <button
        className="rounded-full border border-violet-300/40 bg-violet-800/30 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-violet-800/45 active:scale-95"
        onClick={() => setOpen(true)}
      >
        Reacted {existingReaction === "up" ? "👍" : "👎"}
      </button>
    );
  }

  if (!open) {
    return (
      <button
        className="rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800/75 active:scale-95"
        onClick={() => setOpen(true)}
      >
        Rate it
      </button>
    );
  }

  return (
    <div className="seen-overlay-pop flex items-center gap-2 rounded-full border border-white/15 bg-zinc-900/60 px-3 py-1.5">
      <button
        className="grid h-7 w-7 place-items-center rounded-full border border-emerald-300/55 bg-emerald-900/40 text-sm text-emerald-100 transition hover:bg-emerald-800/60 active:scale-90"
        onClick={() => {
          onReact(title, existingReaction === "up" ? undefined : "up");
          setOpen(false);
        }}
        aria-label="Liked this film"
      >
        👍
      </button>
      <button
        className="grid h-7 w-7 place-items-center rounded-full border border-rose-300/55 bg-rose-900/40 text-sm text-rose-100 transition hover:bg-rose-800/60 active:scale-90"
        onClick={() => {
          onReact(title, existingReaction === "down" ? undefined : "down");
          setOpen(false);
        }}
        aria-label="Did not like this film"
      >
        👎
      </button>
    </div>
  );
}

function PosterThumb({ title, size = "small" }: { title: Title; size?: "small" | "large" }) {
  const poster = tmdbPosterUrl(title.posterPath);
  return (
    <div
      className={
        size === "large"
          ? "h-24 w-16 overflow-hidden rounded-lg border border-white/20 bg-zinc-900/60"
          : "h-14 w-10 overflow-hidden rounded-md border border-white/20 bg-zinc-900/60"
      }
      title={title.name}
    >
      {poster ? (
        <img src={poster} alt={`${title.name} poster`} className="h-full w-full object-cover object-center" />
      ) : (
        <span className="grid h-full w-full place-items-center text-sm font-semibold text-zinc-100">
          {title.name.slice(0, 1)}
        </span>
      )}
    </div>
  );
}
