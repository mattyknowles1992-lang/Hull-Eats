"use client";

import { useMemo } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import { HubMenuBulkPastePanel } from "./hub-menu-bulk-paste-panel";
import {
  formatPizzaMenuSuggestionName,
  normalizeMenuSuggestionName,
  PIZZA_MENU_ROW_KINDS,
  PIZZA_MENU_SUGGESTIONS_BY_KIND,
  type PizzaMenuRowKind,
} from "./hub-menu-pizza-presets";
import { HubMenuSuggestionStrip } from "./hub-menu-suggestion-strip";
import { MenuItemVisibilitySelect } from "./hub-menu-item-visibility-select";
import {
  applyPizzaSizesToMenuItem,
  createInitialPizzaSizeRows,
  pizzaSizeRowsFromMenuItem,
  type PizzaSizeRow,
} from "./pizza-size-draft";
import { applyPizzaMenuRowKind, buildLocalMenuItem, getPizzaMenuRowKind, type BulkPasteRow } from "./menu-studio-core";

type Props = {
  section: HubMenuSection;
  readOnly?: boolean;
  onPatchSection: (updater: (section: HubMenuSection) => HubMenuSection) => void;
};

const SIZE_COLUMNS = createInitialPizzaSizeRows().map((row) => row.label);

function patchSectionItems(
  onPatchSection: Props["onPatchSection"],
  updater: (items: MenuItem[]) => MenuItem[],
) {
  onPatchSection((current) => ({ ...current, items: updater(current.items) }));
}

function pizzaItemFromBulkRow(sectionId: string, row: BulkPasteRow, kind: PizzaMenuRowKind): MenuItem {
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
    const sizeRows = createInitialPizzaSizeRows().map((sizeRow) =>
      sizeRow.label === '10"' ? { ...sizeRow, selected: true, price: String(row.price) } : sizeRow,
    );
    const applied = applyPizzaSizesToMenuItem(item, sizeRows);
    if (!("error" in applied)) {
      item = applied;
    }
  }

  return item;
}

type PizzaCategoryBlockProps = {
  sectionId: string;
  kind: PizzaMenuRowKind;
  label: string;
  items: MenuItem[];
  existingNameKeys: ReadonlySet<string>;
  readOnly: boolean;
  onPatchSection: Props["onPatchSection"];
};

function PizzaCategoryBlock({
  sectionId,
  kind,
  label,
  items,
  existingNameKeys,
  readOnly,
  onPatchSection,
}: PizzaCategoryBlockProps) {
  const addRow = (name = "") => {
    const created = applyPizzaMenuRowKind(
      buildLocalMenuItem({
        categoryId: sectionId,
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

  const updateSizePrice = (item: MenuItem, sizeLabel: string, rawPrice: string) => {
    const rows = pizzaSizeRowsFromMenuItem(item);
    const nextRows: PizzaSizeRow[] = rows.map((row) => {
      if (row.label !== sizeLabel) {
        return row;
      }
      const trimmed = rawPrice.trim();
      if (!trimmed) {
        return { ...row, selected: false, price: "" };
      }
      return { ...row, selected: true, price: trimmed };
    });

    const applied = applyPizzaSizesToMenuItem(item, nextRows);
    if ("error" in applied) {
      return;
    }
    updateRow(item.id, () => applied);
  };

  const removeRow = (itemId: string) => {
    patchSectionItems(onPatchSection, (sectionItems) => sectionItems.filter((item) => item.id !== itemId));
  };

  const sizePriceForItem = (item: MenuItem, sizeLabel: string): string => {
    const rows = pizzaSizeRowsFromMenuItem(item);
    const row = rows.find((entry) => entry.label === sizeLabel);
    return row?.selected ? row.price : "";
  };

  const gridColumns = `minmax(180px, 1.6fr) repeat(${SIZE_COLUMNS.length}, minmax(72px, 0.75fr)) minmax(96px, 0.85fr) auto`;
  const namePlaceholder =
    kind === "garlic_bread" ? "e.g. Garlic Bread with Cheese" : kind === "calzone" ? "e.g. Pepperoni Calzone" : "e.g. Margherita Pizza";

  return (
    <section className="hub-menu-pizza-builder__category">
      <HubMenuSuggestionStrip
        title={`Suggested ${label.toLowerCase()}`}
        suggestions={PIZZA_MENU_SUGGESTIONS_BY_KIND[kind]}
        existingNames={existingNameKeys}
        readOnly={readOnly}
        formatAddName={(suggestion) => formatPizzaMenuSuggestionName(kind, suggestion)}
        onAdd={addSuggestedRow}
      />

      <div className="hub-menu-pizza-builder__category-head">
        <h3>{label}</h3>
        <span>{items.length} row{items.length === 1 ? "" : "s"}</span>
      </div>

      <div className="hub-menu-pizza-builder__table-wrap">
        <div className="hub-menu-pizza-builder__table" role="table">
          <div
            className="hub-menu-pizza-builder__row hub-menu-pizza-builder__row--head"
            role="row"
            style={{ gridTemplateColumns: gridColumns }}
          >
            <span role="columnheader">Name</span>
            {SIZE_COLUMNS.map((sizeLabel) => (
              <span key={sizeLabel} role="columnheader">
                {sizeLabel}
              </span>
            ))}
            <span role="columnheader">Save as</span>
            <span role="columnheader" className="hub-menu-order-builder__actions-head" />
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="hub-menu-pizza-builder__row"
              role="row"
              style={{ gridTemplateColumns: gridColumns }}
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
              {SIZE_COLUMNS.map((sizeLabel) => (
                <label key={`${item.id}-${sizeLabel}`} className="hub-menu-order-builder__cell hub-menu-pizza-builder__size-cell">
                  <span className="hub-menu-order-builder__sr-only">{sizeLabel} price</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={readOnly}
                    placeholder="£"
                    value={sizePriceForItem(item, sizeLabel)}
                    onChange={(event) => updateSizePrice(item, sizeLabel, event.target.value)}
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
              {readOnly ? null : (
                <button type="button" className="hub-menu-order-builder__remove-btn" onClick={() => removeRow(item.id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {readOnly ? null : (
        <button type="button" className="hub-menu-order-builder__add-line" onClick={() => addRow("")}>
          + Add {label.toLowerCase().replace(/s$/, "")} row
        </button>
      )}
    </section>
  );
}

export function HubMenuPizzaOrderBuilder({ section, readOnly = false, onPatchSection }: Props) {
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

  const applyBulkRows = (rows: BulkPasteRow[], kind: PizzaMenuRowKind) => {
    const created = rows
      .filter((row) => row.name.trim() && !existingNameKeys.has(normalizeMenuSuggestionName(row.name)))
      .map((row) => pizzaItemFromBulkRow(section.id, row, kind));
    if (created.length === 0) {
      return;
    }
    patchSectionItems(onPatchSection, (items) => [...items, ...created]);
  };

  return (
    <div className="hub-menu-order-builder hub-menu-pizza-builder">
      <div className="hub-menu-order-builder__intro">
        <strong>Pizza menu tables</strong>
        <p>
          Pizzas, garlic breads, and calzones each have their own table. Suggestions run top-to-bottom from easy
          classics — tap + to add or × to skip to the next name. Enter full prices (£) per size; rows save as Live.
        </p>
      </div>

      <HubMenuBulkPastePanel
        readOnly={readOnly}
        placeholder={`Paste pizza names — one per line — e.g.\nMargherita\nPepperoni from £9.50`}
        onApply={(rows) => applyBulkRows(rows, "pizza")}
      />

      {PIZZA_MENU_ROW_KINDS.map(({ id, label }) => (
        <PizzaCategoryBlock
          key={id}
          sectionId={section.id}
          kind={id}
          label={label}
          items={itemsByKind[id]}
          existingNameKeys={existingNameKeys}
          readOnly={readOnly}
          onPatchSection={onPatchSection}
        />
      ))}
    </div>
  );
}
