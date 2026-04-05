import { TitleCard } from "./TitleCard";
import type { Title } from "../types";

export function SwipeSection(props: {
  currentTitle: Title;
  nextSwipeTitle?: Title;
  deckCursor: number;
  deckLength: number;
  shortlistLength: number;
  isDraggingCard: boolean;
  swipeDeltaX: number;
  passOverlayOpacity: number;
  keepOverlayOpacity: number;
  canUndo: boolean;
  shareFeedback: string | null;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPass: () => void;
  onKeep: () => void;
  onUndo: () => void;
  onShare: () => void;
}) {
  const {
    currentTitle,
    nextSwipeTitle,
    deckCursor,
    deckLength,
    shortlistLength,
    isDraggingCard,
    swipeDeltaX,
    passOverlayOpacity,
    keepOverlayOpacity,
    canUndo,
    shareFeedback,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPass,
    onKeep,
    onUndo,
    onShare
  } = props;

  return (
    <section>
      <div className="">
        <p className="mt-2 text-sm text-zinc-300">
          Card {deckCursor + 1} / {deckLength} - Shortlist: {shortlistLength}
        </p>
      </div>

      <div className="relative mt-3">
        {nextSwipeTitle ? (
          <div className="pointer-events-none absolute inset-0 z-0 translate-y-2 scale-[0.97] opacity-25">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/25 p-2 sm:p-4 shadow-xl backdrop-blur-xl">
              <TitleCard title={nextSwipeTitle} noTopMargin compactMobile truncateOverview />
            </div>
          </div>
        ) : null}

        <div
          className={
            isDraggingCard
              ? "relative z-10 overflow-hidden rounded-3xl border border-white/20 bg-zinc-900/20 p-2 sm:p-4 shadow-2xl backdrop-blur-xl touch-pan-y select-none transition-none"
              : "relative z-10 overflow-hidden rounded-3xl border border-white/20 bg-zinc-900/20 p-2 sm:p-4 shadow-2xl backdrop-blur-xl touch-pan-y select-none transition-transform duration-200 ease-out"
          }
          style={{
            transform: `translateX(${swipeDeltaX}px) rotate(${swipeDeltaX * 0.06}deg)`
          }}
          onDragStart={(event) => event.preventDefault()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-rose-300/20 transition-opacity"
            style={{ opacity: passOverlayOpacity * 0.75 }}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-emerald-300/20 transition-opacity"
            style={{ opacity: keepOverlayOpacity * 0.75 }}
          />

          <div className="relative">
            <div
              className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border-2 border-rose-300/80 bg-rose-950/40 px-3 py-1 text-xs font-bold tracking-wider text-rose-200"
              style={{ opacity: passOverlayOpacity }}
            >
              NOPE
            </div>
            <div
              className="pointer-events-none absolute right-4 top-4 z-10 rounded-lg border-2 border-emerald-300/80 bg-emerald-950/40 px-3 py-1 text-xs font-bold tracking-wider text-emerald-200"
              style={{ opacity: keepOverlayOpacity }}
            >
              LIKE
            </div>
            <div className="">
              <TitleCard title={currentTitle} noTopMargin compactMobile truncateOverview />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-2xl p-1 sm:mt-4 sm:gap-3 sm:p-2">
        <button
          aria-label="Undo"
          className="justify-self-start grid h-11 w-11 sm:h-14 sm:w-14 place-items-center rounded-full border border-white/35 bg-zinc-900/45 text-lg sm:text-xl text-zinc-100 transition-colors hover:bg-zinc-800/60 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onUndo}
          disabled={!canUndo}
        >
          ↺
        </button>
        <div className="flex items-center justify-center gap-4 sm:gap-10">
          <button
            aria-label="Pass"
            className="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full border-2 border-rose-300/60 bg-rose-900/35 text-3xl sm:text-4xl text-rose-200 transition-colors hover:bg-rose-800/55"
            onClick={onPass}
          >
            ✕
          </button>
          <button
            aria-label="Keep"
            className="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full border-2 border-emerald-300/70 bg-emerald-900/45 text-3xl sm:text-4xl text-emerald-200 transition-colors hover:bg-emerald-800/60"
            onClick={onKeep}
          >
            ♥
          </button>
        </div>
        <button
          aria-label="Share"
          className="justify-self-end grid h-11 w-11 sm:h-14 sm:w-14 place-items-center rounded-full border border-white/35 bg-zinc-900/45 text-lg sm:text-xl text-zinc-100 transition-colors hover:bg-zinc-800/60"
          onClick={onShare}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            style={{ display: "block", opacity: 0.92 }}
          >
            <path
              fill="#fff"
              d="M14 3l7 7-7 7v-4.1c-5.2 0-8.8 1.7-11 5.1.6-6 3.9-10 11-10.9V3z"
            />
          </svg>
        </button>
      </div>
      {shareFeedback ? <p className="mt-1 text-center text-xs text-zinc-300">{shareFeedback}</p> : null}
    </section>
  );
}
