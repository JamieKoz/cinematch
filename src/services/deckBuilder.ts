import { passesAiDeckConstraints, passesCandidateConstraints, prepareSwipeCandidatePool } from "../engine/candidateFilters";
import { createDefaultProfile } from "../engine/profile";
import { rankTitles } from "../engine/scoring";
import type { AiHistoryHints } from "./ai";
import { generateSuggestionsWithAi, rerankCandidatesWithAi } from "./ai";
import { assertCanBuildAiDeck, fetchAiQuota } from "./aiQuota";
import { loadBackendConfig } from "./backendConfig";
import { createSyntheticAiTitle, enrichTitlesWithTmdb, resolveAiSuggestionsToTitles } from "./tmdb";
import { buildDeck, fillDeckFromSources } from "../state/machine";
import type { OnboardingAnswers, TasteProfile, Title } from "../types";
import { mergeCatalog } from "../utils/appState";
import { loadSoloHistory, loadGroupHistory } from "./storage";

interface BuildRecommendationDeckParams {
  answers: OnboardingAnswers;
  profile: TasteProfile;
  catalog: Title[];
  watchRegion: string;
}

const AI_GENERATION_CANDIDATE_COUNT = 24;

export interface BuildRecommendationDeckResult {
  deckTitles: Title[];
  deck: string[];
}

function buildHistoryHints(catalog: Title[], profile: TasteProfile): AiHistoryHints {
  const byId = new Map(catalog.map((title) => [title.id, title]));
  const namesFrom = (ids: string[], cap: number) =>
    ids
      .slice(-cap)
      .map((id) => byId.get(id)?.name)
      .filter((name): name is string => Boolean(name));

  // Pull past winners from solo and group history to feed as liked samples
  const soloWinners: string[] = loadSoloHistory()
    .slice(-10)
    .map((e) => e.winner.name);
  const groupWinners: string[] = loadGroupHistory()
    .slice(-10)
    .flatMap((e) => [e.myPick?.name, e.partnerPick?.name, e.sharedCompromise?.name])
    .filter((name): name is string => Boolean(name));
  const historyLikedSample = [...soloWinners, ...groupWinners];

  return {
    likedSample: [...historyLikedSample, ...namesFrom(profile.likedIds, 14)],
    rejectedSample: namesFrom(profile.rejectedIds, 10),
    seenSample: namesFrom(profile.seenIds, 10),
    lastChosenLabel: profile.lastChosenTitle ? byId.get(profile.lastChosenTitle)?.name : undefined,
    sessionCount: profile.sessionCount
  };
}

export async function buildRecommendationDeck(
  params: BuildRecommendationDeckParams
): Promise<BuildRecommendationDeckResult> {
  const { answers, profile, catalog, watchRegion } = params;
  const { ai: aiEnabled, tmdb: tmdbEnabled } = await loadBackendConfig();
  const blockedIds = new Set(profile.rejectedIds);
  let deckTitles: Title[] = [];
  let usedAiSuggestions = false;

  if (aiEnabled) {
    assertCanBuildAiDeck(await fetchAiQuota());
    const historyHints = buildHistoryHints(catalog, profile);
    const generated = await generateSuggestionsWithAi({
      answers,
      profile,
      count: AI_GENERATION_CANDIDATE_COUNT,
      watchRegion,
      historyHints
    });

    if (generated.length > 0) {
      usedAiSuggestions = true;
      if (tmdbEnabled) {
        // Resolve more candidates so we can filter, then shuffle and pick
        const maxCandidates = Math.min(AI_GENERATION_CANDIDATE_COUNT * 2, generated.length * 2);
        deckTitles = await resolveAiSuggestionsToTitles(generated, answers, profile, maxCandidates, watchRegion);
      } else {
        deckTitles = generated.map((item, index) => createSyntheticAiTitle(item, answers, index));
      }
    }
  }

  if (deckTitles.length === 0) {
    const activeProfile = answers.usePersonalization ? profile : createDefaultProfile();
    const pool = prepareSwipeCandidatePool(catalog, answers, activeProfile);
    const sorted = rankTitles(pool.length ? pool : catalog, answers, activeProfile);
    const top20 = sorted.slice(0, 20);
    const reranked = await rerankCandidatesWithAi({
      answers,
      profile: activeProfile,
      candidates: top20,
      watchRegion,
      historyHints: buildHistoryHints(catalog, profile)
    });
    // Shuffle top-ranked candidates for variety, then pick up to 10
    const baseDeckTitles = (reranked.length ? reranked : top20).sort(() => Math.random() - 0.5).slice(0, 10);
    deckTitles = tmdbEnabled ? await enrichTitlesWithTmdb(baseDeckTitles, watchRegion) : baseDeckTitles;
  }

  if (deckTitles.length > 0) {
    deckTitles = deckTitles.filter((title) =>
      usedAiSuggestions ? passesAiDeckConstraints(title, answers) : passesCandidateConstraints(title, answers)
    );
    deckTitles = deckTitles.filter((title) => !blockedIds.has(title.id));

    // Shuffle remaining candidates, then pick up to 10 for the final deck
    const deckTarget = 10;
    const shuffled = [...deckTitles].sort(() => Math.random() - 0.5);
    deckTitles = shuffled.slice(0, deckTarget);
  }

  if (usedAiSuggestions && deckTitles.length === 0) {
    throw new Error("Could not find real streaming matches for those filters. Try broadening provider or format choices.");
  }

  let catalogForDeck = (deckTitles.length > 0 ? mergeCatalog(catalog, deckTitles) : catalog).filter(
    (title) => !blockedIds.has(title.id)
  );
  const primaryIds = deckTitles.map((title) => title.id);
  const fallbackIds = usedAiSuggestions ? [] : buildDeck(catalogForDeck, answers, profile);
  let deck =
    usedAiSuggestions && primaryIds.length > 0
      ? primaryIds
      : primaryIds.length > 0
        ? fillDeckFromSources(primaryIds, fallbackIds)
        : fallbackIds;

  if (tmdbEnabled && deck.length > 0) {
    const selectedTitles = deck
      .map((id) => catalogForDeck.find((title) => title.id === id))
      .filter((title): title is Title => Boolean(title));
    const enrichedSelectedTitles = await enrichTitlesWithTmdb(selectedTitles, watchRegion);
    catalogForDeck = mergeCatalog(catalogForDeck, enrichedSelectedTitles);
    deckTitles = mergeCatalog(deckTitles, enrichedSelectedTitles);
    deck = enrichedSelectedTitles.map((title) => title.id);
  }

  return { deckTitles, deck };
}
