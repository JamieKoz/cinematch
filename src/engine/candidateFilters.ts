import type { OnboardingAnswers, TasteProfile, Title } from "../types";
import { runtimeBucketFromMinutes } from "./scoring";

export function passesCandidateConstraints(title: Title, answers: OnboardingAnswers): boolean {
  if (answers.hardExclusions?.length) {
    if (title.genres.some((genre) => answers.hardExclusions?.includes(genre))) return false;
  }

  if (answers.preferredType && answers.preferredType !== "either" && title.type !== answers.preferredType) {
    return false;
  }

  if (answers.runtime && answers.runtime !== "any") {
    if (runtimeBucketFromMinutes(title.runtimeMinutes) !== answers.runtime) return false;
  }

  if (answers.languages?.length && !answers.languages.includes(title.language)) {
    return false;
  }

  if (answers.releaseWindow && answers.releaseWindow !== "any") {
    const year = title.releaseYear;
    const in2020s = year >= 2020;
    const in2010s = year >= 2010 && year <= 2019;
    const in2000s = year >= 2000 && year <= 2009;
    const pre2000 = year < 2000;

    if (answers.releaseWindow === "2020s" && !in2020s) return false;
    if (answers.releaseWindow === "2010s" && !in2010s) return false;
    if (answers.releaseWindow === "2000s" && !in2000s) return false;
    if (answers.releaseWindow === "pre-2000" && !pre2000) return false;
  }

  if (answers.customYearRange) {
    const { min, max } = answers.customYearRange;
    if (title.releaseYear < min || title.releaseYear > max) return false;
  }

  if (answers.providers?.length) {
    const matchesProvider = title.providers.some((provider) => answers.providers?.includes(provider));
    if (!matchesProvider) return false;
  }

  return true;
}

export function isRejectedTitle(title: Title, profile: TasteProfile): boolean {
  return profile.rejectedIds.includes(title.id);
}

export function isSeenTitle(title: Title, profile: TasteProfile): boolean {
  return profile.seenIds.includes(title.id);
}

const DEFAULT_MIN_POOL = 12;

export function prepareSwipeCandidatePool(
  catalog: Title[],
  answers: OnboardingAnswers,
  profile: TasteProfile,
  minViable = DEFAULT_MIN_POOL
): Title[] {
  const constrained = catalog.filter((title) => passesCandidateConstraints(title, answers));
  const withoutRejected = constrained.filter((title) => !isRejectedTitle(title, profile));
  const base = withoutRejected.length > 0 ? withoutRejected : constrained;

  const withoutSeen = base.filter((title) => !isSeenTitle(title, profile));
  if (withoutSeen.length >= minViable) return withoutSeen;
  return base;
}
