import { normalizeMoodList } from "../config/options";
import type { OnboardingAnswers, SessionState, TasteProfile, Title, TitleType } from "../types";

export function deriveSmartDefaultsFromProfile(profile: TasteProfile): Partial<OnboardingAnswers> {
  const defaults: Partial<OnboardingAnswers> = {
    languages: ["en"],
    runtime: "any",
    providers: [],
    releaseWindow: "any",
    customYearRange: null,
    familiarities: []
  };

  const topLanguage = topAffinityKey(profile.languageAffinity, 0.8);
  if (topLanguage) defaults.languages = [topLanguage];

  const topProvider = topAffinityKey(profile.providerAffinity, 1.2);
  if (topProvider) defaults.providers = [topProvider];

  const topType = profile.typeAffinity.movie === profile.typeAffinity.series
    ? null
    : profile.typeAffinity.movie > profile.typeAffinity.series
      ? "movie"
      : "series";
  if (topType) defaults.preferredType = topType;

  const topMood = topAffinityKey(profile.moodAffinity, 0.45);
  if (topMood) {
    const moods = normalizeMoodList([topMood]);
    if (moods.length) defaults.moods = moods;
  }

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

export function cloneSession(session: SessionState): SessionState {
  return {
    ...session,
    answers: { ...session.answers },
    deck: [...session.deck],
    shortlist: [...session.shortlist],
    passed: [...session.passed],
    showdownQueue: [...session.showdownQueue]
  };
}

export function cloneProfile(profile: TasteProfile): TasteProfile {
  return {
    ...profile,
    runtimeAffinity: { ...profile.runtimeAffinity },
    moodAffinity: { ...profile.moodAffinity },
    genreAffinity: { ...profile.genreAffinity },
    typeAffinity: { ...profile.typeAffinity } as Record<TitleType, number>,
    languageAffinity: { ...profile.languageAffinity },
    providerAffinity: { ...profile.providerAffinity },
    likedIds: [...profile.likedIds],
    rejectedIds: [...profile.rejectedIds],
    seenIds: [...profile.seenIds]
  };
}

export function mergeCatalog(existing: Title[], updates: Title[]): Title[] {
  const byId = new Map(existing.map((title) => [title.id, title]));
  for (const update of updates) {
    byId.set(update.id, {
      ...byId.get(update.id),
      ...update
    });
  }
  return Array.from(byId.values());
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
