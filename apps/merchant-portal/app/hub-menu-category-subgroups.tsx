"use client";

import { useState } from "react";

import type { HubMenuSection } from "@hull-eats/types";
import {
  addMenuSubGroupOnSection,
  formatMenuSubGroupLabel,
  readMenuSubGroupsFromSection,
  removeMenuSubGroupOnSection,
  renameMenuSubGroupOnSection,
} from "@hull-eats/types";

type Props = {
  section: HubMenuSection;
  readOnly?: boolean;
  onUpdateSection: (updater: (section: HubMenuSection) => HubMenuSection) => void;
  onAddProductToSubGroup?: (menuSubGroup: string) => void;
};

function countItemsForSubGroup(section: HubMenuSection, label: string): number {
  return section.items.filter((item) => item.menuSubGroup?.trim() === label.trim()).length;
}

export function HubMenuCategorySubGroupsPanel({
  section,
  readOnly = false,
  onUpdateSection,
  onAddProductToSubGroup,
}: Props) {
  const subGroups = readMenuSubGroupsFromSection(section);
  const [newSectionType, setNewSectionType] = useState("");
  const [newSectionFormat, setNewSectionFormat] = useState("");

  const handleAdd = () => {
    const label = formatMenuSubGroupLabel(newSectionType, newSectionFormat);
    if (!label) {
      return;
    }
    onUpdateSection((current) => addMenuSubGroupOnSection(current, label));
    setNewSectionType("");
    setNewSectionFormat("");
  };

  const previewLabel = formatMenuSubGroupLabel(newSectionType, newSectionFormat);

  return (
    <div className="hub-menu-subgroups-panel">
      <div>
        <strong style={{ fontSize: "0.88rem" }}>Menu sections (customer headings)</strong>
        <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#5b6470", lineHeight: 1.45 }}>
          Add sections like <strong>Fizzy — Cans</strong> or <strong>Milkshakes</strong>, then add each drink (Coke, Fanta…)
          with its own price and photo under that section.
        </p>
      </div>

      {subGroups.length > 0 ? (
        <ul className="hub-menu-subgroups-panel__list">
          {subGroups.map((group) => {
            const productCount = countItemsForSubGroup(section, group.label);
            return (
              <li key={group.id} className="hub-menu-subgroups-panel__row">
                <label className="hub-menu-extras-library__field hub-menu-subgroups-panel__field">
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>
                    Section heading · {productCount} product{productCount === 1 ? "" : "s"}
                  </span>
                  <input
                    value={group.label}
                    disabled={readOnly}
                    placeholder="e.g. Fizzy — Cans"
                    onChange={(e) =>
                      onUpdateSection((current) => renameMenuSubGroupOnSection(current, group.id, e.target.value))
                    }
                  />
                </label>
                {readOnly ? null : (
                  <div className="hub-menu-subgroups-panel__actions">
                    {onAddProductToSubGroup ? (
                      <button
                        type="button"
                        className="hub-menu-grouped-rail__section-add"
                        onClick={() => onAddProductToSubGroup(group.label)}
                      >
                        + Add product
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="hub-menu-parts-library__slot-config-remove"
                      onClick={() => onUpdateSection((current) => removeMenuSubGroupOnSection(current, group.id))}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p style={{ margin: 0, fontSize: "0.82rem", color: "#7a8491" }}>
          No sections yet — add Fizzy + Cans below, or a single name like Milkshakes.
        </p>
      )}

      {readOnly ? null : (
        <div className="hub-menu-subgroups-panel__add-block">
          <div className="hub-menu-extras-library__add-row">
            <label className="hub-menu-extras-library__field">
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Type (optional)</span>
              <input
                value={newSectionType}
                onChange={(e) => setNewSectionType(e.target.value)}
                placeholder="e.g. Fizzy"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </label>
            <label className="hub-menu-extras-library__field">
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Format (optional)</span>
              <input
                value={newSectionFormat}
                onChange={(e) => setNewSectionFormat(e.target.value)}
                placeholder="e.g. Cans"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </label>
          </div>
          {previewLabel ? (
            <p className="hub-menu-subgroups-panel__preview">
              Customer will see: <strong>{previewLabel}</strong>
            </p>
          ) : null}
          <button type="button" className="hub-menu-extras-library__add-btn" onClick={handleAdd}>
            + Add menu section
          </button>
        </div>
      )}
    </div>
  );
}
