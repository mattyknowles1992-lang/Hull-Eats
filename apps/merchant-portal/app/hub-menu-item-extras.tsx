"use client";

import type { CSSProperties } from "react";

import type { HubExtraTopping } from "./menu-studio-core";

type HubMenuItemExtrasPickerProps = {
  toppings: HubExtraTopping[];
  enabled: boolean;
  paidExtraIds: Set<string>;
  priceById: Map<string, number>;
  includedQtyById: Map<string, number>;
  maxAddMoreById: Map<string, number>;
  onEnabledChange: (enabled: boolean) => void;
  onIncludedToggle: (toppingId: string, checked: boolean) => void;
  onPaidExtraToggle: (toppingId: string, checked: boolean) => void;
  onSelectAllPaid: () => void;
  onClearAll: () => void;
  onPriceChange: (toppingId: string, price: number) => void;
  onIncludedQtyChange: (toppingId: string, quantity: number) => void;
  onMaxAddMoreChange: (toppingId: string, quantity: number) => void;
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
  paidExtraIds,
  priceById,
  includedQtyById,
  maxAddMoreById,
  onEnabledChange,
  onIncludedToggle,
  onPaidExtraToggle,
  onSelectAllPaid,
  onClearAll,
  onPriceChange,
  onIncludedQtyChange,
  onMaxAddMoreChange,
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
        <strong>Let customers customise extras on this item</strong>
      </label>
      <p style={{ margin: 0, fontSize: "0.8rem", color: "#5b6470", lineHeight: 1.4 }}>
        <strong>Included</strong> = comes with the item (no extra charge). <strong>Add more (paid)</strong> = customers can
        buy extra portions up to your max. You can use included only, paid only, or both.
      </p>

      <div style={enabled ? toppingList : toppingListDisabled}>
        <div style={toolbar}>
          <button type="button" style={linkButton} disabled={readOnly || !enabled} onClick={onSelectAllPaid}>
            Enable all paid extras
          </button>
          <button type="button" style={linkButton} disabled={readOnly || !enabled} onClick={onClearAll}>
            Clear all
          </button>
        </div>
        {toppings.map((topping) => {
          const includedOn = enabled && (includedQtyById.get(topping.id) ?? 0) > 0;
          const paidOn = enabled && paidExtraIds.has(topping.id);
          const includedQty = includedQtyById.get(topping.id) ?? 0;
          const price = priceById.get(topping.id) ?? topping.price;
          const maxAddMore = maxAddMoreById.get(topping.id) ?? 8;
          const rowActive = includedOn || paidOn;

          return (
            <div key={topping.id} style={optionRow}>
              <span style={{ fontWeight: 700, minWidth: 100, flex: "1 1 120px" }}>{topping.label}</span>
              <label style={miniToggle}>
                <input
                  type="checkbox"
                  className="hub-menu-compose-tick"
                  checked={includedOn}
                  disabled={readOnly || !enabled}
                  onChange={(e) => onIncludedToggle(topping.id, e.target.checked)}
                />
                <span>Included</span>
              </label>
              <label style={qtyField}>
                <span>Incl.</span>
                <input
                  type="number"
                  min={0}
                  max={8}
                  disabled={readOnly || !enabled || !includedOn}
                  value={includedQty}
                  onChange={(e) => onIncludedQtyChange(topping.id, Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label style={miniToggle}>
                <input
                  type="checkbox"
                  className="hub-menu-compose-tick"
                  checked={paidOn}
                  disabled={readOnly || !enabled}
                  onChange={(e) => onPaidExtraToggle(topping.id, e.target.checked)}
                />
                <span>Add more</span>
              </label>
              <label style={qtyField}>
                <span>Max</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  disabled={readOnly || !enabled || !paidOn}
                  value={maxAddMore}
                  onChange={(e) => onMaxAddMoreChange(topping.id, Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label style={qtyField}>
                <span>Extra £</span>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  disabled={readOnly || !enabled || !paidOn}
                  className="hub-menu-item-extras__price"
                  value={price}
                  onChange={(e) => onPriceChange(topping.id, Number(e.target.value) || 0)}
                />
              </label>
              {!rowActive && enabled ? (
                <span style={{ fontSize: "0.72rem", color: "#9aa3ad", fontWeight: 600 }}>Off for this item</span>
              ) : null}
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

const miniToggle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "#3d4652",
};

const qtyField: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "#3d4652",
};
