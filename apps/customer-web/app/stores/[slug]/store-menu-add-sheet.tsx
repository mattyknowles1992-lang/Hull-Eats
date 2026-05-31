"use client";

import type { MenuItem } from "@hull-eats/types";
import { customerFacingMenuItemDescription } from "@hull-eats/types";

import type { BasketCustomisationSelection } from "../../../src/lib/basket";
import { getSelectedQuantityForOption } from "../../../src/lib/basket";
import {
  getAddSheetGroupTitle,
  getAddSheetOptionPriceLabel,
  showsAddSheetSaladSection,
  sortAddSheetOptionGroups,
} from "./store-menu-add-sheet-helpers";

type Props = {
  item: MenuItem;
  selection: BasketCustomisationSelection;
  visibleGroups: MenuItem["optionGroups"];
  addQuantity: number;
  specialInstructions: string;
  itemTotal: number;
  validationErrors: string[];
  onClose: () => void;
  onConfirm: () => void;
  onSpecialInstructionsChange: (value: string) => void;
  onAddQuantityChange: (quantity: number) => void;
  onToggleRemovedComponent: (componentId: string) => void;
  onSetOptionQuantity: (
    groupId: string,
    optionId: string,
    selectionMode: "single" | "multiple",
    requestedQuantity: number,
    optionMaxQuantity: number,
  ) => void;
};

const formatMoney = (value: number) => `£${value.toFixed(2)}`;

export function StoreMenuAddSheet({
  item,
  selection,
  visibleGroups,
  addQuantity,
  specialInstructions,
  itemTotal,
  validationErrors,
  onClose,
  onConfirm,
  onSpecialInstructionsChange,
  onAddQuantityChange,
  onToggleRemovedComponent,
  onSetOptionQuantity,
}: Props) {
  const sortedGroups = sortAddSheetOptionGroups(visibleGroups);
  const intro = customerFacingMenuItemDescription(item.description);
  const saladComponents = item.components.filter((component) => component.removable);
  const showSaladSection = showsAddSheetSaladSection(item);

  const toggleSingleOption = (group: MenuItem["optionGroups"][number], optionId: string) => {
    onSetOptionQuantity(group.id, optionId, "single", 1, 1);
  };

  const toggleMultipleOption = (
    group: MenuItem["optionGroups"][number],
    optionId: string,
    optionMaxQuantity: number,
    selected: boolean,
  ) => {
    onSetOptionQuantity(group.id, optionId, "multiple", selected ? 0 : 1, optionMaxQuantity);
  };

  return (
    <div className="customise-modal-backdrop" onClick={onClose}>
      <section
        className="customise-modal customise-modal--add-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-sheet-title"
      >
        <div className="customise-modal-scroll">
          <header className="add-sheet-header">
            <button type="button" className="icon-button add-sheet-back" onClick={onClose} aria-label="Back">
              ←
            </button>
            <h3 id="add-sheet-title" className="add-sheet-title">
              {item.name}
            </h3>
          </header>

          {intro ? <p className="add-sheet-intro">{intro}</p> : null}

          {showSaladSection ? (
            <section className="add-sheet-section">
              <h4 className="add-sheet-section-title">Add your salad</h4>
              <p className="add-sheet-section-copy">Untick anything you do not want on your order.</p>
              <ul className="add-sheet-options">
                {saladComponents.map((component) => {
                  const included = !selection.removedComponentIds.includes(component.id);
                  const inputId = `salad-${component.id}`;

                  return (
                    <li key={component.id} className={`add-sheet-option${included ? " is-selected" : ""}`}>
                      <label className="add-sheet-option-label" htmlFor={inputId}>
                        <input
                          id={inputId}
                          type="checkbox"
                          className="add-sheet-checkbox"
                          checked={included}
                          onChange={() => onToggleRemovedComponent(component.id)}
                        />
                        <span className="add-sheet-option-name">
                          {component.quantity > 1 ? `${component.quantity}× ` : ""}
                          {component.label}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {sortedGroups.map((group) => (
            <section key={group.id} className="add-sheet-section">
              <h4 className="add-sheet-section-title">{getAddSheetGroupTitle(group)}</h4>
              <ul className="add-sheet-options">
                {group.options.map((option) => {
                  const selectedQuantity = getSelectedQuantityForOption(selection, option.id);
                  const selected = selectedQuantity > 0;
                  const priceLabel = getAddSheetOptionPriceLabel(option);
                  const inputId = `${group.id}-${option.id}`;

                  return (
                    <li key={option.id} className={`add-sheet-option${selected ? " is-selected" : ""}`}>
                      <label className="add-sheet-option-label" htmlFor={inputId}>
                        <input
                          id={inputId}
                          type="checkbox"
                          className="add-sheet-checkbox"
                          checked={selected}
                          onChange={() => {
                            if (group.selectionMode === "single") {
                              toggleSingleOption(group, option.id);
                              return;
                            }
                            toggleMultipleOption(group, option.id, option.maxQuantity, selected);
                          }}
                        />
                        <span className="add-sheet-option-name">{option.label}</span>
                        {priceLabel ? <span className="add-sheet-option-price">{priceLabel}</span> : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <section className="add-sheet-section add-sheet-section--field">
            <h4 className="add-sheet-section-title">Special Instructions</h4>
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
              <button
                type="button"
                className="glass-button"
                aria-label="Increase quantity"
                onClick={() => onAddQuantityChange(addQuantity + 1)}
              >
                +
              </button>
            </div>
          </section>

          {validationErrors.length > 0 ? (
            <p className="add-sheet-errors" role="alert">
              {validationErrors.join(" ")}
            </p>
          ) : null}
        </div>

        <footer className="customise-modal-footer add-sheet-footer">
          <button
            type="button"
            className="primary-button add-sheet-submit"
            disabled={validationErrors.length > 0}
            onClick={onConfirm}
          >
            <span className="add-sheet-submit-price">{formatMoney(itemTotal * addQuantity)}</span>
            <span className="add-sheet-submit-label">Add to basket</span>
          </button>
        </footer>
      </section>
    </div>
  );
}
