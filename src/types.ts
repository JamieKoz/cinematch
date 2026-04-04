export type AppPhase = "questions" | "swipe" | "showdown" | "result";

export type TitleType = "movie" | "series";
export type RuntimeBucket = "short" | "standard" | "long";

export type SwipeAction = "keep" | "pass";

export interface OnboardingAnswers {
  quickModeId?: string;
  mood?: string;
  preferredType?: TitleType | "either";
  runtime?: RuntimeBucket | "any";
  language?: string | "any";
  releaseWindow?: "any" | "2020s" | "2010s" | "2000s" | "pre-2000";
  familiarity?: "any" | "popular" | "hidden-gems";
  providers?: string[];
  hardExclusions?: string[];
  usePersonalization: boolean;
}

export interface Title {
  id: string;
  name: string;
  type: TitleType;
  runtimeMinutes: number;
  genres: string[];
  moods: string[];
  language: string;
  providers: string[];
  popularity: number;
  releaseYear: number;
  posterPath?: string | null;
  overview: string;
}

export interface TasteProfile {
  version: 1;
  updatedAt: string;
  preferredType?: TitleType;
  runtimeAffinity: Record<RuntimeBucket, number>;
  moodAffinity: Record<string, number>;
  genreAffinity: Record<string, number>;
  typeAffinity: Record<TitleType, number>;
  languageAffinity: Record<string, number>;
  providerAffinity: Record<string, number>;
  likedIds: string[];
  rejectedIds: string[];
  seenIds: string[];
  sessionCount: number;
  lastChosenTitle?: string;
}

export interface SessionState {
  phase: AppPhase;
  sessionId: string;
  answers: OnboardingAnswers;
  deck: string[];
  deckCursor: number;
  shortlist: string[];
  passed: string[];
  showdownQueue: string[];
  winnerId?: string;
  backupId?: string;
}

export interface ScoreInput {
  title: Title;
  answers: OnboardingAnswers;
  profile: TasteProfile;
}
