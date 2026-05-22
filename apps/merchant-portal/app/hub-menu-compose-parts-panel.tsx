"use client";

import { useMemo, useState } from "react";

import type { HubMenuSection } from "@hull-eats/types";

import {
  addPartSlotDefinition,
  buildPartLibraryItem,
  getHubPartsFromSection,
  isLabelListedAsExtra,
  readPartSlotDefinitions,
  removePartSlotDefinition,
  renamePartSlotDefinition,
  type ComposePartSlot,
  type ComposeProductLine,
  type HubExtraTopping,
  type HubMenuPart,
  type PartSlotDefinition,
} from "./menu-studio-core";

type Props = {
  line: ComposeProductLine;
  section: HubMenuSection;
  extras: HubExtraTopping[];
  onAddPart: (item: ReturnType<typeof buildPartLibraryItem>) => void;
  onRemovePart: (itemId: string) => void;
  onUpdateSection: (updater: (section: HubMenuSection) => HubMenuSection) => void;
  readOnly?: boolean;
};

export function HubMenuComposePartsPanel({
  line,
  section,
  extras,
  onAddPart,
  onRemovePart,
  onUpdateSection,
  readOnly = false,
}: Props) {
  const title = line === "burger" ? "Burger parts" : "Kebab parts";
  const intro =
    line === "burger"
      ? "Set up part groups (bun, meat, salad, or your own), then add each choice under that group. Paid add-ons like cheese belong in Added extras."
      : "Set up part groups (bread, meat, salad, or your own), then add each choice under that group. Paid add-ons belong in Added extras.";

  const slotDefinitions = useMemo(() => readPartSlotDefinitions(section, line), [section, line]);
  const parts = useMemo(() => getHubPartsFromSection(section, line), [section, line]);

  const grouped = useMemo(() => {
    const groups = new Map<ComposePartSlot, HubMenuPart[]>();
    for (const slot of slotDefinitions) {
      groups.set(slot.key, []);
    }
    for (const part of parts) {
      const bucket = groups.get(part.slot) ?? [];
      bucket.push(part);
      groups.set(part.slot, bucket);
    }
    return groups;
  }, [parts, slotDefinitions]);

  return (
    <section className="hub-menu-parts-library__line-panel">
      <div>
        <strong style={{ fontSize: "0.95rem" }}>{title}</strong>
        <p style={{ margin: "6px 0 0", fontSize: "0.84rem", color: "#5b6470", lineHeight: 1.45 }}>{intro}</p>
      </div>

      <PartSlotConfigEditor
        line={line}
        slotDefinitions={slotDefinitions}
        grouped={grouped}
        readOnly={readOnly}
        onUpdateSection={onUpdateSection}
      />

      {slotDefinitions.map((slotDef) => (
        <SlotBlock
          key={slotDef.key}
          line={line}
          slot={slotDef.key}
          slotLabel={slotDef.label}
          sectionId={section.id}
          parts={grouped.get(slotDef.key) ?? []}
          extras={extras}
          readOnly={readOnly}
          onAddPart={onAddPart}
          onRemovePart={onRemovePart}
        />
      ))}
    </section>
  );
}

function PartSlotConfigEditor({
  line,
  slotDefinitions,
  grouped,
  readOnly,
  onUpdateSection,
}: {
  line: ComposeProductLine;
  slotDefinitions: PartSlotDefinition[];
  grouped: Map<ComposePartSlot, HubMenuPart[]>;
  readOnly: boolean;
  onUpdateSection: Props["onUpdateSection"];
}) {
  const [newGroupName, setNewGroupName] = useState("");

  const handleAddGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      return;
    }
    onUpdateSection((section) => addPartSlotDefinition(section, line, trimmed));
    setNewGroupName("");
  };

  return (
    <div className="hub-menu-parts-library__slot-config">
      <div>
        <strong style={{ fontSize: "0.88rem" }}>Part groups</strong>
        <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#5b6470", lineHeight: 1.4 }}>
          Name each group (what customers see). Add more groups if your menu needs them.
        </p>
      </div>

      <ul className="hub-menu-parts-library__slot-config-list">
        {slotDefinitions.map((slotDef) => {
          const partCount = (grouped.get(slotDef.key) ?? []).length;
          return (
            <li key={slotDef.id} className="hub-menu-parts-library__slot-config-row">
              <label className="hub-menu-extras-library__field hub-menu-parts-library__slot-config-field">
                <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Group name</span>
                <input
                  value={slotDef.label}
                  disabled={readOnly}
                  placeholder={line === "burger" ? "e.g. Bun" : "e.g. Bread"}
                  onChange={(e) =>
                    onUpdateSection((section) => renamePartSlotDefinition(section, line, slotDef.key, e.target.value))
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
                  onClick={() => onUpdateSection((section) => removePartSlotDefinition(section, line, slotDef.key))}
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
            + Add part group
          </button>
        </div>
      )}
    </div>
  );
}

function SlotBlock({
  line,
  slot,
  slotLabel,
  sectionId,
  parts,
  extras,
  readOnly,
  onAddPart,
  onRemovePart,
}: {
  line: ComposeProductLine;
  slot: ComposePartSlot;
  slotLabel: string;
  sectionId: string;
  parts: HubMenuPart[];
  extras: HubExtraTopping[];
  readOnly: boolean;
  onAddPart: Props["onAddPart"];
  onRemovePart: (itemId: string) => void;
}) {
  const [name, setName] = useState("");
  const [addError, setAddError] = useState("");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    if (isLabelListedAsExtra(trimmed, extras)) {
      setAddError(`"${trimmed}" is already in Added extras — add it on each product under Added extras, not here.`);
      return;
    }
    setAddError("");
    onAddPart(
      buildPartLibraryItem({
        categoryId: sectionId,
        label: trimmed,
        line,
        slot,
      }),
    );
    setName("");
  };

  return (
    <div className="hub-menu-parts-library__group">
      <p className="hub-menu-parts-library__group-title">{slotLabel}</p>
      <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "#5b6470" }}>
        Add each choice customers can pick for <strong>{slotLabel.toLowerCase()}</strong> (saved under this group).
      </p>
      {!readOnly ? (
        <div className="hub-menu-extras-library__add-row hub-menu-parts-library__slot-add">
          <label className="hub-menu-extras-library__field">
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Choice name</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (addError) {
                  setAddError("");
                }
              }}
              placeholder={
                slot === "bun" || slot === "bread"
                  ? "e.g. Brioche bun"
                  : slot === "meat"
                    ? "e.g. 3oz smash"
                    : "e.g. Lettuce"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
          </label>
          <button type="button" className="hub-menu-extras-library__add-btn" onClick={handleAdd}>
            Add
          </button>
        </div>
      ) : null}
      {addError ? <p className="hub-menu-parts-library__error">{addError}</p> : null}
      {parts.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.82rem", color: "#7a8491" }}>No choices yet — add one above.</p>
      ) : (
        <ul className="hub-menu-extras-library__list">
          {parts.map((part) => (
            <li key={part.id} className="hub-menu-extras-library__row">
              <span>
                <strong>{part.label}</strong>
              </span>
              {readOnly ? null : (
                <button
                  type="button"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#b42318",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                  onClick={() => onRemovePart(part.id)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
