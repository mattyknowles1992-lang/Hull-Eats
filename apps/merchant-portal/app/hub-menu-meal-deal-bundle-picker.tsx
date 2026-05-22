"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import {
  applyMealDealBundleToItem,
  formatMenuMoney,
  getMealDealBundleSelection,
  listPickableMenuProducts,
  type MealDealBundleSelection,
  type MealDealBundleSlot,
  type PickableMenuProduct,
} from "./menu-studio-core";
import type { HubMenuSection, MenuItem } from "@hull-eats/types";

type Props = {
  item: MenuItem;
  menuSections: HubMenuSection[];
  readOnly: boolean;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
};

const SLOT_LABELS: Record<MealDealBundleSlot, string> = {
  main: "Main",
  side: "Side",
  drink: "Drink",
};

export function HubMenuMealDealBundlePicker({ item, menuSections, readOnly, onUpdateItem }: Props) {
  const menuProducts = useMemo(() => listPickableMenuProducts(menuSections), [menuSections]);
  const selection = useMemo(() => getMealDealBundleSelection(item), [item]);
  const productsById = useMemo(() => new Map(menuProducts.map((product) => [product.id, product])), [menuProducts]);

  const applySelection = (next: MealDealBundleSelection) => {
    onUpdateItem((current) => applyMealDealBundleToItem(current, next, menuProducts));
  };

  if (menuProducts.length === 0) {
    return (
      <p className="hub-menu-meal-library__hint">
        Add products to your customer menu categories first (e.g. Burgers, Sides, Drinks), then pick them here to build
        this meal deal bundle.
      </p>
    );
  }

  return (
    <div className="hub-menu-meal-deal-bundle">
      <p style={hint}>
        Pick items from your current menu for each part of the bundle. Customers choose one main, one side, and one drink
        when they order.
      </p>
      {(["main", "side", "drink"] as MealDealBundleSlot[]).map((slot) => (
        <BundleSlotPicker
          key={slot}
          slot={slot}
          label={SLOT_LABELS[slot]}
          selectedIds={selection[`${slot}Ids` as keyof MealDealBundleSelection] as string[]}
          menuProducts={menuProducts}
          productsById={productsById}
          readOnly={readOnly}
          onChange={(ids) =>
            applySelection({
              ...selection,
              [`${slot}Ids`]: ids,
            } as MealDealBundleSelection)
          }
        />
      ))}
    </div>
  );
}

function BundleSlotPicker({
  slot,
  label,
  selectedIds,
  menuProducts,
  productsById,
  readOnly,
  onChange,
}: {
  slot: MealDealBundleSlot;
  label: string;
  selectedIds: string[];
  menuProducts: PickableMenuProduct[];
  productsById: Map<string, PickableMenuProduct>;
  readOnly: boolean;
  onChange: (ids: string[]) => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState("");

  const available = useMemo(
    () => menuProducts.filter((product) => !selectedIds.includes(product.id)),
    [menuProducts, selectedIds],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, PickableMenuProduct[]>();
    for (const product of available) {
      const bucket = groups.get(product.categoryName) ?? [];
      bucket.push(product);
      groups.set(product.categoryName, bucket);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [available]);

  const addProduct = () => {
    if (!selectedProductId || selectedIds.includes(selectedProductId)) {
      return;
    }
    onChange([...selectedIds, selectedProductId]);
    setSelectedProductId("");
  };

  const removeId = (id: string) => {
    onChange(selectedIds.filter((entry) => entry !== id));
  };

  return (
    <div className="hub-menu-meal-deal-bundle__slot">
      <strong style={slotTitle}>{label}</strong>
      {selectedIds.length === 0 ? (
        <p style={empty}>No {label.toLowerCase()} options yet.</p>
      ) : (
        <ul style={list}>
          {selectedIds.map((id) => {
            const product = productsById.get(id);
            return (
              <li key={id} style={row}>
                <span>
                  <strong>{product?.name ?? "Menu item"}</strong>
                  {product ? (
                    <span style={meta}>
                      {" "}
                      · {product.categoryName} · {formatMenuMoney(product.price)}
                    </span>
                  ) : null}
                </span>
                {readOnly ? null : (
                  <button type="button" style={removeBtn} onClick={() => removeId(id)}>
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {readOnly ? null : (
        <div className="hub-menu-meal-product-picker__add-row hub-menu-meal-product-picker__add-row--bundle">
          <label className="hub-menu-meal-product-picker__field">
            <span style={fieldLabel}>Add from menu</span>
            <select
              className="hub-menu-meal-product-picker__select"
              value={selectedProductId}
              disabled={available.length === 0}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              <option value="">{available.length === 0 ? "All added" : `Choose ${label.toLowerCase()}…`}</option>
              {grouped.map(([categoryName, products]) => (
                <optgroup key={`${slot}-${categoryName}`} label={categoryName}>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({formatMenuMoney(product.price)})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <button type="button" className="hub-menu-meal-deal-items__add-btn" disabled={!selectedProductId} onClick={addProduct}>
            Add
          </button>
        </div>
      )}
    </div>
  );
}

const hint: CSSProperties = { margin: 0, fontSize: "0.86rem", lineHeight: 1.45, color: "rgba(15, 17, 21, 0.72)" };
const slotTitle: CSSProperties = { fontSize: "0.92rem" };
const empty: CSSProperties = { margin: 0, fontSize: "0.84rem", color: "rgba(15, 17, 21, 0.55)" };
const list: CSSProperties = { margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 };
const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
};
const meta: CSSProperties = { fontSize: "0.82rem", color: "rgba(15, 17, 21, 0.55)", fontWeight: 500 };
const removeBtn: CSSProperties = {
  border: "1px solid rgba(15, 17, 21, 0.14)",
  borderRadius: 8,
  background: "#fff",
  padding: "6px 10px",
  fontSize: "0.82rem",
  fontWeight: 700,
  cursor: "pointer",
};
const fieldLabel: CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "rgba(15, 17, 21, 0.6)" };
