"use client";

import { useMemo, useState } from "react";

import { HUB_EXTRA_SUGGESTIONS, normalizeExtraSuggestionName } from "./hub-menu-extras-presets";
import { HubMenuSuggestionStrip } from "./hub-menu-suggestion-strip";
import { buildLocalMenuItem, formatMenuMoney, HUB_DEFAULT_EXTRA_LIBRARY_PRICE, parseHubMenuPriceInput } from "./menu-studio-core";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

type HubMenuExtrasLibraryProps = {
  section: HubMenuSection;
  onAddTopping: (item: MenuItem) => void;
  onUpdateToppingPrice: (itemId: string, price: number) => void;
  onRemoveTopping: (itemId: string) => void;
  readOnly?: boolean;
};

export function HubMenuExtrasLibrary({
  section,
  onAddTopping,
  onUpdateToppingPrice,
  onRemoveTopping,
  readOnly = false,
}: HubMenuExtrasLibraryProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const existingNameKeys = useMemo(
    () => new Set(section.items.map((item) => normalizeExtraSuggestionName(item.name)).filter(Boolean)),
    [section.items],
  );

  const addExtra = (label: string, priceValue = price) => {
    if (!label.trim()) {
      return;
    }
    const parsedPrice = parseHubMenuPriceInput(priceValue, HUB_DEFAULT_EXTRA_LIBRARY_PRICE);
    onAddTopping(
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
    setPrice("");
  };

  const handleAdd = () => {
    addExtra(name);
  };

  return (
    <section className="hub-menu-extras-library">
      <div>
        <strong style={{ fontSize: "0.95rem" }}>Added extras list</strong>
        <p style={{ margin: "6px 0 0", fontSize: "0.84rem", color: "#5b6470", lineHeight: 1.45 }}>
          Toppings only — three suggestions at a time (+ to add, × for next). Defaults to {formatMenuMoney(HUB_DEFAULT_EXTRA_LIBRARY_PRICE)}.
          Bases and crusts belong on the pizza category, not here.
        </p>
      </div>

      <HubMenuSuggestionStrip
        suggestions={HUB_EXTRA_SUGGESTIONS}
        existingNames={existingNameKeys}
        normalizeName={normalizeExtraSuggestionName}
        batchSize={3}
        readOnly={readOnly}
        onAdd={(label) => addExtra(label)}
      />

      {!readOnly ? (
        <div className="hub-menu-extras-library__add-row">
          <label className="hub-menu-extras-library__field">
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Extra name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pepperoni" />
          </label>
          <label className="hub-menu-extras-library__field">
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Price (£)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={HUB_DEFAULT_EXTRA_LIBRARY_PRICE.toFixed(2)}
            />
          </label>
          <button type="button" className="hub-menu-extras-library__add-btn" onClick={handleAdd}>
            Add extra
          </button>
        </div>
      ) : null}

      {section.items.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.84rem", color: "#5b6470" }}>No extras yet — add pepperoni, ham, mushrooms, etc.</p>
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
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={item.price}
                    aria-label={`Price for ${item.name}`}
                    onChange={(e) => onUpdateToppingPrice(item.id, Number(e.target.value) || 0)}
                  />
                </label>
              )}
              {Number(item.price) <= 0 ? (
                <span className="hub-menu-extras-library__zero-note">Set a price — £0 extras are free for customers</span>
              ) : null}
              {readOnly ? null : (
                <button type="button" className="hub-menu-extras-library__remove-btn" onClick={() => onRemoveTopping(item.id)}>
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
