import { rankTitles } from "../engine/scoring";
import type { OnboardingAnswers, SessionState, TasteProfile, Title } from "../types";

const DECK_SIZE = 10;

export function createInitialAnswers(seed: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  const legacySeed = seed as Partial<OnboardingAnswers> & {
    mood?: string;
    language?: string;
    familiarity?: "any" | "popular" | "hidden-gems" | "for-kids";
  };

  return {
    quickModeId: seed.quickModeId,
    moods: normalizeStringArray(seed.moods ?? legacySeed.mood),
    preferredType: seed.preferredType ?? "either",
    runtime: seed.runtime ?? "any",
    languages: normalizeLanguages(seed.languages ?? legacySeed.language),
    releaseWindow: seed.releaseWindow ?? "any",
    customYearRange: seed.customYearRange ?? null,
    familiarities: normalizeFamiliarities(seed.familiarities ?? legacySeed.familiarity),
    providers: seed.providers ?? [],
    hardExclusions: seed.hardExclusions ?? [],
    keywords: normalizeStringArray(seed.keywords),
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

function normalizeStringArray(value: string[] | string | undefined): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      values
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeFamiliarities(
  value: Array<"popular" | "hidden-gems" | "for-kids"> | "any" | "popular" | "hidden-gems" | "for-kids" | undefined
): Array<"popular" | "hidden-gems" | "for-kids"> {
  const normalized = normalizeStringArray(value).filter(
    (item): item is "popular" | "hidden-gems" | "for-kids" =>
      item === "popular" || item === "hidden-gems" || item === "for-kids"
  );
  return normalized;
}

function normalizeLanguages(value: string[] | string | undefined): string[] {
  return normalizeStringArray(value).filter((language) => language !== "any");
}
