"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { MenuItem } from "@hull-eats/types";

import {
  applyComponentsToItem,
  componentFromMenuPart,
  filterPartsNotListedAsExtras,
  isLabelListedAsExtra,
  partSlotLabel,
  type ComposePartSlot,
  type ComposeProductLine,
  type HubExtraTopping,
  type HubMenuPart,
  type PartSlotDefinition,
} from "./menu-studio-core";

type Props = {
  item: MenuItem;
  line: ComposeProductLine;
  parts: HubMenuPart[];
  slotDefinitions: PartSlotDefinition[];
  extras: HubExtraTopping[];
  readOnly?: boolean;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
};

export function HubMenuItemPartsPicker({
  item,
  line,
  parts,
  slotDefinitions,
  extras,
  readOnly = false,
  onUpdateItem,
}: Props) {
  const [syncDescription, setSyncDescription] = useState(true);
  const availableParts = useMemo(() => filterPartsNotListedAsExtras(parts, extras), [parts, extras]);

  const selectedByPartId = useMemo(() => {
    const map = new Map<string, MenuItem["components"][number]>();
    for (const component of item.components) {
      map.set(component.id, component);
    }
    return map;
  }, [item.components]);

  const partsBySlot = useMemo(() => {
    const groups = new Map<ComposePartSlot, HubMenuPart[]>();
    for (const slot of slotDefinitions) {
      groups.set(slot.key, []);
    }
    for (const part of availableParts) {
      const bucket = groups.get(part.slot) ?? [];
      bucket.push(part);
      groups.set(part.slot, bucket);
    }
    return groups;
  }, [availableParts, slotDefinitions]);

  const extrasUsedAsBase = useMemo(
    () => extras.filter((extra) => item.components.some((c) => normalize(c.label) === normalize(extra.label))),
    [extras, item.components],
  );

  const patchComponents = (components: MenuItem["components"]) => {
    onUpdateItem((current) => applyComponentsToItem(current, components, { syncDescription }));
  };

  const togglePart = (part: HubMenuPart, checked: boolean) => {
    if (checked && isLabelListedAsExtra(part.label, extras)) {
      return;
    }
    if (checked) {
      patchComponents([...item.components, componentFromMenuPart(part)]);
      return;
    }
    patchComponents(item.components.filter((component) => component.id !== part.id));
  };

  const updateComponent = (partId: string, patch: Partial<MenuItem["components"][number]>) => {
    patchComponents(
      item.components.map((component) => (component.id === partId ? { ...component, ...patch } : component)),
    );
  };

  if (parts.length === 0) {
    return (
      <p style={empty}>
        Add base parts under <strong>{line === "burger" ? "Burger parts" : "Kebab parts"}</strong> on the left (buns,
        meat, salad), then tick them here.
      </p>
    );
  }

  return (
    <section className="hub-menu-item-parts">
      <div style={headerRow}>
        <div>
          <strong style={title}>Build this {line} from parts</strong>
          <p style={copy}>
            Tick what is included in this product (prints on kitchen tickets). Paid add-ons like cheese, onion, or
            chorizo — tick those under <strong>Added extras</strong> below, not here.
          </p>
        </div>
      </div>

      {extras.length > 0 ? (
        <p style={hintBox}>
          <strong>In Added extras already:</strong>{" "}
          {extras.map((e) => e.label).join(", ")} — use <strong>Added extras on this item</strong> for those, not base
          parts.
        </p>
      ) : null}

      <label style={syncRow}>
        <input
          type="checkbox"
          checked={syncDescription}
          disabled={readOnly}
          onChange={(e) => setSyncDescription(e.target.checked)}
        />
        <span>List parts in customer description (Includes: …)</span>
      </label>

      {slotDefinitions.map((slotDef) => {
        const slotParts = partsBySlot.get(slotDef.key) ?? [];
        if (slotParts.length === 0) {
          return null;
        }
        return (
          <div key={slotDef.key} className="hub-menu-item-parts__group">
            <p style={groupTitle}>{partSlotLabel(line, slotDef.key, slotDefinitions)}</p>
            <ul style={optionList}>
              {slotParts.map((part) => {
                const selected = selectedByPartId.get(part.id);
                const checked = Boolean(selected);
                return (
                  <li key={part.id} style={optionRow}>
                    <label style={checkLabel}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnly}
                        onChange={(e) => togglePart(part, e.target.checked)}
                      />
                      <span>{part.label}</span>
                    </label>
                    {checked && selected ? (
                      <div style={qtyRow}>
                        <input
                          type="number"
                          min={1}
                          style={qtyInput}
                          disabled={readOnly}
                          value={selected.quantity}
                          title="Quantity"
                          onChange={(e) =>
                            updateComponent(part.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
                          }
                        />
                        <label style={removeLabel}>
                          <input
                            type="checkbox"
                            checked={selected.removable}
                            disabled={readOnly}
                            onChange={(e) => updateComponent(part.id, { removable: e.target.checked })}
                          />
                          <span>Customer can remove</span>
                        </label>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {extrasUsedAsBase.length > 0 ? (
        <p style={warn}>
          {extrasUsedAsBase.map((e) => e.label).join(", ")} should be under <strong>Added extras</strong> on this item,
          not base parts — remove from parts above if listed in Added extras.
        </p>
      ) : null}

      {item.components.length > 0 ? (
        <p style={summary}>
          <strong>On ticket:</strong>{" "}
          {item.components.map((c) => `${c.quantity > 1 ? `${c.quantity}× ` : ""}${c.label}`).join(", ")}
        </p>
      ) : null}
    </section>
  );
}

function normalize(label: string) {
  return label.trim().toLowerCase();
}

const headerRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};
const title: CSSProperties = { fontSize: "0.92rem" };
const copy: CSSProperties = { margin: "4px 0 0", fontSize: "0.8rem", color: "#5b6470", lineHeight: 1.4 };
const hintBox: CSSProperties = {
  margin: 0,
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(35, 205, 255, 0.1)",
  border: "1px solid rgba(7, 155, 200, 0.25)",
  fontSize: "0.82rem",
  lineHeight: 1.45,
};
const syncRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem", fontWeight: 600 };
const empty: CSSProperties = { margin: 0, fontSize: "0.84rem", color: "#5b6470" };
const groupTitle: CSSProperties = { margin: "0 0 6px", fontSize: "0.78rem", fontWeight: 800, color: "#064f68" };
const optionList: CSSProperties = { margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 };
const optionRow: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fafbfc",
};
const checkLabel: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontWeight: 700 };
const qtyRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", paddingLeft: 26 };
const qtyInput: CSSProperties = {
  width: 72,
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.15)",
  font: "inherit",
  textAlign: "center",
};
const removeLabel: CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" };
const summary: CSSProperties = { margin: 0, fontSize: "0.82rem", color: "#3d4652", lineHeight: 1.45 };
const warn: CSSProperties = { margin: 0, fontSize: "0.82rem", color: "#8a2121", lineHeight: 1.45 };
