"use client";

import { useMemo, useState } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import { HubMenuBulkPastePanel } from "./hub-menu-bulk-paste-panel";
import { MenuItemVisibilitySelect } from "./hub-menu-item-visibility-select";
import { POPULAR_PIZZA_QUICK_ADD_BATCH, POPULAR_PIZZA_SUGGESTIONS } from "./hub-menu-pizza-presets";
import {
  applyPizzaSizesToMenuItem,
  createInitialPizzaSizeRows,
  pizzaSizeRowsFromMenuItem,
  type PizzaSizeRow,
} from "./pizza-size-draft";
import { buildLocalMenuItem, type BulkPasteRow } from "./menu-studio-core";

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

function normalizePizzaName(name: string): string {
  return name.trim().toLowerCase();
}

function pizzaItemFromBulkRow(sectionId: string, row: BulkPasteRow): MenuItem {
  let item = buildLocalMenuItem({
    categoryId: sectionId,
    name: row.name,
    description: "",
    price: 0,
    requiresIdVerification: false,
    components: [],
    optionGroups: [],
  });

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

export function HubMenuPizzaOrderBuilder({ section, readOnly = false, onPatchSection }: Props) {
  const [suggestionOffset, setSuggestionOffset] = useState(0);

  const existingNameKeys = useMemo(
    () => new Set(section.items.map((item) => normalizePizzaName(item.name)).filter(Boolean)),
    [section.items],
  );

  const availableSuggestions = useMemo(
    () => POPULAR_PIZZA_SUGGESTIONS.filter((name) => !existingNameKeys.has(normalizePizzaName(name))),
    [existingNameKeys],
  );

  const suggestionBatch = useMemo(() => {
    if (availableSuggestions.length === 0) {
      return [];
    }
    const batch: string[] = [];
    for (let i = 0; i < POPULAR_PIZZA_QUICK_ADD_BATCH; i += 1) {
      const index = (suggestionOffset + i) % availableSuggestions.length;
      batch.push(availableSuggestions[index]!);
    }
    return batch;
  }, [availableSuggestions, suggestionOffset]);

  const addPizzaRow = (name = "") => {
    const created = buildLocalMenuItem({
      categoryId: section.id,
      name,
      description: "",
      price: 0,
      requiresIdVerification: false,
      components: [],
      optionGroups: [],
    });
    patchSectionItems(onPatchSection, (items) => [...items, created]);
  };

  const applyBulkRows = (rows: BulkPasteRow[]) => {
    const created = rows
      .filter((row) => row.name.trim() && !existingNameKeys.has(normalizePizzaName(row.name)))
      .map((row) => pizzaItemFromBulkRow(section.id, row));
    if (created.length === 0) {
      return;
    }
    patchSectionItems(onPatchSection, (items) => [...items, ...created]);
  };

  const updatePizzaRow = (itemId: string, updater: (item: MenuItem) => MenuItem) => {
    patchSectionItems(onPatchSection, (items) => items.map((item) => (item.id === itemId ? updater(item) : item)));
  };

  const updatePizzaName = (itemId: string, name: string) => {
    updatePizzaRow(itemId, (item) => ({ ...item, name }));
  };

  const updatePizzaSizePrice = (item: MenuItem, sizeLabel: string, rawPrice: string) => {
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
    updatePizzaRow(item.id, () => applied);
  };

  const removePizzaRow = (itemId: string) => {
    patchSectionItems(onPatchSection, (items) => items.filter((item) => item.id !== itemId));
  };

  const sizePriceForItem = (item: MenuItem, sizeLabel: string): string => {
    const rows = pizzaSizeRowsFromMenuItem(item);
    const row = rows.find((entry) => entry.label === sizeLabel);
    return row?.selected ? row.price : "";
  };

  const gridColumns = `minmax(180px, 1.6fr) repeat(${SIZE_COLUMNS.length}, minmax(72px, 0.75fr)) minmax(96px, 0.85fr) auto`;

  return (
    <div className="hub-menu-order-builder hub-menu-pizza-builder">
      <div className="hub-menu-order-builder__intro">
        <strong>Pizza menu table</strong>
        <p>
          Add each pizza on its own row, then enter the full price (£) for each size you sell. Rows save as Live — use
          Save as → Hidden if needed. Popular suggestions and bulk paste fill names quickly.
        </p>
      </div>

      <HubMenuBulkPastePanel
        readOnly={readOnly}
        placeholder={`Paste pizza names — one per line — e.g.\nMargherita Pizza\nPepperoni Pizza from £9.50`}
        onApply={applyBulkRows}
      />

      {readOnly || availableSuggestions.length === 0 ? null : (
        <section className="hub-menu-pizza-builder__popular">
          <div className="hub-menu-pizza-builder__popular-head">
            <strong>Popular pizzas</strong>
            {availableSuggestions.length > POPULAR_PIZZA_QUICK_ADD_BATCH ? (
              <button
                type="button"
                className="hub-menu-order-builder__ghost-btn"
                onClick={() => setSuggestionOffset((current) => (current + POPULAR_PIZZA_QUICK_ADD_BATCH) % availableSuggestions.length)}
              >
                More suggestions
              </button>
            ) : null}
          </div>
          <div className="hub-menu-pizza-builder__popular-row">
            {suggestionBatch.map((name) => (
              <button
                key={name}
                type="button"
                className="hub-menu-pizza-builder__popular-chip"
                onClick={() => addPizzaRow(name)}
              >
                <span>{name}</span>
                <strong aria-hidden>+</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="hub-menu-pizza-builder__table-wrap">
        <div className="hub-menu-pizza-builder__table" role="table">
          <div className="hub-menu-pizza-builder__row hub-menu-pizza-builder__row--head" role="row" style={{ gridTemplateColumns: gridColumns }}>
            <span role="columnheader">Pizza name</span>
            {SIZE_COLUMNS.map((label) => (
              <span key={label} role="columnheader">
                {label}
              </span>
            ))}
            <span role="columnheader">Save as</span>
            <span role="columnheader" className="hub-menu-order-builder__actions-head" />
          </div>

          {section.items.map((item) => (
            <div
              key={item.id}
              className="hub-menu-pizza-builder__row"
              role="row"
              style={{ gridTemplateColumns: gridColumns }}
            >
              <label className="hub-menu-order-builder__cell">
                <span className="hub-menu-order-builder__sr-only">Pizza name</span>
                <input
                  value={item.name}
                  disabled={readOnly}
                  placeholder="e.g. Margherita Pizza"
                  onChange={(event) => updatePizzaName(item.id, event.target.value)}
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
                    onChange={(event) => updatePizzaSizePrice(item, sizeLabel, event.target.value)}
                  />
                </label>
              ))}
              <div className="hub-menu-order-builder__visibility-cell">
                <MenuItemVisibilitySelect
                  item={item}
                  readOnly={readOnly}
                  compact
                  onChange={(next) => updatePizzaRow(item.id, () => next)}
                />
              </div>
              {readOnly ? null : (
                <button type="button" className="hub-menu-order-builder__remove-btn" onClick={() => removePizzaRow(item.id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {readOnly ? null : (
        <button type="button" className="hub-menu-order-builder__add-line" onClick={() => addPizzaRow("")}>
          + Add pizza row
        </button>
      )}
    </div>
  );
}
