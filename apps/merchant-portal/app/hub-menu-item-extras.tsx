"use client";

import type { CSSProperties } from "react";

import type { HubExtraTopping } from "./menu-studio-core";

type HubMenuItemExtrasPickerProps = {
  toppings: HubExtraTopping[];
  enabled: boolean;
  selectedIds: Set<string>;
  priceById: Map<string, number>;
  includedQtyById: Map<string, number>;
  onEnabledChange: (enabled: boolean) => void;
  onToggle: (toppingId: string, checked: boolean) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onPriceChange: (toppingId: string, price: number) => void;
  onIncludedQtyChange: (toppingId: string, quantity: number) => void;
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
  includedQtyById,
  onEnabledChange,
  onToggle,
  onSelectAll,
  onClearAll,
  onPriceChange,
  onIncludedQtyChange,
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
        <strong>Let customers add extras on this item</strong>
      </label>
      <p style={{ margin: 0, fontSize: "0.8rem", color: "#5b6470", lineHeight: 1.4 }}>
        <strong>Included qty</strong> = comes with the item at no extra cost. <strong>Extra £</strong> = charged for each
        portion above the included amount (or for every portion if included is 0).
      </p>

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
          const includedQty = includedQtyById.get(topping.id) ?? 0;
          return (
            <div key={topping.id} style={optionRow}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={readOnly || !enabled}
                  onChange={(e) => onToggle(topping.id, e.target.checked)}
                />
                <span style={{ fontWeight: 700 }}>{topping.label}</span>
              </label>
              <label style={qtyField}>
                <span>Incl.</span>
                <input
                  type="number"
                  min={0}
                  max={8}
                  disabled={readOnly || !enabled || !checked}
                  value={includedQty}
                  onChange={(e) => onIncludedQtyChange(topping.id, Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label style={qtyField}>
                <span>Extra £</span>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  disabled={readOnly || !enabled || !checked}
                  className="hub-menu-item-extras__price"
                  value={price}
                  onChange={(e) => onPriceChange(topping.id, Number(e.target.value) || 0)}
                />
              </label>
            </div>
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
  flexWrap: "wrap",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 10,
  background: "rgba(15, 17, 21, 0.03)",
};

const qtyField: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "#3d4652",
};

