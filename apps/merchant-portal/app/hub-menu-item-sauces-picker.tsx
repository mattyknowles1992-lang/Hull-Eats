"use client";

import type { CSSProperties } from "react";

import type { HubSauceOption } from "./menu-studio-core";

type HubMenuItemSaucesPickerProps = {
  sauces: HubSauceOption[];
  enabled: boolean;
  includedIds: Set<string>;
  extraEnabled: boolean;
  extraIds: Set<string>;
  extraPriceById: Map<string, number>;
  onEnabledChange: (enabled: boolean) => void;
  onIncludedToggle: (sauceId: string, checked: boolean) => void;
  onSelectAllIncluded: () => void;
  onClearIncluded: () => void;
  onExtraEnabledChange: (enabled: boolean) => void;
  onExtraToggle: (sauceId: string, checked: boolean) => void;
  onExtraPriceChange: (sauceId: string, price: number) => void;
  readOnly?: boolean;
};

const panel: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  display: "grid",
  gap: 12,
};

const sectionTitle: CSSProperties = { margin: 0, fontSize: "0.88rem", fontWeight: 800, color: "#101216" };

export function HubMenuItemSaucesPicker({
  sauces,
  enabled,
  includedIds,
  extraEnabled,
  extraIds,
  extraPriceById,
  onEnabledChange,
  onIncludedToggle,
  onSelectAllIncluded,
  onClearIncluded,
  onExtraEnabledChange,
  onExtraToggle,
  onExtraPriceChange,
  readOnly = false,
}: HubMenuItemSaucesPickerProps) {
  if (sauces.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: "0.84rem", color: "#5b6470" }}>
        Add sauces under <strong>Added extras</strong> → <strong>Sauces list</strong> on the left first.
      </p>
    );
  }

  return (
    <div style={panel}>
      <label style={toggleRow}>
        <input type="checkbox" checked={enabled} disabled={readOnly} onChange={(e) => onEnabledChange(e.target.checked)} />
        <strong>Let customers choose a sauce on this item</strong>
      </label>

      <div style={enabled ? block : blockDisabled}>
        <p style={sectionTitle}>Included sauce (customer picks one)</p>
        <div style={toolbar}>
          <button type="button" style={linkButton} disabled={readOnly || !enabled} onClick={onSelectAllIncluded}>
            Select all
          </button>
          <button type="button" style={linkButton} disabled={readOnly || !enabled} onClick={onClearIncluded}>
            Clear all
          </button>
        </div>
        <div style={optionList}>
          {sauces.map((sauce) => {
            const checked = enabled && includedIds.has(sauce.id);
            return (
              <label key={`inc-${sauce.id}`} style={optionRow}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={readOnly || !enabled}
                  onChange={(e) => onIncludedToggle(sauce.id, e.target.checked)}
                />
                <span style={{ flex: 1, fontWeight: 700 }}>{sauce.label}</span>
                <span style={priceHint}>Free with item</span>
              </label>
            );
          })}
        </div>
      </div>

      <div style={enabled ? block : blockDisabled}>
        <label style={toggleRow}>
          <input
            type="checkbox"
            checked={extraEnabled}
            disabled={readOnly || !enabled}
            onChange={(e) => onExtraEnabledChange(e.target.checked)}
          />
          <strong>Also allow paid extra sauce portions</strong>
        </label>
        {extraEnabled ? (
          <div style={optionList}>
            {sauces.map((sauce) => {
              const checked = enabled && extraEnabled && extraIds.has(sauce.id);
              const price = extraPriceById.get(sauce.id) ?? sauce.extraPrice;
              return (
                <label key={`ext-${sauce.id}`} style={optionRow}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={readOnly || !enabled || !extraEnabled}
                    onChange={(e) => onExtraToggle(sauce.id, e.target.checked)}
                  />
                  <span style={{ flex: 1, fontWeight: 700 }}>{sauce.label}</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    disabled={readOnly || !enabled || !extraEnabled || !checked}
                    className="hub-menu-item-extras__price"
                    style={{ opacity: enabled && extraEnabled && checked ? 1 : 0.45 }}
                    value={price}
                    onChange={(e) => onExtraPriceChange(sauce.id, Number(e.target.value) || 0)}
                  />
                </label>
              );
            })}
          </div>
        ) : null}
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
  marginBottom: 6,
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

const block: CSSProperties = { display: "grid", gap: 6 };

const blockDisabled: CSSProperties = {
  ...block,
  opacity: 0.45,
  pointerEvents: "none",
  userSelect: "none",
};

const optionList: CSSProperties = { display: "grid", gap: 6 };

const optionRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 10,
  background: "rgba(15, 17, 21, 0.03)",
  cursor: "pointer",
};

const priceHint: CSSProperties = { fontSize: "0.78rem", color: "#5b6470", fontWeight: 600 };
