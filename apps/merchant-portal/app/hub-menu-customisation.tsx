"use client";

import type { CSSProperties } from "react";

import type { MenuItem } from "@hull-eats/types";

import { createEmptyComponent, createEmptyOption, createEmptyOptionGroup } from "./menu-studio-core";

type MenuOptionGroup = MenuItem["optionGroups"][number];
type MenuOption = MenuOptionGroup["options"][number];

const parseCsv = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

type CustomisationBuilderProps = {
  item: MenuItem;
  onChangeComponents: (components: MenuItem["components"]) => void;
  onChangeOptionGroups: (optionGroups: MenuItem["optionGroups"]) => void;
};

export function HubMenuCustomisationBuilder({ item, onChangeComponents, onChangeOptionGroups }: CustomisationBuilderProps) {
  const optionReferenceList = item.optionGroups.flatMap((group) =>
    group.options.map((option) => ({
      id: option.id,
      label: option.label || option.id,
      groupName: group.name || "Unnamed choice",
    })),
  );

  const updateComponent = (componentId: string, patch: Partial<MenuItem["components"][number]>) => {
    onChangeComponents(item.components.map((component) => (component.id === componentId ? { ...component, ...patch } : component)));
  };

  const updateGroup = (groupId: string, patch: Partial<MenuOptionGroup>) => {
    onChangeOptionGroups(item.optionGroups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)));
  };

  const updateOption = (groupId: string, optionId: string, patch: Partial<MenuOption>) => {
    onChangeOptionGroups(
      item.optionGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: group.options.map((option) => (option.id === optionId ? { ...option, ...patch } : option)),
            }
          : group,
      ),
    );
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section style={subBuilderCard}>
        <div style={subBuilderHeader}>
          <div>
            <strong style={builderTitle}>What&apos;s included</strong>
            <p style={builderCopy}>Parts that come with the item. Tick if the customer can remove them (e.g. no onion).</p>
          </div>
          <button type="button" style={secondaryButtonSmall} onClick={() => onChangeComponents([...item.components, createEmptyComponent()])}>
            Add included part
          </button>
        </div>

        {item.components.length === 0 ? (
          <div style={emptyStateCard}>Optional. Skip this for simple items, or add bun, patty, cheese, salad, etc.</div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          {item.components.map((component) => (
            <div key={component.id} style={builderRow}>
              <input
                style={lightInput}
                value={component.label}
                onChange={(event) => updateComponent(component.id, { label: event.target.value })}
                placeholder="e.g. Cheese, Lettuce"
              />
              <input
                type="number"
                min={1}
                style={lightInput}
                value={component.quantity}
                onChange={(event) => updateComponent(component.id, { quantity: Math.max(1, Number(event.target.value) || 1) })}
              />
              <label style={toggleLabel}>
                <input
                  type="checkbox"
                  checked={component.removable}
                  onChange={(event) => updateComponent(component.id, { removable: event.target.checked })}
                />
                <span>Customer can remove</span>
              </label>
              <button type="button" style={secondaryButtonSmall} onClick={() => onChangeComponents(item.components.filter((entry) => entry.id !== component.id))}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section style={subBuilderCard}>
        <div style={subBuilderHeader}>
          <div>
            <strong style={builderTitle}>Customer choices</strong>
            <p style={builderCopy}>Sizes, toppings, salad, extras, meal upgrades, sauces — each group is one decision for the customer.</p>
          </div>
          <button type="button" style={secondaryButtonSmall} onClick={() => onChangeOptionGroups([...item.optionGroups, createEmptyOptionGroup()])}>
            Add choice group
          </button>
        </div>

        {item.optionGroups.length === 0 ? (
          <div style={emptyStateCard}>No choices yet. Add a group like Size, Extra toppings, or Salad.</div>
        ) : null}

        <div style={{ display: "grid", gap: 14 }}>
          {item.optionGroups.map((group) => (
            <article key={group.id} style={optionGroupCard}>
              <div style={subBuilderHeader}>
                <div>
                  <strong style={builderTitle}>{group.name || "Untitled choice group"}</strong>
                  <p style={builderCopy}>
                    {group.isRequired ? "Required" : "Optional"} · {group.selectionMode === "single" ? "Pick one" : "Pick many"}
                  </p>
                </div>
                <button type="button" style={secondaryButtonSmall} onClick={() => onChangeOptionGroups(item.optionGroups.filter((entry) => entry.id !== group.id))}>
                  Remove group
                </button>
              </div>

              <div style={builderGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Group title (customer sees this)</span>
                  <input
                    style={lightInput}
                    value={group.name}
                    onChange={(event) => updateGroup(group.id, { name: event.target.value })}
                    placeholder="e.g. Size, Extra toppings"
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Pick one or many?</span>
                  <select
                    style={lightInput}
                    value={group.selectionMode}
                    onChange={(event) =>
                      updateGroup(group.id, {
                        selectionMode: event.target.value as MenuOptionGroup["selectionMode"],
                        maxSelections: event.target.value === "single" ? 1 : group.maxSelections,
                      })
                    }
                  >
                    <option value="single">Pick one (e.g. size)</option>
                    <option value="multiple">Pick many (e.g. toppings)</option>
                  </select>
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Minimum picks</span>
                  <input
                    type="number"
                    min={0}
                    style={lightInput}
                    value={group.minSelections}
                    onChange={(event) => updateGroup(group.id, { minSelections: Math.max(0, Number(event.target.value) || 0) })}
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Maximum picks</span>
                  <input
                    type="number"
                    min={1}
                    style={lightInput}
                    value={group.maxSelections ?? ""}
                    onChange={(event) =>
                      updateGroup(group.id, {
                        maxSelections: event.target.value ? Math.max(1, Number(event.target.value) || 1) : null,
                      })
                    }
                    placeholder={group.selectionMode === "single" ? "1" : "Blank = no limit"}
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Helper text (optional)</span>
                  <input
                    style={lightInput}
                    value={group.description}
                    onChange={(event) => updateGroup(group.id, { description: event.target.value })}
                    placeholder="e.g. Choose your drink"
                  />
                </label>
              </div>

              <label style={toggleLabel}>
                <input type="checkbox" checked={group.isRequired} onChange={(event) => updateGroup(group.id, { isRequired: event.target.checked })} />
                <span>Customer must choose from this group</span>
              </label>

              <div style={{ display: "grid", gap: 10 }}>
                {group.options.map((option) => (
                  <div key={option.id} style={optionRow}>
                    <div style={builderGrid}>
                      <label style={field}>
                        <span style={darkFieldLabel}>Choice name</span>
                        <input
                          style={lightInput}
                          value={option.label}
                          onChange={(event) => updateOption(group.id, option.id, { label: event.target.value })}
                          placeholder="e.g. Large, Pepperoni"
                        />
                      </label>
                      <label style={field}>
                        <span style={darkFieldLabel}>Extra price</span>
                        <input
                          type="number"
                          step="0.1"
                          style={lightInput}
                          value={option.priceDelta}
                          onChange={(event) => updateOption(group.id, option.id, { priceDelta: Number(event.target.value) || 0 })}
                        />
                      </label>
                      <label style={field}>
                        <span style={darkFieldLabel}>Note (optional)</span>
                        <input
                          style={lightInput}
                          value={option.description}
                          onChange={(event) => updateOption(group.id, option.id, { description: event.target.value })}
                        />
                      </label>
                    </div>
                    <div style={optionActionRow}>
                      <label style={toggleLabel}>
                        <input
                          type="checkbox"
                          checked={option.isDefault}
                          onChange={(event) => updateOption(group.id, option.id, { isDefault: event.target.checked })}
                        />
                        <span>Pre-selected</span>
                      </label>
                      <button
                        type="button"
                        style={secondaryButtonSmall}
                        onClick={() =>
                          onChangeOptionGroups(
                            item.optionGroups.map((entry) =>
                              entry.id === group.id
                                ? { ...entry, options: entry.options.filter((existing) => existing.id !== option.id) }
                                : entry,
                            ),
                          )
                        }
                      >
                        Remove choice
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  style={secondaryButtonSmall}
                  onClick={() =>
                    onChangeOptionGroups(
                      item.optionGroups.map((entry) =>
                        entry.id === group.id ? { ...entry, options: [...entry.options, createEmptyOption()] } : entry,
                      ),
                    )
                  }
                >
                  Add choice
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const field: CSSProperties = { display: "grid", gap: 8 };
const darkFieldLabel: CSSProperties = { color: "#3d4654", fontSize: 12, fontWeight: 800 };
const lightInput: CSSProperties = {
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  background: "#fff",
  padding: "0 12px",
};
const toggleLabel: CSSProperties = { display: "flex", alignItems: "center", gap: 10, fontWeight: 700, color: "#3d4654" };
const builderTitle: CSSProperties = { fontSize: "1rem", color: "#101216" };
const builderCopy: CSSProperties = { margin: "6px 0 0", color: "#5b6470", lineHeight: 1.5, fontSize: "0.9rem" };
const secondaryButtonSmall: CSSProperties = {
  minHeight: 38,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid rgba(7, 155, 200, 0.35)",
  background: "rgba(7, 155, 200, 0.08)",
  color: "#0680a6",
  fontWeight: 800,
  cursor: "pointer",
};
const emptyStateCard: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px dashed rgba(15, 17, 21, 0.2)",
  background: "rgba(255,255,255,0.7)",
  color: "#5b6470",
  lineHeight: 1.5,
};
const subBuilderCard: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
};
const subBuilderHeader: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" };
const builderGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 };
const builderRow: CSSProperties = { display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 10, alignItems: "center" };
const optionGroupCard: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(7, 155, 200, 0.2)",
  background: "linear-gradient(180deg, rgba(35, 205, 255, 0.04), #fff)",
};
const optionRow: CSSProperties = { display: "grid", gap: 10, padding: 12, borderRadius: 12, border: "1px solid rgba(15, 17, 21, 0.08)", background: "#fafbfc" };
const optionActionRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" };
