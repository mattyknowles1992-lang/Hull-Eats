"use client";

import { useMemo, useState } from "react";

import type { HubMenuSection } from "@hull-eats/types";

import {
  normalizePizzaChoiceSuggestionName,
  PIZZA_BASE_SUGGESTIONS,
  PIZZA_CRUST_SUGGESTIONS,
} from "./hub-menu-extras-presets";
import { HubMenuSuggestionStrip } from "./hub-menu-suggestion-strip";
import {
  applyPizzaCategoryChoicesToSectionItems,
  createPizzaCategoryChoiceRow,
  existingPizzaChoiceNameKeys,
  readPizzaCategoryChoicesFromSection,
  writePizzaCategoryChoicesOnSection,
  type PizzaCategoryChoiceRow,
  type PizzaCategoryChoicesConfig,
} from "./pizza-category-choices";

type Props = {
  section: HubMenuSection;
  readOnly?: boolean;
  onPatchSection: (updater: (section: HubMenuSection) => HubMenuSection) => void;
};

function ChoiceListEditor({
  label,
  kind,
  hint,
  suggestions,
  rows,
  readOnly,
  onChange,
  onApplyAll,
}: {
  label: string;
  kind: "base" | "crust";
  hint: string;
  suggestions: readonly string[];
  rows: PizzaCategoryChoiceRow[];
  readOnly: boolean;
  onChange: (rows: PizzaCategoryChoiceRow[]) => void;
  onApplyAll: () => void;
}) {
  const [draftName, setDraftName] = useState("");
  const [draftPrice, setDraftPrice] = useState("");

  const existingNames = useMemo(() => existingPizzaChoiceNameKeys(rows), [rows]);

  const addRow = (name: string, price = draftPrice) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const key = trimmed.toLowerCase();
    if (existingNames.has(key)) {
      return;
    }
    const created = createPizzaCategoryChoiceRow(trimmed, kind);
    if (price.trim()) {
      created.price = price.trim();
    }
    onChange([...rows, created]);
    setDraftName("");
    setDraftPrice("");
  };

  return (
    <section className="hub-menu-pizza-choices">
      <div className="hub-menu-pizza-choices__head">
        <strong>{label}</strong>
        <p>{hint}</p>
      </div>

      <HubMenuSuggestionStrip
        suggestions={suggestions}
        existingNames={existingNames}
        normalizeName={normalizePizzaChoiceSuggestionName}
        batchSize={1}
        readOnly={readOnly}
        onAdd={(name) => addRow(name)}
      />

      {!readOnly ? (
        <div className="hub-menu-extras-library__add-row">
          <label className="hub-menu-extras-library__field">
            <span>Name</span>
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="e.g. Tomato" />
          </label>
          <label className="hub-menu-extras-library__field">
            <span>Extra £</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={draftPrice}
              onChange={(e) => setDraftPrice(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <button type="button" className="hub-menu-extras-library__add-btn" onClick={() => addRow(draftName)}>
            Add
          </button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="hub-menu-pizza-choices__empty">None yet — add tomato, BBQ, garlic, etc.</p>
      ) : (
        <ul className="hub-menu-extras-library__list">
          {rows.map((row) => (
            <li key={row.id} className="hub-menu-extras-library__row">
              <span className="hub-menu-extras-library__row-name">
                <strong>{row.label}</strong>
              </span>
              {readOnly ? (
                <span>£{Number(row.price || 0).toFixed(2)}</span>
              ) : (
                <label className="hub-menu-extras-library__price-field">
                  <span>Extra £</span>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={row.price}
                    aria-label={`Price for ${row.label}`}
                    onChange={(e) =>
                      onChange(rows.map((entry) => (entry.id === row.id ? { ...entry, price: e.target.value } : entry)))
                    }
                  />
                </label>
              )}
              {readOnly ? null : (
                <button
                  type="button"
                  className="hub-menu-extras-library__remove-btn"
                  onClick={() => onChange(rows.filter((entry) => entry.id !== row.id))}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && rows.length > 0 ? (
        <button type="button" className="hub-menu-pizza-choices__apply-btn" onClick={onApplyAll}>
          Apply to all pizzas
        </button>
      ) : null}
    </section>
  );
}

export function HubMenuPizzaCategoryChoicesPanel({ section, readOnly = false, onPatchSection }: Props) {
  const choices = useMemo(() => readPizzaCategoryChoicesFromSection(section), [section.description, section.presetKey]);

  const patchChoices = (updater: (current: PizzaCategoryChoicesConfig) => PizzaCategoryChoicesConfig) => {
    onPatchSection((current) => writePizzaCategoryChoicesOnSection(current, updater(readPizzaCategoryChoicesFromSection(current))));
  };

  const applyChoices = (options: { bases?: boolean; crusts?: boolean }) => {
    onPatchSection((current) => {
      const config = readPizzaCategoryChoicesFromSection(current);
      const withChoices = writePizzaCategoryChoicesOnSection(current, config);
      return applyPizzaCategoryChoicesToSectionItems(withChoices, config, { ...options, kinds: ["pizza"] });
    });
  };

  return (
    <div className="hub-menu-pizza-choices-panel">
      <div className="hub-menu-order-builder__intro">
        <strong>Pizza bases &amp; crusts</strong>
        <p>
          Build your base and crust lists here with prices, then apply to every pizza row. Customers pick one base and one
          crust when ordering — not from the extras list.
        </p>
      </div>

      <ChoiceListEditor
        label="Pizza bases"
        kind="base"
        hint="Tomato is usually £0. BBQ, garlic, and other bases add an extra charge."
        suggestions={PIZZA_BASE_SUGGESTIONS}
        rows={choices.bases}
        readOnly={readOnly}
        onChange={(bases) => patchChoices((current) => ({ ...current, bases }))}
        onApplyAll={() => applyChoices({ bases: true, crusts: false })}
      />

      <ChoiceListEditor
        label="Pizza crusts"
        kind="crust"
        hint="Regular is usually £0. Stuffed and specialty crusts add an extra charge."
        suggestions={PIZZA_CRUST_SUGGESTIONS}
        rows={choices.crusts}
        readOnly={readOnly}
        onChange={(crusts) => patchChoices((current) => ({ ...current, crusts }))}
        onApplyAll={() => applyChoices({ bases: false, crusts: true })}
      />

      {!readOnly && choices.bases.length > 0 && choices.crusts.length > 0 ? (
        <button type="button" className="hub-menu-pizza-choices__apply-btn hub-menu-pizza-choices__apply-btn--all" onClick={() => applyChoices({ bases: true, crusts: true })}>
          Apply bases &amp; crusts to all pizzas
        </button>
      ) : null}
    </div>
  );
}
