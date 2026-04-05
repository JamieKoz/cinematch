import type { OnboardingAnswers } from "../types";

export const MOOD_OPTIONS = ["Light", "Intense", "Emotional", "Mind-bending"];
export const PROVIDER_OPTIONS = ["Netflix", "Prime", "Hulu", "HBO Max", "Apple", "Disney"];
export const LANGUAGE_OPTIONS = ["any", "en", "es", "fr", "ko", "ja"];
export const EXCLUSION_OPTIONS = ["Horror", "Crime", "Romance", "Drama", "Action", "Thriller", "Comedy"];
export const RELEASE_WINDOW_OPTIONS = ["any", "2020s", "2010s", "2000s", "pre-2000"] as const;
export const FAMILIARITY_OPTIONS = ["any", "popular", "hidden-gems", "for-kids"] as const;
export const YEAR_MIN = 1900;
export const YEAR_MAX = new Date().getFullYear();

export type QuickPreset = {
  id: string;
  label: string;
  description: string;
  values: Partial<OnboardingAnswers>;
};

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: "easy-light",
    label: "Easy & light",
    description: "Low effort, short, feel-good choices.",
    values: { moods: ["light"], preferredType: "either", runtime: "short", familiarities: ["popular"] }
  },
  {
    id: "something-deep",
    label: "Something deep",
    description: "Richer stories with emotional pull.",
    values: { moods: ["emotional"], preferredType: "movie", runtime: "standard", releaseWindow: "2010s" }
  },
  {
    id: "high-intensity",
    label: "High intensity",
    description: "Fast pace, tension, and momentum.",
    values: { moods: ["intense"], preferredType: "either", runtime: "standard", familiarities: ["popular"] }
  },
  {
    id: "binge-mode",
    label: "Binge mode",
    description: "Series-first setup for longer sessions.",
    values: { preferredType: "series", runtime: "any" }
  }
];
