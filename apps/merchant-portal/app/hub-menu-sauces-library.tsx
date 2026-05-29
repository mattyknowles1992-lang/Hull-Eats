"use client";

import { useMemo, useState } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import { HUB_SAUCE_SUGGESTIONS, normalizeExtraSuggestionName } from "./hub-menu-extras-presets";
import { HubMenuSuggestionStrip } from "./hub-menu-suggestion-strip";
import {
  buildLocalMenuItem,
  formatMenuMoney,
  HUB_DEFAULT_SAUCE_EXTRA_LIBRARY_PRICE,
  parseHubMenuPriceInput,
} from "./menu-studio-core";

type HubMenuSaucesLibraryProps = {
  section: HubMenuSection;
  onAddSauce: (item: MenuItem) => void;
  onUpdateSaucePrice: (itemId: string, extraPrice: number) => void;
  onRemoveSauce: (itemId: string) => void;
  readOnly?: boolean;
};

export function HubMenuSaucesLibrary({
  section,
  onAddSauce,
  onUpdateSaucePrice,
  onRemoveSauce,
  readOnly = false,
}: HubMenuSaucesLibraryProps) {
  const [name, setName] = useState("");
  const [extraPrice, setExtraPrice] = useState("");

  const existingNameKeys = useMemo(
    () => new Set(section.items.map((item) => normalizeExtraSuggestionName(item.name)).filter(Boolean)),
    [section.items],
  );

  const addSauce = (label: string, priceValue = extraPrice) => {
    if (!label.trim()) {
      return;
    }
    const parsedPrice = parseHubMenuPriceInput(priceValue, HUB_DEFAULT_SAUCE_EXTRA_LIBRARY_PRICE);
    onAddSauce(
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

  const handleAdd = () => {
    addSauce(name);
  };

  return (
    <section className="hub-menu-extras-library hub-menu-sauces-library">
      <div>
        <strong style={{ fontSize: "0.95rem" }}>Sauces list</strong>
        <p style={{ margin: "6px 0 0", fontSize: "0.84rem", color: "#5b6470", lineHeight: 1.45 }}>
          Add each sauce once. Included sauce picks stay free on products — edit the extra portion price below (suggestions
          default to {formatMenuMoney(HUB_DEFAULT_SAUCE_EXTRA_LIBRARY_PRICE)}).
        </p>
      </div>

      <HubMenuSuggestionStrip
        title="Suggested sauces"
        suggestions={HUB_SAUCE_SUGGESTIONS}
        existingNames={existingNameKeys}
        normalizeName={normalizeExtraSuggestionName}
        readOnly={readOnly}
        onAdd={addSauce}
      />

      {!readOnly ? (
        <div className="hub-menu-extras-library__add-row">
          <label className="hub-menu-extras-library__field">
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Sauce name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Garlic mayo" />
          </label>
          <label className="hub-menu-extras-library__field">
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Extra portion price (£)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={extraPrice}
              onChange={(e) => setExtraPrice(e.target.value)}
              placeholder={HUB_DEFAULT_SAUCE_EXTRA_LIBRARY_PRICE.toFixed(2)}
            />
          </label>
          <button type="button" className="hub-menu-extras-library__add-btn" onClick={handleAdd}>
            Add sauce
          </button>
        </div>
      ) : null}

      {section.items.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.84rem", color: "#5b6470" }}>No sauces yet — add BBQ, garlic mayo, chilli, etc.</p>
      ) : (
        <ul className="hub-menu-extras-library__list">
          {section.items.map((item) => (
            <li key={item.id} className="hub-menu-extras-library__row">
              <span className="hub-menu-extras-library__row-name">
                <strong>{item.name}</strong>
              </span>
              {readOnly ? (
                <span>
                  {Number(item.price) > 0 ? <>extra {formatMenuMoney(Number(item.price))}</> : <>included pick free</>}
                </span>
              ) : (
                <label className="hub-menu-extras-library__price-field">
                  <span>Extra £</span>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={item.price}
                    aria-label={`Extra portion price for ${item.name}`}
                    onChange={(e) => onUpdateSaucePrice(item.id, Number(e.target.value) || 0)}
                  />
                </label>
              )}
              {readOnly ? null : (
                <button type="button" className="hub-menu-extras-library__remove-btn" onClick={() => onRemoveSauce(item.id)}>
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
