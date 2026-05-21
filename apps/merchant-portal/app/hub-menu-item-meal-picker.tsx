"use client";

import type { CSSProperties } from "react";

import type { MenuItem } from "@hull-eats/types";

import { applyMealUpgradeToItem, formatMenuMoney, getItemMealUpgradeSelection, type HubMealTemplate } from "./menu-studio-core";

type Props = {
  item: MenuItem;
  templates: HubMealTemplate[];
  readOnly?: boolean;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
};

export function HubMenuItemMealPicker({ item, templates, readOnly = false, onUpdateItem }: Props) {
  const selection = getItemMealUpgradeSelection(item, templates);

  if (templates.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: "0.84rem", color: "#5b6470" }}>
        Add meal templates under <strong>Make it a meal</strong> on the left first.
      </p>
    );
  }

  const activeTemplate = templates.find((template) => template.id === selection.templateId) ?? templates[0]!;

  const patch = (
    enabled: boolean,
    templateId: string,
    sideIds: Set<string>,
    drinkIds: Set<string>,
  ) => {
    const template = templates.find((entry) => entry.id === templateId) ?? null;
    onUpdateItem((current) => applyMealUpgradeToItem(current, enabled, template, sideIds, drinkIds));
  };

  return (
    <div style={panel}>
      <label style={toggleRow}>
        <input
          type="checkbox"
          checked={selection.enabled}
          disabled={readOnly}
          onChange={(e) => {
            const template = templates.find((entry) => entry.id === selection.templateId) ?? templates[0]!;
            const sideIds = new Set(template.sides.map((side) => side.id));
            const drinkIds = new Set(template.drinks.map((drink) => drink.id));
            patch(e.target.checked, template.id, sideIds, drinkIds);
          }}
        />
        <strong>Let customers make it a meal</strong>
      </label>

      {selection.enabled ? (
        <>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={fieldLabel}>Meal template</span>
            <select
              style={input}
              disabled={readOnly}
              value={selection.templateId ?? templates[0]?.id}
              onChange={(e) => {
                const template = templates.find((entry) => entry.id === e.target.value) ?? templates[0]!;
                patch(true, template.id, new Set(template.sides.map((s) => s.id)), new Set(template.drinks.map((d) => d.id)));
              }}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label} (+{formatMenuMoney(template.upgradePrice)})
                </option>
              ))}
            </select>
          </label>

          <div>
            <span style={fieldLabel}>Sides for this item (untick to hide)</span>
            <div style={optionList}>
              {activeTemplate.sides.map((side) => (
                <label key={side.id} style={optionRow}>
                  <input
                    type="checkbox"
                    checked={selection.selectedSideIds.has(side.id)}
                    disabled={readOnly}
                    onChange={(e) => {
                      const next = new Set(selection.selectedSideIds);
                      if (e.target.checked) {
                        next.add(side.id);
                      } else {
                        next.delete(side.id);
                      }
                      patch(true, activeTemplate.id, next, selection.selectedDrinkIds);
                    }}
                  />
                  <span>
                    {side.label}
                    {side.priceDelta > 0 ? ` (+${formatMenuMoney(side.priceDelta)})` : ""}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <span style={fieldLabel}>Drinks for this item (untick to hide)</span>
            <div style={optionList}>
              {activeTemplate.drinks.map((drink) => (
                <label key={drink.id} style={optionRow}>
                  <input
                    type="checkbox"
                    checked={selection.selectedDrinkIds.has(drink.id)}
                    disabled={readOnly}
                    onChange={(e) => {
                      const next = new Set(selection.selectedDrinkIds);
                      if (e.target.checked) {
                        next.add(drink.id);
                      } else {
                        next.delete(drink.id);
                      }
                      patch(true, activeTemplate.id, selection.selectedSideIds, next);
                    }}
                  />
                  <span>
                    {drink.label}
                    {drink.priceDelta > 0 ? ` (+${formatMenuMoney(drink.priceDelta)})` : ""}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

const panel: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(155, 74, 18, 0.18)",
  background: "rgba(255, 252, 247, 0.9)",
  display: "grid",
  gap: 10,
};

const toggleRow: CSSProperties = { display: "flex", alignItems: "center", gap: 10 };

const fieldLabel: CSSProperties = { fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" };

const input: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.15)",
  font: "inherit",
};

const optionList: CSSProperties = { display: "grid", gap: 6, marginTop: 6 };

const optionRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: "0.88rem",
};
