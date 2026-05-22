"use client";

import { useState } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

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

  const handleAdd = () => {
    if (!name.trim()) {
      return;
    }
    const parsedPrice = Number(price);
    onAddTopping(
      buildLocalMenuItem({
        categoryId: section.id,
        name: name.trim(),
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

  return (
    <section className="hub-menu-extras-library">
      <div>
        <strong style={{ fontSize: "0.95rem" }}>Added extras list</strong>
        <p style={{ margin: "6px 0 0", fontSize: "0.84rem", color: "#5b6470", lineHeight: 1.45 }}>
          Add each extra once with a price. On each product, tick which extras customers can pick.
        </p>
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
              step="0.01"
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
