"use client";

import { useMemo, useState } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import { HUB_SIDE_SEASONING_SUGGESTIONS, normalizeExtraSuggestionName } from "./hub-menu-extras-presets";
import { HubMenuSuggestionStrip } from "./hub-menu-suggestion-strip";
import { buildLocalMenuItem } from "./menu-studio-core";

type HubMenuSideSeasoningsLibraryProps = {
  section: HubMenuSection;
  onAddSeasoning: (item: MenuItem) => void;
  onRemoveSeasoning: (itemId: string) => void;
  readOnly?: boolean;
};

export function HubMenuSideSeasoningsLibrary({
  section,
  onAddSeasoning,
  onRemoveSeasoning,
  readOnly = false,
}: HubMenuSideSeasoningsLibraryProps) {
  const [name, setName] = useState("");

  const existingNameKeys = useMemo(
    () => new Set(section.items.map((item) => normalizeExtraSuggestionName(item.name)).filter(Boolean)),
    [section.items],
  );

  const addSeasoning = (label: string) => {
    if (!label.trim()) {
      return;
    }
    onAddSeasoning(
      buildLocalMenuItem({
        categoryId: section.id,
        name: label.trim(),
        description: "",
        price: 0,
        requiresIdVerification: false,
        isActive: true,
        components: [],
        optionGroups: [],
      }),
    );
    setName("");
  };

  return (
    <section className="hub-menu-extras-library hub-menu-side-seasonings-library">
      <div>
        <strong style={{ fontSize: "0.95rem" }}>Chips &amp; sides seasoning</strong>
        <p style={{ margin: "6px 0 0", fontSize: "0.84rem", color: "#5b6470", lineHeight: 1.45 }}>
          Build your seasoning list once (salt, chip spice, salt &amp; vinegar, pepper, etc.). On each chips or side item,
          tick which seasonings customers can add — they choose yes or no for each. Paid flavours such as Cajun stay in{" "}
          <strong>Added extras</strong>.
        </p>
      </div>

      <HubMenuSuggestionStrip
        title="Suggested seasonings"
        suggestions={HUB_SIDE_SEASONING_SUGGESTIONS}
        existingNames={existingNameKeys}
        normalizeName={normalizeExtraSuggestionName}
        readOnly={readOnly}
        onAdd={addSeasoning}
      />

      {!readOnly ? (
        <div className="hub-menu-extras-library__add-row">
          <label className="hub-menu-extras-library__field">
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Seasoning name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Salt & vinegar" />
          </label>
          <button type="button" className="hub-menu-extras-library__add-btn" onClick={() => addSeasoning(name)}>
            Add seasoning
          </button>
        </div>
      ) : null}

      {section.items.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.84rem", color: "#5b6470" }}>
          No seasonings yet — add salt, chip spice, vinegar, pepper, or your own labels.
        </p>
      ) : (
        <ul className="hub-menu-extras-library__list">
          {section.items.map((item) => (
            <li key={item.id} className="hub-menu-extras-library__row">
              <span className="hub-menu-extras-library__row-name">
                <strong>{item.name}</strong>
              </span>
              <span style={{ fontSize: "0.84rem", color: "#5b6470" }}>Free — customer ticks on or off</span>
              {readOnly ? null : (
                <button
                  type="button"
                  className="hub-menu-extras-library__remove-btn"
                  onClick={() => onRemoveSeasoning(item.id)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
