"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import {
  createMealCustomOption,
  formatMenuMoney,
  mealOptionFromMenuProduct,
  type MealDealItem,
  type MealDealSlot,
  type PickableMenuProduct,
} from "./menu-studio-core";

type Props = {
  items: MealDealItem[];
  menuProducts: PickableMenuProduct[];
  readOnly: boolean;
  onChange: (items: MealDealItem[]) => void;
};

export function HubMenuMealDealItemsPicker({ items, menuProducts, readOnly, onChange }: Props) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addSlot, setAddSlot] = useState<MealDealSlot>("side");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("0");

  const productsById = useMemo(() => new Map(menuProducts.map((product) => [product.id, product])), [menuProducts]);

  const usedMenuItemIds = useMemo(
    () => new Set(items.map((item) => item.menuItemId).filter(Boolean) as string[]),
    [items],
  );

  const availableProducts = useMemo(
    () => menuProducts.filter((product) => !usedMenuItemIds.has(product.id)),
    [menuProducts, usedMenuItemIds],
  );

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, PickableMenuProduct[]>();
    for (const product of availableProducts) {
      const bucket = groups.get(product.categoryName) ?? [];
      bucket.push(product);
      groups.set(product.categoryName, bucket);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [availableProducts]);

  const addFromMenu = () => {
    const product = productsById.get(selectedProductId);
    if (!product) {
      return;
    }
    onChange([...items, { ...mealOptionFromMenuProduct(product), slot: addSlot }]);
    setSelectedProductId("");
  };

  const addCustom = () => {
    if (!customName.trim()) {
      return;
    }
    onChange([
      ...items,
      { ...createMealCustomOption(customName, Number(customPrice) || 0, addSlot), slot: addSlot },
    ]);
    setCustomName("");
    setCustomPrice("0");
  };

  const updateItem = (id: string, patch: Partial<MealDealItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="hub-menu-meal-deal-items">
      <strong style={title}>Items in this meal deal</strong>
      <p style={hint}>Add menu items (fries, drink, etc.). Mark each as a side or drink — customers choose when they upgrade.</p>

      {items.length === 0 ? (
        <p style={empty}>No items yet — pick from your menu or add a custom name.</p>
      ) : (
        <ul style={list}>
          {items.map((item) => {
            const linked = item.menuItemId ? productsById.get(item.menuItemId) : null;
            return (
              <li key={item.id} style={row}>
                <select
                  style={slotSelect}
                  value={item.slot}
                  disabled={readOnly}
                  onChange={(e) => updateItem(item.id, { slot: e.target.value as MealDealSlot })}
                >
                  <option value="side">Side</option>
                  <option value="drink">Drink</option>
                </select>
                <span style={nameCol}>
                  <strong>{item.label}</strong>
                  {linked ? (
                    <span style={meta}>
                      {" "}
                      · {linked.categoryName} · menu {formatMenuMoney(linked.price)}
                    </span>
                  ) : (
                    <span style={meta}> · custom</span>
                  )}
                </span>
                <label style={priceField}>
                  <span style={priceLabel}>Extra £</span>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    className="hub-menu-meal-product-picker__price-input"
                    disabled={readOnly}
                    value={item.priceDelta}
                    onChange={(e) => updateItem(item.id, { priceDelta: Number(e.target.value) || 0 })}
                  />
                </label>
                {readOnly ? null : (
                  <button type="button" style={removeButton} onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {readOnly ? null : (
        <div style={addPanel}>
          <div className="hub-menu-meal-product-picker__add-row">
            <label className="hub-menu-meal-product-picker__field">
              <span style={priceLabel}>Add from menu</span>
              <select
                className="hub-menu-meal-product-picker__select"
                value={selectedProductId}
                disabled={availableProducts.length === 0}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">
                  {availableProducts.length === 0 ? "Add customer menu items first" : "Choose item…"}
                </option>
                {groupedProducts.map(([categoryName, products]) => (
                  <optgroup key={categoryName} label={categoryName}>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({formatMenuMoney(product.price)})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="hub-menu-meal-product-picker__field">
              <span style={priceLabel}>Type</span>
              <select
                className="hub-menu-meal-product-picker__select"
                value={addSlot}
                onChange={(e) => setAddSlot(e.target.value as MealDealSlot)}
              >
                <option value="side">Side</option>
                <option value="drink">Drink</option>
              </select>
            </label>
            <button type="button" className="hub-menu-meal-deal-items__add-btn" disabled={!selectedProductId} onClick={addFromMenu}>
              Add
            </button>
          </div>
          <div className="hub-menu-meal-product-picker__custom-row">
            <label className="hub-menu-meal-product-picker__field">
              <span style={priceLabel}>Or custom name</span>
              <input
                className="hub-menu-meal-product-picker__select"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Fries"
              />
            </label>
            <label className="hub-menu-meal-product-picker__price-field">
              <span style={priceLabel}>Extra £</span>
              <input
                type="number"
                step="0.1"
                min={0}
                className="hub-menu-meal-product-picker__price-input"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
            </label>
            <label className="hub-menu-meal-product-picker__field">
              <span style={priceLabel}>Type</span>
              <select
                className="hub-menu-meal-product-picker__select"
                value={addSlot}
                onChange={(e) => setAddSlot(e.target.value as MealDealSlot)}
              >
                <option value="side">Side</option>
                <option value="drink">Drink</option>
              </select>
            </label>
            <button type="button" className="hub-menu-meal-deal-items__add-btn" disabled={!customName.trim()} onClick={addCustom}>
              Add custom
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const title: CSSProperties = { fontSize: "0.9rem" };
const hint: CSSProperties = { margin: 0, fontSize: "0.8rem", color: "#5b6470", lineHeight: 1.45 };
const empty: CSSProperties = { margin: 0, fontSize: "0.82rem", color: "#5b6470" };
const list: CSSProperties = { margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 };
const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "88px minmax(0, 1fr) minmax(120px, 160px) auto",
  gap: 10,
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fafbfc",
};
const slotSelect: CSSProperties = {
  minHeight: 44,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.15)",
  font: "inherit",
};
const nameCol: CSSProperties = { minWidth: 0 };
const meta: CSSProperties = { fontWeight: 500, color: "#5b6470", fontSize: "0.8rem" };
const priceField: CSSProperties = { display: "grid", gap: 4, minWidth: 0 };
const priceLabel: CSSProperties = { fontSize: "0.72rem", fontWeight: 800, color: "#3d4652" };
const removeButton: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid rgba(155, 28, 28, 0.25)",
  background: "rgba(255, 95, 95, 0.08)",
  color: "#8a2121",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "0.82rem",
};
const addPanel: CSSProperties = { display: "grid", gap: 10 };
