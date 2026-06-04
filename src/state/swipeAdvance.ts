import type { OnboardingAnswers } from "../types";

/** Pure swipe-end logic (mirrors useSessionFlow when the deck is exhausted). */
export function phaseAfterDeckExhausted(
  shortlist: string[],
  passed: string[]
): "showdown" | "result" | "questions" {
  if (shortlist.length >= 2) return "showdown";
  if (shortlist.length === 1) return "result";
  return "questions";
}

export function resultFromSingleKeep(
  shortlist: string[],
  passed: string[]
): { winnerId: string; backupId?: string } | null {
  if (shortlist.length !== 1) return null;
  const backupId = passed.at(-1);
  return { winnerId: shortlist[0]!, backupId };
}

export function retryAnswersAfterEmptyKeep(answers: OnboardingAnswers): OnboardingAnswers {
  return {
    ...answers,
    moods: answers.moods?.includes("light") ? ["intense"] : ["light"]
  };
}
