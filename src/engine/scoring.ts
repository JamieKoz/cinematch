import type { OnboardingAnswers, RuntimeBucket, ScoreInput, TasteProfile, Title } from "../types";

export function runtimeBucketFromMinutes(minutes: number): RuntimeBucket {
  if (minutes < 90) return "short";
  if (minutes <= 130) return "standard";
  return "long";
}

export function scoreCandidate({ title, answers, profile }: ScoreInput): number {
  let score = 0;

  if (profile.rejectedIds.includes(title.id)) return -9999;
  if (answers.hardExclusions?.length) {
    const excluded = title.genres.some((genre) => answers.hardExclusions?.includes(genre));
    if (excluded) return -9999;
  }

  if (answers.preferredType && answers.preferredType !== "either" && title.type !== answers.preferredType) {
    score -= 2;
  }

  const bucket = runtimeBucketFromMinutes(title.runtimeMinutes);
  if (answers.runtime && answers.runtime !== "any" && bucket !== answers.runtime) {
    score -= 1.5;
  }

  if (answers.language && answers.language !== "any" && answers.language !== title.language) {
    score -= 1;
  }

  if (answers.releaseWindow && answers.releaseWindow !== "any") {
    const year = title.releaseYear;
    const in2020s = year >= 2020;
    const in2010s = year >= 2010 && year <= 2019;
    const in2000s = year >= 2000 && year <= 2009;
    const pre2000 = year < 2000;

    if (answers.releaseWindow === "2020s" && !in2020s) score -= 1.5;
    if (answers.releaseWindow === "2010s" && !in2010s) score -= 1.5;
    if (answers.releaseWindow === "2000s" && !in2000s) score -= 1.5;
    if (answers.releaseWindow === "pre-2000" && !pre2000) score -= 1.5;
  }

  if (answers.customYearRange) {
    const { min, max } = answers.customYearRange;
    if (title.releaseYear < min || title.releaseYear > max) {
      return -9999;
    }
  }

  if (answers.mood && title.moods.includes(answers.mood)) {
    score += 3;
  }

  if (answers.providers?.length) {
    const matchesProvider = title.providers.some((provider) => answers.providers?.includes(provider));
    if (matchesProvider) score += 2;
  }

  for (const genre of title.genres) {
    score += (profile.genreAffinity[genre] ?? 0) * 0.8;
  }

  for (const mood of title.moods) {
    score += (profile.moodAffinity[mood] ?? 0) * 0.9;
  }

  score += (profile.runtimeAffinity[bucket] ?? 0) * 0.7;
  score += (profile.typeAffinity[title.type] ?? 0) * 0.8;
  score += (profile.languageAffinity[title.language] ?? 0) * 0.5;

  for (const provider of title.providers) {
    score += (profile.providerAffinity[provider] ?? 0) * 0.4;
  }

  if (profile.seenIds.includes(title.id)) {
    score -= 2.5;
  }

  score += title.popularity * 0.8;
  score += normalizeRecency(title.releaseYear) * 0.4;

  if (answers.familiarity === "popular") {
    score += title.popularity * 1.1;
  } else if (answers.familiarity === "hidden-gems") {
    score += (1 - title.popularity) * 1.1;
  }

  return score;
}

export function rankTitles(titles: Title[], answers: OnboardingAnswers, profile: TasteProfile): Title[] {
  return [...titles].sort((a, b) => {
    const aScore = scoreCandidate({ title: a, answers, profile });
    const bScore = scoreCandidate({ title: b, answers, profile });
    return bScore - aScore;
  });
}

function normalizeRecency(year: number): number {
  const now = new Date().getFullYear();
  const diff = Math.max(0, now - year);
  if (diff <= 1) return 1;
  if (diff <= 3) return 0.8;
  if (diff <= 6) return 0.6;
  if (diff <= 10) return 0.3;
  return 0.1;
}
