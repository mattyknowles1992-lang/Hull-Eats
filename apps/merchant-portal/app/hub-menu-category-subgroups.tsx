"use client";

import { useState } from "react";

import type { HubMenuSection } from "@hull-eats/types";
import {
  addMenuSubGroupOnSection,
  readMenuSubGroupsFromSection,
  removeMenuSubGroupOnSection,
  renameMenuSubGroupOnSection,
} from "@hull-eats/types";

type Props = {
  section: HubMenuSection;
  readOnly?: boolean;
  onUpdateSection: (updater: (section: HubMenuSection) => HubMenuSection) => void;
};

export function HubMenuCategorySubGroupsPanel({ section, readOnly = false, onUpdateSection }: Props) {
  const subGroups = readMenuSubGroupsFromSection(section);
  const [newGroupName, setNewGroupName] = useState("");

  const handleAdd = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      return;
    }
    onUpdateSection((current) => addMenuSubGroupOnSection(current, trimmed));
    setNewGroupName("");
  };

  return (
    <div className="hub-menu-subgroups-panel">
      <div>
        <strong style={{ fontSize: "0.88rem" }}>Sub-categories on customer menu</strong>
        <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#5b6470", lineHeight: 1.45 }}>
          Split this category into sections (e.g. <strong>Cans</strong>, <strong>Milkshakes</strong>). Assign each product
          to a sub-category when you add or edit it.
        </p>
      </div>

      {subGroups.length > 0 ? (
        <ul className="hub-menu-subgroups-panel__list">
          {subGroups.map((group) => (
            <li key={group.id} className="hub-menu-subgroups-panel__row">
              <label className="hub-menu-extras-library__field hub-menu-subgroups-panel__field">
                <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Heading</span>
                <input
                  value={group.label}
                  disabled={readOnly}
                  placeholder="e.g. Cans"
                  onChange={(e) =>
                    onUpdateSection((current) => renameMenuSubGroupOnSection(current, group.id, e.target.value))
                  }
                />
              </label>
              {readOnly ? null : (
                <button
                  type="button"
                  className="hub-menu-parts-library__slot-config-remove"
                  onClick={() => onUpdateSection((current) => removeMenuSubGroupOnSection(current, group.id))}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0, fontSize: "0.82rem", color: "#7a8491" }}>
          No sub-categories yet — products will list under the category name only.
        </p>
      )}

      {readOnly ? null : (
        <div className="hub-menu-extras-library__add-row">
          <label className="hub-menu-extras-library__field">
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>New sub-category</span>
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Milkshakes"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
          </label>
          <button type="button" className="hub-menu-extras-library__add-btn" onClick={handleAdd}>
            + Add sub-category
          </button>
        </div>
      )}
    </div>
  );
}
