"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import type { MenuItem } from "@hull-eats/types";
import { customerFacingOptionGroupDescription } from "@hull-eats/types";

import {
  getDefaultMenuCustomisationSelection,
  getGroupCountLabel,
  getMenuCustomisationExtraTotal,
  getMenuCustomisationValidationErrors,
  getSelectedQuantityForOption,
  getVisibleOptionGroups,
  synchroniseMenuSelection,
  type MenuCustomisationSelection,
} from "./menu-item-customisation";
import { formatMenuMoney } from "./menu-studio-core";

type Props = {
  item: MenuItem | null;
  onClose: () => void;
};

export function HubMenuPreviewCustomise({ item, onClose }: Props) {
  const [selection, setSelection] = useState<MenuCustomisationSelection | null>(null);

  useEffect(() => {
    if (!item) {
      setSelection(null);
      return;
    }
    setSelection(getDefaultMenuCustomisationSelection(item));
  }, [item]);

  useEffect(() => {
    if (!item) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [item]);

  const visibleOptionGroups = useMemo(
    () => (item && selection ? getVisibleOptionGroups(item, selection.selectedOptionQuantities) : []),
    [item, selection],
  );

  const validationErrors = useMemo(
    () => (item && selection ? getMenuCustomisationValidationErrors(item, selection) : []),
    [item, selection],
  );

  const customisationTotal = item && selection ? getMenuCustomisationExtraTotal(item, selection) : 0;

  if (!item || !selection) {
    return null;
  }

  const setOptionQuantity = (
    groupId: string,
    optionId: string,
    selectionMode: "single" | "multiple",
    requestedQuantity: number,
    optionMaxQuantity: number,
  ) => {
    setSelection((current) => {
      if (!current) {
        return current;
      }

      const group = item.optionGroups.find((entry) => entry.id === groupId);
      if (!group) {
        return current;
      }

      if (selectionMode === "single") {
        const nextQuantities = { ...current.selectedOptionQuantities };
        group.options.forEach((option) => {
          delete nextQuantities[option.id];
        });
        if (requestedQuantity > 0) {
          nextQuantities[optionId] = 1;
        }
        return synchroniseMenuSelection(item, { ...current, selectedOptionQuantities: nextQuantities });
      }

      const nextQuantities = { ...current.selectedOptionQuantities };
      const groupCount = group.options.reduce((sum, option) => sum + (nextQuantities[option.id] ?? 0), 0);
      const currentQuantity = nextQuantities[optionId] ?? 0;
      const desiredQuantity = Math.max(0, Math.min(optionMaxQuantity, requestedQuantity));
      const maximumSelections = group.maxSelections ?? Number.POSITIVE_INFINITY;
      const nextGroupCount = groupCount - currentQuantity + desiredQuantity;

      if (nextGroupCount > maximumSelections) {
        return current;
      }

      if (desiredQuantity === 0) {
        delete nextQuantities[optionId];
      } else {
        nextQuantities[optionId] = desiredQuantity;
      }

      return synchroniseMenuSelection(item, { ...current, selectedOptionQuantities: nextQuantities });
    });
  };

  const toggleRemovedComponent = (componentId: string) => {
    setSelection((current) => {
      if (!current) {
        return current;
      }
      return synchroniseMenuSelection(item, {
        ...current,
        removedComponentIds: current.removedComponentIds.includes(componentId)
          ? current.removedComponentIds.filter((id) => id !== componentId)
          : [...current.removedComponentIds, componentId],
      });
    });
  };

  return (
    <div style={backdrop} role="presentation" onClick={onClose}>
      <section style={modal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="preview-customise-title">
        <header style={modalHeader}>
          <div>
            <p style={eyebrow}>Customer view</p>
            <h3 id="preview-customise-title" style={modalTitle}>
              {item.name}
            </h3>
            {item.description ? <p style={modalCopy}>{item.description}</p> : null}
          </div>
          <button type="button" style={closeBtn} onClick={onClose}>
            Close
          </button>
        </header>

        <div style={modalScroll}>
          {item.components.length > 0 ? (
            <section style={block}>
              <h4 style={blockTitle}>What&apos;s in this item</h4>
              <div style={choiceStack}>
                {item.components.map((component) => {
                  const removed = selection.removedComponentIds.includes(component.id);
                  return (
                    <div key={component.id} style={removed ? choiceRemoved : choice}>
                      <div>
                        <strong>
                          {component.quantity} x {component.label}
                        </strong>
                        <p style={choiceMeta}>{component.removable ? "Can be removed" : "Included as standard"}</p>
                      </div>
                      {component.removable ? (
                        <button type="button" style={choiceBtn} onClick={() => toggleRemovedComponent(component.id)}>
                          {removed ? "Add back" : "Remove"}
                        </button>
                      ) : (
                        <span style={tag}>Included</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {visibleOptionGroups.map((group) => {
            const groupCopy = customerFacingOptionGroupDescription(group.description);

            return (
            <section key={group.id} style={block}>
              <div style={groupHeader}>
                <div>
                  <h4 style={blockTitle}>{group.name}</h4>
                  <p style={choiceMeta}>{getGroupCountLabel(group)}</p>
                  {groupCopy ? <p style={choiceMeta}>{groupCopy}</p> : null}
                </div>
                <span style={tag}>
                  {group.options.reduce((sum, option) => sum + getSelectedQuantityForOption(selection, option.id), 0)} selected
                </span>
              </div>

              <div style={choiceStack}>
                {group.options.map((option) => {
                  const selectedQuantity = getSelectedQuantityForOption(selection, option.id);
                  const selected = selectedQuantity > 0;

                  return (
                    <div key={option.id} style={selected ? choiceSelected : choice}>
                      <div>
                        <strong>{option.label}</strong>
                        <p style={choiceMeta}>
                          {option.priceDelta > 0 ? `+${formatMenuMoney(option.priceDelta)}` : "Included"}
                          {option.maxQuantity > 1 ? ` / up to ${option.maxQuantity}` : ""}
                        </p>
                      </div>

                      {group.selectionMode === "single" ? (
                        <button
                          type="button"
                          style={choiceBtn}
                          onClick={() => setOptionQuantity(group.id, option.id, group.selectionMode, 1, option.maxQuantity)}
                        >
                          {selected ? "Selected" : "Choose"}
                        </button>
                      ) : (
                        <div style={stepper}>
                          <button
                            type="button"
                            style={choiceBtn}
                            disabled={selectedQuantity === 0}
                            onClick={() =>
                              setOptionQuantity(group.id, option.id, group.selectionMode, selectedQuantity - 1, option.maxQuantity)
                            }
                          >
                            -
                          </button>
                          <span>{selectedQuantity}</span>
                          <button
                            type="button"
                            style={choiceBtn}
                            disabled={selectedQuantity >= option.maxQuantity}
                            onClick={() =>
                              setOptionQuantity(group.id, option.id, group.selectionMode, selectedQuantity + 1, option.maxQuantity)
                            }
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
            );
          })}

          <section style={summary}>
            <div style={summaryRow}>
              <span style={choiceMeta}>Base item</span>
              <strong>{formatMenuMoney(item.price)}</strong>
            </div>
            <div style={summaryRow}>
              <span style={choiceMeta}>Customisations</span>
              <strong>{formatMenuMoney(customisationTotal)}</strong>
            </div>
            <div style={summaryRow}>
              <span style={choiceMeta}>Item total</span>
              <strong>{formatMenuMoney(item.price + customisationTotal)}</strong>
            </div>
            {validationErrors.length > 0 ? (
              <div style={errorBox}>
                {validationErrors.map((error) => (
                  <p key={error} style={errorText}>
                    {error}
                  </p>
                ))}
              </div>
            ) : (
              <p style={okText}>Choices match what customers see on the live menu (after publish).</p>
            )}
          </section>
        </div>

        <footer style={modalFooter}>
          <button type="button" style={closeBtn} onClick={onClose}>
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1300,
  background: "rgba(8, 14, 24, 0.55)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding: 12,
};

const modal: CSSProperties = {
  width: "min(520px, 100%)",
  maxHeight: "min(88vh, 720px)",
  background: "#fff",
  borderRadius: "18px 18px 12px 12px",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 20px 60px rgba(8, 14, 24, 0.25)",
};

const modalHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "16px 18px",
  borderBottom: "1px solid rgba(15, 17, 21, 0.08)",
};

const eyebrow: CSSProperties = {
  margin: "0 0 4px",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#0680a6",
  fontWeight: 800,
};

const modalTitle: CSSProperties = { margin: 0, fontSize: 20 };

const modalCopy: CSSProperties = { margin: "6px 0 0", fontSize: 14, color: "rgba(15, 17, 21, 0.65)" };

const closeBtn: CSSProperties = {
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  flexShrink: 0,
};

const modalScroll: CSSProperties = { overflow: "auto", flex: 1, padding: "12px 18px 18px", display: "grid", gap: 14 };

const block: CSSProperties = { display: "grid", gap: 10 };

const blockTitle: CSSProperties = { margin: 0, fontSize: 16 };

const groupHeader: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" };

const choiceStack: CSSProperties = { display: "grid", gap: 8 };

const choice: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fafbfd",
};

const choiceSelected: CSSProperties = {
  ...choice,
  borderColor: "rgba(7, 155, 200, 0.45)",
  background: "rgba(7, 155, 200, 0.08)",
};

const choiceRemoved: CSSProperties = {
  ...choice,
  opacity: 0.55,
};

const choiceMeta: CSSProperties = { margin: "4px 0 0", fontSize: 13, color: "rgba(15, 17, 21, 0.6)" };

const choiceBtn: CSSProperties = {
  minHeight: 36,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const tag: CSSProperties = {
  padding: "4px 8px",
  borderRadius: 8,
  background: "rgba(7, 155, 200, 0.1)",
  color: "#0680a6",
  fontSize: 12,
  fontWeight: 800,
};

const stepper: CSSProperties = { display: "flex", alignItems: "center", gap: 8 };

const summary: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "rgba(15, 17, 21, 0.04)",
  display: "grid",
  gap: 8,
};

const summaryRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10 };

const errorBox: CSSProperties = { display: "grid", gap: 4 };

const errorText: CSSProperties = { margin: 0, fontSize: 13, color: "#9f1239", fontWeight: 700 };

const okText: CSSProperties = { margin: 0, fontSize: 13, color: "rgba(15, 17, 21, 0.65)" };

const modalFooter: CSSProperties = {
  padding: "12px 18px 16px",
  borderTop: "1px solid rgba(15, 17, 21, 0.08)",
  display: "flex",
  justifyContent: "flex-end",
};
