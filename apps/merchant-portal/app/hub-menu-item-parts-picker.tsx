"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { MenuItem } from "@hull-eats/types";

import {
  componentFromMenuPart,
  partSlotLabel,
  syncComposePartsFromSelection,
  type ComposePartSlot,
  type ComposeProductLine,
  type HubMenuPart,
  type PartSlotDefinition,
} from "./menu-studio-core";

type Props = {
  item: MenuItem;
  line: ComposeProductLine;
  parts: HubMenuPart[];
  slotDefinitions: PartSlotDefinition[];
  readOnly?: boolean;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
};

export function HubMenuItemPartsPicker({
  item,
  line,
  parts,
  slotDefinitions,
  readOnly = false,
  onUpdateItem,
}: Props) {
  const [syncDescription, setSyncDescription] = useState(true);

  const selectedByPartId = useMemo(() => {
    const map = new Map<string, MenuItem["components"][number]>();
    for (const component of item.components) {
      map.set(component.id, component);
    }
    for (const group of item.optionGroups) {
      if (!/^__HULL_PART_CHOICE:(burger|kebab):/.test((group.description ?? "").trim())) {
        continue;
      }
      for (const option of group.options) {
        if (!map.has(option.id)) {
          map.set(option.id, {
            id: option.id,
            label: option.label,
            quantity: 1,
            removable: false,
          });
        }
      }
    }
    return map;
  }, [item.components, item.optionGroups]);

  const collectSelectedComponents = (): MenuItem["components"] => {
    return Array.from(selectedByPartId.values());
  };

  const partsBySlot = useMemo(() => {
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

  const patchComponents = (components: MenuItem["components"]) => {
    onUpdateItem((current) =>
      syncComposePartsFromSelection(current, line, slotDefinitions, parts, components, { syncDescription }),
    );
  };

  const selectedCountBySlot = useMemo(() => {
    const counts = new Map<ComposePartSlot, number>();
    for (const partId of selectedByPartId.keys()) {
      const part = parts.find((entry) => entry.id === partId);
      if (part) {
        counts.set(part.slot, (counts.get(part.slot) ?? 0) + 1);
      }
    }
    return counts;
  }, [parts, selectedByPartId]);

  const togglePart = (part: HubMenuPart, checked: boolean) => {
    const current = collectSelectedComponents();
    if (checked) {
      patchComponents([...current.filter((entry) => entry.id !== part.id), componentFromMenuPart(part)]);
      return;
    }
    patchComponents(current.filter((component) => component.id !== part.id));
  };

  const updateComponent = (partId: string, patch: Partial<MenuItem["components"][number]>) => {
    patchComponents(
      collectSelectedComponents().map((component) => (component.id === partId ? { ...component, ...patch } : component)),
    );
  };

  if (parts.length === 0) {
    return (
      <p style={empty}>
        Add base parts under <strong>{line === "burger" ? "Burger parts" : "Kebab parts"}</strong> on the left (buns,
        meat, salad, sauce), then tick them here.
      </p>
    );
  }

  return (
    <section className="hub-menu-item-parts">
      <div style={headerRow}>
        <div>
          <strong style={title}>Part of this item</strong>
          <p style={copy}>
            Green tick what makes up this product (bun, patty, salad, sauce). Nothing is ticked until you choose.
            <strong> One</strong> tick per group = fixed on the item. <strong>Two or more</strong> in the same group =
            customer picks one on the website. The same ingredient can also be ticked under{" "}
            <strong>Added extras</strong> as a paid add-on.
          </p>
        </div>
      </div>

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
        const slotCount = selectedCountBySlot.get(slotDef.key) ?? 0;
        return (
          <div key={slotDef.key} className="hub-menu-item-parts__group">
            <p style={groupTitle}>{partSlotLabel(line, slotDef.key, slotDefinitions)}</p>
            {slotCount > 1 ? (
              <p style={slotHint}>Customer will pick one of these on the menu ({slotCount} choices).</p>
            ) : slotCount === 1 ? (
              <p style={slotHint}>Fixed on this item — set quantity below.</p>
            ) : null}
            <ul style={optionList}>
              {slotParts.map((part) => {
                const selected = selectedByPartId.get(part.id);
                const checked = Boolean(selected);
                return (
                  <li key={part.id} style={optionRow}>
                    <label style={checkLabel}>
                      <input
                        type="checkbox"
                        className="hub-menu-compose-tick"
                        checked={checked}
                        disabled={readOnly}
                        onChange={(e) => togglePart(part, e.target.checked)}
                      />
                      <span>{part.label}</span>
                      <span style={partBadge}>Part of this item</span>
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
                            disabled={readOnly || slotCount > 1}
                            onChange={(e) => updateComponent(part.id, { removable: e.target.checked })}
                          />
                          <span>{slotCount > 1 ? "Pick-one group (not removable)" : "Customer can remove"}</span>
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

      {item.components.length > 0 ? (
        <p style={summary}>
          <strong>On ticket:</strong>{" "}
          {item.components.map((c) => `${c.quantity > 1 ? `${c.quantity}× ` : ""}${c.label}`).join(", ")}
        </p>
      ) : null}
    </section>
  );
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
const syncRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem", fontWeight: 600 };
const empty: CSSProperties = { margin: 0, fontSize: "0.84rem", color: "#5b6470" };
const groupTitle: CSSProperties = { margin: "0 0 6px", fontSize: "0.78rem", fontWeight: 800, color: "#064f68" };
const slotHint: CSSProperties = { margin: "0 0 8px", fontSize: "0.78rem", color: "#5b6470", lineHeight: 1.4 };
const optionList: CSSProperties = { margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 };
const optionRow: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fafbfc",
};
const checkLabel: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontWeight: 700, flexWrap: "wrap" };
const partBadge: CSSProperties = {
  marginLeft: "auto",
  fontSize: "0.72rem",
  fontWeight: 800,
  color: "#0a7a3b",
  letterSpacing: "0.02em",
};
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
