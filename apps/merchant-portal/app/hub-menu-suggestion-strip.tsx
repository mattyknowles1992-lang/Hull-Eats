"use client";

import { useMemo, useState } from "react";

import { MENU_SUGGESTION_CHIP_BATCH, normalizeMenuSuggestionName } from "./hub-menu-pizza-presets";

type Props = {
  title?: string;
  suggestions: readonly string[];
  existingNames: ReadonlySet<string>;
  normalizeName?: (name: string) => string;
  batchSize?: number;
  readOnly?: boolean;
  formatAddName?: (suggestion: string) => string;
  onAdd: (name: string) => void;
};

export function HubMenuSuggestionStrip({
  title,
  suggestions,
  existingNames,
  normalizeName = normalizeMenuSuggestionName,
  batchSize = MENU_SUGGESTION_CHIP_BATCH,
  readOnly = false,
  formatAddName,
  onAdd,
}: Props) {
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => new Set());

  const availableSuggestions = useMemo(
    () =>
      suggestions.filter((name) => {
        const key = normalizeName(name);
        return key.length > 0 && !existingNames.has(key) && !dismissedKeys.has(key);
      }),
    [suggestions, existingNames, dismissedKeys, normalizeName],
  );

  const visibleSuggestions = availableSuggestions.slice(0, batchSize);

  if (readOnly || availableSuggestions.length === 0) {
    return null;
  }

  const dismissSuggestion = (name: string) => {
    const key = normalizeName(name);
    if (!key) {
      return;
    }
    setDismissedKeys((current) => {
      if (current.has(key)) {
        return current;
      }
      const next = new Set(current);
      next.add(key);
      return next;
    });
  };

  return (
    <section className="hub-menu-pizza-builder__popular hub-menu-suggestion-strip">
      {title ? (
        <div className="hub-menu-pizza-builder__popular-head">
          <strong>{title}</strong>
          <span className="hub-menu-suggestion-strip__hint">Top of list first — use × to see the next suggestion</span>
        </div>
      ) : (
        <p className="hub-menu-suggestion-strip__hint hub-menu-suggestion-strip__hint--solo">
          Suggested — + to add, × for next
        </p>
      )}
      <div className="hub-menu-pizza-builder__popular-row">
        {visibleSuggestions.map((name) => (
          <div key={name} className="hub-menu-suggestion-strip__chip">
            <span className="hub-menu-suggestion-strip__chip-label">{name}</span>
            <div className="hub-menu-suggestion-strip__chip-actions">
              <button
                type="button"
                className="hub-menu-suggestion-strip__chip-btn hub-menu-suggestion-strip__chip-btn--add"
                aria-label={`Add ${name}`}
                onClick={() => onAdd(formatAddName ? formatAddName(name) : name)}
              >
                +
              </button>
              <button
                type="button"
                className="hub-menu-suggestion-strip__chip-btn hub-menu-suggestion-strip__chip-btn--skip"
                aria-label={`Skip ${name}`}
                onClick={() => dismissSuggestion(name)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
