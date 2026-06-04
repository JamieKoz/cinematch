import { useEffect, useId, useRef, useState } from "react";
import { DEFAULT_LANGUAGES, getLanguageOption, LANGUAGE_OPTIONS } from "../config/options";

export function LanguageMultiSelect({
  selected,
  onChange
}: {
  selected: string[];
  onChange: (languages: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function commitSelection(next: string[]) {
    onChange(next.length ? next : [...DEFAULT_LANGUAGES]);
  }

  function toggleCode(code: string) {
    const isSelected = selected.includes(code);
    if (isSelected) {
      commitSelection(selected.filter((value) => value !== code));
      return;
    }
    commitSelection([...selected, code]);
  }

  function removeCode(code: string) {
    commitSelection(selected.filter((value) => value !== code));
  }

  const triggerLabel =
    selected.length === 1
      ? (getLanguageOption(selected[0]!)?.label ?? selected[0]!.toUpperCase())
      : `${selected.length} languages selected`;

  return (
    <div ref={rootRef} className="language-multiselect">
      <div className="language-multiselect__selected">
        {selected.map((code) => {
          const option = getLanguageOption(code);
          return (
            <span key={code} className="language-multiselect__tag">
              {option?.flag ? <span className="language-multiselect__tag-flag">{option.flag}</span> : null}
              <span>{option?.label ?? code.toUpperCase()}</span>
              <button
                type="button"
                className="language-multiselect__tag-remove"
                aria-label={`Remove ${option?.label ?? code}`}
                onClick={() => removeCode(code)}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>

      <button
        type="button"
        className="language-multiselect__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="language-multiselect__trigger-label">Add or change languages</span>
        <span className="language-multiselect__trigger-value">{triggerLabel}</span>
        <svg
          className={`language-multiselect__chevron${open ? " language-multiselect__chevron--open" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <ul id={listboxId} className="language-multiselect__menu" role="listbox" aria-multiselectable="true">
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = selected.includes(option.code);
            return (
              <li key={option.code} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={
                    isSelected
                      ? "language-multiselect__option language-multiselect__option--selected"
                      : "language-multiselect__option"
                  }
                  onClick={() => toggleCode(option.code)}
                >
                  <span className="language-multiselect__option-flag" aria-hidden="true">
                    {option.flag ?? "🌐"}
                  </span>
                  <span className="language-multiselect__option-label">{option.label}</span>
                  {isSelected ? (
                    <svg
                      className="language-multiselect__check"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.333a1 1 0 0 1-1.414 0l-3.25-3.333a1 1 0 1 1 1.414-1.414l2.516 2.58 6.542-6.61a1 1 0 0 1 1.438-.01Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
