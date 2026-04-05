import {
  EXCLUSION_OPTIONS,
  FAMILIARITY_OPTIONS,
  LANGUAGE_OPTIONS,
  MOOD_OPTIONS,
  PROVIDER_OPTIONS,
  QUICK_PRESETS,
  RELEASE_WINDOW_OPTIONS,
  YEAR_MAX,
  YEAR_MIN
} from "../config/options";
import type { OnboardingAnswers } from "../types";

type QuickPreset = (typeof QUICK_PRESETS)[number];

export function QuestionsSection(props: {
  hasSelectedQuickMode: boolean;
  selectedQuickPresetLabel?: string;
  answers: OnboardingAnswers;
  isBuildingDeck: boolean;
  customYearStartPct: number;
  customYearEndPct: number;
  onSelectQuickMode: (preset: QuickPreset) => void;
  onResetQuickSetup: () => void;
  onUpdateAnswers: (next: Partial<OnboardingAnswers>) => void;
  onToggleCustomYearRange: () => void;
  onUpdateCustomYearRange: (next: Partial<{ min: number; max: number }>) => void;
  onToggleProvider: (provider: string) => void;
  onToggleExclusion: (exclusion: string) => void;
  onToggleMood: (mood: string) => void;
  onToggleLanguage: (language: string) => void;
  onToggleFamiliarity: (familiarity: "any" | "popular" | "hidden-gems" | "for-kids") => void;
  onStart: () => void;
}) {
  const {
    hasSelectedQuickMode,
    selectedQuickPresetLabel,
    answers,
    isBuildingDeck,
    customYearStartPct,
    customYearEndPct,
    onSelectQuickMode,
    onResetQuickSetup,
    onUpdateAnswers,
    onToggleCustomYearRange,
    onUpdateCustomYearRange,
    onToggleProvider,
    onToggleExclusion,
    onToggleMood,
    onToggleLanguage,
    onToggleFamiliarity,
    onStart
  } = props;

  const customYearRange = answers.customYearRange;

  return (
    <>
      <section className="shadow-2xl">
        {!hasSelectedQuickMode ? (
          <div className="mt-4 grid gap-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className="rounded-2xl border border-white/25 bg-zinc-900/60 p-4 text-left transition hover:border-white/45 hover:bg-zinc-800/70"
                  onClick={() => onSelectQuickMode(preset)}
                >
                  <p className="text-sm font-semibold text-white">{preset.label}</p>
                  <p className="mt-1 text-xs text-zinc-300">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-xl sm:flex-row items-center justify-between">
            <p className="text-xs text-zinc-300 sm:text-sm">
              Selected mode: <span className="font-medium text-zinc-100">{selectedQuickPresetLabel ?? "Custom"}</span>
            </p>
            <button
              className="rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1 text-xs transition hover:border-white/45 hover:bg-zinc-800/70"
              onClick={onResetQuickSetup}
            >
              Reset
            </button>
          </div>
        )}

        {hasSelectedQuickMode ? (
          <>
            <div className="mt-4 grid gap-2">
              <label className="text-sm text-zinc-200">Mood</label>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood}
                    className={
                      answers.moods?.includes(mood)
                        ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                        : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                    }
                    onClick={() => onToggleMood(mood)}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <label className="text-sm text-zinc-200">Type</label>
              <select
                className="w-full sm:w-56 rounded-xl border border-white/25 bg-zinc-900/75 px-3 py-2 text-sm text-zinc-100 outline-none backdrop-blur-md"
                value={answers.preferredType ?? "either"}
                onChange={(event) => onUpdateAnswers({ preferredType: event.target.value as OnboardingAnswers["preferredType"] })}
              >
                <option value="either">Either</option>
                <option value="movie">Movie</option>
                <option value="series">Series</option>
              </select>
            </div>

            <div className="mt-4 grid gap-2">
              <label className="text-sm text-zinc-200">Runtime</label>
              <select
                className="w-full sm:w-56 rounded-xl border border-white/25 bg-zinc-900/75 px-3 py-2 text-sm text-zinc-100 outline-none backdrop-blur-md"
                value={answers.runtime ?? "any"}
                onChange={(event) => onUpdateAnswers({ runtime: event.target.value as OnboardingAnswers["runtime"] })}
              >
                <option value="any">Any</option>
                <option value="short">Under 90m</option>
                <option value="standard">90-130m</option>
                <option value="long">130m+</option>
              </select>
            </div>

            <div className="mt-4 grid gap-2">
              <label className="text-sm text-zinc-200">Release style</label>
              <div className="flex flex-wrap gap-2">
                {RELEASE_WINDOW_OPTIONS.map((window) => {
                  const selected = (answers.releaseWindow ?? "any") === window;
                  return (
                    <button
                      key={window}
                      className={
                        selected
                          ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                          : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                      }
                      onClick={() => onUpdateAnswers({ releaseWindow: window, customYearRange: null })}
                    >
                      {window === "any"
                        ? "Any"
                        : window === "2020s"
                          ? "2020+"
                          : window === "2010s"
                            ? "2010-2019"
                            : window === "2000s"
                              ? "2000-2009"
                              : "Before 2000"}
                    </button>
                  );
                })}
                <button
                  className={
                    answers.customYearRange
                      ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                      : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                  }
                  onClick={onToggleCustomYearRange}
                >
                  Custom range
                </button>
              </div>
              {customYearRange ? (
                <div className="mt-2 rounded-xl border border-white/20 bg-zinc-900/45 p-3">
                  <p className="text-xs text-zinc-300">
                    Year range: <span className="font-medium text-zinc-100">{customYearRange.min}</span> -{" "}
                    <span className="font-medium text-zinc-100">{customYearRange.max}</span>
                  </p>
                  <div className="relative mt-3 h-8">
                    <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-zinc-700/70" />
                    <div
                      className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-violet-400/80"
                      style={{
                        left: `${customYearStartPct}%`,
                        right: `${100 - customYearEndPct}%`
                      }}
                    />
                    <input
                      className="dual-range dual-range-min absolute inset-0 w-full"
                      type="range"
                      min={YEAR_MIN}
                      max={YEAR_MAX}
                      value={customYearRange.min}
                      onChange={(event) => onUpdateCustomYearRange({ min: Number(event.target.value) })}
                    />
                    <input
                      className="dual-range dual-range-max absolute inset-0 w-full"
                      type="range"
                      min={YEAR_MIN}
                      max={YEAR_MAX}
                      value={customYearRange.max}
                      onChange={(event) => onUpdateCustomYearRange({ max: Number(event.target.value) })}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
                    <span>{YEAR_MIN}</span>
                    <span>{YEAR_MAX}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2">
              <label className="text-sm text-zinc-200">Language</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((language) => {
                  const selected = language === "any" ? !answers.languages?.length : answers.languages?.includes(language);
                  return (
                    <button
                      key={language}
                      className={
                        selected
                          ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                          : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                      }
                      onClick={() => onToggleLanguage(language)}
                    >
                      {language === "any" ? "Any language" : language.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <label className="text-sm text-zinc-200">Discovery style</label>
              <div className="flex flex-wrap gap-2">
                {FAMILIARITY_OPTIONS.map((familiarity) => {
                  const selected = familiarity === "any" ? !answers.familiarities?.length : answers.familiarities?.includes(familiarity);
                  return (
                    <button
                      key={familiarity}
                      className={
                        selected
                          ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                          : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                      }
                      onClick={() => onToggleFamiliarity(familiarity)}
                    >
                      {familiarity === "any"
                        ? "Any"
                        : familiarity === "popular"
                          ? "Popular picks"
                          : familiarity === "hidden-gems"
                            ? "Hidden gems"
                            : "For kids"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <label className="text-sm text-zinc-200">Provider</label>
              <div className="flex flex-wrap gap-2">
                <button
                  className={
                    !answers.providers?.length
                      ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                      : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                  }
                  onClick={() => onUpdateAnswers({ providers: [] })}
                >
                  No preference
                </button>
                {PROVIDER_OPTIONS.map((provider) => {
                  const selected = answers.providers?.includes(provider);
                  return (
                    <button
                      key={provider}
                      className={
                        selected
                          ? "rounded-full border border-violet-300/70 bg-violet-500/30 px-3 py-1.5 text-sm transition hover:bg-violet-500/40"
                          : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                      }
                      onClick={() => onToggleProvider(provider)}
                    >
                      {provider}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <label className="text-sm text-zinc-200">Avoid tonight</label>
              <div className="flex flex-wrap gap-2">
                {EXCLUSION_OPTIONS.map((exclusion) => {
                  const selected = answers.hardExclusions?.includes(exclusion);
                  return (
                    <button
                      key={exclusion}
                      className={
                        selected
                          ? "rounded-full border border-rose-300/70 bg-rose-500/25 px-3 py-1.5 text-sm transition hover:bg-rose-500/35"
                          : "rounded-full border border-white/25 bg-zinc-900/60 px-3 py-1.5 text-sm transition hover:border-white/45 hover:bg-zinc-800/70"
                      }
                      onClick={() => onToggleExclusion(exclusion)}
                    >
                      {exclusion}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <label className="text-sm text-zinc-200">Keywords (optional)</label>
              <input
                className="w-full rounded-xl border border-white/25 bg-zinc-900/75 px-3 py-2 text-sm text-zinc-100 outline-none backdrop-blur-md placeholder:text-zinc-400"
                type="text"
                value={(answers.keywords ?? []).join(", ")}
                onChange={(event) =>
                  onUpdateAnswers({
                    keywords: event.target.value
                      .split(",")
                      .map((item) => item.trim().toLowerCase())
                      .filter(Boolean)
                  })
                }
                placeholder="animation, black and white, slasher"
              />
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-zinc-300"></p>
        )}
      </section>
      {hasSelectedQuickMode ? (
        <div className="mt-5 flex justify-center">
          <button
            className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-7 py-2.5 font-medium text-white shadow-lg shadow-violet-900/40 transition hover:brightness-110 disabled:opacity-70"
            onClick={onStart}
            disabled={isBuildingDeck}
          >
            {isBuildingDeck ? "Building your deck..." : "Start"}
          </button>
        </div>
      ) : null}
    </>
  );
}
