"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import {
  buildMealLibraryItem,
  formatMenuMoney,
  getHubMealTemplatesFromSection,
  getMealTemplateFromItem,
  updateMealLibraryItemTemplate,
  type HubMealDrinkOption,
  type HubMealSideOption,
} from "./menu-studio-core";
import { ManualVariationsEditor } from "./hub-menu-variations-editor";

type Props = {
  section: HubMenuSection;
  onAddTemplate: (item: MenuItem) => void;
  onUpdateTemplate: (itemId: string, updater: (item: MenuItem) => MenuItem) => void;
  onRemoveTemplate: (itemId: string) => void;
  readOnly?: boolean;
};

export function HubMenuMealLibrary({
  section,
  onAddTemplate,
  onUpdateTemplate,
  onRemoveTemplate,
  readOnly = false,
}: Props) {
  const [label, setLabel] = useState("Make it a Meal (Fries & a Can)");
  const [upgradePrice, setUpgradePrice] = useState("3");
  const templates = getHubMealTemplatesFromSection(section);

  const handleAdd = () => {
    if (!label.trim()) {
      return;
    }
    const price = Number(upgradePrice);
    onAddTemplate(
      buildMealLibraryItem({
        categoryId: section.id,
        label: label.trim(),
        upgradePrice: Number.isFinite(price) && price >= 0 ? price : 0,
      }),
    );
    setLabel("Make it a Meal (Fries & a Can)");
    setUpgradePrice("3");
  };

  return (
    <section style={card}>
      <div>
        <strong style={{ fontSize: "0.95rem" }}>Make it a meal templates</strong>
        <p style={{ margin: "6px 0 0", fontSize: "0.84rem", color: "#5b6470", lineHeight: 1.45 }}>
          Create meal upgrades here (e.g. fries + drink for £3). On each menu item, tick <strong>Make it a meal</strong> and
          pick which template to offer — you can swap sides or drinks per item.
        </p>
      </div>

      {!readOnly ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 100px auto", gap: 8, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={fieldLabel}>Customer sees</span>
            <input style={input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Make it a Meal…" />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={fieldLabel}>Extra £</span>
            <input
              type="number"
              step="0.01"
              min={0}
              style={input}
              value={upgradePrice}
              onChange={(e) => setUpgradePrice(e.target.value)}
            />
          </label>
          <button type="button" style={addButton} onClick={handleAdd}>
            Add meal
          </button>
        </div>
      ) : null}

      {templates.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.84rem", color: "#5b6470" }}>No meal templates yet — add your default fries &amp; drink deal.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {section.items.map((item) => (
            <MealTemplateEditor
              key={item.id}
              item={item}
              readOnly={readOnly}
              onUpdate={(updater) => onUpdateTemplate(item.id, updater)}
              onRemove={() => onRemoveTemplate(item.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MealTemplateEditor({
  item,
  readOnly,
  onUpdate,
  onRemove,
}: {
  item: MenuItem;
  readOnly: boolean;
  onUpdate: (updater: (item: MenuItem) => MenuItem) => void;
  onRemove: () => void;
}) {
  const template = getMealTemplateFromItem(item);

  const sideRows = template.sides.map((side) => ({
    id: side.id,
    label: side.label,
    price: String(side.priceDelta),
  }));
  const drinkRows = template.drinks.map((drink) => ({
    id: drink.id,
    label: drink.label,
    price: String(drink.priceDelta),
  }));

  const mapRowsToSides = (rows: { id: string; label: string; price: string }[]): HubMealSideOption[] =>
    rows
      .filter((row) => row.label.trim())
      .map((row) => ({
        id: row.id,
        label: row.label.trim(),
        priceDelta: Number(row.price) || 0,
      }));

  return (
    <article style={templateCard}>
      <div style={templateHeader}>
        <div style={{ display: "grid", gap: 8, flex: 1 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={fieldLabel}>Label</span>
            <input
              style={input}
              value={item.name}
              disabled={readOnly}
              onChange={(e) => onUpdate((current) => updateMealLibraryItemTemplate(current, { label: e.target.value }))}
            />
          </label>
          <label style={{ display: "grid", gap: 4, maxWidth: 120 }}>
            <span style={fieldLabel}>Extra £</span>
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
            Remove
          </button>
        )}
      </div>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "#5b6470" }}>
        Default upgrade: <strong>{formatMenuMoney(template.upgradePrice)}</strong> on top of the item
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <strong style={{ fontSize: "0.84rem" }}>Side choices</strong>
          <ManualVariationsEditor
            rows={sideRows}
            readOnly={readOnly}
            placeholderLabel="e.g. Fries"
            addButtonLabel="+ Add side option"
            onChange={(rows) =>
              onUpdate((current) => updateMealLibraryItemTemplate(current, { sides: mapRowsToSides(rows) }))
            }
          />
        </div>
        <div>
          <strong style={{ fontSize: "0.84rem" }}>Drink choices</strong>
          <ManualVariationsEditor
            rows={drinkRows}
            readOnly={readOnly}
            placeholderLabel="e.g. Coke"
            addButtonLabel="+ Add drink option"
            onChange={(rows) =>
              onUpdate((current) =>
                updateMealLibraryItemTemplate(current, {
                  drinks: mapRowsToSides(rows) as HubMealDrinkOption[],
                }),
              )
            }
          />
        </div>
      </div>
    </article>
  );
}

const card: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(155, 74, 18, 0.22)",
  background: "rgba(255, 244, 232, 0.5)",
  display: "grid",
  gap: 12,
};

const templateCard: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  display: "grid",
  gap: 10,
};

const templateHeader: CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start" };

const fieldLabel: CSSProperties = { fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" };

const input: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.15)",
  font: "inherit",
};

const addButton: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#9b4a12",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const removeButton: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(155, 28, 28, 0.25)",
  background: "rgba(255, 95, 95, 0.08)",
  color: "#8a2121",
  fontWeight: 800,
  cursor: "pointer",
};
