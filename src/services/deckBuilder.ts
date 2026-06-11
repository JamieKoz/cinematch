import { passesAiDeckConstraints, passesCandidateConstraints, prepareSwipeCandidatePool } from "../engine/candidateFilters";
import { createDefaultProfile } from "../engine/profile";
import { rankTitles } from "../engine/scoring";
import type { AiHistoryHints } from "./ai";
import { generateSuggestionsWithAi, rerankCandidatesWithAi } from "./ai";
import { assertCanBuildAiDeck, fetchAiQuota } from "./aiQuota";
import { loadBackendConfig } from "./backendConfig";
import { createSyntheticAiTitle, enrichTitlesWithTmdb, resolveAiSuggestionsToTitles } from "./tmdb";
import { buildDeck, DECK_SIZE, fillDeckFromSources } from "../state/machine";
import type { OnboardingAnswers, TasteProfile, Title } from "../types";
import { mergeCatalog } from "../utils/appState";
import { loadSoloHistory, loadGroupHistory } from "./storage";

interface BuildRecommendationDeckParams {
  answers: OnboardingAnswers;
  profile: TasteProfile;
  catalog: Title[];
  watchRegion: string;
}

const AI_GENERATION_CANDIDATE_COUNT = 30;
const AI_REFILL_CANDIDATE_COUNT = 20;
const MAX_AI_REFILL_ROUNDS = 2;

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

function shuffleTitles<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function filterDeckTitles(
  titles: Title[],
  answers: OnboardingAnswers,
  usedAiSuggestions: boolean,
  blockedIds: Set<string>
): Title[] {
  return titles
    .filter((title) =>
      usedAiSuggestions ? passesAiDeckConstraints(title, answers) : passesCandidateConstraints(title, answers)
    )
    .filter((title) => !blockedIds.has(title.id));
}

function mergeUniqueTitles(existing: Title[], incoming: Title[]): Title[] {
  const seen = new Set(existing.map((title) => title.id));
  const merged = [...existing];
  for (const title of incoming) {
    if (seen.has(title.id)) continue;
    seen.add(title.id);
    merged.push(title);
  }
  return merged;
}

async function resolveAiSuggestions(
  generated: Awaited<ReturnType<typeof generateSuggestionsWithAi>>,
  answers: OnboardingAnswers,
  profile: TasteProfile,
  watchRegion: string,
  tmdbEnabled: boolean
): Promise<Title[]> {
  if (generated.length === 0) return [];
  if (tmdbEnabled) {
    const maxCandidates = Math.min(AI_GENERATION_CANDIDATE_COUNT * 2, generated.length * 2);
    return resolveAiSuggestionsToTitles(generated, answers, profile, maxCandidates, watchRegion);
  }
  return generated.map((item, index) => createSyntheticAiTitle(item, answers, index));
}

async function accumulateAiDeckTitles(params: {
  answers: OnboardingAnswers;
  profile: TasteProfile;
  watchRegion: string;
  historyHints: AiHistoryHints;
  blockedIds: Set<string>;
  tmdbEnabled: boolean;
}): Promise<Title[]> {
  const { answers, profile, watchRegion, historyHints, blockedIds, tmdbEnabled } = params;
  let deckTitles: Title[] = [];

  const initialGenerated = await generateSuggestionsWithAi({
    answers,
    profile,
    count: AI_GENERATION_CANDIDATE_COUNT,
    watchRegion,
    historyHints
  });

  if (initialGenerated.length > 0) {
    const resolved = await resolveAiSuggestions(initialGenerated, answers, profile, watchRegion, tmdbEnabled);
    deckTitles = filterDeckTitles(resolved, answers, true, blockedIds);
  }

  let refillRound = 0;
  while (deckTitles.length < DECK_SIZE && refillRound < MAX_AI_REFILL_ROUNDS) {
    const beforeCount = deckTitles.length;
    const refillGenerated = await generateSuggestionsWithAi({
      answers,
      profile,
      count: AI_REFILL_CANDIDATE_COUNT,
      watchRegion,
      historyHints,
      excludeNames: deckTitles.map((title) => title.name)
    });
    if (refillGenerated.length === 0) break;

    const resolved = await resolveAiSuggestions(refillGenerated, answers, profile, watchRegion, tmdbEnabled);
    deckTitles = mergeUniqueTitles(
      deckTitles,
      filterDeckTitles(resolved, answers, true, blockedIds)
    );
    refillRound += 1;
    if (deckTitles.length === beforeCount) break;
  }

  return deckTitles;
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
    deckTitles = await accumulateAiDeckTitles({
      answers,
      profile,
      watchRegion,
      historyHints,
      blockedIds,
      tmdbEnabled
    });
    usedAiSuggestions = deckTitles.length > 0;
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
    const baseDeckTitles = shuffleTitles(reranked.length ? reranked : top20);
    deckTitles = tmdbEnabled ? await enrichTitlesWithTmdb(baseDeckTitles, watchRegion) : baseDeckTitles;
    deckTitles = filterDeckTitles(deckTitles, answers, false, blockedIds);
  }

  if (usedAiSuggestions && deckTitles.length === 0) {
    throw new Error("Could not find real streaming matches for those filters. Try broadening provider or format choices.");
  }

  const shuffledPrimary = shuffleTitles(deckTitles);
  let catalogForDeck = (deckTitles.length > 0 ? mergeCatalog(catalog, deckTitles) : catalog).filter(
    (title) => !blockedIds.has(title.id)
  );
  const primaryIds = shuffledPrimary.map((title) => title.id);
  const fallbackIds = buildDeck(catalogForDeck, answers, profile);
  let deck = fillDeckFromSources(primaryIds, fallbackIds, DECK_SIZE);

  if (tmdbEnabled && deck.length > 0) {
    const selectedTitles = deck
      .map((id) => catalogForDeck.find((title) => title.id === id))
      .filter((title): title is Title => Boolean(title));
    const enrichedSelectedTitles = await enrichTitlesWithTmdb(selectedTitles, watchRegion);
    catalogForDeck = mergeCatalog(catalogForDeck, enrichedSelectedTitles);
    deckTitles = enrichedSelectedTitles;
    deck = enrichedSelectedTitles.map((title) => title.id);
  } else {
    deckTitles = deck
      .map((id) => catalogForDeck.find((title) => title.id === id))
      .filter((title): title is Title => Boolean(title));
  }

  return { deckTitles, deck };
}
