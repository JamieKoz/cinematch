import { rankTitles } from "../engine/scoring";
import type { OnboardingAnswers, SessionState, TasteProfile, Title } from "../types";

const DECK_SIZE = 10;

export function createInitialAnswers(seed: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  return {
    quickModeId: seed.quickModeId,
    mood: seed.mood,
    preferredType: seed.preferredType ?? "either",
    runtime: seed.runtime ?? "any",
    language: seed.language ?? "any",
    releaseWindow: seed.releaseWindow ?? "any",
    customYearRange: seed.customYearRange ?? null,
    familiarity: seed.familiarity ?? "any",
    providers: seed.providers ?? [],
    hardExclusions: seed.hardExclusions ?? [],
    usePersonalization: true
  };
}

export function createSession(answers: OnboardingAnswers): SessionState {
  return {
    phase: "questions",
    sessionId: crypto.randomUUID(),
    answers,
    deck: [],
    deckCursor: 0,
    shortlist: [],
    passed: [],
    showdownQueue: []
  };
}

export function buildDeck(titles: Title[], answers: OnboardingAnswers, profile: TasteProfile): string[] {
  const activeProfile = answers.usePersonalization ? profile : clearProfileAffinity(profile);
  return rankTitles(titles, answers, activeProfile)
    .slice(0, DECK_SIZE)
    .map((title) => title.id);
}

export function nextPair(queue: string[]): [string, string] | null {
  if (queue.length < 2) return null;
  return [queue[0], queue[1]];
}

function clearProfileAffinity(profile: TasteProfile): TasteProfile {
  return {
    ...profile,
    runtimeAffinity: { short: 0, standard: 0, long: 0 },
    typeAffinity: { movie: 0, series: 0 },
    moodAffinity: {},
    genreAffinity: {},
    languageAffinity: {},
    providerAffinity: {}
  };
}
