"use client";

import type { CSSProperties } from "react";

import type { HubMenuSection } from "@hull-eats/types";
import { readMenuSubGroupsFromSection } from "@hull-eats/types";

type Props = {
  section: HubMenuSection;
  value?: string;
  readOnly?: boolean;
  onChange: (menuSubGroup: string | undefined) => void;
};

export function HubMenuItemSubGroupField({ section, value, readOnly = false, onChange }: Props) {
  const subGroups = readMenuSubGroupsFromSection(section);

  if (subGroups.length === 0) {
    return null;
  }

  return (
    <label style={field}>
      <span style={labelText}>Sub-category (customer heading)</span>
      <select
        style={select}
        disabled={readOnly}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.trim() || undefined)}
      >
        <option value="">— None —</option>
        {subGroups.map((group) => (
          <option key={group.id} value={group.label}>
            {group.label}
          </option>
        ))}
      </select>
      <span style={hint}>Groups this product under {value ? `"${value}"` : "the main category list"} on your menu.</span>
    </label>
  );
}

const field: CSSProperties = { display: "grid", gap: 6 };
const labelText: CSSProperties = { fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" };
const select: CSSProperties = {
  minHeight: 44,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  font: "inherit",
  background: "#fff",
};
const hint: CSSProperties = { fontSize: "0.78rem", color: "rgba(15, 17, 21, 0.55)", lineHeight: 1.4 };
