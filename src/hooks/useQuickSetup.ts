import { QUICK_PRESETS, YEAR_MAX, YEAR_MIN } from "../config/options";
import type { OnboardingAnswers, SessionState, TasteProfile } from "../types";
import { deriveSmartDefaultsFromProfile } from "../utils/appState";

export function useQuickSetup(params: {
  answers: OnboardingAnswers;
  profile: TasteProfile;
  setSession: React.Dispatch<React.SetStateAction<SessionState>>;
}) {
  const { answers, profile, setSession } = params;
  const hasSelectedQuickMode = Boolean(answers.quickModeId);
  const selectedQuickPreset = QUICK_PRESETS.find((preset) => preset.id === answers.quickModeId);
  const customYearRange = answers.customYearRange;
  const customYearStartPct = customYearRange
    ? ((customYearRange.min - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100
    : 0;
  const customYearEndPct = customYearRange
    ? ((customYearRange.max - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100
    : 100;

  function updateAnswers(next: Partial<OnboardingAnswers>) {
    setSession((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        ...next
      }
    }));
  }

  function selectQuickMode(preset: (typeof QUICK_PRESETS)[number]) {
    const smartDefaults = deriveSmartDefaultsFromProfile(profile);
    updateAnswers({
      ...smartDefaults,
      ...preset.values,
      quickModeId: preset.id
    });
  }

  function resetQuickSetup() {
    const smartDefaults = deriveSmartDefaultsFromProfile(profile);
    updateAnswers({
      ...smartDefaults,
      quickModeId: undefined
    });
  }

  function toggleProvider(provider: string) {
    const selected = answers.providers?.includes(provider);
    updateAnswers({
      providers: selected
        ? answers.providers?.filter((value) => value !== provider)
        : [...(answers.providers ?? []), provider]
    });
  }

  function toggleExclusion(exclusion: string) {
    const selected = answers.hardExclusions?.includes(exclusion);
    updateAnswers({
      hardExclusions: selected
        ? answers.hardExclusions?.filter((value) => value !== exclusion)
        : [...(answers.hardExclusions ?? []), exclusion]
    });
  }

  function toggleCustomYearRange() {
    if (answers.customYearRange) {
      updateAnswers({ customYearRange: null });
      return;
    }
    updateAnswers({
      customYearRange: { min: 2000, max: YEAR_MAX }
    });
  }

  function updateCustomYearRange(next: Partial<{ min: number; max: number }>) {
    const current = answers.customYearRange ?? { min: 2000, max: YEAR_MAX };
    const merged = { ...current, ...next };
    const min = Math.max(YEAR_MIN, Math.min(merged.min, merged.max));
    const max = Math.min(YEAR_MAX, Math.max(merged.max, min));
    updateAnswers({ customYearRange: { min, max } });
  }

  return {
    hasSelectedQuickMode,
    selectedQuickPreset,
    customYearStartPct,
    customYearEndPct,
    updateAnswers,
    selectQuickMode,
    resetQuickSetup,
    toggleProvider,
    toggleExclusion,
    toggleCustomYearRange,
    updateCustomYearRange
  };
}
