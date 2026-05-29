"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import {
  createMealCustomOption,
  formatMenuMoney,
  mealOptionFromMenuProduct,
  type HubMealSideOption,
  type PickableMenuProduct,
} from "./menu-studio-core";

type HubMenuMealProductPickerProps = {
  title: string;
  kind: "side" | "drink";
  options: HubMealSideOption[];
  menuProducts: PickableMenuProduct[];
  readOnly: boolean;
  allowCustom?: boolean;
  onChange: (options: HubMealSideOption[]) => void;
};

export function HubMenuMealProductPicker({
  title,
  kind,
  options,
  menuProducts,
  readOnly,
  allowCustom = true,
  onChange,
}: HubMenuMealProductPickerProps) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("0");

  const productsById = useMemo(() => new Map(menuProducts.map((product) => [product.id, product])), [menuProducts]);

  const usedMenuItemIds = useMemo(
    () => new Set(options.map((option) => option.menuItemId).filter(Boolean) as string[]),
    [options],
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

  const addProduct = () => {
    const product = productsById.get(selectedProductId);
    if (!product) {
      return;
    }
    onChange([...options, mealOptionFromMenuProduct(product)]);
    setSelectedProductId("");
  };

  const updateOption = (optionId: string, patch: Partial<HubMealSideOption>) => {
    onChange(options.map((option) => (option.id === optionId ? { ...option, ...patch } : option)));
  };

  const removeOption = (optionId: string) => {
    onChange(options.filter((option) => option.id !== optionId));
  };

  const addCustom = () => {
    if (!customName.trim()) {
      return;
    }
    onChange([...options, createMealCustomOption(customName, Number(customPrice) || 0, kind)]);
    setCustomName("");
    setCustomPrice("0");
  };

  return (
    <div style={block}>
      <strong style={blockTitle}>{title}</strong>
      <p style={hint}>
        Pick real items from your customer menu (e.g. Fries, Coke). Extra £ is added on top of the meal upgrade when
        customers choose that option.
      </p>

      {options.length === 0 ? (
        <p style={empty}>No {kind === "side" ? "sides" : "drinks"} yet — add from your menu below.</p>
      ) : (
        <ul style={optionList}>
          {options.map((option) => {
            const linked = option.menuItemId ? productsById.get(option.menuItemId) : null;
            const missingFromMenu = Boolean(option.menuItemId && !linked);

            return (
              <li key={option.id} style={optionCard}>
                <div style={optionMain}>
                  <span style={optionName}>
                    {option.label}
                    {linked ? (
                      <span style={menuLink}>
                        {" "}
                        · {linked.categoryName} · menu {formatMenuMoney(linked.price)}
                      </span>
                    ) : !option.menuItemId ? (
                      <span style={menuLink}> · custom option</span>
                    ) : null}
                    {missingFromMenu ? <span style={missing}> · no longer on menu</span> : null}
                  </span>
                  <label className="hub-menu-meal-product-picker__price-field">
                    <span style={priceLabel}>Extra £</span>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      className="hub-menu-meal-product-picker__price-input"
                      disabled={readOnly}
                      value={option.priceDelta}
                      onChange={(e) => updateOption(option.id, { priceDelta: Number(e.target.value) || 0 })}
                    />
                  </label>
                </div>
                {readOnly ? null : (
                  <button type="button" style={removeButton} onClick={() => removeOption(option.id)}>
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {readOnly ? null : (
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
                {availableProducts.length === 0 ? "Add menu categories & items first" : "Choose a menu item…"}
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
          <button type="button" style={addButton} disabled={!selectedProductId} onClick={addProduct}>
            Add from menu
          </button>
        </div>
      )}

      {readOnly || !allowCustom ? null : (
        <div className="hub-menu-meal-product-picker__custom-row">
          <label className="hub-menu-meal-product-picker__field">
            <span style={priceLabel}>Or create custom {kind}</span>
            <input
              className="hub-menu-meal-product-picker__select"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={kind === "side" ? "e.g. Fries" : "e.g. Coke"}
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
          <button type="button" style={addButton} disabled={!customName.trim()} onClick={addCustom}>
            Add custom
          </button>
        </div>
      )}
    </div>
  );
}

const block: CSSProperties = { display: "grid", gap: 8 };
const blockTitle: CSSProperties = { fontSize: "0.84rem" };
const hint: CSSProperties = { margin: 0, fontSize: "0.8rem", color: "#5b6470", lineHeight: 1.4 };
const empty: CSSProperties = { margin: 0, fontSize: "0.82rem", color: "#5b6470" };
const optionList: CSSProperties = { margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 };
const optionCard: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fafbfc",
};
const optionMain: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", flex: "1 1 200px" };
const optionName: CSSProperties = { fontWeight: 700, fontSize: "0.88rem" };
const menuLink: CSSProperties = { fontWeight: 500, color: "#5b6470", fontSize: "0.8rem" };
const missing: CSSProperties = { color: "#8a2121", fontSize: "0.8rem", fontWeight: 700 };
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
const addButton: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(180deg, #23cdff, #079bc8)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};
