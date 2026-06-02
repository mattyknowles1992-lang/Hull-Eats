"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import type { HubMenuSection } from "@hull-eats/types";

import { HubMenuItemExtrasPicker } from "./hub-menu-item-extras";
import {
  customerFacingMenuSections,
  getCategoryExtrasAssignment,
  type HubCategoryExtrasAssignment,
  type HubExtraTopping,
} from "./menu-studio-core";

type HubMenuCategoryExtrasAssignProps = {
  open: boolean;
  menuSections: HubMenuSection[];
  toppings: HubExtraTopping[];
  onClose: () => void;
  onApply: (assignment: HubCategoryExtrasAssignment) => void;
  readOnly?: boolean;
};

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  background: "rgba(8, 12, 20, 0.55)",
  display: "grid",
  placeItems: "center",
  padding: 16,
};

const dialog: CSSProperties = {
  width: "min(720px, 100%)",
  maxHeight: "min(90vh, 900px)",
  overflow: "auto",
  borderRadius: 18,
  border: "1px solid rgba(7, 155, 200, 0.25)",
  background: "#fff",
  padding: 20,
  display: "grid",
  gap: 16,
};

const primaryBtn: CSSProperties = {
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(180deg, #23cdff, #079bc8)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  minHeight: 42,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

function mapsFromAssignment(assignment: HubCategoryExtrasAssignment | null, toppings: HubExtraTopping[]) {
  if (assignment) {
    return {
      paidExtraIds: new Set(assignment.paidExtraIds),
      includedQtyById: new Map(Object.entries(assignment.includedQtyById)),
      maxAddMoreById: new Map(Object.entries(assignment.maxAddMoreById)),
      priceById: new Map(
        toppings.map((topping) => [topping.id, assignment.priceById[topping.id] ?? topping.price] as const),
      ),
    };
  }
  const paidExtraIds = new Set(toppings.map((topping) => topping.id));
  const maxAddMoreById = new Map(toppings.map((topping) => [topping.id, 8] as const));
  const priceById = new Map(toppings.map((topping) => [topping.id, topping.price] as const));
  return { paidExtraIds, includedQtyById: new Map<string, number>(), maxAddMoreById, priceById };
}

export function HubMenuCategoryExtrasAssign({
  open,
  menuSections,
  toppings,
  onClose,
  onApply,
  readOnly = false,
}: HubMenuCategoryExtrasAssignProps) {
  const categories = useMemo(() => customerFacingMenuSections(menuSections), [menuSections]);
  const [categoryId, setCategoryId] = useState("");
  const [itemIds, setItemIds] = useState<Set<string>>(new Set());
  const [paidExtraIds, setPaidExtraIds] = useState<Set<string>>(new Set());
  const [includedQtyById, setIncludedQtyById] = useState<Map<string, number>>(new Map());
  const [maxAddMoreById, setMaxAddMoreById] = useState<Map<string, number>>(new Map());
  const [priceById, setPriceById] = useState<Map<string, number>>(new Map());

  const selectedCategory = categories.find((section) => section.id === categoryId) ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }
    const first = categories[0]?.id ?? "";
    setCategoryId((current) => current || first);
  }, [open, categories]);

  useEffect(() => {
    if (!open || !categoryId) {
      return;
    }
    const section = categories.find((entry) => entry.id === categoryId);
    if (!section) {
      return;
    }
    const existing = getCategoryExtrasAssignment(menuSections, categoryId);
    const maps = mapsFromAssignment(existing, toppings);
    setPaidExtraIds(maps.paidExtraIds);
    setIncludedQtyById(maps.includedQtyById);
    setMaxAddMoreById(maps.maxAddMoreById);
    setPriceById(maps.priceById);
    setItemIds(new Set(existing?.itemIds.length ? existing.itemIds : section.items.map((item) => item.id)));
  }, [open, categoryId, categories, menuSections, toppings]);

  if (!open) {
    return null;
  }

  const patchExtras = (
    nextPaid: Set<string>,
    nextIncluded: Map<string, number>,
    nextMax: Map<string, number>,
    nextPrices: Map<string, number>,
  ) => {
    setPaidExtraIds(nextPaid);
    setIncludedQtyById(nextIncluded);
    setMaxAddMoreById(nextMax);
    setPriceById(nextPrices);
  };

  const handleApply = () => {
    if (!categoryId || itemIds.size === 0) {
      return;
    }
    const assignment: HubCategoryExtrasAssignment = {
      categoryId,
      paidExtraIds: [...paidExtraIds],
      includedQtyById: Object.fromEntries(includedQtyById),
      maxAddMoreById: Object.fromEntries(maxAddMoreById),
      priceById: Object.fromEntries(priceById),
      itemIds: [...itemIds],
    };
    onApply(assignment);
    onClose();
  };

  return (
    <div style={overlay} role="presentation" onClick={onClose}>
      <div
        style={dialog}
        role="dialog"
        aria-labelledby="category-extras-assign-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h2 id="category-extras-assign-title" style={{ margin: 0, fontSize: "1.15rem" }}>
            Assign extras to category
          </h2>
          <p style={{ margin: "8px 0 0", color: "#5b6470", fontSize: "0.86rem", lineHeight: 1.45 }}>
            Pick extras once for a whole category. When at least one included or paid extra is selected here, that set
            applies to the ticked products. If nothing is selected, each product keeps its own per-item extras. Uncheck
            products below or detach later for individual control.
          </p>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3d4652" }}>Category</span>
          <select
            value={categoryId}
            disabled={readOnly || categories.length === 0}
            onChange={(event) => setCategoryId(event.target.value)}
            style={{ minHeight: 42, borderRadius: 12, border: "1px solid rgba(15, 17, 21, 0.14)", padding: "0 12px" }}
          >
            {categories.length === 0 ? <option value="">No customer categories yet</option> : null}
            {categories.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </label>

        {toppings.length === 0 ? (
          <p style={{ margin: 0, color: "#5b6470", fontSize: "0.86rem" }}>Add extras to your master list first.</p>
        ) : (
          <HubMenuItemExtrasPicker
            toppings={toppings}
            enabled
            paidExtraIds={paidExtraIds}
            priceById={priceById}
            includedQtyById={includedQtyById}
            maxAddMoreById={maxAddMoreById}
            readOnly={readOnly}
            onEnabledChange={() => undefined}
            onIncludedToggle={(id, checked) => {
              const included = new Map(includedQtyById);
              if (checked) {
                included.set(id, Math.max(1, included.get(id) ?? 1));
              } else {
                included.delete(id);
              }
              patchExtras(paidExtraIds, included, maxAddMoreById, priceById);
            }}
            onPaidExtraToggle={(id, checked) => {
              const paid = new Set(paidExtraIds);
              const maxAddMore = new Map(maxAddMoreById);
              if (checked) {
                paid.add(id);
                if (!maxAddMore.has(id)) {
                  maxAddMore.set(id, 8);
                }
              } else {
                paid.delete(id);
              }
              patchExtras(paid, includedQtyById, maxAddMore, priceById);
            }}
            onSelectAllPaid={() => {
              const paid = new Set(toppings.map((topping) => topping.id));
              const maxAddMore = new Map(toppings.map((topping) => [topping.id, maxAddMoreById.get(topping.id) ?? 8]));
              patchExtras(paid, includedQtyById, maxAddMore, priceById);
            }}
            onClearAll={() => patchExtras(new Set(), new Map(), maxAddMoreById, priceById)}
            onPriceChange={(id, price) => {
              const next = new Map(priceById);
              next.set(id, price);
              patchExtras(paidExtraIds, includedQtyById, maxAddMoreById, next);
            }}
            onIncludedQtyChange={(id, quantity) => {
              const included = new Map(includedQtyById);
              included.set(id, quantity);
              patchExtras(paidExtraIds, included, maxAddMoreById, priceById);
            }}
            onMaxAddMoreChange={(id, quantity) => {
              const maxAddMore = new Map(maxAddMoreById);
              maxAddMore.set(id, quantity);
              patchExtras(paidExtraIds, includedQtyById, maxAddMore, priceById);
            }}
          />
        )}

        {selectedCategory ? (
          <div style={{ display: "grid", gap: 8 }}>
            <strong style={{ fontSize: "0.9rem" }}>Products in {selectedCategory.name}</strong>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#5b6470" }}>
              Uncheck any item that should not use this category extras set.
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6, maxHeight: 220, overflow: "auto" }}>
              {selectedCategory.items.map((item) => (
                <li
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(15, 17, 21, 0.08)",
                  }}
                >
                  <input
                    type="checkbox"
                    className="hub-menu-compose-tick"
                    checked={itemIds.has(item.id)}
                    disabled={readOnly}
                    onChange={(event) => {
                      setItemIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) {
                          next.add(item.id);
                        } else {
                          next.delete(item.id);
                        }
                        return next;
                      });
                    }}
                  />
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" style={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            style={primaryBtn}
            disabled={readOnly || !categoryId || itemIds.size === 0 || toppings.length === 0}
            onClick={handleApply}
          >
            Apply to category
          </button>
        </div>
      </div>
    </div>
  );
}
