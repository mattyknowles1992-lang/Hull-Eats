"use client";

import { useMemo, useState } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import { HUB_SAUCE_SUGGESTIONS, normalizeExtraSuggestionName } from "./hub-menu-extras-presets";
import { HubMenuSuggestionStrip } from "./hub-menu-suggestion-strip";
import { buildLocalMenuItem, formatMenuMoney } from "./menu-studio-core";

type HubMenuSaucesLibraryProps = {
  section: HubMenuSection;
  onAddSauce: (item: MenuItem) => void;
  onRemoveSauce: (itemId: string) => void;
  readOnly?: boolean;
};

export function HubMenuSaucesLibrary({ section, onAddSauce, onRemoveSauce, readOnly = false }: HubMenuSaucesLibraryProps) {
  const [name, setName] = useState("");
  const [extraPrice, setExtraPrice] = useState("");

  const existingNameKeys = useMemo(
    () => new Set(section.items.map((item) => normalizeExtraSuggestionName(item.name)).filter(Boolean)),
    [section.items],
  );

  const addSauce = (label: string) => {
    if (!label.trim()) {
      return;
    }
    const parsedPrice = Number(extraPrice);
    onAddSauce(
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
          Add each sauce once. Suggestions run in order — + to add, × to skip. On products, tick which sauces customers
          can pick (one included) and which can be added as paid extras.
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
              step="0.01"
              min={0}
              value={extraPrice}
              onChange={(e) => setExtraPrice(e.target.value)}
              placeholder="0.50"
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
              <span>
                <strong>{item.name}</strong>
                {Number(item.price) > 0 ? <> — extra {formatMenuMoney(Number(item.price))}</> : <> — included pick free</>}
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
                  onClick={() => onRemoveSauce(item.id)}
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
