"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import type { MenuItem } from "@hull-eats/types";

import { applyComponentsToItem, createEmptyComponent } from "./menu-studio-core";

type Props = {
  item: MenuItem;
  readOnly?: boolean;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
};

export function HubMenuItemIngredients({ item, readOnly = false, onUpdateItem }: Props) {
  const [syncDescription, setSyncDescription] = useState(true);

  const patchComponents = (components: MenuItem["components"]) => {
    onUpdateItem((current) => applyComponentsToItem(current, components, { syncDescription }));
  };

  return (
    <section className="hub-menu-ingredients">
      <div style={headerRow}>
        <div>
          <strong style={title}>What&apos;s in this item</strong>
          <p style={copy}>List parts (bun, patty, cheese, salad). These can be listed automatically in the customer description.</p>
        </div>
        <button
          type="button"
          style={addPartButton}
          disabled={readOnly}
          onClick={() => patchComponents([...item.components, createEmptyComponent()])}
        >
          + Add part
        </button>
      </div>

      <label style={syncRow}>
        <input
          type="checkbox"
          checked={syncDescription}
          disabled={readOnly}
          onChange={(e) => setSyncDescription(e.target.checked)}
        />
        <span>List ingredients in customer description (Includes: …)</span>
      </label>

      {item.components.length === 0 ? (
        <p style={empty}>Optional — e.g. bun, 2× 3oz smash patty, cheese, lettuce, gherkins.</p>
      ) : (
        <ul style={list}>
          {item.components.map((component) => (
            <li key={component.id} style={row}>
              <input
                style={input}
                value={component.label}
                disabled={readOnly}
                placeholder="e.g. Brioche bun"
                onChange={(e) =>
                  patchComponents(
                    item.components.map((entry) =>
                      entry.id === component.id ? { ...entry, label: e.target.value } : entry,
                    ),
                  )
                }
              />
              <input
                type="number"
                min={1}
                style={qtyInput}
                value={component.quantity}
                disabled={readOnly}
                title="Quantity"
                onChange={(e) =>
                  patchComponents(
                    item.components.map((entry) =>
                      entry.id === component.id
                        ? { ...entry, quantity: Math.max(1, Number(e.target.value) || 1) }
                        : entry,
                    ),
                  )
                }
              />
              <label style={removeLabel}>
                <input
                  type="checkbox"
                  checked={component.removable}
                  disabled={readOnly}
                  onChange={(e) =>
                    patchComponents(
                      item.components.map((entry) =>
                        entry.id === component.id ? { ...entry, removable: e.target.checked } : entry,
                      ),
                    )
                  }
                />
                <span>Can remove</span>
              </label>
              {readOnly ? null : (
                <button
                  type="button"
                  style={removeBtn}
                  onClick={() => patchComponents(item.components.filter((entry) => entry.id !== component.id))}
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

const headerRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};
const title: CSSProperties = { fontSize: "0.92rem" };
const copy: CSSProperties = { margin: "4px 0 0", fontSize: "0.8rem", color: "#5b6470", lineHeight: 1.4 };
const syncRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem", fontWeight: 600 };
const empty: CSSProperties = { margin: 0, fontSize: "0.84rem", color: "#5b6470" };
const list: CSSProperties = { margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 };
const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 72px auto auto",
  gap: 10,
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fafbfc",
};
const input: CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.15)",
  font: "inherit",
  boxSizing: "border-box",
};
const qtyInput: CSSProperties = { ...input, textAlign: "center" };
const removeLabel: CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", whiteSpace: "nowrap" };
const addPartButton: CSSProperties = {
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(180deg, #23cdff, #079bc8)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};
const removeBtn: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#b42318",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "0.82rem",
};
