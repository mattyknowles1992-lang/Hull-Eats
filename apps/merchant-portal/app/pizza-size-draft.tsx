"use client";

import type { CSSProperties } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";
import {
  decodeHubMenuCategoryDescription,
  encodeHubMenuCategoryDescription,
  HULL_PIZZA_SIZE_COLUMNS_PREFIX,
  stripHubPizzaSizeColumnsMarker,
} from "@hull-eats/types";

import { HUB_PRICE_INPUT_STEP } from "./hub-input-steps";

/** @deprecated Use HUB_PRICE_INPUT_STEP — same £0.10 step for all menu prices. */
export const PIZZA_PRICE_INPUT_STEP = HUB_PRICE_INPUT_STEP;

export type PizzaSizeRow = {
  key: string;
  label: string;
  selected: boolean;
  price: string;
  labelEditable?: boolean;
};

export type PizzaSizeColumnDef = {
  key: string;
  label: string;
  labelEditable?: boolean;
};

const STANDARD_PIZZA_SIZE_LABELS = ['7"', '10"', '12"', '14"', '15"', '16"'] as const;

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `hull-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Parse inch value from labels like `8"`, `8`, `8 inch`. */
export function parsePizzaSizeInches(label: string): number | null {
  const trimmed = label.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:"|in(?:ch(?:es)?)?)?\s*$/i);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function normalizePizzaSizeLabel(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  const inches = parsePizzaSizeInches(trimmed);
  if (inches != null) {
    return Number.isInteger(inches) ? `${inches}"` : `${inches}"`;
  }
  return trimmed;
}

export function comparePizzaSizeLabels(left: string, right: string): number {
  const leftInches = parsePizzaSizeInches(left);
  const rightInches = parsePizzaSizeInches(right);
  if (leftInches != null && rightInches != null) {
    return leftInches - rightInches;
  }
  if (leftInches != null) {
    return -1;
  }
  if (rightInches != null) {
    return 1;
  }
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

export function sortPizzaSizeColumnDefs(columns: PizzaSizeColumnDef[]): PizzaSizeColumnDef[] {
  return [...columns].sort((left, right) => comparePizzaSizeLabels(left.label, right.label));
}

export function sortPizzaSizeRows(rows: PizzaSizeRow[]): PizzaSizeRow[] {
  return [...rows].sort((left, right) => comparePizzaSizeLabels(left.label, right.label));
}

export function defaultPizzaSizeColumnDefs(): PizzaSizeColumnDef[] {
  return STANDARD_PIZZA_SIZE_LABELS.map((label, index) => ({
    key: `hull-pizza-std-${index}`,
    label,
    labelEditable: false,
  }));
}

export function createInitialPizzaSizeRows(): PizzaSizeRow[] {
  return createPizzaSizeRowsForColumns(defaultPizzaSizeColumnDefs());
}

export function createPizzaSizeRowsForColumns(columns: PizzaSizeColumnDef[]): PizzaSizeRow[] {
  return columns.map((column) => ({
    key: column.key,
    label: column.label,
    selected: false,
    price: "",
    labelEditable: column.labelEditable,
  }));
}

export function createPizzaSizeRowsForSection(section: {
  description?: string | null;
  presetKey?: string | null;
}): PizzaSizeRow[] {
  return createPizzaSizeRowsForColumns(readPizzaSizeColumnsFromSection(section));
}

export type PizzaSizeTableConfig = {
  columns: PizzaSizeColumnDef[];
  /** Extra £ added vs the previous size column (keyed by column key). */
  stepByColumnKey: Record<string, string>;
};

function parsePizzaSizeTablePayload(raw: string): PizzaSizeTableConfig | null {
  try {
    const parsed = JSON.parse(raw) as { columns?: unknown; sizeSteps?: unknown };
    if (!Array.isArray(parsed.columns)) {
      return null;
    }
    const columns = parsed.columns
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const row = entry as { key?: string; label?: string; labelEditable?: boolean };
        const label = normalizePizzaSizeLabel(row.label ?? "");
        if (!label) {
          return null;
        }
        return {
          key: row.key?.trim() || newId(),
          label,
          labelEditable: Boolean(row.labelEditable),
        } satisfies PizzaSizeColumnDef;
      })
      .filter(Boolean) as PizzaSizeColumnDef[];

    const stepByColumnKey: Record<string, string> = {};
    if (parsed.sizeSteps && typeof parsed.sizeSteps === "object") {
      for (const [key, value] of Object.entries(parsed.sizeSteps as Record<string, unknown>)) {
        if (typeof value === "string" || typeof value === "number") {
          const trimmed = String(value).trim();
          if (trimmed) {
            stepByColumnKey[key] = trimmed;
          }
        }
      }
    }

    if (columns.length === 0) {
      return null;
    }

    return {
      columns: sortPizzaSizeColumnDefs(columns),
      stepByColumnKey,
    };
  } catch {
    return null;
  }
}

function encodePizzaSizeTableInDescription(config: PizzaSizeTableConfig, userNote = ""): string {
  const payload = JSON.stringify({
    columns: config.columns.map((column) => ({
      key: column.key,
      label: column.label,
      labelEditable: Boolean(column.labelEditable),
    })),
    sizeSteps: config.stepByColumnKey,
  });
  const note = stripHubPizzaSizeColumnsMarker(userNote.trim());
  const marker = `__HULL_PIZZA_SIZE_COLUMNS:${payload}__`;
  return note ? `${marker}\n${note}` : marker;
}

export function readPizzaSizeTableConfigFromSection(section: {
  description?: string | null;
  presetKey?: string | null;
}): PizzaSizeTableConfig {
  const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
  const match = decoded.description.match(HULL_PIZZA_SIZE_COLUMNS_PREFIX);
  if (match?.[1]) {
    const stored = parsePizzaSizeTablePayload(match[1]);
    if (stored) {
      return stored;
    }
  }
  return { columns: defaultPizzaSizeColumnDefs(), stepByColumnKey: {} };
}

export function readPizzaSizeColumnsFromSection(section: {
  description?: string | null;
  presetKey?: string | null;
}): PizzaSizeColumnDef[] {
  return readPizzaSizeTableConfigFromSection(section).columns;
}

export function writePizzaSizeTableConfigOnSection<T extends { description?: string | null; presetKey?: string | null }>(
  section: T,
  config: PizzaSizeTableConfig,
): T {
  const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
  const description = encodePizzaSizeTableInDescription(
    {
      columns: sortPizzaSizeColumnDefs(config.columns),
      stepByColumnKey: config.stepByColumnKey,
    },
    decoded.description,
  );
  return {
    ...section,
    description: encodeHubMenuCategoryDescription(section.presetKey ?? null, description),
  };
}

export function writePizzaSizeColumnsOnSection<T extends { description?: string | null; presetKey?: string | null }>(
  section: T,
  columns: PizzaSizeColumnDef[],
): T {
  const current = readPizzaSizeTableConfigFromSection(section);
  return writePizzaSizeTableConfigOnSection(section, { ...current, columns: sortPizzaSizeColumnDefs(columns) });
}

export function parsePizzaSizeStepAmount(raw: string): number {
  const value = Number(raw.trim());
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/** Fill this row's prices from the smallest size using per-column +£ steps. */
export function expandPizzaPricesFromBase(
  rows: PizzaSizeRow[],
  columns: PizzaSizeColumnDef[],
  stepByColumnKey: Record<string, string>,
  basePriceRaw: string,
): PizzaSizeRow[] {
  const trimmedBase = basePriceRaw.trim();
  if (!trimmedBase || columns.length === 0) {
    return rows;
  }

  const baseValue = Number(trimmedBase);
  if (!Number.isFinite(baseValue) || baseValue < 0) {
    return rows;
  }

  let running = baseValue;
  const rowByLabel = new Map(rows.map((row) => [row.label, row]));

  return columns.map((column, index) => {
    const existing = rowByLabel.get(column.label);
    if (index > 0) {
      running = Number((running + parsePizzaSizeStepAmount(stepByColumnKey[column.key] ?? "0")).toFixed(2));
    }
    return {
      key: existing?.key ?? column.key,
      label: column.label,
      selected: true,
      price: index === 0 ? trimmedBase : String(running),
      labelEditable: existing?.labelEditable ?? column.labelEditable,
    };
  });
}

export function clonePizzaSizePriceRows(sourceRows: PizzaSizeRow[]): PizzaSizeRow[] {
  return sourceRows.map((row) => ({
    ...row,
    selected: Boolean(row.selected && row.price.trim()),
    price: row.selected && row.price.trim() ? row.price : "",
  }));
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
  const options: MenuOption[] = sortPizzaSizeRows(active).map((r) => {
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

export function pizzaSizeRowsForItem(item: MenuItem, columns: PizzaSizeColumnDef[]): PizzaSizeRow[] {
  const sizeGroup = item.optionGroups.find((group) => isPizzaSizeOptionGroup(group));
  const rows: PizzaSizeRow[] = columns.map((column) => ({
    key: column.key,
    label: column.label,
    selected: false,
    price: "",
    labelEditable: column.labelEditable,
  }));
  const rowByLabel = new Map(rows.map((row) => [row.label, row]));

  if (!sizeGroup) {
    return rows;
  }

  for (const option of sizeGroup.options) {
    if (!option.label.trim()) {
      continue;
    }
    const label = normalizePizzaSizeLabel(option.label);
    const fullPrice = Number((item.price + option.priceDelta).toFixed(2));
    const existing = rowByLabel.get(label);
    if (existing) {
      rowByLabel.set(label, {
        ...existing,
        selected: true,
        price: String(fullPrice),
      });
      continue;
    }
    rowByLabel.set(label, {
      key: option.id,
      label,
      selected: true,
      price: String(fullPrice),
      labelEditable: true,
    });
  }

  return sortPizzaSizeRows([...rowByLabel.values()]);
}

/** @deprecated Use pizzaSizeRowsForItem with section columns. */
export function pizzaSizeRowsFromMenuItem(item: MenuItem): PizzaSizeRow[] {
  return pizzaSizeRowsForItem(item, defaultPizzaSizeColumnDefs());
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

export function applyPizzaSizesOrClearItem(item: MenuItem, rows: PizzaSizeRow[]): MenuItem | { error: string } {
  const active = rows.filter((row) => row.selected && row.label.trim() && row.price.trim());
  if (active.length === 0) {
    return simplifyPizzaMenuItem({
      ...item,
      optionGroups: item.optionGroups.filter((group) => !isPizzaSizeOptionGroup(group)),
    });
  }
  return applyPizzaSizesToMenuItem(item, rows);
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
  const sortedRows = sortPizzaSizeRows(rows);

  const updateRow = (key: string, patch: Partial<PizzaSizeRow>) => {
    onChange(sortPizzaSizeRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r))));
  };

  const removeRow = (key: string) => {
    onChange(sortPizzaSizeRows(rows.filter((r) => r.key !== key)));
  };

  const addCustom = () => {
    onChange(
      sortPizzaSizeRows([
        ...rows,
        { key: newId(), label: "", selected: true, price: "", labelEditable: true },
      ]),
    );
  };

  return (
    <div style={panelStyle}>
      <strong style={{ fontSize: "0.92rem", color: "#0f1115" }}>Size &amp; price for this pizza</strong>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "#5b6470", lineHeight: 1.45 }}>
        Tick each size you sell and enter the full price (£) next to it. Prices step by £0.10. Customers pick a size at
        checkout — you do not need a separate single price for the pizza.
      </p>
      {sortedRows.map((row) => (
        <div key={row.key} style={rowStyle}>
          <input type="checkbox" checked={row.selected} onChange={(e) => updateRow(row.key, { selected: e.target.checked })} />
          {row.labelEditable ? (
            <input
              style={inputStyle}
              value={row.label}
              placeholder='e.g. 18"'
              onChange={(e) => updateRow(row.key, { label: normalizePizzaSizeLabel(e.target.value) })}
            />
          ) : (
            <span style={{ fontWeight: 800, color: "#101216" }}>{row.label}</span>
          )}
          <input
            type="number"
            step={PIZZA_PRICE_INPUT_STEP}
            min={0}
            disabled={!row.selected}
            className="hub-menu-pizza-price-input"
            style={{
              ...inputStyle,
              opacity: row.selected ? 1 : 0.45,
            }}
            value={row.price}
            placeholder="0.00"
            onChange={(e) => updateRow(row.key, { price: e.target.value })}
          />
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
