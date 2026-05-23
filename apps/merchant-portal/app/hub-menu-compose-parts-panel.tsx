"use client";

import { useMemo, useState } from "react";

import type { HubMenuSection } from "@hull-eats/types";

import {
  buildPartLibraryItem,
  getHubPartsFromSection,
  isLabelListedAsExtra,
  readPartSlotDefinitions,
  type ComposePartSlot,
  type ComposeProductLine,
  type HubExtraTopping,
  type HubMenuPart,
} from "./menu-studio-core";

type Props = {
  line: ComposeProductLine;
  section: HubMenuSection;
  extras: HubExtraTopping[];
  onAddPart: (item: ReturnType<typeof buildPartLibraryItem>) => void;
  onRemovePart: (itemId: string) => void;
  onOpenGroupSettings: () => void;
  readOnly?: boolean;
};

export function HubMenuComposePartsPanel({
  line,
  section,
  extras,
  onAddPart,
  onRemovePart,
  onOpenGroupSettings,
  readOnly = false,
}: Props) {
  const title = line === "burger" ? "Burger parts" : "Kebab parts";
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

  const groupSummary = slotDefinitions.map((slot) => slot.label).join(" · ");

  return (
    <section className="hub-menu-parts-library__line-panel">
      <div>
        <strong style={{ fontSize: "0.95rem" }}>{title}</strong>
        <p style={{ margin: "6px 0 0", fontSize: "0.84rem", color: "#5b6470", lineHeight: 1.45 }}>
          Add each choice customers can pick (brioche bun, 3oz patty, lettuce…). Paid add-ons like cheese belong in{" "}
          <strong>Added extras</strong>.
        </p>
      </div>

      <div className="hub-menu-parts-library__toolbar">
        <p style={{ margin: 0, fontSize: "0.82rem", color: "#5b6470" }}>
          <strong>Groups:</strong> {groupSummary || "Not set up yet"}
        </p>
        {readOnly ? null : (
          <button type="button" className="hub-menu-parts-library__settings-btn" onClick={onOpenGroupSettings}>
            Edit option groups
          </button>
        )}
      </div>

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
        Add each choice for <strong>{slotLabel.toLowerCase()}</strong>.
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
