"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import type { HubMenuSection } from "@hull-eats/types";

import type { MenuItem } from "@hull-eats/types";

import { buildLocalMenuItem, formatMenuMoney } from "./menu-studio-core";

type HubMenuExtrasLibraryProps = {
  section: HubMenuSection;
  onAddTopping: (item: MenuItem) => void;
  onRemoveTopping: (itemId: string) => void;
  readOnly?: boolean;
};

const card: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(7, 155, 200, 0.22)",
  background: "rgba(7, 155, 200, 0.06)",
  display: "grid",
  gap: 12,
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
    <section style={card}>
      <div>
        <strong style={{ fontSize: "0.95rem" }}>Extra toppings list</strong>
        <p style={{ margin: "6px 0 0", fontSize: "0.84rem", color: "#5b6470", lineHeight: 1.45 }}>
          Add each topping once with a price. On each pizza (or item), tick which extras customers can pick — prices can be adjusted per item.
        </p>
      </div>

      {!readOnly ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 100px auto", gap: 8, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Topping name</span>
            <input
              style={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pepperoni"
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Price (£)</span>
            <input
              type="number"
              step="0.01"
              min={0}
              style={input}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1.50"
            />
          </label>
          <button type="button" style={addButton} onClick={handleAdd}>
            Add topping
          </button>
        </div>
      ) : null}

      {section.items.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.84rem", color: "#5b6470" }}>No toppings yet — add pepperoni, ham, mushrooms, etc.</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
          {section.items.map((item) => (
            <li key={item.id} style={row}>
              <span>
                <strong>{item.name}</strong> — {formatMenuMoney(item.price)}
              </span>
              {readOnly ? null : (
                <button type="button" style={removeButton} onClick={() => onRemoveTopping(item.id)}>
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

const input: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.15)",
  font: "inherit",
};

const addButton: CSSProperties = {
  minHeight: 42,
  padding: "0 14px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #079bc8, #0680a6)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 10,
  background: "#fff",
  border: "1px solid rgba(15, 17, 21, 0.08)",
};

const removeButton: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#b42318",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "0.8rem",
};
