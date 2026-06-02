"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import { HubMenuMealDealItemsPicker } from "./hub-menu-meal-deal-items-picker";
import {
  buildMealLibraryItem,
  customerFacingMenuSections,
  emptyMealDealEditorConfig,
  formatMenuMoney,
  getMealTemplateCustomerNote,
  getMealTemplateFromItem,
  listMealPickableCategories,
  listPickableMenuProducts,
  mealDealHasChoices,
  readMealDealEditorConfig,
  resolveMealDealItems,
  suggestNextMealStudioLabel,
  updateMealLibraryItemTemplate,
  type HubMealDealEditorConfig,
} from "./menu-studio-core";

type Props = {
  section: HubMenuSection;
  menuSections: HubMenuSection[];
  readOnly?: boolean;
  onAddTemplate: (item: MenuItem) => void;
  onUpdateTemplate: (itemId: string, updater: (item: MenuItem) => MenuItem) => void;
  onRemoveTemplate: (itemId: string) => void;
};

export function HubMenuMealLibrary({
  section,
  menuSections,
  readOnly = false,
  onAddTemplate,
  onUpdateTemplate,
  onRemoveTemplate,
}: Props) {
  const menuProducts = useMemo(() => listPickableMenuProducts(menuSections), [menuSections]);
  const pickableCategories = useMemo(() => listMealPickableCategories(menuSections), [menuSections]);
  const hasMenuProducts = menuProducts.length > 0;
  const customerSectionCount = customerFacingMenuSections(menuSections).length;

  return (
    <div className="hub-menu-meal-library">
      <p className="hub-menu-meal-library__intro">
        Save as many meal offers as you need (e.g. deal 1 for burgers, deal 2 for desserts). On each product, open{" "}
        <strong>Make it a meal</strong> in customer options and choose which offer applies.
      </p>

      {section.items.length > 0 ? (
        <p className="hub-menu-meal-library__hint">
          <strong>{section.items.length}</strong> saved meal offer{section.items.length === 1 ? "" : "s"} — open a burger
          or dessert, then pick the right one under customer options.
        </p>
      ) : null}

      {customerSectionCount === 0 ? (
        <p className="hub-menu-meal-library__hint">
          Add at least one <strong>customer menu</strong> category with items (e.g. Fries, Coke), then return here to
          build meal deals.
        </p>
      ) : null}

      {readOnly ? null : (
        <NewMealDealForm
          categoryId={section.id}
          existingTemplateCount={section.items.length}
          menuProducts={menuProducts}
          pickableCategories={pickableCategories}
          hasMenuProducts={hasMenuProducts}
          onAdd={onAddTemplate}
        />
      )}

      {section.items.length === 0 ? (
        <p className="hub-menu-meal-library__empty">No meal deals yet. Use the form above to add your first deal.</p>
      ) : (
        <div className="hub-menu-meal-library__list">
          {section.items.map((item) => (
            <MealTemplateEditor
              key={item.id}
              item={item}
              menuProducts={menuProducts}
              pickableCategories={pickableCategories}
              readOnly={readOnly}
              onUpdate={(updater) => onUpdateTemplate(item.id, updater)}
              onRemove={() => onRemoveTemplate(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NewMealDealForm({
  categoryId,
  existingTemplateCount,
  menuProducts,
  pickableCategories,
  hasMenuProducts,
  onAdd,
}: {
  categoryId: string;
  existingTemplateCount: number;
  menuProducts: ReturnType<typeof listPickableMenuProducts>;
  pickableCategories: ReturnType<typeof listMealPickableCategories>;
  hasMenuProducts: boolean;
  onAdd: (item: MenuItem) => void;
}) {
  const [label, setLabel] = useState("Make it a Meal");
  const [upgradePrice, setUpgradePrice] = useState("3");
  const [customerNote, setCustomerNote] = useState("");
  const [mealConfig, setMealConfig] = useState<HubMealDealEditorConfig>(() =>
    emptyMealDealEditorConfig(suggestNextMealStudioLabel(existingTemplateCount)),
  );

  const resolvedCount = useMemo(
    () => resolveMealDealItems(mealConfig, menuProducts).length,
    [mealConfig, menuProducts],
  );

  const reset = () => {
    setLabel("Make it a Meal");
    setUpgradePrice("3");
    setCustomerNote("");
    setMealConfig(emptyMealDealEditorConfig(suggestNextMealStudioLabel(existingTemplateCount + 1)));
  };

  const handleSave = () => {
    const trimmed = label.trim();
    if (!trimmed || !mealDealHasChoices(mealConfig, menuProducts)) {
      return;
    }
    onAdd(
      buildMealLibraryItem({
        categoryId,
        label: trimmed,
        upgradePrice: Number(upgradePrice) || 0,
        mealConfig,
        customerNote: customerNote.trim(),
      }),
    );
    reset();
  };

  const canSave = label.trim().length > 0 && mealDealHasChoices(mealConfig, menuProducts);

  return (
    <article className="hub-menu-meal-library__new-deal">
      <p style={newDealTitle}>New meal deal</p>

      <div className="hub-menu-meal-library__deal-meta">
        <label style={field}>
          <span style={fieldLabel}>Your reference (portal only)</span>
          <input
            style={input}
            value={mealConfig.studioLabel ?? ""}
            onChange={(e) => setMealConfig((current) => ({ ...current, studioLabel: e.target.value }))}
            placeholder="e.g. Meal deal 1 — burgers"
          />
        </label>
        <label style={field}>
          <span style={fieldLabel}>Customer sees</span>
          <input style={input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Make it a Meal…" />
        </label>
        <label style={field}>
          <span style={fieldLabel}>Meal deal price (£)</span>
          <input
            type="number"
            step="0.1"
            min={0}
            style={input}
            value={upgradePrice}
            onChange={(e) => setUpgradePrice(e.target.value)}
            title="Added on top of the main item when the customer upgrades"
          />
        </label>
      </div>

      <label style={{ ...field, gridColumn: "1 / -1" }}>
        <span style={fieldLabel}>Note for customers (optional)</span>
        <textarea
          style={{ ...input, minHeight: 64, resize: "vertical" }}
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          placeholder="e.g. Includes one side and one drink"
        />
      </label>

      {!hasMenuProducts ? (
        <p className="hub-menu-meal-library__hint">
          Add items to your <strong>customer menu</strong> tabs first, then link a category or pick items below.
        </p>
      ) : null}

      <HubMenuMealDealItemsPicker
        config={mealConfig}
        menuProducts={menuProducts}
        pickableCategories={pickableCategories}
        readOnly={false}
        onChange={setMealConfig}
      />

      {resolvedCount === 0 &&
      mealConfig.sideCategoryPools.length === 0 &&
      mealConfig.drinkCategoryPools.length === 0 ? (
        <p style={warn}>Link a category or add at least one item before saving.</p>
      ) : null}

      <button type="button" className="hub-menu-meal-library__save-btn" disabled={!canSave} onClick={handleSave}>
        Save meal deal
      </button>
    </article>
  );
}

function MealTemplateEditor({
  item,
  menuProducts,
  pickableCategories,
  readOnly,
  onUpdate,
  onRemove,
}: {
  item: MenuItem;
  menuProducts: ReturnType<typeof listPickableMenuProducts>;
  pickableCategories: ReturnType<typeof listMealPickableCategories>;
  readOnly: boolean;
  onUpdate: (updater: (item: MenuItem) => MenuItem) => void;
  onRemove: () => void;
}) {
  const template = getMealTemplateFromItem(item, menuProducts);
  const mealConfig = useMemo(() => readMealDealEditorConfig(item), [item]);
  const resolvedCount = template.sides.length + template.drinks.length;
  const customerNote = getMealTemplateCustomerNote(item);

  return (
    <article style={templateCard}>
      <p style={dealHeading}>{template.studioLabel.trim() || template.label}</p>
      <div style={templateHeader}>
        <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 0 }}>
          <label style={field}>
            <span style={fieldLabel}>Your reference (portal only)</span>
            <input
              style={input}
              value={mealConfig.studioLabel ?? ""}
              disabled={readOnly}
              onChange={(e) =>
                onUpdate((current) =>
                  updateMealLibraryItemTemplate(current, {
                    mealConfig: { ...readMealDealEditorConfig(current), studioLabel: e.target.value },
                  }),
                )
              }
            />
          </label>
          <label style={field}>
            <span style={fieldLabel}>Customer sees</span>
            <input
              style={input}
              value={item.name}
              disabled={readOnly}
              onChange={(e) => onUpdate((current) => updateMealLibraryItemTemplate(current, { label: e.target.value }))}
            />
          </label>
          <label style={{ ...field, maxWidth: 180 }}>
            <span style={fieldLabel}>Meal deal price (£)</span>
            <input
              type="number"
              step="0.1"
              style={input}
              value={item.price}
              disabled={readOnly}
              onChange={(e) =>
                onUpdate((current) =>
                  updateMealLibraryItemTemplate(current, { upgradePrice: Number(e.target.value) || 0 }),
                )
              }
            />
          </label>
        </div>
        {readOnly ? null : (
          <button type="button" style={removeButton} onClick={onRemove}>
            Remove deal
          </button>
        )}
      </div>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "#5b6470" }}>
        Deal price: <strong>{formatMenuMoney(template.upgradePrice)}</strong> · {resolvedCount} choice
        {resolvedCount === 1 ? "" : "s"} in deal
      </p>
      <label style={field}>
        <span style={fieldLabel}>Note for customers (optional)</span>
        <textarea
          style={{ ...input, minHeight: 56, resize: "vertical" }}
          value={customerNote}
          disabled={readOnly}
          onChange={(e) => onUpdate((current) => updateMealLibraryItemTemplate(current, { customerNote: e.target.value }))}
        />
      </label>
      <MealDealConfigEditor item={item} menuProducts={menuProducts} pickableCategories={pickableCategories} readOnly={readOnly} onUpdate={onUpdate} />
    </article>
  );
}

function MealDealConfigEditor({
  item,
  menuProducts,
  pickableCategories,
  readOnly,
  onUpdate,
}: {
  item: MenuItem;
  menuProducts: ReturnType<typeof listPickableMenuProducts>;
  pickableCategories: ReturnType<typeof listMealPickableCategories>;
  readOnly: boolean;
  onUpdate: (updater: (item: MenuItem) => MenuItem) => void;
}) {
  const mealConfig = useMemo(() => readMealDealEditorConfig(item), [item]);

  return (
    <HubMenuMealDealItemsPicker
      config={mealConfig}
      menuProducts={menuProducts}
      pickableCategories={pickableCategories}
      readOnly={readOnly}
      onChange={(nextConfig) => onUpdate((current) => updateMealLibraryItemTemplate(current, { mealConfig: nextConfig }))}
    />
  );
}

const field: CSSProperties = { display: "grid", gap: 6, minWidth: 0 };

const fieldLabel: CSSProperties = { fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" };

const input: CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 44,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.15)",
  font: "inherit",
  boxSizing: "border-box",
};

const newDealTitle: CSSProperties = { margin: 0, fontWeight: 900, fontSize: "0.95rem", color: "#064f68" };

const dealHeading: CSSProperties = { margin: 0, fontWeight: 900, fontSize: "0.92rem", color: "#064f68" };

const warn: CSSProperties = { margin: 0, fontSize: "0.84rem", color: "#5b6470" };

const templateCard: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  display: "grid",
  gap: 12,
};

const templateHeader: CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" };

const removeButton: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(155, 28, 28, 0.25)",
  background: "rgba(255, 95, 95, 0.08)",
  color: "#8a2121",
  fontWeight: 800,
  cursor: "pointer",
};
