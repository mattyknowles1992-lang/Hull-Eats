"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import { HubMenuMealDealItemsPicker } from "./hub-menu-meal-deal-items-picker";
import {
  buildMealLibraryItem,
  customerFacingMenuSections,
  formatMenuMoney,
  getMealTemplateCustomerNote,
  getMealTemplateFromItem,
  listPickableMenuProducts,
  mealDealItemsFromTemplate,
  splitMealDealItems,
  updateMealLibraryItemTemplate,
  type MealDealItem,
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
  const hasMenuProducts = menuProducts.length > 0;
  const customerSectionCount = customerFacingMenuSections(menuSections).length;

  return (
    <div className="hub-menu-meal-library">
      <p className="hub-menu-meal-library__intro">
        Meal deals add an upgrade price on top of the main item. Pick real menu products for the deal — customers choose
        when they order.
      </p>

      {customerSectionCount === 0 ? (
        <p className="hub-menu-meal-library__hint">
          Add at least one <strong>customer menu</strong> category with items (e.g. Fries, Coke), then return here to
          build meal deals.
        </p>
      ) : null}

      {readOnly ? null : (
        <NewMealDealForm
          categoryId={section.id}
          menuProducts={menuProducts}
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
  menuProducts,
  hasMenuProducts,
  onAdd,
}: {
  categoryId: string;
  menuProducts: ReturnType<typeof listPickableMenuProducts>;
  hasMenuProducts: boolean;
  onAdd: (item: MenuItem) => void;
}) {
  const [label, setLabel] = useState("Make it a Meal");
  const [upgradePrice, setUpgradePrice] = useState("3");
  const [customerNote, setCustomerNote] = useState("");
  const [dealItems, setDealItems] = useState<MealDealItem[]>([]);

  const reset = () => {
    setLabel("Make it a Meal");
    setUpgradePrice("3");
    setCustomerNote("");
    setDealItems([]);
  };

  const handleSave = () => {
    const trimmed = label.trim();
    if (!trimmed || dealItems.length === 0) {
      return;
    }
    const { sides, drinks } = splitMealDealItems(dealItems);
    onAdd(
      buildMealLibraryItem({
        categoryId,
        label: trimmed,
        upgradePrice: Number(upgradePrice) || 0,
        sides,
        drinks,
        customerNote: customerNote.trim(),
      }),
    );
    reset();
  };

  const canSave = label.trim().length > 0 && dealItems.length > 0;

  return (
    <article className="hub-menu-meal-library__new-deal">
      <p style={newDealTitle}>New meal deal</p>

      <div className="hub-menu-meal-library__deal-meta">
        <label style={field}>
          <span style={fieldLabel}>Customer sees</span>
          <input style={input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Make it a Meal…" />
        </label>
        <label style={field}>
          <span style={fieldLabel}>Meal deal price (£)</span>
          <input
            type="number"
            step="0.01"
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
          Add items to your <strong>customer menu</strong> tabs first, then pick them below. You can also add custom
          names.
        </p>
      ) : null}

      <HubMenuMealDealItemsPicker items={dealItems} menuProducts={menuProducts} readOnly={false} onChange={setDealItems} />

      {dealItems.length === 0 ? (
        <p style={warn}>Add at least one menu item (side or drink) before saving.</p>
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
  readOnly,
  onUpdate,
  onRemove,
}: {
  item: MenuItem;
  menuProducts: ReturnType<typeof listPickableMenuProducts>;
  readOnly: boolean;
  onUpdate: (updater: (item: MenuItem) => MenuItem) => void;
  onRemove: () => void;
}) {
  const template = getMealTemplateFromItem(item);
  const dealItems = mealDealItemsFromTemplate(template);
  const customerNote = getMealTemplateCustomerNote(item);

  const setDealItems = (items: MealDealItem[]) => {
    const { sides, drinks } = splitMealDealItems(items);
    onUpdate((current) => updateMealLibraryItemTemplate(current, { sides, drinks }));
  };

  return (
    <article style={templateCard}>
      <div style={templateHeader}>
        <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 0 }}>
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
              step="0.01"
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
        Deal price: <strong>{formatMenuMoney(template.upgradePrice)}</strong> · {dealItems.length} item
        {dealItems.length === 1 ? "" : "s"} in deal
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
      <HubMenuMealDealItemsPicker
        items={dealItems}
        menuProducts={menuProducts}
        readOnly={readOnly}
        onChange={setDealItems}
      />
    </article>
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
