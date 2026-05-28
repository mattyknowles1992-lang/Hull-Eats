"use client";

import type { CSSProperties } from "react";

import {
  applyMenuAvailabilityMode,
  describeMenuAvailability,
  getMenuAvailabilityMode,
  type MenuAvailabilityMode,
} from "./menu-studio-core";
import type { MenuItem } from "@hull-eats/types";

const MODES: MenuAvailabilityMode[] = ["live", "sold_out", "hidden"];

type Props = {
  item: MenuItem;
  readOnly?: boolean;
  compact?: boolean;
  onChange: (item: MenuItem) => void;
};

export function MenuItemVisibilitySelect({ item, readOnly = false, compact = false, onChange }: Props) {
  const mode = getMenuAvailabilityMode(item);

  return (
    <label style={compact ? compactLabel : label}>
      {!compact ? <span style={labelText}>Save as</span> : null}
      <select
        style={compact ? compactSelect : select}
        disabled={readOnly}
        value={mode}
        title={describeMenuAvailability(mode).hint}
        onChange={(event) => onChange(applyMenuAvailabilityMode(item, event.target.value as MenuAvailabilityMode))}
      >
        {MODES.map((entry) => (
          <option key={entry} value={entry}>
            {describeMenuAvailability(entry).label}
          </option>
        ))}
      </select>
    </label>
  );
}

const label: CSSProperties = { display: "grid", gap: 6 };
const labelText: CSSProperties = { fontSize: "0.82rem", fontWeight: 800, color: "#101216" };
const select: CSSProperties = {
  minHeight: "42px",
  padding: "0 10px",
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.15)",
  font: "inherit",
  background: "#fff",
};
const compactLabel: CSSProperties = { display: "block", minWidth: 0 };
const compactSelect: CSSProperties = {
  ...select,
  minHeight: "40px",
  width: "100%",
  fontSize: "0.78rem",
  fontWeight: 700,
};
