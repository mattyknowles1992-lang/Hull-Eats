"use client";

import { useMemo, useState } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import { HUB_SALAD_SUGGESTIONS, normalizeExtraSuggestionName } from "./hub-menu-extras-presets";
import { HubMenuSuggestionStrip } from "./hub-menu-suggestion-strip";
import { HubFreeTypeNumberInput } from "./hub-free-type-number-input";
import {
  buildLocalMenuItem,
  formatMenuMoney,
  HUB_DEFAULT_SAUCE_EXTRA_LIBRARY_PRICE,
  parseHubMenuPriceInput,
} from "./menu-studio-core";

type HubMenuSaladLibraryProps = {
  section: HubMenuSection;
  onAddSalad: (item: MenuItem) => void;
  onUpdateSaladPrice: (itemId: string, extraPrice: number) => void;
  onRemoveSalad: (itemId: string) => void;
  readOnly?: boolean;
};

export function HubMenuSaladLibrary({
  section,
  onAddSalad,
  onUpdateSaladPrice,
  onRemoveSalad,
  readOnly = false,
}: HubMenuSaladLibraryProps) {
  const [name, setName] = useState("");
  const [extraPrice, setExtraPrice] = useState("");

  const existingNameKeys = useMemo(
    () => new Set(section.items.map((item) => normalizeExtraSuggestionName(item.name)).filter(Boolean)),
    [section.items],
  );

  const addSalad = (label: string, priceValue = extraPrice) => {
    if (!label.trim()) {
      return;
    }
    const parsedPrice = parseHubMenuPriceInput(priceValue, HUB_DEFAULT_SAUCE_EXTRA_LIBRARY_PRICE);
    onAddSalad(
      buildLocalMenuItem({
        categoryId: section.id,
        name: label.trim(),
        description: "",
        price: parsedPrice,
        requiresIdVerification: false,
        isActive: true,
        components: [],
        optionGroups: [],
      }),
    );
    setName("");
    setExtraPrice("");
  };

  return (
    <section className="hub-menu-extras-library hub-menu-salad-library">
      <div>
        <strong style={{ fontSize: "0.95rem" }}>Salad list</strong>
        <p style={{ margin: "6px 0 0", fontSize: "0.84rem", color: "#5b6470", lineHeight: 1.45 }}>
          Lettuce, tomato, onion, and other garnishes. Tick included salad on each product; optional paid extras use the
          price below (defaults to {formatMenuMoney(HUB_DEFAULT_SAUCE_EXTRA_LIBRARY_PRICE)}).
        </p>
      </div>

      <HubMenuSuggestionStrip
        title="Suggested salad"
        suggestions={HUB_SALAD_SUGGESTIONS}
        existingNames={existingNameKeys}
        normalizeName={normalizeExtraSuggestionName}
        readOnly={readOnly}
        onAdd={addSalad}
      />

      {!readOnly ? (
        <div className="hub-menu-extras-library__add-row">
          <label className="hub-menu-extras-library__field">
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Salad name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lettuce" />
          </label>
          <label className="hub-menu-extras-library__field">
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Extra portion (£)</span>
            <input
              value={extraPrice}
              onChange={(e) => setExtraPrice(e.target.value)}
              placeholder={HUB_DEFAULT_SAUCE_EXTRA_LIBRARY_PRICE.toFixed(2)}
            />
          </label>
          <button type="button" className="hub-menu-extras-library__add-btn" onClick={() => addSalad(name)}>
            Add salad
          </button>
        </div>
      ) : null}

      {section.items.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.84rem", color: "#5b6470" }}>No salad choices yet.</p>
      ) : (
        <ul className="hub-menu-extras-library__list">
          {section.items.map((item) => (
            <li key={item.id} className="hub-menu-extras-library__row">
              <span className="hub-menu-extras-library__row-name">
                <strong>{item.name}</strong>
              </span>
              {readOnly ? (
                <span>{formatMenuMoney(item.price)}</span>
              ) : (
                <label className="hub-menu-extras-library__price-field">
                  <span>£</span>
                  <HubFreeTypeNumberInput
                    min={0}
                    value={item.price}
                    aria-label={`Extra price for ${item.name}`}
                    onCommit={(price) => onUpdateSaladPrice(item.id, price)}
                  />
                </label>
              )}
              {readOnly ? null : (
                <button type="button" className="hub-menu-extras-library__remove-btn" onClick={() => onRemoveSalad(item.id)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
