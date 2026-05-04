"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { MenuItem } from "@hull-eats/types";

import {
  addConfiguredItemToBasket,
  getBasketItemCount,
  getBasketLineDetails,
  getBasketSubtotal,
  getDefaultCustomisationSelection,
  getSelectedQuantityForOption,
  getSelectionValidationErrors,
  getVisibleOptionGroups,
  loadBasket,
  synchroniseSelection,
  type BasketCustomisationSelection,
  type StoreBasket,
} from "../../../src/lib/basket";

type MenuCategory = {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
};

type StoreMenuClientProps = {
  storeId: string;
  storeSlug: string;
  storeName: string;
  categories: MenuCategory[];
};

const formatMoney = (value: number) => `£${value.toFixed(2)}`;

const categoryImageRules = [
  {
    pattern: /burger|smash|patty|beef/i,
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=82",
  },
  {
    pattern: /pizza|slice|pepperoni/i,
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=82",
  },
  {
    pattern: /chicken|wings|strips|tenders/i,
    imageUrl: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1200&q=82",
  },
  {
    pattern: /fries|loaded|munch|tray|chips/i,
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1200&q=82",
  },
  {
    pattern: /dessert|sweet|cookie|waffle|shake|cake|brownie/i,
    imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=82",
  },
  {
    pattern: /drink|refresh|soda|juice/i,
    imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=82",
  },
  {
    pattern: /hot dog|hotdog|dog/i,
    imageUrl: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=1200&q=82",
  },
];

const defaultCategoryImageUrl =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=82";

const getCategoryImageUrl = (category: MenuCategory) => {
  const searchableText = `${category.name} ${category.description ?? ""}`;
  return categoryImageRules.find((rule) => rule.pattern.test(searchableText))?.imageUrl ?? defaultCategoryImageUrl;
};

const getItemImageUrl = (item: MenuItem, category: MenuCategory) => item.imageUrl ?? getCategoryImageUrl(category);

const getGroupCountLabel = (group: MenuItem["optionGroups"][number]) => {
  const minimum = group.isRequired ? Math.max(group.minSelections, 1) : group.minSelections;
  const requirementLabel = minimum > 0 ? `${minimum} required` : "Optional";
  return group.maxSelections ? `${requirementLabel} / max ${group.maxSelections}` : requirementLabel;
};

export function StoreMenuClient({ storeId, storeSlug, storeName, categories }: StoreMenuClientProps) {
  const [basket, setBasket] = useState<StoreBasket | null>(null);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [selection, setSelection] = useState<BasketCustomisationSelection | null>(null);
  const [addedMessage, setAddedMessage] = useState("");

  useEffect(() => {
    const sync = () => setBasket(loadBasket(storeSlug));

    sync();
    window.addEventListener("hull-eats-basket-updated", sync as EventListener);

    return () => {
      window.removeEventListener("hull-eats-basket-updated", sync as EventListener);
    };
  }, [storeSlug]);

  useEffect(() => {
    if (!addedMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setAddedMessage(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [addedMessage]);

  const itemCount = getBasketItemCount(basket);
  const subtotal = getBasketSubtotal(basket);

  const activeDetails =
    activeItem && selection
      ? getBasketLineDetails(activeItem, selection)
      : {
          selectedOptions: [],
          removedComponents: [],
          components: [],
          customisationTotal: 0,
        };

  const visibleOptionGroups = useMemo(
    () => (activeItem && selection ? getVisibleOptionGroups(activeItem, selection.selectedOptionQuantities) : []),
    [activeItem, selection],
  );

  const selectionValidationErrors = useMemo(
    () => (activeItem && selection ? getSelectionValidationErrors(activeItem, selection) : []),
    [activeItem, selection],
  );

  const openCustomise = (item: MenuItem) => {
    if (item.components.length === 0 && item.optionGroups.length === 0) {
      addConfiguredItemToBasket(
        {
          storeId,
          storeSlug,
          storeName,
        },
        item,
        getDefaultCustomisationSelection(item),
      );
      setAddedMessage(`${item.name} added to your basket`);
      return;
    }

    setActiveItem(item);
    setSelection(getDefaultCustomisationSelection(item));
  };

  const closeCustomise = () => {
    setActiveItem(null);
    setSelection(null);
  };

  const toggleRemovedComponent = (componentId: string) => {
    setSelection((current) => {
      if (!current || !activeItem) {
        return current;
      }

      return synchroniseSelection(activeItem, {
        ...current,
        removedComponentIds: current.removedComponentIds.includes(componentId)
          ? current.removedComponentIds.filter((entry) => entry !== componentId)
          : [...current.removedComponentIds, componentId],
      });
    });
  };

  const setOptionQuantity = (
    groupId: string,
    optionId: string,
    selectionMode: "single" | "multiple",
    requestedQuantity: number,
    optionMaxQuantity: number,
  ) => {
    setSelection((current) => {
      if (!current || !activeItem) {
        return current;
      }

      const group = activeItem.optionGroups.find((entry) => entry.id === groupId);

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

        return synchroniseSelection(activeItem, {
          ...current,
          selectedOptionQuantities: nextQuantities,
        });
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

      return synchroniseSelection(activeItem, {
        ...current,
        selectedOptionQuantities: nextQuantities,
      });
    });
  };

  const confirmCustomisation = () => {
    if (!activeItem || !selection || selectionValidationErrors.length > 0) {
      return;
    }

    addConfiguredItemToBasket(
      {
        storeId,
        storeSlug,
        storeName,
      },
      activeItem,
      selection,
    );
    setAddedMessage(`${activeItem.name} added to your basket`);
    closeCustomise();
  };

  return (
    <div className="menu-section-stack">
      {itemCount > 0 ? (
        <section className="basket-banner">
          <div>
            <p className="eyebrow">Basket ready</p>
            <h3>
              {itemCount} item{itemCount === 1 ? "" : "s"} / {formatMoney(subtotal)}
            </h3>
            {addedMessage ? <p className="basket-added-message">{addedMessage}</p> : null}
          </div>
          <Link href={`/checkout/${storeSlug}`} className="primary-button">
            Go to checkout
          </Link>
        </section>
      ) : addedMessage ? (
        <section className="basket-banner">
          <div>
            <p className="eyebrow">Added to basket</p>
            <h3>{addedMessage}</h3>
          </div>
        </section>
      ) : null}

      {categories.map((category) => (
        <section key={category.id} className="menu-section-card menu-section-card-visual">
          <div
            className="menu-category-visual"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(7, 9, 13, 0.72), rgba(7, 9, 13, 0.18)), url(${getCategoryImageUrl(category)})`,
            }}
          >
            <div className="menu-category-copy">
              <p className="eyebrow">{storeName}</p>
              <h3>{category.name}</h3>
              {category.description ? <p className="menu-section-copy">{category.description}</p> : null}
            </div>
            <span className="store-tag menu-category-count">{category.items.length} items</span>
          </div>

          <div className="menu-item-grid">
            {category.items.map((item) => (
              <article key={item.id} className="menu-item-card menu-item-card-visual">
                <div
                  className="menu-item-image"
                  style={{
                    backgroundImage: `url(${getItemImageUrl(item, category)})`,
                  }}
                  aria-hidden="true"
                />
                <div className="menu-item-content-panel">
                  <div className="menu-item-top">
                    <div>
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                    </div>
                    <strong>{formatMoney(item.price)}</strong>
                  </div>

                  {item.components.length > 0 || item.optionGroups.length > 0 ? (
                    <div className="menu-item-customise-summary">
                      {item.components.length > 0 ? <span>{item.components.length} included ingredients</span> : null}
                      {item.optionGroups.length > 0 ? <span>{item.optionGroups.length} customisation groups</span> : null}
                    </div>
                  ) : null}

                  <div className="menu-item-footer">
                    <button type="button" className="glass-button" onClick={() => openCustomise(item)}>
                      {item.components.length > 0 || item.optionGroups.length > 0 ? "Customise and add" : "Add"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {activeItem && selection ? (
        <div className="customise-modal-backdrop" onClick={closeCustomise}>
          <section className="customise-modal" onClick={(event) => event.stopPropagation()}>
            <div className="customise-modal-header">
              <div>
                <p className="eyebrow">Customise item</p>
                <h3>{activeItem.name}</h3>
                <p>{activeItem.description}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeCustomise}>
                Close
              </button>
            </div>

            {activeItem.components.length > 0 ? (
              <section className="customise-block">
                <div className="customise-group-header">
                  <div>
                    <h4>What&apos;s in this item</h4>
                    <p className="customise-group-meta">Included ingredients and removable parts</p>
                  </div>
                </div>

                <div className="customise-choice-stack">
                  {activeItem.components.map((component) => {
                    const removed = selection.removedComponentIds.includes(component.id);

                    return (
                      <label key={component.id} className={`customise-choice ${removed ? "is-removed" : ""}`}>
                        <div>
                          <strong>
                            {component.quantity} x {component.label}
                          </strong>
                          <p>{component.removable ? "Can be removed" : "Included as standard"}</p>
                        </div>
                        {component.removable ? (
                          <button type="button" className="glass-button" onClick={() => toggleRemovedComponent(component.id)}>
                            {removed ? "Add back" : "Remove"}
                          </button>
                        ) : (
                          <span className="store-tag">Included</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {visibleOptionGroups.map((group) => (
              <section key={group.id} className="customise-block">
                <div className="customise-group-header">
                  <div>
                    <h4>{group.name}</h4>
                    <p className="customise-group-meta">{getGroupCountLabel(group)}</p>
                  </div>
                  <span className="store-tag">
                    {group.options.reduce((sum, option) => sum + getSelectedQuantityForOption(selection, option.id), 0)} selected
                  </span>
                </div>

                {group.description ? <p className="customise-block-copy">{group.description}</p> : null}

                <div className="customise-choice-stack">
                  {group.options.map((option) => {
                    const selectedQuantity = getSelectedQuantityForOption(selection, option.id);
                    const selected = selectedQuantity > 0;

                    return (
                      <label key={option.id} className={`customise-choice ${selected ? "is-selected" : ""}`}>
                        <div>
                          <strong>{option.label}</strong>
                          <p>
                            {option.priceDelta > 0 ? `+${formatMoney(option.priceDelta)}` : "Included"}
                            {option.maxQuantity > 1 ? ` / up to ${option.maxQuantity}` : ""}
                          </p>
                        </div>

                        {group.selectionMode === "single" ? (
                          <button
                            type="button"
                            className="glass-button"
                            onClick={() => setOptionQuantity(group.id, option.id, group.selectionMode, 1, option.maxQuantity)}
                          >
                            {selected ? "Selected" : "Choose"}
                          </button>
                        ) : (
                          <div className="quantity-stepper">
                            <button
                              type="button"
                              className="glass-button"
                              onClick={() =>
                                setOptionQuantity(group.id, option.id, group.selectionMode, selectedQuantity - 1, option.maxQuantity)
                              }
                              disabled={selectedQuantity === 0}
                            >
                              -
                            </button>
                            <span>{selectedQuantity}</span>
                            <button
                              type="button"
                              className="glass-button"
                              onClick={() =>
                                setOptionQuantity(group.id, option.id, group.selectionMode, selectedQuantity + 1, option.maxQuantity)
                              }
                              disabled={selectedQuantity >= option.maxQuantity}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}

            <section className="customise-summary-card">
              <div className="glance-row">
                <span className="muted-copy">Base item</span>
                <strong>{formatMoney(activeItem.price)}</strong>
              </div>
              <div className="glance-row">
                <span className="muted-copy">Customisations</span>
                <strong>{formatMoney(activeDetails.customisationTotal)}</strong>
              </div>
              <div className="glance-row">
                <span className="muted-copy">Item total</span>
                <strong>{formatMoney(activeItem.price + activeDetails.customisationTotal)}</strong>
              </div>

              {selectionValidationErrors.length > 0 ? (
                <div className="customise-summary-list">
                  <span className="muted-copy">Needs attention</span>
                  {selectionValidationErrors.map((error) => (
                    <strong key={error}>{error}</strong>
                  ))}
                </div>
              ) : null}

              {activeDetails.removedComponents.length > 0 ? (
                <div className="customise-summary-list">
                  <span className="muted-copy">Removed</span>
                  {activeDetails.removedComponents.map((component) => (
                    <strong key={component.componentId}>No {component.label}</strong>
                  ))}
                </div>
              ) : null}

              {activeDetails.selectedOptions.length > 0 ? (
                <div className="customise-summary-list">
                  <span className="muted-copy">Selected</span>
                  {activeDetails.selectedOptions.map((option) => (
                    <strong key={option.valueId}>
                      {option.quantity} x {option.groupName}: {option.valueName}
                    </strong>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="button-row">
              <button type="button" className="glass-button" onClick={closeCustomise}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={confirmCustomisation}
                disabled={selectionValidationErrors.length > 0}
              >
                Add configured item
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
