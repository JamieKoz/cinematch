import type { OnboardingAnswers, Title } from "../types";

export function matchesReleaseWindow(
  year: number,
  window: OnboardingAnswers["releaseWindow"]
): boolean {
  if (!window || window === "any") return true;
  if (window === "2020s") return year >= 2020;
  if (window === "2010s") return year >= 2010 && year <= 2019;
  if (window === "2000s") return year >= 2000 && year <= 2009;
  return year < 2000;
}

export function matchesCustomYearRange(
  year: number,
  range: OnboardingAnswers["customYearRange"]
): boolean {
  if (!range) return true;
  return year >= range.min && year <= range.max;
}

export function hasExcludedGenre(title: Title, exclusions: OnboardingAnswers["hardExclusions"]): boolean {
  if (!exclusions?.length) return false;
  return title.genres.some((genre) => exclusions.includes(genre));
}
