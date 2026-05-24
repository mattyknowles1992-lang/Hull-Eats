"use client";

import { useMemo, useState } from "react";

import type { HubMenuSection } from "@hull-eats/types";

import { HubMenuPartsGroupSettingsPanel } from "./hub-menu-parts-group-settings";
import {
  getHubPartsFromSection,
  readPartSlotDefinitions,
  renamePartLibraryItem,
  type ComposePartSlot,
  type ComposeProductLine,
} from "./menu-studio-core";

type Props = {
  burgerPartsSection: HubMenuSection | null;
  kebabPartsSection: HubMenuSection | null;
  initialLine?: ComposeProductLine | null;
  readOnly?: boolean;
  onUpdateBurgerPartsSection: (updater: (section: HubMenuSection) => HubMenuSection) => void;
  onUpdateKebabPartsSection: (updater: (section: HubMenuSection) => HubMenuSection) => void;
  onRemoveBurgerPart: (itemId: string) => void;
  onRemoveKebabPart: (itemId: string) => void;
};

const lineOptions: Array<{ line: ComposeProductLine; label: string }> = [
  { line: "burger", label: "Burger parts" },
  { line: "kebab", label: "Kebab parts" },
];

export function HubMenuPartsSettingsWorkbench({
  burgerPartsSection,
  kebabPartsSection,
  initialLine = null,
  readOnly = false,
  onUpdateBurgerPartsSection,
  onUpdateKebabPartsSection,
  onRemoveBurgerPart,
  onRemoveKebabPart,
}: Props) {
  const availableLines = lineOptions.filter((entry) =>
    entry.line === "burger" ? Boolean(burgerPartsSection) : Boolean(kebabPartsSection),
  );

  const defaultLine = initialLine ?? availableLines[0]?.line ?? "burger";
  const [activeLine, setActiveLine] = useState<ComposeProductLine>(defaultLine);

  const section = activeLine === "burger" ? burgerPartsSection : kebabPartsSection;
  const onUpdateSection = activeLine === "burger" ? onUpdateBurgerPartsSection : onUpdateKebabPartsSection;
  const onRemovePart = activeLine === "burger" ? onRemoveBurgerPart : onRemoveKebabPart;

  const slotDefinitions = useMemo(
    () => (section ? readPartSlotDefinitions(section, activeLine) : []),
    [section, activeLine],
  );
  const parts = useMemo(() => (section ? getHubPartsFromSection(section, activeLine) : []), [section, activeLine]);

  const grouped = useMemo(() => {
    const map = new Map<ComposePartSlot, typeof parts>();
    for (const slot of slotDefinitions) {
      map.set(slot.key, []);
    }
    for (const part of parts) {
      const bucket = map.get(part.slot) ?? [];
      bucket.push(part);
      map.set(part.slot, bucket);
    }
    return map;
  }, [parts, slotDefinitions]);

  if (!burgerPartsSection && !kebabPartsSection) {
    return (
      <p className="form-helper" style={{ marginTop: 12 }}>
        Burger and kebab part libraries are not set up for this hub yet. Add a burger or kebab category from the menu
        builder first.
      </p>
    );
  }

  if (!section) {
    return null;
  }

  return (
    <section className="hub-menu-parts-settings-workbench">
      <header className="hub-menu-parts-settings-workbench__intro">
        <p className="hub-menu-parts-settings__eyebrow">Menu · Option groups</p>
        <h3 className="hub-menu-parts-settings__title">Edit or add option groups</h3>
        <p className="hub-menu-parts-settings__copy">
          Name the groups customers see (buns, meat, salad, sauce…). To add new choices for each group, use{" "}
          <strong>Burger parts</strong> or <strong>Kebab parts</strong> on the menu builder — not here.
        </p>
      </header>

      {availableLines.length > 1 ? (
        <div className="hub-menu-parts-settings-workbench__line-tabs" role="tablist" aria-label="Parts library">
          {availableLines.map((entry) => (
            <button
              key={entry.line}
              type="button"
              role="tab"
              aria-selected={activeLine === entry.line}
              className={`hub-menu-parts-settings-workbench__line-tab${activeLine === entry.line ? " is-active" : ""}`}
              onClick={() => setActiveLine(entry.line)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      ) : null}

      <HubMenuPartsGroupSettingsPanel
        line={activeLine}
        section={section}
        readOnly={readOnly}
        onUpdateSection={onUpdateSection}
        embedded
      />

      <div className="hub-menu-parts-settings-workbench__choices">
        <strong style={{ fontSize: "0.88rem" }}>Existing choices</strong>
        <p style={{ margin: "4px 0 12px", fontSize: "0.8rem", color: "#5b6470", lineHeight: 1.4 }}>
          Rename or remove choices you already added. Use the menu builder tab to add new ones.
        </p>

        {slotDefinitions.map((slotDef) => {
          const slotParts = grouped.get(slotDef.key) ?? [];
          return (
            <div key={slotDef.id} className="hub-menu-parts-settings-workbench__choice-group">
              <p className="hub-menu-parts-library__group-title">{slotDef.label}</p>
              {slotParts.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#7a8491" }}>No choices yet.</p>
              ) : (
                <ul className="hub-menu-parts-library__slot-config-list">
                  {slotParts.map((part) => (
                    <li key={part.id} className="hub-menu-parts-library__slot-config-row">
                      <label className="hub-menu-extras-library__field hub-menu-parts-library__slot-config-field">
                        <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Choice name</span>
                        <input
                          value={part.label}
                          disabled={readOnly}
                          onChange={(event) =>
                            onUpdateSection((current) => renamePartLibraryItem(current, part.id, event.target.value))
                          }
                        />
                      </label>
                      {readOnly ? null : (
                        <button
                          type="button"
                          className="hub-menu-parts-library__slot-config-remove"
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
        })}
      </div>
    </section>
  );
}
