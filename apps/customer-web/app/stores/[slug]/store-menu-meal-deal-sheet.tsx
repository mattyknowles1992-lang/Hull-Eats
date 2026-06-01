"use client";

import { useMemo, useState } from "react";

import type { MenuItem } from "@hull-eats/types";
import { customerFacingMenuItemDescription, isHubMenuMealDealsCategory } from "@hull-eats/types";

import {
  getBasketLineDetails,
  getDefaultCustomisationSelection,
  getSelectionValidationErrors,
  type BasketCustomisationSelection,
  type MealDealPickSnapshot,
} from "../../../src/lib/basket";
import {
  buildMealDealDealSelection,
  buildMenuItemLookup,
  mealDealGroupsForItem,
  resolveMealDealProductForOption,
  type MealDealPick,
} from "../../../src/lib/meal-deals";

export type { MealDealPick };
import { StoreMenuAddSheet } from "./store-menu-add-sheet";
import { usesItemAddSheet } from "./store-menu-add-sheet-helpers";

type MenuCategory = {
  id: string;
  name: string;
  presetKey?: string | null;
  items: MenuItem[];
};

type Props = {
  dealItem: MenuItem;
  categories: MenuCategory[];
  addQuantity: number;
  specialInstructions: string;
  onClose: () => void;
  onConfirm: (picks: MealDealPick[], selection: BasketCustomisationSelection, notes: string, quantity: number) => void;
  onSpecialInstructionsChange: (value: string) => void;
  onAddQuantityChange: (quantity: number) => void;
};

const formatMoney = (value: number) => `£${value.toFixed(2)}`;

export function StoreMenuMealDealSheet({
  dealItem,
  categories,
  addQuantity,
  specialInstructions,
  onClose,
  onConfirm,
  onSpecialInstructionsChange,
  onAddQuantityChange,
}: Props) {
  const menuLookup = useMemo(() => buildMenuItemLookup(categories), [categories]);
  const groups = useMemo(() => mealDealGroupsForItem(dealItem), [dealItem]);
  const [picks, setPicks] = useState<MealDealPick[]>([]);
  const [customising, setCustomising] = useState<{
    groupId: string;
    product: MenuItem;
    selection: BasketCustomisationSelection;
  } | null>(null);

  const picksByGroup = useMemo(() => new Map(picks.map((pick) => [pick.groupId, pick])), [picks]);

  const nestedTotal = useMemo(
    () => Number(picks.reduce((sum, pick) => sum + pick.nestedCustomisationTotal, 0).toFixed(2)),
    [picks],
  );

  const missingRequired = groups.filter((group) => group.isRequired && !picksByGroup.has(group.id));
  const intro = customerFacingMenuItemDescription(dealItem.description);

  const openProductCustomisation = (groupId: string, product: MenuItem) => {
    const existing = picksByGroup.get(groupId);
    setCustomising({
      groupId,
      product,
      selection: existing?.selection ?? getDefaultCustomisationSelection(product),
    });
  };

  const confirmProductCustomisation = () => {
    if (!customising) {
      return;
    }
    const group = groups.find((entry) => entry.id === customising.groupId);
    if (!group) {
      return;
    }
    const errors = getSelectionValidationErrors(customising.product, customising.selection);
    if (errors.length > 0) {
      return;
    }
    const nested = getBasketLineDetails(customising.product, customising.selection);
    const pick: MealDealPick = {
      groupId: group.id,
      groupName: group.name,
      menuItemId: customising.product.id,
      menuItemName: customising.product.name,
      selection: customising.selection,
      nestedCustomisationTotal: nested.customisationTotal,
    };
    setPicks((current) => [...current.filter((entry) => entry.groupId !== group.id), pick]);
    setCustomising(null);
  };

  const handleConfirmDeal = () => {
    if (missingRequired.length > 0) {
      return;
    }
    const selection = buildMealDealDealSelection(dealItem, picks);
    onConfirm(picks, selection, specialInstructions, addQuantity);
  };

  if (customising) {
    const nestedDetails = getBasketLineDetails(customising.product, customising.selection);
    const validationErrors = getSelectionValidationErrors(customising.product, customising.selection);
    const useAddSheet = usesItemAddSheet(customising.product);

    return useAddSheet ? (
      <StoreMenuAddSheet
        item={customising.product}
        selection={customising.selection}
        visibleGroups={customising.product.optionGroups}
        addQuantity={1}
        specialInstructions=""
        itemTotal={customising.product.price + nestedDetails.customisationTotal}
        validationErrors={validationErrors}
        onClose={() => setCustomising(null)}
        onConfirm={confirmProductCustomisation}
        onSpecialInstructionsChange={() => undefined}
        onAddQuantityChange={() => undefined}
        onToggleRemovedComponent={(componentId) => {
          setCustomising((current) =>
            current
              ? {
                  ...current,
                  selection: {
                    ...current.selection,
                    removedComponentIds: current.selection.removedComponentIds.includes(componentId)
                      ? current.selection.removedComponentIds.filter((id) => id !== componentId)
                      : [...current.selection.removedComponentIds, componentId],
                  },
                }
              : current,
          );
        }}
        onSetOptionQuantity={(groupId, optionId, selectionMode, requestedQuantity, optionMaxQuantity) => {
          setCustomising((current) => {
            if (!current) {
              return current;
            }
            const group = current.product.optionGroups.find((entry) => entry.id === groupId);
            if (!group) {
              return current;
            }
            const next = { ...current.selection.selectedOptionQuantities };
            if (selectionMode === "single") {
              group.options.forEach((option) => delete next[option.id]);
              next[optionId] = 1;
            } else {
              next[optionId] = Math.max(0, Math.min(requestedQuantity, optionMaxQuantity));
            }
            return { ...current, selection: { ...current.selection, selectedOptionQuantities: next } };
          });
        }}
      />
    ) : null;
  }

  return (
    <div className="customise-modal-backdrop" onClick={onClose}>
      <section
        className="customise-modal customise-modal--add-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-deal-sheet-title"
      >
        <div className="customise-modal-scroll">
          <header className="add-sheet-header">
            <button type="button" className="icon-button add-sheet-back" onClick={onClose} aria-label="Back">
              ←
            </button>
            <h3 id="meal-deal-sheet-title" className="add-sheet-title">
              {dealItem.name}
            </h3>
          </header>

          {intro ? <p className="add-sheet-intro">{intro}</p> : null}

          {groups.map((group) => {
            const pick = picksByGroup.get(group.id);
            return (
              <section key={group.id} className="add-sheet-section">
                <h4 className="add-sheet-section-title">
                  {group.name}
                  {group.isRequired ? " (required)" : ""}
                </h4>
                <ul className="add-sheet-options">
                  {group.options.map((option) => {
                    const product = resolveMealDealProductForOption(option, menuLookup);
                    if (!product) {
                      return null;
                    }
                    const selected = pick?.menuItemId === product.id;
                    const needsCustomisation =
                      product.optionGroups.length > 0 || product.components.some((c) => c.removable);

                    return (
                      <li key={option.id} className={`add-sheet-option${selected ? " is-selected" : ""}`}>
                        <div className="add-sheet-option-label" style={{ flexDirection: "column", alignItems: "stretch" }}>
                          <span className="add-sheet-option-name">{product.name}</span>
                          {selected && pick ? (
                            <span style={{ fontSize: "0.78rem", color: "#5b6470" }}>
                              {pick.nestedCustomisationTotal > 0
                                ? `Customisations +${formatMoney(pick.nestedCustomisationTotal)}`
                                : "Selected"}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className="glass-button"
                            style={{ marginTop: 8, width: "100%" }}
                            onClick={() => openProductCustomisation(group.id, product)}
                          >
                            {selected
                              ? needsCustomisation
                                ? "Edit choices"
                                : "Selected"
                              : needsCustomisation
                                ? "Choose & customise"
                                : "Choose"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          <section className="add-sheet-section add-sheet-section--field">
            <h4 className="add-sheet-section-title">Special instructions</h4>
            <textarea
              className="form-input form-textarea add-sheet-textarea"
              value={specialInstructions}
              placeholder="Example: No pepper / sugar / salt please."
              rows={2}
              onChange={(event) => onSpecialInstructionsChange(event.target.value)}
            />
          </section>

          <section className="add-sheet-section add-sheet-section--field">
            <h4 className="add-sheet-section-title">Quantity</h4>
            <div className="add-sheet-quantity quantity-stepper">
              <button
                type="button"
                className="glass-button"
                aria-label="Decrease quantity"
                disabled={addQuantity <= 1}
                onClick={() => onAddQuantityChange(Math.max(1, addQuantity - 1))}
              >
                −
              </button>
              <span>{addQuantity}</span>
              <button type="button" className="glass-button" aria-label="Increase quantity" onClick={() => onAddQuantityChange(addQuantity + 1)}>
                +
              </button>
            </div>
          </section>

          {missingRequired.length > 0 ? (
            <p className="add-sheet-errors" role="alert">
              Choose an item for: {missingRequired.map((group) => group.name).join(", ")}
            </p>
          ) : null}
        </div>

        <footer className="customise-modal-footer add-sheet-footer">
          <button
            type="button"
            className="primary-button add-sheet-submit"
            disabled={missingRequired.length > 0}
            onClick={handleConfirmDeal}
          >
            <span className="add-sheet-submit-price">{formatMoney((dealItem.price + nestedTotal) * addQuantity)}</span>
            <span className="add-sheet-submit-label">Add to basket</span>
          </button>
        </footer>
      </section>
    </div>
  );
}

export function isMealDealCategoryItem(item: MenuItem, categories: MenuCategory[]): boolean {
  const section = categories.find((category) => category.id === item.categoryId);
  return isHubMenuMealDealsCategory(section) || mealDealGroupsForItem(item).length > 0;
}

export function mealDealPicksToSnapshots(picks: MealDealPick[]): MealDealPickSnapshot[] {
  return picks.map((pick) => ({
    groupId: pick.groupId,
    groupName: pick.groupName,
    menuItemId: pick.menuItemId,
    menuItemName: pick.menuItemName,
    selectedOptionQuantities: pick.selection.selectedOptionQuantities,
    removedComponentIds: pick.selection.removedComponentIds,
    nestedCustomisationTotal: pick.nestedCustomisationTotal,
  }));
}
