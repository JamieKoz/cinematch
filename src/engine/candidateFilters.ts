import type { OnboardingAnswers, TasteProfile, Title } from "../types";
import { runtimeBucketFromMinutes } from "./scoring";
import { hasExcludedGenre, matchesCustomYearRange, matchesReleaseWindow } from "./constraints";

/** For AI-curated picks: honor hard genre exclusions and movie/series preference only (release/runtime/provider already inform the model). */
export function passesAiDeckConstraints(title: Title, answers: OnboardingAnswers): boolean {
  if (hasExcludedGenre(title, answers.hardExclusions)) return false;

  if (answers.preferredType && answers.preferredType !== "either" && title.type !== answers.preferredType) {
    return false;
  }

  return true;
}

export function passesCandidateConstraints(title: Title, answers: OnboardingAnswers): boolean {
  if (hasExcludedGenre(title, answers.hardExclusions)) return false;

  if (answers.preferredType && answers.preferredType !== "either" && title.type !== answers.preferredType) {
    return false;
  }

  if (answers.runtime && answers.runtime !== "any") {
    if (runtimeBucketFromMinutes(title.runtimeMinutes) !== answers.runtime) return false;
  }

  if (answers.languages?.length && !answers.languages.includes(title.language)) {
    return false;
  }

  if (!matchesReleaseWindow(title.releaseYear, answers.releaseWindow)) return false;

  if (!matchesCustomYearRange(title.releaseYear, answers.customYearRange)) return false;

  if (answers.providers?.length) {
    const matchesProvider = title.providers.some((provider) => answers.providers?.includes(provider));
    if (!matchesProvider) return false;
  }

  return true;
}

export function isRejectedTitle(title: Title, profile: TasteProfile): boolean {
  return profile.rejectedIds.includes(title.id);
}

export function prepareSwipeCandidatePool(
  catalog: Title[],
  answers: OnboardingAnswers,
  profile: TasteProfile
): Title[] {
  const rejectedIds = new Set(profile.rejectedIds);
  const constrained = catalog.filter((title) => passesCandidateConstraints(title, answers));
  const withoutRejected = constrained.filter((title) => !rejectedIds.has(title.id));
  return withoutRejected.length > 0 ? withoutRejected : constrained;
}
