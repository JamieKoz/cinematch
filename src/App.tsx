import { useEffect, useMemo, useRef, useState } from "react";
import { MOCK_TITLES } from "./data/mockTitles";
import { applyDecisionSignal, applyKeepSignal, applyPassSignal, createDefaultProfile } from "./engine/profile";
import { rankTitles } from "./engine/scoring";
import { generateSuggestionsWithAi, rerankCandidatesWithAi } from "./services/ai";
import { loadLastAnswers, loadProfile, resetPersonalization, saveLastAnswers, saveProfile } from "./services/storage";
import { enrichTitlesWithTmdb, tmdbPosterUrl } from "./services/tmdb";
import { buildDeck, createInitialAnswers, createSession, nextPair } from "./state/machine";
import type { OnboardingAnswers, SessionState, Title } from "./types";

const MOOD_OPTIONS = ["light", "intense", "emotional", "mind-bending"];
const PROVIDER_OPTIONS = ["netflix", "prime", "hulu", "max", "apple", "disney"];
const LANGUAGE_OPTIONS = ["any", "en", "es", "fr", "ko", "ja"];
const EXCLUSION_OPTIONS = ["horror", "crime", "romance", "drama", "action", "thriller", "comedy"];
const RELEASE_WINDOW_OPTIONS = ["any", "2020s", "2010s", "2000s", "pre-2000"] as const;
const FAMILIARITY_OPTIONS = ["any", "popular", "hidden-gems"] as const;

type QuickPreset = {
  id: string;
  label: string;
  description: string;
  values: Partial<OnboardingAnswers>;
};

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: "easy-light",
    label: "Easy & light",
    description: "Low effort, short, feel-good choices.",
    values: { mood: "light", preferredType: "either", runtime: "short", familiarity: "popular" }
  },
  {
    id: "something-deep",
    label: "Something deep",
    description: "Richer stories with emotional pull.",
    values: { mood: "emotional", preferredType: "movie", runtime: "standard", releaseWindow: "2010s" }
  },
  {
    id: "high-intensity",
    label: "High intensity",
    description: "Fast pace, tension, and momentum.",
    values: { mood: "intense", preferredType: "either", runtime: "standard", familiarity: "popular" }
  },
  {
    id: "binge-mode",
    label: "Binge mode",
    description: "Series-first setup for longer sessions.",
    values: { preferredType: "series", runtime: "any" }
  }
];

export function App() {
  const [profile, setProfile] = useState(() => {
    if (typeof window === "undefined") return createDefaultProfile();
    return loadProfile();
  });

  const [session, setSession] = useState<SessionState>(() => {
    const seed = typeof window === "undefined" ? {} : loadLastAnswers();
    return createSession(createInitialAnswers(seed));
  });

  const [isBuildingDeck, setIsBuildingDeck] = useState(false);
  const [roundMessage, setRoundMessage] = useState<string>("");
  const [catalog, setCatalog] = useState<Title[]>(MOCK_TITLES);
  const [swipeDeltaX, setSwipeDeltaX] = useState(0);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const swipeStartXRef = useRef<number | null>(null);
  const SWIPE_TRIGGER_PX = 110;

  const titlesById = useMemo(() => {
    return new Map(catalog.map((title) => [title.id, title]));
  }, [catalog]);

  const currentTitle = session.phase === "swipe" ? titlesById.get(session.deck[session.deckCursor]) : undefined;
  const showdownPair = session.phase === "showdown" ? nextPair(session.showdownQueue) : null;
  const showdownLeft = showdownPair ? titlesById.get(showdownPair[0]) : undefined;
  const showdownRight = showdownPair ? titlesById.get(showdownPair[1]) : undefined;
  const winner = session.winnerId ? titlesById.get(session.winnerId) : undefined;
  const backup = session.backupId ? titlesById.get(session.backupId) : undefined;
  const hasSelectedQuickMode = Boolean(session.answers.quickModeId);
  const selectedQuickPreset = QUICK_PRESETS.find((preset) => preset.id === session.answers.quickModeId);
  const passOverlayOpacity = Math.min(1, Math.max(0, -swipeDeltaX / SWIPE_TRIGGER_PX));
  const keepOverlayOpacity = Math.min(1, Math.max(0, swipeDeltaX / SWIPE_TRIGGER_PX));

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.querySelector('script[src="https://tenor.com/embed.js"]')) return;

    const script = document.createElement("script");
    script.src = "https://tenor.com/embed.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    setSwipeDeltaX(0);
    setIsDraggingCard(false);
    swipeStartXRef.current = null;
  }, [currentTitle?.id]);

  async function startSwipeRound() {
    setIsBuildingDeck(true);
    setRoundMessage("");
    saveLastAnswers({ ...session.answers, quickModeId: undefined });

    const aiEnabled = Boolean(import.meta.env.VITE_OPENAI_API_KEY);
    const tmdbEnabled = Boolean(import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN);
    let deckTitles: Title[] = [];

    if (aiEnabled) {
      const generated = await generateSuggestionsWithAi({
        answers: session.answers,
        profile,
        count: 10
      });

      if (generated.length > 0) {
        const generatedTitles: Title[] = generated.map((item, index) => ({
          id: `ai-${index}-${slugify(item.name)}`,
          name: item.name,
          type: item.type,
          runtimeMinutes: item.type === "series" ? 45 : 110,
          genres: [],
          moods: session.answers.mood ? [session.answers.mood] : [],
          language: session.answers.language && session.answers.language !== "any" ? session.answers.language : "en",
          providers: [...(session.answers.providers ?? [])],
          popularity: 0.6,
          releaseYear: new Date().getFullYear(),
          posterPath: null,
          overview: item.reason ?? "AI-picked for your current mood."
        }));

        deckTitles = tmdbEnabled ? await enrichTitlesWithTmdb(generatedTitles) : generatedTitles;
      }
    }

    if (deckTitles.length === 0) {
      const sorted = rankTitles(catalog, session.answers, session.answers.usePersonalization ? profile : createDefaultProfile());
      const top20 = sorted.slice(0, 20);
      const reranked = await rerankCandidatesWithAi({ answers: session.answers, profile, candidates: top20 });
      const baseDeckTitles = (reranked.length ? reranked : top20).slice(0, 10);
      deckTitles = tmdbEnabled ? await enrichTitlesWithTmdb(baseDeckTitles) : baseDeckTitles;
    }

    if (deckTitles.length > 0) setCatalog((prev) => mergeCatalog(prev, deckTitles));

    const ids = deckTitles.map((title) => title.id);
    const fallback = buildDeck(catalog, session.answers, profile);
    const deck = ids.length ? ids : fallback;
    const mode = aiEnabled ? "AI suggestions" : "local ranking";
    setRoundMessage(`Prepared ${deck.length} picks via ${mode}${tmdbEnabled ? " + TMDB enrichment" : ""}.`);

    setSession((prev) => ({
      ...prev,
      phase: "swipe",
      deck,
      deckCursor: 0,
      shortlist: [],
      passed: [],
      showdownQueue: [],
      winnerId: undefined,
      backupId: undefined
    }));
    setIsBuildingDeck(false);
  }

  function updateAnswers(next: Partial<OnboardingAnswers>) {
    setSession((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        ...next
      }
    }));
  }

  function selectQuickMode(preset: QuickPreset) {
    const smartDefaults = deriveSmartDefaultsFromProfile(profile);
    updateAnswers({
      ...smartDefaults,
      ...preset.values,
      quickModeId: preset.id
    });
  }

  function resetQuickSetup(): void {
    const smartDefaults = deriveSmartDefaultsFromProfile(profile);
    updateAnswers({
      ...smartDefaults,
      quickModeId: undefined
    });
  }

  function toggleProvider(provider: string) {
    const selected = session.answers.providers?.includes(provider);
    updateAnswers({
      providers: selected
        ? session.answers.providers?.filter((value) => value !== provider)
        : [...(session.answers.providers ?? []), provider]
    });
  }

  function toggleExclusion(exclusion: string) {
    const selected = session.answers.hardExclusions?.includes(exclusion);
    updateAnswers({
      hardExclusions: selected
        ? session.answers.hardExclusions?.filter((value) => value !== exclusion)
        : [...(session.answers.hardExclusions ?? []), exclusion]
    });
  }

  function handleSwipe(action: "keep" | "pass") {
    if (!currentTitle) return;

    if (action === "keep") {
      setProfile((prev) => applyKeepSignal(prev, currentTitle));
    } else {
      setProfile((prev) => applyPassSignal(prev, currentTitle));
    }

    setSession((prev) => {
      const shortlist = action === "keep" ? [...prev.shortlist, currentTitle.id] : prev.shortlist;
      const passed = action === "pass" ? [...prev.passed, currentTitle.id] : prev.passed;
      const nextCursor = prev.deckCursor + 1;

      if (shortlist.length >= 5) {
        return {
          ...prev,
          phase: "showdown",
          shortlist,
          passed,
          showdownQueue: [...shortlist]
        };
      }

      if (nextCursor >= prev.deck.length) {
        if (shortlist.length >= 2) {
          return {
            ...prev,
            phase: "showdown",
            shortlist,
            passed,
            showdownQueue: [...shortlist]
          };
        }

        return {
          ...prev,
          phase: "questions",
          shortlist,
          passed,
          deck: [],
          deckCursor: 0,
          answers: {
            ...prev.answers,
            mood: prev.answers.mood === "light" ? "intense" : "light"
          }
        };
      }

      return {
        ...prev,
        shortlist,
        passed,
        deckCursor: nextCursor
      };
    });
  }

  function onSwipePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    swipeStartXRef.current = event.clientX;
    setIsDraggingCard(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onSwipePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingCard || swipeStartXRef.current === null) return;
    setSwipeDeltaX(event.clientX - swipeStartXRef.current);
  }

  function onSwipePointerEnd() {
    if (!isDraggingCard) return;

    const delta = swipeDeltaX;
    setIsDraggingCard(false);
    swipeStartXRef.current = null;

    if (delta > SWIPE_TRIGGER_PX) {
      setSwipeDeltaX(0);
      handleSwipe("keep");
      return;
    }

    if (delta < -SWIPE_TRIGGER_PX) {
      setSwipeDeltaX(0);
      handleSwipe("pass");
      return;
    }

    setSwipeDeltaX(0);
  }

  function handleShowdownPick(winnerPick: "left" | "right") {
    if (!showdownPair || !showdownLeft || !showdownRight) return;

    const winnerId = winnerPick === "left" ? showdownLeft.id : showdownRight.id;
    const loserId = winnerPick === "left" ? showdownRight.id : showdownLeft.id;

    setSession((prev) => {
      const [first, second, ...rest] = prev.showdownQueue;
      if (!first || !second) return prev;

      const nextQueue = [...rest, winnerId];
      if (nextQueue.length === 1) {
        return {
          ...prev,
          phase: "result",
          showdownQueue: nextQueue,
          winnerId,
          backupId: loserId
        };
      }

      return {
        ...prev,
        showdownQueue: nextQueue
      };
    });
  }

  function finalizeDecision() {
    if (!winner) return;
    setProfile((prev) => applyDecisionSignal(prev, winner));
    setRoundMessage("Nice. Your preferences were updated for smarter next picks.");
  }

  function resetAndStartNewRound() {
    const nextAnswers: OnboardingAnswers = {
      ...session.answers,
      quickModeId: undefined
    };
    setSession(() => ({
      ...createSession(nextAnswers),
      answers: nextAnswers
    }));
  }

  function handleResetPersonalization() {
    resetPersonalization();
    setProfile(createDefaultProfile());
    setRoundMessage("Personalization reset.");
  }

  return (
    <div className="relative min-h-screen">
      <div className="hero-tenor" aria-hidden="true">
        <div
          className="tenor-gif-embed"
          data-postid="14815314352463346984"
          data-share-method="host"
          data-aspect-ratio="1.33333"
          data-width="100%"
        >
          <a href="https://tenor.com/view/tom-neal-detour-film-noir-driving-gif-14815314352463346984">
            Tom Neal Detour GIF
          </a>
        </div>
      </div>
      <div className="pointer-events-none fixed inset-0 z-10 bg-gradient-to-b from-black/40 via-black/55 to-black/80" />

      <main className="relative z-20 mx-auto max-w-5xl px-4 py-6 text-zinc-100 md:py-10">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">CineMatch</h1>
            <p className="text-sm text-zinc-300 md:text-base">Find your match for your next film.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-zinc-900/55 px-3 py-1.5 text-xs text-zinc-100 backdrop-blur-md md:text-sm">
              <input
                className="h-4 w-4 rounded border-white/30 bg-zinc-900/60 accent-violet-500"
                type="checkbox"
                checked={session.answers.usePersonalization}
                onChange={(event) => updateAnswers({ usePersonalization: event.target.checked })}
              />
              Use my past preferences
            </label>
            <button
              className="rounded-full border border-white/30 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-100 backdrop-blur-md transition hover:border-white/50 hover:bg-zinc-800/70"
              onClick={handleResetPersonalization}
            >
              Reset Personalization
            </button>
          </div>
        </header>

        {roundMessage ? <p className="mb-3 text-sm text-emerald-300">{roundMessage}</p> : null}

        {session.phase === "questions" && (
          <>
            <section className="rounded-3xl border border-white/25 bg-gradient-to-br from-zinc-900/20 to-zinc-800/10 p-5 shadow-2xl backdrop-blur-xl">

              {!hasSelectedQuickMode ? (
                <div className="mt-4 grid gap-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        className="rounded-2xl border border-white/25 bg-zinc-900/60 p-4 text-left transition hover:border-white/45 hover:bg-zinc-800/70"
                        onClick={() => selectQuickMode(preset)}
                      >
                        <p className="text-sm font-semibold text-white">{preset.label}</p>
                        <p className="mt-1 text-xs text-zinc-300">{preset.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-white/15 bg-zinc-900/40 px-3 py-2">
                  <p className="text-xs text-zinc-300">
                    Selected quick mode: <span className="font-medium text-zinc-100">{selectedQuickPreset?.label ?? "Custom"}</span>
                  </p>
                  <button
                    className="rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1 text-xs transition hover:border-white/45 hover:bg-zinc-800/70"
                    onClick={resetQuickSetup}
                  >
                    Reset
                  </button>
                </div>
              )}

              {hasSelectedQuickMode ? (
                <>
                  <div className="mt-4 grid gap-2">
                    <label className="text-sm text-zinc-200">Mood</label>
                    <div className="flex flex-wrap gap-2">
                      {MOOD_OPTIONS.map((mood) => (
                        <button
                          key={mood}
                          className={
                            session.answers.mood === mood
                              ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                              : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                          }
                          onClick={() => updateAnswers({ mood })}
                        >
                          {mood}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <label className="text-sm text-zinc-200">Type</label>
                    <select
                      className="w-56 rounded-xl border border-white/25 bg-zinc-900/75 px-3 py-2 text-sm text-zinc-100 outline-none backdrop-blur-md"
                      value={session.answers.preferredType ?? "either"}
                      onChange={(event) => updateAnswers({ preferredType: event.target.value as OnboardingAnswers["preferredType"] })}
                    >
                      <option value="either">Either</option>
                      <option value="movie">Movie</option>
                      <option value="series">Series</option>
                    </select>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <label className="text-sm text-zinc-200">Runtime</label>
                    <select
                      className="w-56 rounded-xl border border-white/25 bg-zinc-900/75 px-3 py-2 text-sm text-zinc-100 outline-none backdrop-blur-md"
                      value={session.answers.runtime ?? "any"}
                      onChange={(event) => updateAnswers({ runtime: event.target.value as OnboardingAnswers["runtime"] })}
                    >
                      <option value="any">Any</option>
                      <option value="short">Under 90m</option>
                      <option value="standard">90-130m</option>
                      <option value="long">130m+</option>
                    </select>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <label className="text-sm text-zinc-200">Release style</label>
                    <div className="flex flex-wrap gap-2">
                      {RELEASE_WINDOW_OPTIONS.map((window) => {
                        const selected = (session.answers.releaseWindow ?? "any") === window;
                        return (
                          <button
                            key={window}
                            className={
                              selected
                                ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                                : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                            }
                            onClick={() => updateAnswers({ releaseWindow: window })}
                          >
                            {window === "any"
                              ? "Any"
                              : window === "2020s"
                                ? "2020+"
                                : window === "2010s"
                                  ? "2010-2019"
                                  : window === "2000s"
                                    ? "2000-2009"
                                    : "Before 2000"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <label className="text-sm text-zinc-200">Language</label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGE_OPTIONS.map((language) => {
                        const selected = (session.answers.language ?? "any") === language;
                        return (
                          <button
                            key={language}
                            className={
                              selected
                                ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                                : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                            }
                            onClick={() => updateAnswers({ language: language as OnboardingAnswers["language"] })}
                          >
                            {language === "any" ? "Any language" : language.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <label className="text-sm text-zinc-200">Discovery style</label>
                    <div className="flex flex-wrap gap-2">
                      {FAMILIARITY_OPTIONS.map((familiarity) => {
                        const selected = (session.answers.familiarity ?? "any") === familiarity;
                        return (
                          <button
                            key={familiarity}
                            className={
                              selected
                                ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                                : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                            }
                            onClick={() => updateAnswers({ familiarity })}
                          >
                            {familiarity === "any"
                              ? "Any"
                              : familiarity === "popular"
                                ? "Popular picks"
                                : "Hidden gems"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <label className="text-sm text-zinc-200">Provider</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={
                          !session.answers.providers?.length
                            ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                            : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                        }
                        onClick={() => updateAnswers({ providers: [] })}
                      >
                        No preference
                      </button>
                      {PROVIDER_OPTIONS.map((provider) => {
                        const selected = session.answers.providers?.includes(provider);
                        return (
                          <button
                            key={provider}
                            className={
                              selected
                                ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                                : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                            }
                            onClick={() => toggleProvider(provider)}
                          >
                            {provider}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <label className="text-sm text-zinc-200">Avoid tonight</label>
                    <div className="flex flex-wrap gap-2">
                      {EXCLUSION_OPTIONS.map((exclusion) => {
                        const selected = session.answers.hardExclusions?.includes(exclusion);
                        return (
                          <button
                            key={exclusion}
                            className={
                              selected
                                ? "rounded-full border border-rose-300/70 bg-rose-500/25 px-3 py-1.5 text-sm transition hover:bg-rose-500/35"
                                : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                            }
                            onClick={() => toggleExclusion(exclusion)}
                          >
                            {exclusion}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </>
              ) : (
                <p className="mt-4 text-sm text-zinc-300"></p>
              )}
            </section>
            {hasSelectedQuickMode ? (
              <div className="mt-5 flex justify-center">
                <button
                  className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-7 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-900/40 transition hover:brightness-110 disabled:opacity-70"
                  onClick={startSwipeRound}
                  disabled={isBuildingDeck}
                >
                  {isBuildingDeck ? "Building your deck..." : "Start"}
                </button>
              </div>
            ) : null}
          </>
        )}

        {session.phase === "swipe" && currentTitle && (
          <section>
            <div className="">
              <h2 className="text-xl font-semibold">Picks</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Card {session.deckCursor + 1} / {session.deck.length} - Shortlist: {session.shortlist.length}
              </p>
            </div>

            <div
              className={
                isDraggingCard
                  ? "relative mt-4 overflow-hidden rounded-3xl border border-white/20 bg-zinc-900/35 p-4 shadow-2xl backdrop-blur-xl touch-pan-y select-none transition-none"
                  : "relative mt-4 overflow-hidden rounded-3xl border border-white/20 bg-zinc-900/35 p-4 shadow-2xl backdrop-blur-xl touch-pan-y select-none transition-transform duration-200 ease-out"
              }
              style={{
                transform: `translateX(${swipeDeltaX}px) rotate(${swipeDeltaX * 0.06}deg)`
              }}
              onPointerDown={onSwipePointerDown}
              onPointerMove={onSwipePointerMove}
              onPointerUp={onSwipePointerEnd}
              onPointerCancel={onSwipePointerEnd}
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
                  <TitleCard title={currentTitle} noTopMargin />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-10 rounded-2xl p-4">
              <button
                aria-label="Pass"
                className="grid h-20 w-20 place-items-center rounded-full border-2 border-rose-300/60 bg-rose-900/35 text-4xl text-rose-200 transition-colors hover:bg-rose-800/55"
                onClick={() => handleSwipe("pass")}
              >
                ✕
              </button>
              <button
                aria-label="Keep"
                className="grid h-20 w-20 place-items-center rounded-full border-2 border-emerald-300/70 bg-emerald-900/45 text-4xl text-emerald-200 transition-colors hover:bg-emerald-800/60"
                onClick={() => handleSwipe("keep")}
              >
                ♥
              </button>
            </div>
          </section>
        )}

        {session.phase === "showdown" && showdownLeft && showdownRight && (
          <section className="rounded-3xl border border-white/20 bg-zinc-900/55 p-5 shadow-2xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold">Final showdown</h2>
            <p className="mt-2 text-sm text-zinc-300">Pick one. Repeat until we get your winner.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                className="rounded-2xl border border-white/15 bg-zinc-900/40 p-0 text-left transition hover:border-white/35"
                onClick={() => handleShowdownPick("left")}
              >
                <TitleCard title={showdownLeft} compact />
              </button>
              <button
                className="rounded-2xl border border-white/15 bg-zinc-900/40 p-0 text-left transition hover:border-white/35"
                onClick={() => handleShowdownPick("right")}
              >
                <TitleCard title={showdownRight} compact />
              </button>
            </div>
          </section>
        )}

        {session.phase === "result" && winner && (
          <section className="rounded-3xl border border-white/20 bg-zinc-900/55 p-5 shadow-2xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold">Your pick tonight</h2>
            <TitleCard title={winner} />
            {backup ? <p className="mt-2 text-sm text-zinc-300">Backup option: {backup.name}</p> : null}
            <div className="mt-4 flex gap-3">
              <button
                className="rounded-full border border-emerald-300/55 bg-emerald-900/45 px-4 py-2 text-sm transition hover:bg-emerald-800/55"
                onClick={finalizeDecision}
              >
                Watch now
              </button>
              <button
                className="rounded-full border border-white/30 bg-zinc-900/60 px-4 py-2 text-sm transition hover:border-white/50 hover:bg-zinc-800/75"
                onClick={resetAndStartNewRound}
              >
                Pick another
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function deriveSmartDefaultsFromProfile(profile: ReturnType<typeof createDefaultProfile>): Partial<OnboardingAnswers> {
  const defaults: Partial<OnboardingAnswers> = {
    language: "en",
    providers: [],
    releaseWindow: "any",
    familiarity: "any"
  };

  const topLanguage = topAffinityKey(profile.languageAffinity, 0.8);
  if (topLanguage) defaults.language = topLanguage as OnboardingAnswers["language"];

  const topProvider = topAffinityKey(profile.providerAffinity, 1.2);
  if (topProvider) defaults.providers = [topProvider];

  const topType = profile.typeAffinity.movie === profile.typeAffinity.series
    ? null
    : profile.typeAffinity.movie > profile.typeAffinity.series
      ? "movie"
      : "series";
  if (topType) defaults.preferredType = topType;

  return defaults;
}

function topAffinityKey(affinity: Record<string, number>, minScore: number): string | null {
  let bestKey: string | null = null;
  let bestScore = minScore;
  for (const [key, score] of Object.entries(affinity)) {
    if (score > bestScore) {
      bestKey = key;
      bestScore = score;
    }
  }
  return bestKey;
}

function mergeCatalog(existing: Title[], updates: Title[]): Title[] {
  const byId = new Map(existing.map((title) => [title.id, title]));
  for (const update of updates) {
    byId.set(update.id, {
      ...byId.get(update.id),
      ...update
    });
  }
  return Array.from(byId.values());
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function TitleCard({ title, compact = false, noTopMargin = false }: { title: Title; compact?: boolean; noTopMargin?: boolean }) {
  const poster = tmdbPosterUrl(title.posterPath);
  return (
    <article
      className={
        compact
          ? `${noTopMargin ? "" : "mt-4 "}rounded-2xl bg-zinc-900/20 p-3`
          : `${noTopMargin ? "" : "mt-4 "}rounded-2xl bg-zinc-900/20 p-4`
      }
    >
      <div
        className={
          compact
            ? "mx-auto grid w-full max-w-[170px] place-items-center overflow-hidden rounded-xl bg-zinc-800/70 text-3xl font-semibold aspect-[2/3]"
            : "mx-auto grid w-full max-w-[260px] place-items-center overflow-hidden rounded-xl bg-zinc-800/70 text-4xl font-semibold aspect-[2/3]"
        }
      >
        {poster ? (
          <img className="h-full w-full object-cover object-center" src={poster} alt={`${title.name} poster`} />
        ) : (
          <span>{title.name.slice(0, 1)}</span>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-lg font-medium md:text-xl">{title.name}</h3>
        <p className="mt-2 text-sm text-zinc-300">
          {title.type} - {title.releaseYear} - {title.runtimeMinutes}m
        </p>
        <p className="mt-2 text-zinc-100">{title.overview}</p>
        <p className="mt-2 text-sm text-zinc-300">Genres: {title.genres.join(", ")}</p>
      </div>
    </article>
  );
}
