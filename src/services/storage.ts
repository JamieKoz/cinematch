import { createDefaultProfile } from "../engine/profile";
import type { OnboardingAnswers, TasteProfile } from "../types";

const PROFILE_KEY = "cinematch.tasteProfile.v1";
const ANSWERS_KEY = "cinematch.lastAnswers.v1";

export function loadProfile(): TasteProfile {
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) return createDefaultProfile();

  try {
    const parsed = JSON.parse(raw) as Partial<TasteProfile>;
    if (parsed.version !== 1) return createDefaultProfile();
    return {
      ...createDefaultProfile(),
      ...parsed,
      runtimeAffinity: {
        ...createDefaultProfile().runtimeAffinity,
        ...(parsed.runtimeAffinity ?? {})
      },
      typeAffinity: {
        ...createDefaultProfile().typeAffinity,
        ...(parsed.typeAffinity ?? {})
      }
    };
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: TasteProfile): void {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadLastAnswers(): Partial<OnboardingAnswers> {
  const raw = window.localStorage.getItem(ANSWERS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<OnboardingAnswers>;
  } catch {
    return {};
  }
}

export function saveLastAnswers(answers: OnboardingAnswers): void {
  window.localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
}

export function resetPersonalization(): void {
  window.localStorage.removeItem(PROFILE_KEY);
}
