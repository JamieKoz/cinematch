import { EXCLUSION_OPTIONS } from "../config/options";

export function AvoidTonightPicker({
  selected,
  onToggle
}: {
  selected: string[];
  onToggle: (genre: string) => void;
}) {
  return (
    <div className="avoid-tonight__grid">
      {EXCLUSION_OPTIONS.map((genre) => {
        const isSelected = selected.includes(genre);
        return (
          <button
            key={genre}
            type="button"
            className={
              isSelected
                ? "onboarding-choice-card onboarding-choice-card--exclusion onboarding-choice-card--exclusion-selected"
                : "onboarding-choice-card onboarding-choice-card--exclusion"
            }
            onClick={() => onToggle(genre)}
            aria-pressed={isSelected}
          >
            <span className="text-base font-semibold text-white sm:text-lg">{genre}</span>
          </button>
        );
      })}
    </div>
  );
}
