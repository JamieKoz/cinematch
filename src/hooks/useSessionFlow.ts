import { useState } from "react";
import { applyDecisionSignal, applyKeepSignal, applyPassSignal, createDefaultProfile } from "../engine/profile";
import { rankTitles } from "../engine/scoring";
import { generateSuggestionsWithAi, rerankCandidatesWithAi } from "../services/ai";
import { saveLastAnswers } from "../services/storage";
import { enrichTitlesWithTmdb } from "../services/tmdb";
import { buildDeck, createSession } from "../state/machine";
import type { OnboardingAnswers, SessionState, TasteProfile, Title } from "../types";
import { cloneProfile, cloneSession, mergeCatalog, slugify } from "../utils/appState";

export function useSessionFlow(params: {
  session: SessionState;
  setSession: React.Dispatch<React.SetStateAction<SessionState>>;
  profile: TasteProfile;
  setProfile: React.Dispatch<React.SetStateAction<TasteProfile>>;
  catalog: Title[];
  setCatalog: React.Dispatch<React.SetStateAction<Title[]>>;
  currentTitle?: Title;
  showdownLeft?: Title;
  showdownRight?: Title;
  winner?: Title;
}) {
  const {
    session,
    setSession,
    profile,
    setProfile,
    catalog,
    setCatalog,
    currentTitle,
    showdownLeft,
    showdownRight,
    winner
  } = params;

  const [isBuildingDeck, setIsBuildingDeck] = useState(false);
  const [lastSwipeSnapshot, setLastSwipeSnapshot] = useState<{ session: SessionState; profile: TasteProfile } | null>(null);

  async function startSwipeRound() {
    setIsBuildingDeck(true);
    setLastSwipeSnapshot(null);
    saveLastAnswers({ ...session.answers, quickModeId: undefined });

    try {
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
            moods: [...(session.answers.moods ?? [])],
            language: session.answers.languages?.[0] ?? "en",
            providers: [...(session.answers.providers ?? [])],
            popularity: 0.6,
            releaseYear: new Date().getFullYear(),
            posterPath: null,
            overview: item.reason ?? "AI-picked for your current vibe."
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
    } finally {
      setIsBuildingDeck(false);
    }
  }

  function handleSwipe(action: "keep" | "pass") {
    if (!currentTitle) return;
    setLastSwipeSnapshot({
      session: cloneSession(session),
      profile: cloneProfile(profile)
    });

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
            moods: prev.answers.moods?.includes("light") ? ["intense"] : ["light"]
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

  function handleUndoSwipe() {
    if (!lastSwipeSnapshot) return;
    setSession(lastSwipeSnapshot.session);
    setProfile(lastSwipeSnapshot.profile);
    setLastSwipeSnapshot(null);
  }

  function handleShowdownPick(winnerPick: "left" | "right") {
    if (!showdownLeft || !showdownRight) return;

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

  return {
    isBuildingDeck,
    canUndo: Boolean(lastSwipeSnapshot),
    startSwipeRound,
    handleSwipe,
    handleUndoSwipe,
    handleShowdownPick,
    finalizeDecision,
    resetAndStartNewRound
  };
}
