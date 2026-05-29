"use client";

import { useMemo, useState } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import { HUB_EXTRA_SUGGESTION_GROUPS, normalizeExtraSuggestionName } from "./hub-menu-extras-presets";
import { HubMenuSuggestionStrip } from "./hub-menu-suggestion-strip";
import { buildLocalMenuItem, formatMenuMoney } from "./menu-studio-core";

type HubMenuExtrasLibraryProps = {
  section: HubMenuSection;
  onAddTopping: (item: MenuItem) => void;
  onRemoveTopping: (itemId: string) => void;
  readOnly?: boolean;
};

export function HubMenuExtrasLibrary({ section, onAddTopping, onRemoveTopping, readOnly = false }: HubMenuExtrasLibraryProps) {
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
    const parsedPrice = Number(priceValue);
    onAddTopping(
      buildLocalMenuItem({
        categoryId: section.id,
        name: label.trim(),
        description: "",
        price: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0,
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
          Add each extra once with a price. Suggestions run in order — + to add, × to skip to the next. On each product,
          tick which extras customers can pick.
        </p>
      </div>

      <div className="hub-menu-extras-library__suggestions">
        {HUB_EXTRA_SUGGESTION_GROUPS.map((group) => (
          <HubMenuSuggestionStrip
            key={group.id}
            title={`Suggested ${group.label.toLowerCase()}`}
            suggestions={group.suggestions}
            existingNames={existingNameKeys}
            normalizeName={normalizeExtraSuggestionName}
            readOnly={readOnly}
            onAdd={(label) => addExtra(label)}
          />
        ))}
      </div>

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
              placeholder="1.50"
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
              <span>
                <strong>{item.name}</strong> — {formatMenuMoney(item.price)}
              </span>
              {readOnly ? null : (
                <button
                  type="button"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#b42318",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                  onClick={() => onRemoveTopping(item.id)}
                >
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
