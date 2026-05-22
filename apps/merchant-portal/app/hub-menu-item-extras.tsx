"use client";

import type { CSSProperties } from "react";

import type { HubExtraTopping } from "./menu-studio-core";

type HubMenuItemExtrasPickerProps = {
  toppings: HubExtraTopping[];
  enabled: boolean;
  selectedIds: Set<string>;
  priceById: Map<string, number>;
  onEnabledChange: (enabled: boolean) => void;
  onToggle: (toppingId: string, checked: boolean) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onPriceChange: (toppingId: string, price: number) => void;
  readOnly?: boolean;
};

const panel: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  display: "grid",
  gap: 10,
};

export function HubMenuItemExtrasPicker({
  toppings,
  enabled,
  selectedIds,
  priceById,
  onEnabledChange,
  onToggle,
  onSelectAll,
  onClearAll,
  onPriceChange,
  readOnly = false,
}: HubMenuItemExtrasPickerProps) {
  if (toppings.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: "0.84rem", color: "#5b6470" }}>
        Add extras under <strong>Added extras</strong> on the left first.
      </p>
    );
  }

  return (
    <div style={panel}>
      <label style={toggleRow}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={readOnly}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <strong>Let customers add extra toppings on this item</strong>
      </label>

      <div style={enabled ? toppingList : toppingListDisabled}>
        <div style={toolbar}>
          <button type="button" style={linkButton} disabled={readOnly || !enabled} onClick={onSelectAll}>
            Select all
          </button>
          <button type="button" style={linkButton} disabled={readOnly || !enabled} onClick={onClearAll}>
            Clear all
          </button>
        </div>
        {toppings.map((topping) => {
          const checked = enabled && selectedIds.has(topping.id);
          const price = priceById.get(topping.id) ?? topping.price;
          return (
            <label key={topping.id} style={optionRow}>
              <input
                type="checkbox"
                checked={checked}
                disabled={readOnly || !enabled}
                onChange={(e) => onToggle(topping.id, e.target.checked)}
              />
              <span style={{ flex: 1, fontWeight: 700 }}>{topping.label}</span>
              <input
                type="number"
                step="0.01"
                min={0}
                disabled={readOnly || !enabled || !checked}
                className="hub-menu-item-extras__price"
                style={{ opacity: enabled && checked ? 1 : 0.45 }}
                value={price}
                onChange={(e) => onPriceChange(topping.id, Number(e.target.value) || 0)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

const toggleRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

const toolbar: CSSProperties = {
  display: "flex",
  gap: 12,
};

const linkButton: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#0680a6",
  fontWeight: 800,
  cursor: "pointer",
  padding: 0,
  fontSize: "0.84rem",
};

const toppingList: CSSProperties = { display: "grid", gap: 6 };

const toppingListDisabled: CSSProperties = {
  ...toppingList,
  opacity: 0.45,
  pointerEvents: "none",
  userSelect: "none",
};

const optionRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 10,
  background: "rgba(15, 17, 21, 0.03)",
  cursor: "pointer",
};

