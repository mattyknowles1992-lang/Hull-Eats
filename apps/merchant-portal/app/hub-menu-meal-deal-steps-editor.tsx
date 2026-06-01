"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";
import { isHubMenuMealDealsCategory } from "@hull-eats/types";

import {
  applyMealDealConfigToItem,
  createEmptyMealDealConfig,
  customerFacingMenuSections,
  getMealDealConfig,
  listPickableMenuProducts,
  type HubMealDealConfig,
  type HubMealDealStep,
  type MealDealStepSource,
  type PickableMenuProduct,
} from "./menu-studio-core";

type Props = {
  item: MenuItem;
  menuSections: HubMenuSection[];
  readOnly?: boolean;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
};

const hint: CSSProperties = { margin: 0, fontSize: "0.84rem", color: "#5b6470", lineHeight: 1.45 };
const stepCard: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
};

export function HubMenuMealDealStepsEditor({ item, menuSections, readOnly = false, onUpdateItem }: Props) {
  const menuProducts = useMemo(() => listPickableMenuProducts(menuSections), [menuSections]);
  const customerCategories = useMemo(
    () => customerFacingMenuSections(menuSections).filter((section) => !isHubMenuMealDealsCategory(section)),
    [menuSections],
  );
  const config = useMemo(() => getMealDealConfig(item), [item]);

  const applyConfig = (next: HubMealDealConfig) => {
    onUpdateItem((current) => applyMealDealConfigToItem(current, next, menuProducts));
  };

  const updateStep = (stepId: string, patch: Partial<HubMealDealStep>) => {
    applyConfig({
      steps: config.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
    });
  };

  const addStep = () => {
    applyConfig({
      steps: [
        ...config.steps,
        {
          id: `step-${Date.now()}`,
          label: "Choice",
          source: "pick_products",
          productIds: [],
          categoryIds: [],
          required: true,
        },
      ],
    });
  };

  const removeStep = (stepId: string) => {
    applyConfig({ steps: config.steps.filter((step) => step.id !== stepId) });
  };

  if (menuProducts.length === 0) {
    return (
      <p style={hint}>
        Add products to your customer menu categories first (burgers, pizza, drinks, etc.), then configure which items
        customers can pick for each part of this deal.
      </p>
    );
  }

  return (
    <div className="hub-menu-meal-deal-steps" style={{ display: "grid", gap: 14 }}>
      <p style={hint}>
        Build each step of the deal: pick specific products, whole categories, or the full menu. Customers choose one
        item per step, then customise that product (size, extras, etc.) before adding to basket.
      </p>

      {config.steps.length === 0 ? (
        <button type="button" className="hub-menu-extras-library__add-btn" disabled={readOnly} onClick={() => applyConfig(createEmptyMealDealConfig())}>
          Start with Main / Side / Drink steps
        </button>
      ) : (
        config.steps.map((step, index) => (
          <div key={step.id} style={stepCard}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
              <strong style={{ fontSize: "0.9rem" }}>
                Step {index + 1}
              </strong>
              {readOnly || config.steps.length <= 1 ? null : (
                <button type="button" className="hub-menu-extras-library__remove-btn" onClick={() => removeStep(step.id)}>
                  Remove step
                </button>
              )}
            </div>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>Customer sees</span>
              <input
                value={step.label}
                disabled={readOnly}
                placeholder="e.g. Main, Drink, Dessert"
                onChange={(e) => updateStep(step.id, { label: e.target.value })}
              />
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>Choices from</span>
              <select
                value={step.source}
                disabled={readOnly}
                onChange={(e) =>
                  updateStep(step.id, {
                    source: e.target.value as MealDealStepSource,
                    productIds: [],
                    categoryIds: [],
                  })
                }
              >
                <option value="pick_products">Selected products</option>
                <option value="pick_categories">Whole categories</option>
                <option value="all_menu">Any item on the menu</option>
              </select>
            </label>

            {step.source === "pick_products" ? (
              <ProductMultiSelect
                products={menuProducts}
                selectedIds={step.productIds}
                readOnly={readOnly}
                onChange={(productIds) => updateStep(step.id, { productIds })}
              />
            ) : null}

            {step.source === "pick_categories" ? (
              <CategoryMultiSelect
                categories={customerCategories.map((section) => ({ id: section.id, name: section.name }))}
                selectedIds={step.categoryIds}
                readOnly={readOnly}
                onChange={(categoryIds) => updateStep(step.id, { categoryIds })}
              />
            ) : null}

            {step.source === "all_menu" ? (
              <p style={hint}>All {menuProducts.length} menu products will be available for this step.</p>
            ) : null}

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem" }}>
              <input
                type="checkbox"
                checked={step.required}
                disabled={readOnly}
                onChange={(e) => updateStep(step.id, { required: e.target.checked })}
              />
              Required step
            </label>
          </div>
        ))
      )}

      {readOnly ? null : (
        <button type="button" className="hub-menu-extras-library__add-btn" onClick={addStep}>
          + Add step
        </button>
      )}
    </div>
  );
}

function ProductMultiSelect({
  products,
  selectedIds,
  readOnly,
  onChange,
}: {
  products: PickableMenuProduct[];
  selectedIds: string[];
  readOnly: boolean;
  onChange: (ids: string[]) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, PickableMenuProduct[]>();
    for (const product of products) {
      const bucket = map.get(product.categoryName) ?? [];
      bucket.push(product);
      map.set(product.categoryName, bucket);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [products]);

  const toggle = (id: string) => {
    const set = new Set(selectedIds);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange([...set]);
  };

  return (
    <div style={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 8 }}>
      {grouped.map(([categoryName, items]) => (
        <div key={categoryName}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#5b6470" }}>{categoryName}</span>
          <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
            {items.map((product) => (
              <li key={product.id}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.84rem" }}>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={selectedIds.includes(product.id)}
                    onChange={() => toggle(product.id)}
                  />
                  {product.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CategoryMultiSelect({
  categories,
  selectedIds,
  readOnly,
  onChange,
}: {
  categories: Array<{ id: string; name: string }>;
  selectedIds: string[];
  readOnly: boolean;
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    const set = new Set(selectedIds);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange([...set]);
  };

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6, maxHeight: 180, overflow: "auto" }}>
      {categories.map((category) => (
        <li key={category.id}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.84rem" }}>
            <input
              type="checkbox"
              disabled={readOnly}
              checked={selectedIds.includes(category.id)}
              onChange={() => toggle(category.id)}
            />
            {category.name}
          </label>
        </li>
      ))}
    </ul>
  );
}
