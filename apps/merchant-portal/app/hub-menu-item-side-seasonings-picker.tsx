"use client";

import type { CSSProperties } from "react";

import type { HubSideSeasoningOption } from "./menu-studio-core";

type HubMenuItemSideSeasoningsPickerProps = {
  seasonings: HubSideSeasoningOption[];
  enabled: boolean;
  offeredIds: Set<string>;
  chipsOrFriesHint?: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onOfferedToggle: (seasoningId: string, checked: boolean) => void;
  onSelectAllOffered: () => void;
  onClearOffered: () => void;
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
const toggleRow: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" };
const block: CSSProperties = { display: "grid", gap: 10 };
const blockDisabled: CSSProperties = { ...block, opacity: 0.55, pointerEvents: "none" };
const toolbar: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12 };
const linkButton: CSSProperties = {
  border: "none",
  background: "none",
  padding: 0,
  font: "inherit",
  fontWeight: 800,
  fontSize: "0.82rem",
  color: "#079bc8",
  cursor: "pointer",
};
const optionList: CSSProperties = { display: "grid", gap: 8 };
const optionRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fafbfc",
};

export function HubMenuItemSideSeasoningsPicker({
  seasonings,
  enabled,
  offeredIds,
  chipsOrFriesHint = false,
  onEnabledChange,
  onOfferedToggle,
  onSelectAllOffered,
  onClearOffered,
  readOnly = false,
}: HubMenuItemSideSeasoningsPickerProps) {
  if (seasonings.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: "0.84rem", color: "#5b6470" }}>
        Add seasonings under <strong>Chips &amp; sides seasoning</strong> on the left first.
      </p>
    );
  }

  return (
    <div style={panel}>
      {chipsOrFriesHint ? (
        <p style={{ margin: 0, fontSize: "0.82rem", color: "#5b6470", lineHeight: 1.45 }}>
          This looks like a chips or fries item — seasonings are a good fit here.
        </p>
      ) : null}

      <label style={toggleRow}>
        <input type="checkbox" checked={enabled} disabled={readOnly} onChange={(e) => onEnabledChange(e.target.checked)} />
        <strong>Let customers choose seasonings on this item</strong>
      </label>

      <div style={enabled ? block : blockDisabled}>
        <p style={sectionTitle}>Seasonings offered on this item (customer can tick any)</p>
        <div style={toolbar}>
          <button type="button" style={linkButton} disabled={readOnly || !enabled} onClick={onSelectAllOffered}>
            Select all
          </button>
          <button type="button" style={linkButton} disabled={readOnly || !enabled} onClick={onClearOffered}>
            Clear all
          </button>
        </div>
        <div style={optionList}>
          {seasonings.map((seasoning) => {
            const checked = enabled && offeredIds.has(seasoning.id);
            return (
              <label key={seasoning.id} style={optionRow}>
                <input
                  type="checkbox"
                  className="hub-menu-compose-tick"
                  checked={checked}
                  disabled={readOnly || !enabled}
                  onChange={(e) => onOfferedToggle(seasoning.id, e.target.checked)}
                />
                <span style={{ flex: 1, fontWeight: 700 }}>{seasoning.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
