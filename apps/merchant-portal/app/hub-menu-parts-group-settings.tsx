"use client";

import { useState } from "react";

import type { HubMenuSection } from "@hull-eats/types";

import {
  addPartSlotDefinition,
  readPartSlotDefinitions,
  removePartSlotDefinition,
  renamePartSlotDefinition,
  getHubPartsFromSection,
  type ComposePartSlot,
  type ComposeProductLine,
} from "./menu-studio-core";

type Props = {
  line: ComposeProductLine;
  section: HubMenuSection;
  readOnly?: boolean;
  onUpdateSection: (updater: (section: HubMenuSection) => HubMenuSection) => void;
  onClose?: () => void;
  /** When true, hide back navigation (used inside hub Settings). */
  embedded?: boolean;
};

export function HubMenuPartsGroupSettingsPanel({
  line,
  section,
  readOnly = false,
  onUpdateSection,
  onClose,
  embedded = false,
}: Props) {
  const title = line === "burger" ? "Burger option groups" : "Kebab option groups";
  const slotDefinitions = readPartSlotDefinitions(section, line);
  const parts = getHubPartsFromSection(section, line);

  const grouped = new Map<ComposePartSlot, number>();
  for (const slot of slotDefinitions) {
    grouped.set(slot.key, 0);
  }
  for (const part of parts) {
    grouped.set(part.slot, (grouped.get(part.slot) ?? 0) + 1);
  }

  const [newGroupName, setNewGroupName] = useState("");

  const handleAddGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      return;
    }
    onUpdateSection((current) => addPartSlotDefinition(current, line, trimmed));
    setNewGroupName("");
  };

  return (
    <section className={`hub-menu-parts-settings${embedded ? " hub-menu-parts-settings--embedded" : ""}`}>
      {embedded ? null : (
        <header className="hub-menu-parts-settings__header">
          <div>
            <p className="hub-menu-parts-settings__eyebrow">Hub setup · Settings</p>
            <h3 className="hub-menu-parts-settings__title">{title}</h3>
            <p className="hub-menu-parts-settings__copy">
              Name the groups customers see when you build products (e.g. rename <strong>Buns</strong> to{" "}
              <strong>Base</strong>, or add <strong>Sauce</strong> and <strong>Toppings</strong>). Add each choice on the
              Burger parts or Kebab parts tab in the menu builder.
            </p>
          </div>
          {onClose ? (
            <button type="button" className="hub-menu-parts-settings__back" onClick={onClose}>
              Back to choices
            </button>
          ) : null}
        </header>
      )}

      <div className="hub-menu-parts-library__slot-config hub-menu-parts-settings__panel">
        <div>
          <strong style={{ fontSize: "0.88rem" }}>Your option groups</strong>
          <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#5b6470", lineHeight: 1.4 }}>
            These headings appear when you tick parts on each burger or kebab product.
          </p>
        </div>

        <ul className="hub-menu-parts-library__slot-config-list">
          {slotDefinitions.map((slotDef) => {
            const partCount = grouped.get(slotDef.key) ?? 0;
            return (
              <li key={slotDef.id} className="hub-menu-parts-library__slot-config-row">
                <label className="hub-menu-extras-library__field hub-menu-parts-library__slot-config-field">
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Group name</span>
                  <input
                    value={slotDef.label}
                    disabled={readOnly}
                    placeholder={line === "burger" ? "e.g. Bun, Cheese, Toppings" : "e.g. Bread, Meat, Salad"}
                    onChange={(e) =>
                      onUpdateSection((current) => renamePartSlotDefinition(current, line, slotDef.key, e.target.value))
                    }
                  />
                </label>
                <span style={{ fontSize: "0.78rem", color: "#7a8491", whiteSpace: "nowrap" }}>
                  {partCount} choice{partCount === 1 ? "" : "s"}
                </span>
                {readOnly || slotDefinitions.length <= 1 ? null : (
                  <button
                    type="button"
                    className="hub-menu-parts-library__slot-config-remove"
                    onClick={() => onUpdateSection((current) => removePartSlotDefinition(current, line, slotDef.key))}
                  >
                    Remove group
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {readOnly ? null : (
          <div className="hub-menu-extras-library__add-row hub-menu-parts-library__slot-config-add">
            <label className="hub-menu-extras-library__field">
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>New group name</span>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={line === "burger" ? "e.g. Sauce" : "e.g. Sauce"}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddGroup();
                  }
                }}
              />
            </label>
            <button type="button" className="hub-menu-extras-library__add-btn" onClick={handleAddGroup}>
              + Add option group
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
