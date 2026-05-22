"use client";

import type { CSSProperties } from "react";

import type { MenuItem } from "@hull-eats/types";

export type PizzaSizeRow = {
  key: string;
  label: string;
  selected: boolean;
  price: string;
  labelEditable?: boolean;
};

export function createInitialPizzaSizeRows(): PizzaSizeRow[] {
  return ['7"', '10"', '12"', '14"', '15"', '16"'].map((label, i) => ({
    key: `hull-pizza-std-${i}`,
    label,
    selected: false,
    price: "",
  }));
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `hull-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function buildPizzaSizeOptionGroupFromRows(
  rows: PizzaSizeRow[],
): { optionGroups: MenuItem["optionGroups"]; basePrice: number } | { error: string } {
  const active = rows.filter((r) => r.selected && r.label.trim() && r.price.trim());
  if (active.length === 0) {
    return { error: "Select at least one pizza size and enter its price." };
  }
  for (const r of active) {
    if (r.labelEditable && !r.label.trim()) {
      return { error: "Enter a label for each custom size." };
    }
  }
  const prices = active.map((r) => Number(r.price));
  if (prices.some((p) => !Number.isFinite(p) || p < 0)) {
    return { error: "Enter a valid price for each selected size." };
  }
  const basePrice = Math.min(...prices);
  const groupId = newId();
  type MenuOption = MenuItem["optionGroups"][number]["options"][number];
  const options: MenuOption[] = active.map((r) => {
    const full = Number(r.price);
    return {
      id: newId(),
      label: r.label.trim(),
      description: "",
      priceDelta: Number((full - basePrice).toFixed(2)),
      isDefault: false,
      maxQuantity: 1,
    };
  });
  const firstAtBase = options.findIndex((o) => Math.abs(o.priceDelta) < 0.0001);
  if (firstAtBase >= 0) {
    const o = options[firstAtBase]!;
    options[firstAtBase] = { ...o, isDefault: true };
  }

  return {
    basePrice: Number(basePrice.toFixed(2)),
    optionGroups: [
      {
        id: groupId,
        name: "Size",
        description: "Choose a pizza size",
        selectionMode: "single" as const,
        isRequired: true,
        minSelections: 1,
        maxSelections: null,
        showWhenValueIds: [],
        options,
      },
    ],
  };
}

export function isPizzaSizeOptionGroup(group: MenuItem["optionGroups"][number]): boolean {
  return group.isRequired && /size/i.test(group.name);
}

export function pizzaSizeRowsFromMenuItem(item: MenuItem): PizzaSizeRow[] {
  const sizeGroup = item.optionGroups.find((group) => isPizzaSizeOptionGroup(group));
  const rows = createInitialPizzaSizeRows();
  if (!sizeGroup) {
    return rows;
  }

  const rowByLabel = new Map(rows.map((row) => [row.label, row]));
  const customRows: PizzaSizeRow[] = [];

  for (const option of sizeGroup.options) {
    if (!option.label.trim()) {
      continue;
    }
    const fullPrice = Number((item.price + option.priceDelta).toFixed(2));
    const standard = rowByLabel.get(option.label);
    if (standard) {
      rowByLabel.set(option.label, {
        ...standard,
        selected: true,
        price: String(fullPrice),
      });
      continue;
    }
    customRows.push({
      key: option.id,
      label: option.label,
      selected: true,
      price: String(fullPrice),
      labelEditable: true,
    });
  }

  return [...rowByLabel.values(), ...customRows];
}

/** Drops auto-generated crust groups and duplicate topping groups from the old pizza template. */
export function simplifyPizzaMenuItem(item: MenuItem): MenuItem {
  return {
    ...item,
    components: [],
    optionGroups: item.optionGroups.filter(
      (group) => !/^Crust \(/i.test(group.name) && group.name !== "Extra toppings",
    ),
  };
}

export function applyPizzaSizesToMenuItem(
  item: MenuItem,
  rows: PizzaSizeRow[],
): MenuItem | { error: string } {
  const built = buildPizzaSizeOptionGroupFromRows(rows);
  if ("error" in built) {
    return built;
  }

  const otherGroups = item.optionGroups.filter(
    (group) => !isPizzaSizeOptionGroup(group) && !/^Crust \(/i.test(group.name) && group.name !== "Extra toppings",
  );

  return {
    ...item,
    price: built.basePrice,
    optionGroups: [...otherGroups, ...built.optionGroups],
  };
}

const panelStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 12,
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "rgba(255, 255, 255, 0.96)",
};

const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "22px minmax(0, 1fr) 104px auto",
  gap: 10,
  alignItems: "center",
};

const inputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.15)",
  font: "inherit",
};

type PizzaSizeDraftPanelProps = {
  rows: PizzaSizeRow[];
  onChange: (next: PizzaSizeRow[]) => void;
};

export function PizzaSizeDraftPanel({ rows, onChange }: PizzaSizeDraftPanelProps) {
  const updateRow = (key: string, patch: Partial<PizzaSizeRow>) => {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    onChange(rows.filter((r) => r.key !== key));
  };

  const addCustom = () => {
    onChange([...rows, { key: newId(), label: "", selected: true, price: "", labelEditable: true }]);
  };

  return (
    <div style={panelStyle}>
      <strong style={{ fontSize: "0.92rem", color: "#0f1115" }}>Size &amp; price for this pizza</strong>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "#5b6470", lineHeight: 1.45 }}>
        Tick each size you sell and enter the full price (£) next to it. Customers pick a size at checkout — you do not need a separate single price for the pizza.
      </p>
      {rows.map((row) => (
        <div key={row.key} style={rowStyle}>
          <input type="checkbox" checked={row.selected} onChange={(e) => updateRow(row.key, { selected: e.target.checked })} />
          {row.labelEditable ? (
            <input style={inputStyle} value={row.label} placeholder='e.g. 18"' onChange={(e) => updateRow(row.key, { label: e.target.value })} />
          ) : (
            <span style={{ fontWeight: 800, color: "#101216" }}>{row.label}</span>
          )}
          <input
            type="number"
            step="0.01"
            min={0}
            disabled={!row.selected}
            style={{
              ...inputStyle,
              opacity: row.selected ? 1 : 0.45,
            }}
            value={row.price}
            placeholder="0.00"
            onChange={(e) => updateRow(row.key, { price: e.target.value })}
          />
          {row.labelEditable ? (
            <button
              type="button"
              style={{
                fontSize: "0.78rem",
                fontWeight: 800,
                border: "none",
                background: "transparent",
                color: "#b42318",
                cursor: "pointer",
              }}
              onClick={() => removeRow(row.key)}
            >
              Remove
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}
      <button
        type="button"
        style={{
          justifySelf: "start",
          padding: "8px 14px",
          borderRadius: 12,
          border: "1px solid rgba(15, 17, 21, 0.18)",
          background: "linear-gradient(180deg, #fff, #f6fbff)",
          fontWeight: 800,
          cursor: "pointer",
          font: "inherit",
        }}
        onClick={addCustom}
      >
        Add custom size
      </button>
    </div>
  );
}
