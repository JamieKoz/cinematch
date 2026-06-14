/** Custom Plausible event names for the product funnel. */
export const AnalyticsEvents = {
  onboardingBegin: "onboarding_begin",
  onboardingReviewReached: "onboarding_review_reached",
  deckBuildStart: "deck_build_start",
  deckBuildSuccess: "deck_build_success",
  deckBuildError: "deck_build_error",
  swipeDeckComplete: "swipe_deck_complete",
  sessionResult: "session_result",
  pickAnother: "pick_another",
  quotaLimitReached: "quota_limit_reached",
  signUpPromptShown: "sign_up_prompt_shown",
  signUpPromptDismissed: "sign_up_prompt_dismissed",
  watchNowClick: "watch_now_click",
  watchTrailerClick: "watch_trailer_click"
} as const;

export type DeckBuildErrorReason = "rate_limit" | "turnstile" | "other";
