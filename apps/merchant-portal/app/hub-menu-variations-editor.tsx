"use client";

import type { CSSProperties } from "react";

import type { MenuItem } from "@hull-eats/types";

import {
  applyManualVariationsToItem,
  createMenuDraftId,
  getManualVariationRows,
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
        <div key={row.id} style={rowGrid}>
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

export function ItemManualVariationsEditor({
  item,
  readOnly,
  onUpdateItem,
  hint,
}: {
  item: MenuItem;
  readOnly: boolean;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
  hint?: string;
}) {
  const rows = getManualVariationRows(item);

  return (
    <ManualVariationsEditor
      rows={rows}
      readOnly={readOnly}
      hint={hint}
      onChange={(next) => onUpdateItem((current) => applyManualVariationsToItem(current, next))}
    />
  );
}

const wrap: CSSProperties = { display: "grid", gap: 8 };
const hintStyle: CSSProperties = { margin: 0, color: "#5b6470", lineHeight: 1.55, fontSize: "0.88rem" };
const emptyHint: CSSProperties = { margin: 0, color: "#7a8491", fontSize: "0.86rem" };
const rowGrid: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 100px auto", gap: 8 };
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
