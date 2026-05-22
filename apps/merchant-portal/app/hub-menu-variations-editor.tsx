"use client";

import type { CSSProperties } from "react";

import type { MenuItem } from "@hull-eats/types";

import {
  applyManualVariationsToItem,
  createMenuDraftId,
  CUSTOMER_CHOICES_GROUP_LABEL,
  getManualVariationRows,
  UNIVERSAL_CHOICE_QUICK_ADDS,
  type ManualVariationRow,
} from "./menu-studio-core";

type Props = {
  rows: ManualVariationRow[];
  onChange: (rows: ManualVariationRow[]) => void;
  readOnly?: boolean;
  /** Shown above the rows — e.g. wings flavours vs pizza (not used here). */
  hint?: string;
  placeholderLabel?: string;
  addButtonLabel?: string;
};

export function createEmptyVariationRow(): ManualVariationRow {
  return { id: createMenuDraftId("var"), label: "", price: "" };
}

export function ManualVariationsEditor({
  rows,
  onChange,
  readOnly = false,
  hint,
  placeholderLabel = "e.g. BBQ",
  addButtonLabel = "+ Add option with price",
}: Props) {
  return (
    <div style={wrap}>
      {hint ? <p style={hintStyle}>{hint}</p> : null}
      {rows.length === 0 ? (
        <p style={emptyHint}>No options yet — add flavours or styles if customers choose one (e.g. BBQ, Spicy).</p>
      ) : null}
      {rows.map((row) => (
        <div key={row.id} className="hub-menu-variations-editor__row">
          <input
            style={lightInput}
            value={row.label}
            disabled={readOnly}
            placeholder={placeholderLabel}
            onChange={(e) => onChange(rows.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)))}
          />
          <input
            type="number"
            step="0.01"
            style={lightInput}
            value={row.price}
            disabled={readOnly}
            placeholder="0.00"
            title="Extra £ on top of item price (0 = same price)"
            onChange={(e) => onChange(rows.map((r) => (r.id === row.id ? { ...r, price: e.target.value } : r)))}
          />
          <button
            type="button"
            style={dangerButtonSmall}
            disabled={readOnly}
            onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        style={secondaryButton}
        disabled={readOnly}
        onClick={() => onChange([...rows, createEmptyVariationRow()])}
      >
        {addButtonLabel}
      </button>
    </div>
  );
}

const CUSTOMER_CHOICES_HINT =
  "Optional choices for any item — e.g. base, sauce, crust on pizza, or BBQ / spicy on wings. Extra £ adds on top of the item price.";

export function CustomerChoicesEditor({
  rows,
  onChange,
  readOnly = false,
}: {
  rows: ManualVariationRow[];
  onChange: (rows: ManualVariationRow[]) => void;
  readOnly?: boolean;
}) {
  const existingLabels = new Set(rows.map((row) => row.label.trim().toLowerCase()));

  const addPreset = (preset: (typeof UNIVERSAL_CHOICE_QUICK_ADDS)[number]) => {
    const key = preset.label.toLowerCase();
    if (existingLabels.has(key)) {
      return;
    }
    onChange([...rows, { id: createMenuDraftId("var"), label: preset.label, price: "" }]);
  };

  return (
    <div style={wrap}>
      <p style={hintStyle}>
        <strong>{CUSTOMER_CHOICES_GROUP_LABEL}</strong> (optional). {CUSTOMER_CHOICES_HINT}
      </p>
      <div style={quickRow}>
        <span style={quickLabel}>Quick add:</span>
        {UNIVERSAL_CHOICE_QUICK_ADDS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            style={quickChip}
            disabled={readOnly || existingLabels.has(preset.label.toLowerCase())}
            onClick={() => addPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <ManualVariationsEditor
        rows={rows}
        readOnly={readOnly}
        placeholderLabel="Choice name"
        addButtonLabel="+ Add choice"
        onChange={onChange}
      />
    </div>
  );
}

export function ItemCustomerChoicesEditor({
  item,
  readOnly,
  onUpdateItem,
}: {
  item: MenuItem;
  readOnly: boolean;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
}) {
  const rows = getManualVariationRows(item);
  return (
    <CustomerChoicesEditor
      rows={rows}
      readOnly={readOnly}
      onChange={(next) => onUpdateItem((current) => applyManualVariationsToItem(current, next))}
    />
  );
}

export function ItemManualVariationsEditor({
  item,
  readOnly,
  onUpdateItem,
  hint,
  placeholderLabel,
  addButtonLabel,
}: {
  item: MenuItem;
  readOnly: boolean;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
  hint?: string;
  placeholderLabel?: string;
  addButtonLabel?: string;
}) {
  const rows = getManualVariationRows(item);

  return (
    <ManualVariationsEditor
      rows={rows}
      readOnly={readOnly}
      hint={hint}
      placeholderLabel={placeholderLabel}
      addButtonLabel={addButtonLabel}
      onChange={(next) => onUpdateItem((current) => applyManualVariationsToItem(current, next))}
    />
  );
}

const wrap: CSSProperties = { display: "grid", gap: 8 };
const quickRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" };
const quickLabel: CSSProperties = { fontSize: "0.8rem", fontWeight: 800, color: "#3d4652" };
const quickChip: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid rgba(7, 155, 200, 0.35)",
  background: "rgba(35, 205, 255, 0.12)",
  color: "#064f68",
  fontWeight: 800,
  fontSize: "0.82rem",
  cursor: "pointer",
};
const hintStyle: CSSProperties = { margin: 0, color: "#5b6470", lineHeight: 1.55, fontSize: "0.88rem" };
const emptyHint: CSSProperties = { margin: 0, color: "#7a8491", fontSize: "0.86rem" };
const lightInput: CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  padding: "10px 12px",
  fontSize: "0.95rem",
};
const secondaryButton: CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  background: "#fff",
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};
const dangerButtonSmall: CSSProperties = {
  ...secondaryButton,
  color: "#9b1c1c",
  borderColor: "rgba(155, 28, 28, 0.25)",
};
