"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import {
  createMealCustomOption,
  emptyMealDealEditorConfig,
  formatMenuMoney,
  mealOptionFromMenuProduct,
  resolveMealDealItems,
  syncMealDealEditorConfigFromItems,
  type HubMealDealEditorConfig,
  type HubMealPickableCategory,
  type MealDealItem,
  type MealDealSlot,
  type PickableMenuProduct,
} from "./menu-studio-core";

type Props = {
  config: HubMealDealEditorConfig;
  menuProducts: PickableMenuProduct[];
  pickableCategories: HubMealPickableCategory[];
  readOnly: boolean;
  onChange: (config: HubMealDealEditorConfig) => void;
};

export function HubMenuMealDealItemsPicker({
  config,
  menuProducts,
  pickableCategories,
  readOnly,
  onChange,
}: Props) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addSlot, setAddSlot] = useState<MealDealSlot>("side");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [categorySlot, setCategorySlot] = useState<MealDealSlot>("drink");
  const [categoryDefaultExtra, setCategoryDefaultExtra] = useState("0");

  const items = useMemo(() => resolveMealDealItems(config, menuProducts), [config, menuProducts]);

  const productsById = useMemo(() => new Map(menuProducts.map((product) => [product.id, product])), [menuProducts]);

  const categoriesById = useMemo(
    () => new Map(pickableCategories.map((category) => [category.id, category])),
    [pickableCategories],
  );

  const poolCategoryIds = useMemo(
    () =>
      new Set([
        ...config.sideCategoryPools.map((pool) => pool.categoryId),
        ...config.drinkCategoryPools.map((pool) => pool.categoryId),
      ]),
    [config.sideCategoryPools, config.drinkCategoryPools],
  );

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

  const linkedCategoryPools = useMemo(
    () => [
      ...config.sideCategoryPools.map((pool) => ({
        ...pool,
        slot: "side" as const,
        name: categoriesById.get(pool.categoryId)?.name ?? "Category",
        count: categoriesById.get(pool.categoryId)?.productCount ?? 0,
      })),
      ...config.drinkCategoryPools.map((pool) => ({
        ...pool,
        slot: "drink" as const,
        name: categoriesById.get(pool.categoryId)?.name ?? "Category",
        count: categoriesById.get(pool.categoryId)?.productCount ?? 0,
      })),
    ],
    [config.sideCategoryPools, config.drinkCategoryPools, categoriesById],
  );

  const usedCategoryPoolIds = useMemo(
    () => new Set(linkedCategoryPools.map((pool) => `${pool.slot}:${pool.categoryId}`)),
    [linkedCategoryPools],
  );

  const availableCategories = useMemo(
    () =>
      pickableCategories.filter(
        (category) => !usedCategoryPoolIds.has(`${categorySlot}:${category.id}`),
      ),
    [pickableCategories, usedCategoryPoolIds, categorySlot],
  );

  const setItems = (nextItems: MealDealItem[]) => {
    onChange(syncMealDealEditorConfigFromItems(config, nextItems, menuProducts));
  };

  const addFromMenu = () => {
    const product = productsById.get(selectedProductId);
    if (!product) {
      return;
    }
    setItems([...items, { ...mealOptionFromMenuProduct(product), slot: addSlot }]);
    setSelectedProductId("");
  };

  const addCustom = () => {
    if (!customName.trim()) {
      return;
    }
    setItems([
      ...items,
      { ...createMealCustomOption(customName, Number(customPrice) || 0, addSlot), slot: addSlot },
    ]);
    setCustomName("");
    setCustomPrice("0");
  };

  const addCategoryPool = () => {
    const id = categoryId.trim();
    if (!id) {
      return;
    }
    const pool = {
      categoryId: id,
      defaultPriceDelta: Number(categoryDefaultExtra) || 0,
    };
    if (categorySlot === "drink") {
      if (config.drinkCategoryPools.some((entry) => entry.categoryId === id)) {
        return;
      }
      onChange({
        ...config,
        drinkCategoryPools: [...config.drinkCategoryPools, pool],
      });
    } else {
      if (config.sideCategoryPools.some((entry) => entry.categoryId === id)) {
        return;
      }
      onChange({
        ...config,
        sideCategoryPools: [...config.sideCategoryPools, pool],
      });
    }
    setCategoryId("");
    setCategoryDefaultExtra("0");
  };

  const removeCategoryPool = (slot: MealDealSlot, poolCategoryId: string) => {
    if (slot === "drink") {
      onChange({
        ...config,
        drinkCategoryPools: config.drinkCategoryPools.filter((pool) => pool.categoryId !== poolCategoryId),
      });
      return;
    }
    onChange({
      ...config,
      sideCategoryPools: config.sideCategoryPools.filter((pool) => pool.categoryId !== poolCategoryId),
    });
  };

  const updateCategoryPoolDefault = (slot: MealDealSlot, poolCategoryId: string, defaultPriceDelta: number) => {
    if (slot === "drink") {
      onChange({
        ...config,
        drinkCategoryPools: config.drinkCategoryPools.map((pool) =>
          pool.categoryId === poolCategoryId ? { ...pool, defaultPriceDelta } : pool,
        ),
      });
      return;
    }
    onChange({
      ...config,
      sideCategoryPools: config.sideCategoryPools.map((pool) =>
        pool.categoryId === poolCategoryId ? { ...pool, defaultPriceDelta } : pool,
      ),
    });
  };

  const updateItem = (id: string, patch: Partial<MealDealItem>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const isFromCategoryPool = (menuItemId: string | null | undefined) => {
    if (!menuItemId) {
      return false;
    }
    const product = productsById.get(menuItemId);
    return product ? poolCategoryIds.has(product.categoryId) : false;
  };

  return (
    <div className="hub-menu-meal-deal-items">
      <strong style={title}>Items in this meal deal</strong>
      <p style={hint}>
        Link a whole menu category (e.g. all drinks) or add individual items. New products in a linked category appear
        automatically after you publish the menu.
      </p>

      {linkedCategoryPools.length > 0 ? (
        <div style={poolSection}>
          <span style={poolTitle}>Linked categories</span>
          <ul style={poolList}>
            {linkedCategoryPools.map((pool) => (
              <li key={`${pool.slot}-${pool.categoryId}`} style={poolRow}>
                <span style={poolMeta}>
                  <strong>{pool.name}</strong>
                  <span style={meta}>
                    {" "}
                    · {pool.slot === "drink" ? "Drinks" : "Sides"} · {pool.count} item{pool.count === 1 ? "" : "s"}
                  </span>
                </span>
                <label style={priceField}>
                  <span style={priceLabel}>Default extra £</span>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    className="hub-menu-meal-product-picker__price-input"
                    disabled={readOnly}
                    value={pool.defaultPriceDelta ?? 0}
                    onChange={(e) =>
                      updateCategoryPoolDefault(pool.slot, pool.categoryId, Number(e.target.value) || 0)
                    }
                  />
                </label>
                {readOnly ? null : (
                  <button
                    type="button"
                    style={removeButton}
                    onClick={() => removeCategoryPool(pool.slot, pool.categoryId)}
                  >
                    Unlink
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {items.length === 0 && linkedCategoryPools.length === 0 ? (
        <p style={empty}>No items yet — link a category or pick individual menu items.</p>
      ) : items.length > 0 ? (
        <ul style={list}>
          {items.map((item) => {
            const linked = item.menuItemId ? productsById.get(item.menuItemId) : null;
            const fromPool = isFromCategoryPool(item.menuItemId);
            return (
              <li key={item.id} style={row}>
                <select
                  style={slotSelect}
                  value={item.slot}
                  disabled={readOnly || fromPool}
                  onChange={(e) => updateItem(item.id, { slot: e.target.value as MealDealSlot })}
                  title={fromPool ? "Slot is set by the linked category" : undefined}
                >
                  <option value="side">Side</option>
                  <option value="drink">Drink</option>
                </select>
                <span style={nameCol}>
                  <strong>{item.label}</strong>
                  {linked ? (
                    <span style={meta}>
                      {" "}
                      · {linked.categoryName}
                      {fromPool ? " · from linked category" : ""} · menu {formatMenuMoney(linked.price)}
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
      ) : null}

      {readOnly ? null : (
        <div style={addPanel}>
          <div className="hub-menu-meal-product-picker__add-row">
            <label className="hub-menu-meal-product-picker__field">
              <span style={priceLabel}>Add whole category</span>
              <select
                className="hub-menu-meal-product-picker__select"
                value={categoryId}
                disabled={availableCategories.length === 0}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">
                  {pickableCategories.length === 0
                    ? "Add customer menu categories first"
                    : availableCategories.length === 0
                      ? "All categories linked for this type"
                      : "Choose category…"}
                </option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.productCount} items)
                  </option>
                ))}
              </select>
            </label>
            <label className="hub-menu-meal-product-picker__field">
              <span style={priceLabel}>Type</span>
              <select
                className="hub-menu-meal-product-picker__select"
                value={categorySlot}
                onChange={(e) => {
                  setCategorySlot(e.target.value as MealDealSlot);
                  setCategoryId("");
                }}
              >
                <option value="side">Side</option>
                <option value="drink">Drink</option>
              </select>
            </label>
            <label className="hub-menu-meal-product-picker__price-field">
              <span style={priceLabel}>Default extra £</span>
              <input
                type="number"
                step="0.1"
                min={0}
                className="hub-menu-meal-product-picker__price-input"
                value={categoryDefaultExtra}
                onChange={(e) => setCategoryDefaultExtra(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="hub-menu-meal-deal-items__add-btn"
              disabled={!categoryId}
              onClick={addCategoryPool}
            >
              Link category
            </button>
          </div>
          <div className="hub-menu-meal-product-picker__add-row">
            <label className="hub-menu-meal-product-picker__field">
              <span style={priceLabel}>Add single item</span>
              <select
                className="hub-menu-meal-product-picker__select"
                value={selectedProductId}
                disabled={availableProducts.length === 0}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">
                  {availableProducts.length === 0 ? "All items already included" : "Choose item…"}
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
const poolSection: CSSProperties = { display: "grid", gap: 8 };
const poolTitle: CSSProperties = { fontSize: "0.82rem", fontWeight: 800, color: "#3d4652" };
const poolList: CSSProperties = { margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 };
const poolRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(120px, 160px) auto",
  gap: 10,
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(6, 79, 104, 0.2)",
  background: "rgba(6, 79, 104, 0.06)",
};
const poolMeta: CSSProperties = { minWidth: 0 };
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
