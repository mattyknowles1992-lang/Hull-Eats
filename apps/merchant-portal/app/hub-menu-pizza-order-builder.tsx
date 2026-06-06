"use client";

import { useMemo, useState } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import { HubMenuBulkPastePanel } from "./hub-menu-bulk-paste-panel";
import { HubMenuPizzaCategoryChoicesPanel } from "./hub-menu-pizza-category-choices";
import {
  formatPizzaMenuSuggestionName,
  normalizeMenuSuggestionName,
  PIZZA_MENU_SUGGESTIONS_BY_KIND,
  type PizzaMenuRowKind,
} from "./hub-menu-pizza-presets";
import { HubMenuSuggestionStrip } from "./hub-menu-suggestion-strip";
import { MenuItemVisibilitySelect } from "./hub-menu-item-visibility-select";
import {
  applyPizzaMenuRowKind,
  getPizzaMenuRowKind,
  buildLocalMenuItem,
  type BulkPasteRow,
} from "./menu-studio-core";
import {
  applyPizzaSizesOrClearItem,
  applyPizzaSizesToMenuItem,
  clonePizzaSizePriceRows,
  defaultPizzaSizeColumnDefs,
  expandPizzaPricesFromBase,
  findPizzaSizeRowForColumn,
  normalizePizzaSizeLabel,
  parsePizzaSizeInches,
  PIZZA_PRICE_INPUT_STEP,
  pizzaSizeRowsForItem,
  readPizzaSizeTableConfigFromSection,
  sortPizzaSizeColumnDefs,
  writePizzaSizeTableConfigOnSection,
  type PizzaSizeColumnDef,
  type PizzaSizeRow,
  type PizzaSizeTableConfig,
} from "./pizza-size-draft";

const COPY_PRICES_DOWN_COUNT = 5;

type Props = {
  section: HubMenuSection;
  readOnly?: boolean;
  onPatchSection: (updater: (section: HubMenuSection) => HubMenuSection) => void;
};

function patchSectionItems(
  onPatchSection: Props["onPatchSection"],
  updater: (items: MenuItem[]) => MenuItem[],
) {
  onPatchSection((current) => ({ ...current, items: updater(current.items) }));
}

function pizzaItemFromBulkRow(
  sectionId: string,
  row: BulkPasteRow,
  kind: PizzaMenuRowKind,
  tableConfig: PizzaSizeTableConfig,
): MenuItem {
  let item = buildLocalMenuItem({
    categoryId: sectionId,
    name: row.name,
    description: "",
    price: 0,
    requiresIdVerification: false,
    components: [],
    optionGroups: [],
  });
  item = applyPizzaMenuRowKind(item, kind);

  if (row.price != null && Number.isFinite(row.price)) {
    const defaultColumn =
      tableConfig.columns.find((column) => parsePizzaSizeInches(column.label) === 10) ??
      tableConfig.columns[Math.min(1, tableConfig.columns.length - 1)];
    const baseRows = pizzaSizeRowsForItem(item, tableConfig.columns);
    const sizeRows =
      defaultColumn && tableConfig.columns[0]?.key === defaultColumn.key
        ? expandPizzaPricesFromBase(baseRows, tableConfig.columns, tableConfig.stepByColumnKey, String(row.price))
        : baseRows.map((sizeRow) =>
            sizeRow.key === defaultColumn?.key
              ? { ...sizeRow, selected: true, price: String(row.price) }
              : sizeRow,
          );
    const applied = applyPizzaSizesToMenuItem(item, sizeRows);
    if (!("error" in applied)) {
      item = applied;
    }
  }

  return item;
}

function reapplyItemsForSizeColumns(section: HubMenuSection, tableConfig: PizzaSizeTableConfig): HubMenuSection {
  return {
    ...section,
    items: section.items.map((item) => {
      const rows = pizzaSizeRowsForItem(item, tableConfig.columns);
      const applied = applyPizzaSizesOrClearItem(item, rows);
      return "error" in applied ? item : applied;
    }),
  };
}

function buildGridColumns(sizeCount: number): string {
  return `minmax(160px, 1.5fr) repeat(${sizeCount}, minmax(108px, 108px)) minmax(104px, 0.8fr) minmax(92px, 0.7fr) minmax(76px, auto)`;
}

function buildTableMinWidth(sizeCount: number): number {
  return 160 + sizeCount * 108 + 104 + 92 + 76;
}

type PizzaCategoryBlockProps = {
  section: HubMenuSection;
  tableConfig: PizzaSizeTableConfig;
  kind: PizzaMenuRowKind;
  label: string;
  items: MenuItem[];
  existingNameKeys: ReadonlySet<string>;
  readOnly: boolean;
  showBulkPaste?: boolean;
  onPatchSection: Props["onPatchSection"];
  onRemoveSizeColumn: (columnKey: string) => void;
  onPatchSizeColumns: (columns: PizzaSizeColumnDef[]) => void;
  onPatchSizeSteps: (stepByColumnKey: Record<string, string>) => void;
  onBulkPaste?: (rows: BulkPasteRow[]) => void;
};

function PizzaTableSizeAddRow({
  readOnly,
  sizeColumns,
  onPatchSizeColumns,
}: {
  readOnly: boolean;
  sizeColumns: PizzaSizeColumnDef[];
  onPatchSizeColumns: (columns: PizzaSizeColumnDef[]) => void;
}) {
  const [newSizeLabel, setNewSizeLabel] = useState("");

  if (readOnly) {
    return null;
  }

  const addSizeColumn = () => {
    const normalized = normalizePizzaSizeLabel(newSizeLabel);
    if (!normalized) {
      return;
    }
    if (sizeColumns.some((column) => column.label.toLowerCase() === normalized.toLowerCase())) {
      setNewSizeLabel("");
      return;
    }
    const isStandard = defaultPizzaSizeColumnDefs().some((column) => column.label === normalized);
    onPatchSizeColumns(
      sortPizzaSizeColumnDefs([
        ...sizeColumns,
        {
          key: `hull-pizza-col-${Date.now()}`,
          label: normalized,
          labelEditable: !isStandard,
        },
      ]),
    );
    setNewSizeLabel("");
  };

  return (
    <form
      className="hub-menu-pizza-builder__table-size-add"
      onSubmit={(event) => {
        event.preventDefault();
        addSizeColumn();
      }}
    >
      <label>
        <span className="hub-menu-order-builder__sr-only">Add size column</span>
        <input
          value={newSizeLabel}
          placeholder='Add size column e.g. 8"'
          onChange={(event) => setNewSizeLabel(event.target.value)}
        />
      </label>
      <button type="submit">Add size</button>
    </form>
  );
}

function PizzaCategoryBlock({
  section,
  tableConfig,
  kind,
  label,
  items,
  existingNameKeys,
  readOnly,
  showBulkPaste = false,
  onPatchSection,
  onRemoveSizeColumn,
  onPatchSizeColumns,
  onPatchSizeSteps,
  onBulkPaste,
}: PizzaCategoryBlockProps) {
  const { columns: sizeColumns, stepByColumnKey } = tableConfig;
  const gridColumns = buildGridColumns(sizeColumns.length);

  const addRow = (name = "") => {
    const created = applyPizzaMenuRowKind(
      buildLocalMenuItem({
        categoryId: section.id,
        name,
        description: "",
        price: 0,
        requiresIdVerification: false,
        components: [],
        optionGroups: [],
      }),
      kind,
    );
    patchSectionItems(onPatchSection, (sectionItems) => [...sectionItems, created]);
  };

  const addSuggestedRow = (suggestion: string) => {
    addRow(formatPizzaMenuSuggestionName(kind, suggestion));
  };

  const updateRow = (itemId: string, updater: (item: MenuItem) => MenuItem) => {
    patchSectionItems(onPatchSection, (sectionItems) =>
      sectionItems.map((item) => (item.id === itemId ? updater(item) : item)),
    );
  };

  const updateName = (itemId: string, name: string) => {
    updateRow(itemId, (item) => ({ ...item, name }));
  };

  const applyRowsToItem = (item: MenuItem, nextRows: PizzaSizeRow[]) => {
    const applied = applyPizzaSizesOrClearItem(item, nextRows);
    if ("error" in applied) {
      return;
    }
    updateRow(item.id, () => applied);
  };

  const updateSizePrice = (item: MenuItem, columnIndex: number, column: PizzaSizeColumnDef, rawPrice: string) => {
    const rows = pizzaSizeRowsForItem(item, sizeColumns);
    const trimmed = rawPrice.trim();
    const targetLabel = findPizzaSizeRowForColumn(rows, column)?.label ?? column.label;

    if (!trimmed) {
      const cleared = rows.map((row) =>
        row.label === targetLabel || row.key === column.key ? { ...row, selected: false, price: "" } : row,
      );
      applyRowsToItem(item, cleared);
      return;
    }

    if (columnIndex === 0) {
      applyRowsToItem(item, expandPizzaPricesFromBase(rows, sizeColumns, stepByColumnKey, trimmed));
      return;
    }

    const nextRows = rows.map((row) =>
      row.label === targetLabel || row.key === column.key ? { ...row, selected: true, price: trimmed } : row,
    );
    applyRowsToItem(item, nextRows);
  };

  const copyPricesToNextRows = (sourceItemId: string) => {
    const sourceIndex = items.findIndex((entry) => entry.id === sourceItemId);
    if (sourceIndex < 0) {
      return;
    }
    const source = items[sourceIndex];
    if (!source) {
      return;
    }
    const targetIds = new Set(
      items.slice(sourceIndex + 1, sourceIndex + 1 + COPY_PRICES_DOWN_COUNT).map((entry) => entry.id),
    );
    if (targetIds.size === 0) {
      return;
    }

    const sourceRows = clonePizzaSizePriceRows(pizzaSizeRowsForItem(source, sizeColumns));
    patchSectionItems(onPatchSection, (sectionItems) =>
      sectionItems.map((entry) => {
        if (!targetIds.has(entry.id)) {
          return entry;
        }
        const applied = applyPizzaSizesOrClearItem(entry, sourceRows);
        return "error" in applied ? entry : applied;
      }),
    );
  };

  const removeProductRow = (itemId: string) => {
    patchSectionItems(onPatchSection, (sectionItems) => sectionItems.filter((item) => item.id !== itemId));
  };

  const sizePriceForItem = (item: MenuItem, column: PizzaSizeColumnDef): string => {
    const rows = pizzaSizeRowsForItem(item, sizeColumns);
    const row = findPizzaSizeRowForColumn(rows, column);
    return row?.selected ? row.price : "";
  };

  const namePlaceholder =
    kind === "garlic_bread" ? "e.g. Garlic Bread with Cheese" : kind === "calzone" ? "e.g. Pepperoni Calzone" : "e.g. Margherita Pizza";

  const rowKindLabel =
    kind === "garlic_bread" ? "garlic bread" : kind === "calzone" ? "calzone" : "pizza";

  return (
    <details className="hub-menu-pizza-builder__category" open>
      <summary className="hub-menu-pizza-builder__category-summary">
        <span className="hub-menu-pizza-builder__category-summary-title">{label}</span>
        <span className="hub-menu-pizza-builder__category-summary-meta">
          {items.length} row{items.length === 1 ? "" : "s"} · {sizeColumns.length} size
          {sizeColumns.length === 1 ? "" : "s"}
        </span>
      </summary>

      <div className="hub-menu-pizza-builder__category-body">
      <HubMenuSuggestionStrip
        suggestions={PIZZA_MENU_SUGGESTIONS_BY_KIND[kind]}
        existingNames={existingNameKeys}
        readOnly={readOnly}
        formatAddName={(suggestion) => formatPizzaMenuSuggestionName(kind, suggestion)}
        onAdd={addSuggestedRow}
      />

      {showBulkPaste && onBulkPaste ? (
        <HubMenuBulkPastePanel
          readOnly={readOnly}
          placeholder={`Paste pizza names — one per line — e.g.\nMargherita\nPepperoni from £9.50`}
          onApply={onBulkPaste}
        />
      ) : null}

      <p className="hub-menu-pizza-builder__table-hint">
        Each cell is the <strong>full price</strong> for that size (what customers pay). Use <strong>+£</strong> in the
        header for step-ups; enter the <strong>base</strong> size in the first column to fill the rest. Prices save as
        Size options when you publish. <strong>Copy ↓</strong> copies a row to the next rows.
      </p>

      <div className="hub-menu-pizza-builder__table-wrap">
        <div
          className="hub-menu-pizza-builder__table"
          role="table"
          style={{ gridTemplateColumns: gridColumns, minWidth: buildTableMinWidth(sizeColumns.length) }}
        >
          <div className="hub-menu-pizza-builder__row hub-menu-pizza-builder__row--head" role="row">
            <span role="columnheader" className="hub-menu-pizza-builder__grid-head-cell">
              Name
            </span>
            {sizeColumns.map((column, columnIndex) => (
              <span key={column.key} role="columnheader" className="hub-menu-pizza-builder__size-head">
                <span className="hub-menu-pizza-builder__size-label">{column.label}</span>
                {columnIndex === 0 ? (
                  <span className="hub-menu-pizza-builder__size-step-tag">Base</span>
                ) : readOnly ? null : (
                  <label className="hub-menu-pizza-builder__size-step">
                    <span>+£</span>
                    <input
                      type="number"
                      min={0}
                      step={PIZZA_PRICE_INPUT_STEP}
                      className="hub-menu-pizza-step-input"
                      value={stepByColumnKey[column.key] ?? ""}
                      placeholder="0"
                      onChange={(event) =>
                        onPatchSizeSteps({
                          ...stepByColumnKey,
                          [column.key]: event.target.value,
                        })
                      }
                    />
                  </label>
                )}
                {readOnly || sizeColumns.length <= 1 ? null : (
                  <button
                    type="button"
                    className="hub-menu-pizza-builder__size-remove"
                    aria-label={`Remove ${column.label} size column`}
                    onClick={() => onRemoveSizeColumn(column.key)}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            <span role="columnheader" className="hub-menu-pizza-builder__grid-head-cell">
              Save as
            </span>
            <span role="columnheader" className="hub-menu-pizza-builder__grid-head-cell hub-menu-pizza-builder__copy-head">
              Prices
            </span>
            <span role="columnheader" className="hub-menu-pizza-builder__grid-head-cell hub-menu-order-builder__actions-head" />
          </div>

          {items.map((item, itemIndex) => {
            const targetsBelow = Math.min(COPY_PRICES_DOWN_COUNT, Math.max(0, items.length - itemIndex - 1));
            return (
              <div
                key={item.id}
                className="hub-menu-pizza-builder__row hub-menu-pizza-builder__product-row"
                role="row"
              >
                <label className="hub-menu-order-builder__cell">
                  <span className="hub-menu-order-builder__sr-only">Name</span>
                  <input
                    value={item.name}
                    disabled={readOnly}
                    placeholder={namePlaceholder}
                    onChange={(event) => updateName(item.id, event.target.value)}
                  />
                </label>
                {sizeColumns.map((column, columnIndex) => (
                  <label
                    key={`${item.id}-${column.key}`}
                    className="hub-menu-order-builder__cell hub-menu-pizza-builder__size-cell"
                  >
                    <span className="hub-menu-pizza-builder__mobile-size-label">{column.label}</span>
                    <span className="hub-menu-order-builder__sr-only">{column.label} price</span>
                    <input
                      type="number"
                      min={0}
                      step={PIZZA_PRICE_INPUT_STEP}
                      disabled={readOnly}
                      placeholder="£"
                      className="hub-menu-pizza-price-input"
                      value={sizePriceForItem(item, column)}
                      onChange={(event) => updateSizePrice(item, columnIndex, column, event.target.value)}
                    />
                  </label>
                ))}
                <div className="hub-menu-order-builder__visibility-cell">
                  <MenuItemVisibilitySelect
                    item={item}
                    readOnly={readOnly}
                    compact
                    onChange={(next) => updateRow(item.id, () => next)}
                  />
                </div>
                {readOnly ? (
                  <span />
                ) : (
                  <button
                    type="button"
                    className="hub-menu-pizza-builder__copy-down"
                    disabled={targetsBelow === 0}
                    title={
                      targetsBelow > 0
                        ? `Copy these size prices to the next ${targetsBelow} row${targetsBelow === 1 ? "" : "s"}`
                        : "No rows below to copy to"
                    }
                    onClick={() => copyPricesToNextRows(item.id)}
                  >
                    {targetsBelow > 0 ? `Copy ↓${targetsBelow}` : "—"}
                  </button>
                )}
                {readOnly ? null : (
                  <button type="button" className="hub-menu-order-builder__remove-btn" onClick={() => removeProductRow(item.id)}>
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <PizzaTableSizeAddRow readOnly={readOnly} sizeColumns={sizeColumns} onPatchSizeColumns={onPatchSizeColumns} />
      </div>

      {readOnly ? null : (
        <button type="button" className="hub-menu-order-builder__add-line" onClick={() => addRow("")}>
          + Add {rowKindLabel} row
        </button>
      )}
      </div>
    </details>
  );
}

export function HubMenuPizzaOrderBuilder({ section, readOnly = false, onPatchSection }: Props) {
  const tableConfig = useMemo(() => readPizzaSizeTableConfigFromSection(section), [section.description, section.presetKey]);
  const sizeColumns = tableConfig.columns;

  const existingNameKeys = useMemo(
    () => new Set(section.items.map((item) => normalizeMenuSuggestionName(item.name)).filter(Boolean)),
    [section.items],
  );

  const itemsByKind = useMemo(() => {
    const grouped: Record<PizzaMenuRowKind, MenuItem[]> = {
      pizza: [],
      garlic_bread: [],
      calzone: [],
    };
    for (const item of section.items) {
      grouped[getPizzaMenuRowKind(item)].push(item);
    }
    return grouped;
  }, [section.items]);

  const patchTableConfig = (updater: (config: PizzaSizeTableConfig) => PizzaSizeTableConfig) => {
    onPatchSection((current) => {
      const nextConfig = updater(readPizzaSizeTableConfigFromSection(current));
      const withConfig = writePizzaSizeTableConfigOnSection(current, nextConfig);
      return reapplyItemsForSizeColumns(withConfig, nextConfig);
    });
  };

  const patchSizeColumns = (nextColumns: PizzaSizeColumnDef[]) => {
    patchTableConfig((current) => ({ ...current, columns: nextColumns }));
  };

  const patchSizeSteps = (stepByColumnKey: Record<string, string>) => {
    onPatchSection((current) =>
      writePizzaSizeTableConfigOnSection(current, { ...readPizzaSizeTableConfigFromSection(current), stepByColumnKey }),
    );
  };

  const removeSizeColumn = (columnKey: string) => {
    if (sizeColumns.length <= 1) {
      return;
    }
    patchTableConfig((current) => {
      const nextSteps = { ...current.stepByColumnKey };
      delete nextSteps[columnKey];
      return {
        columns: current.columns.filter((column) => column.key !== columnKey),
        stepByColumnKey: nextSteps,
      };
    });
  };

  const applyBulkRows = (rows: BulkPasteRow[], kind: PizzaMenuRowKind) => {
    const created = rows
      .filter((row) => row.name.trim() && !existingNameKeys.has(normalizeMenuSuggestionName(row.name)))
      .map((row) => pizzaItemFromBulkRow(section.id, row, kind, tableConfig));
    if (created.length === 0) {
      return;
    }
    patchSectionItems(onPatchSection, (items) => [...items, ...created]);
  };

  const blockProps = {
    section,
    tableConfig,
    existingNameKeys,
    readOnly,
    onPatchSection,
    onRemoveSizeColumn: removeSizeColumn,
    onPatchSizeColumns: patchSizeColumns,
    onPatchSizeSteps: patchSizeSteps,
  };

  return (
    <div className="hub-menu-order-builder hub-menu-pizza-builder">
      <PizzaCategoryBlock
        {...blockProps}
        kind="pizza"
        label="Pizzas"
        items={itemsByKind.pizza}
        showBulkPaste
        onBulkPaste={(rows) => applyBulkRows(rows, "pizza")}
      />

      <PizzaCategoryBlock {...blockProps} kind="garlic_bread" label="Garlic breads" items={itemsByKind.garlic_bread} />

      <HubMenuPizzaCategoryChoicesPanel section={section} readOnly={readOnly} onPatchSection={onPatchSection} />

      <PizzaCategoryBlock {...blockProps} kind="calzone" label="Calzones" items={itemsByKind.calzone} />
    </div>
  );
}
