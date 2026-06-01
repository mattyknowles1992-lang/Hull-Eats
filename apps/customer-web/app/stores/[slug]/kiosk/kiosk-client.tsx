"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { menuItemRequiresCustomerConfiguration, type MenuItem } from "@hull-eats/types";

import {
  addConfiguredItemToBasket,
  addMealDealToBasket,
  clearBasket,
  getBasketItemCount,
  getBasketLineDetails,
  getBasketSubtotal,
  getDefaultCustomisationSelection,
  getSelectedQuantityForOption,
  getSelectionValidationErrors,
  getVisibleOptionGroups,
  loadBasket,
  synchroniseSelection,
  updateBasketQuantity,
  type BasketCustomisationSelection,
  type StoreBasket,
} from "../../../../src/lib/basket";
import { createCheckoutSession, placeCheckoutOrder } from "../../../../src/lib/api";
import { playOrderSuccessDelight, saveActiveOrderSnapshot } from "../../../../src/lib/customer-experience";
import { StoreMenuAddSheet } from "../store-menu-add-sheet";
import { usesItemAddSheet } from "../store-menu-add-sheet-helpers";
import {
  isMealDealCategoryItem,
  mealDealPicksToSnapshots,
  StoreMenuMealDealSheet,
  type MealDealPick,
} from "../store-menu-meal-deal-sheet";

type MenuCategory = {
  id: string;
  name: string;
  presetKey?: string | null;
  description?: string;
  items: MenuItem[];
};

type KioskMenuClientProps = {
  storeId: string;
  storeSlug: string;
  storeName: string;
  categories: MenuCategory[];
};

const formatMoney = (value: number) => `GBP ${value.toFixed(2)}`;

export function KioskMenuClient({ storeId, storeSlug, storeName, categories }: KioskMenuClientProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "all");
  const [basket, setBasket] = useState<StoreBasket | null>(null);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [activeMealDeal, setActiveMealDeal] = useState<MenuItem | null>(null);
  const [selection, setSelection] = useState<BasketCustomisationSelection | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exitTapCount, setExitTapCount] = useState(0);
  const [exitUnlocked, setExitUnlocked] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSendingOrder, setIsSendingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<Awaited<ReturnType<typeof placeCheckoutOrder>> | null>(null);

  useEffect(() => {
    const sync = () => setBasket(loadBasket(storeSlug));

    sync();
    window.addEventListener("hull-eats-basket-updated", sync as EventListener);

    return () => window.removeEventListener("hull-eats-basket-updated", sync as EventListener);
  }, [storeSlug]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));

    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);

    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const visibleCategories = useMemo(
    () => categories.filter((category) => activeCategoryId === "all" || category.id === activeCategoryId),
    [activeCategoryId, categories],
  );

  const visibleOptionGroups = useMemo(
    () => (activeItem && selection ? getVisibleOptionGroups(activeItem, selection.selectedOptionQuantities) : []),
    [activeItem, selection],
  );

  const validationErrors = useMemo(
    () => (activeItem && selection ? getSelectionValidationErrors(activeItem, selection) : []),
    [activeItem, selection],
  );

  const basketItemCount = getBasketItemCount(basket);
  const basketSubtotal = getBasketSubtotal(basket);

  const launchFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  };

  const closeFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    setExitUnlocked(false);
    setExitTapCount(0);
  };

  const openItem = (item: MenuItem) => {
    const category = categories.find((entry) => entry.id === item.categoryId);

    if (isMealDealCategoryItem(item, categories)) {
      setActiveMealDeal(item);
      setActiveItem(null);
      setSelection(null);
      setAddQuantity(1);
      setSpecialInstructions("");
      return;
    }

    if (!menuItemRequiresCustomerConfiguration(item, category?.presetKey)) {
      addConfiguredItemToBasket({ storeId, storeSlug, storeName }, item, getDefaultCustomisationSelection(item));
      return;
    }

    setActiveMealDeal(null);
    setActiveItem(item);
    setSelection(getDefaultCustomisationSelection(item));
    setAddQuantity(1);
    setSpecialInstructions("");
  };

  const closeItem = () => {
    setActiveItem(null);
    setSelection(null);
    setAddQuantity(1);
    setSpecialInstructions("");
  };

  const closeMealDeal = () => {
    setActiveMealDeal(null);
    setAddQuantity(1);
    setSpecialInstructions("");
  };

  const confirmMealDeal = (
    picks: MealDealPick[],
    dealSelection: BasketCustomisationSelection,
    notes: string,
    quantity: number,
  ) => {
    if (!activeMealDeal) {
      return;
    }

    addMealDealToBasket(
      { storeId, storeSlug, storeName },
      activeMealDeal,
      dealSelection,
      mealDealPicksToSnapshots(picks),
      { quantity, notes },
    );
    closeMealDeal();
  };

  const confirmCustomisation = () => {
    if (!activeItem || !selection || validationErrors.length > 0) {
      return;
    }

    addConfiguredItemToBasket(
      { storeId, storeSlug, storeName },
      activeItem,
      selection,
      { quantity: addQuantity, notes: specialInstructions },
    );
    closeItem();
  };

  const toggleExitHotspot = () => {
    setExitTapCount((current) => {
      const next = current + 1;
      if (next >= 5) {
        setExitUnlocked(true);
        return 0;
      }

      return next;
    });
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

  const addActiveItem = () => {
    if (!activeItem || !selection || validationErrors.length > 0) {
      return;
    }

    addConfiguredItemToBasket({ storeId, storeSlug, storeName }, activeItem, selection);
    closeItem();
  };

  const sendKioskOrder = async () => {
    if (!basket || basket.items.length === 0) {
      return;
    }

    if (!customerName.trim()) {
      setOrderError("Enter a customer name for collection.");
      return;
    }

    setIsSendingOrder(true);
    setOrderError("");

    try {
      const session = await createCheckoutSession({
        storeId,
        source: "kiosk",
        fulfillmentType: "pickup",
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || "KIOSK",
        notes: "Self service kiosk collection order",
        items: basket.items.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          selectedOptionQuantities: line.selectedOptionQuantities,
          removedComponentIds: line.removedComponentIds,
          notes: line.notes,
        })),
      });

      if (!session.canPlaceOrder) {
        setOrderError("This order is not ready yet. Check minimum order and menu status.");
        return;
      }

      const order = await placeCheckoutOrder(session.id, "mock_paid");
      setPlacedOrder(order);
      saveActiveOrderSnapshot({
        orderNumber: order.order.orderNumber,
        storeName,
        storeSlug,
        placedAt: new Date().toISOString(),
        etaMinutesHint: null,
      });
      playOrderSuccessDelight();
      clearBasket(storeSlug);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "Kiosk order failed.");
    } finally {
      setIsSendingOrder(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const activeDetails =
    activeItem && selection
      ? getBasketLineDetails(activeItem, selection)
      : {
          selectedOptions: [],
          removedComponents: [],
          components: [],
          customisationTotal: 0,
        };

  return (
    <>
      <button type="button" className="kiosk-hidden-exit-hotspot" aria-label="Hidden kiosk exit" onClick={toggleExitHotspot} />

      {exitUnlocked ? (
        <div className="kiosk-exit-panel">
          <button type="button" className="secondary-button" onClick={() => setExitUnlocked(false)}>
            Hide
          </button>
          <button type="button" className="primary-button" onClick={closeFullscreen}>
            Exit fullscreen
          </button>
          <Link href={`/stores/${storeSlug}`} className="secondary-button">
            Store view
          </Link>
        </div>
      ) : null}

      <section className="kiosk-launch-panel">
        <div>
          <strong>{isFullscreen ? "Kiosk mode active" : "Ready for kiosk mode"}</strong>
          <span>{basketItemCount} items in current order</span>
        </div>
        <button type="button" className="primary-button" onClick={launchFullscreen}>
          Launch fullscreen
        </button>
      </section>

      <section className="kiosk-layout">
        <aside className="kiosk-categories">
          <button
            type="button"
            className={`kiosk-category-button${activeCategoryId === "all" ? " is-active" : ""}`}
            onClick={() => setActiveCategoryId("all")}
          >
            All items
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`kiosk-category-button${activeCategoryId === category.id ? " is-active" : ""}`}
              onClick={() => setActiveCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </aside>

        <div className="kiosk-menu-board">
          {visibleCategories.map((category) => (
            <section key={category.id} className="kiosk-category-section">
              <div className="kiosk-section-heading">
                <h2>{category.name}</h2>
                {category.description ? <p>{category.description}</p> : null}
              </div>
              <div className="kiosk-item-grid">
                {category.items
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <button key={item.id} type="button" className="kiosk-item-card" onClick={() => openItem(item)}>
                      <span className="kiosk-item-image" style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined} />
                      <span className="kiosk-item-copy">
                        <strong>{item.name}</strong>
                        <small>{item.description}</small>
                      </span>
                      <span className="kiosk-item-price">From {formatMoney(item.price)}</span>
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="kiosk-basket">
          <div className="kiosk-section-heading">
            <h2>Your order</h2>
            <p>Enter a name, mock pay, and send to the kitchen.</p>
          </div>

          <label className="kiosk-field">
            <span>Collection name</span>
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name" />
          </label>
          <label className="kiosk-field">
            <span>Phone optional</span>
            <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Phone number" />
          </label>

          <div className="kiosk-basket-lines">
            {basket?.items.map((line) => (
              <div key={line.lineId} className="kiosk-basket-line">
                <div>
                  <strong>{line.name}</strong>
                  <span>
                    {line.selectedOptions.map((option) => option.valueName).join(", ")}
                    {line.removedComponents.length ? ` / no ${line.removedComponents.map((component) => component.label).join(", ")}` : ""}
                  </span>
                </div>
                <div className="kiosk-quantity-row">
                  <button type="button" onClick={() => updateBasketQuantity(storeSlug, line.lineId, line.quantity - 1)}>
                    -
                  </button>
                  <strong>{line.quantity}</strong>
                  <button type="button" onClick={() => updateBasketQuantity(storeSlug, line.lineId, line.quantity + 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
            {basketItemCount === 0 ? <p className="kiosk-empty-copy">Tap an item to start the order.</p> : null}
          </div>

          <div className="kiosk-total-row">
            <span>Total</span>
            <strong>{formatMoney(basketSubtotal)}</strong>
          </div>
          {orderError ? <div className="kiosk-errors">{orderError}</div> : null}
          <button type="button" className="primary-button kiosk-pay-button" disabled={basketItemCount === 0 || isSendingOrder} onClick={sendKioskOrder}>
            {isSendingOrder ? "Sending..." : "Mock pay and send"}
          </button>
          {basketItemCount > 0 ? (
            <button type="button" className="secondary-button" onClick={() => clearBasket(storeSlug)}>
              Clear order
            </button>
          ) : null}
        </aside>
      </section>

      {placedOrder ? (
        <section className="kiosk-receipt-panel">
          <div>
            <p className="eyebrow">Order sent</p>
            <h2>{placedOrder.order.orderNumber}</h2>
            <p>{customerName.trim()} can collect when called. This order is now visible to demo tracking and merchant order lists.</p>
          </div>
          <div className="kiosk-receipt-actions">
            <button type="button" className="primary-button" onClick={printReceipt}>
              Print receipt
            </button>
            <Link href={`/track/${placedOrder.order.orderNumber}`} className="secondary-button">
              Track order
            </Link>
            <button type="button" className="secondary-button" onClick={() => setPlacedOrder(null)}>
              New order
            </button>
          </div>
        </section>
      ) : null}

      {activeMealDeal
        ? createPortal(
            <StoreMenuMealDealSheet
              dealItem={activeMealDeal}
              categories={categories}
              addQuantity={addQuantity}
              specialInstructions={specialInstructions}
              onClose={closeMealDeal}
              onConfirm={confirmMealDeal}
              onSpecialInstructionsChange={setSpecialInstructions}
              onAddQuantityChange={setAddQuantity}
            />,
            document.body,
          )
        : null}

      {activeItem && selection && usesItemAddSheet(activeItem)
        ? createPortal(
            <StoreMenuAddSheet
              item={activeItem}
              selection={selection}
              visibleGroups={visibleOptionGroups}
              addQuantity={addQuantity}
              specialInstructions={specialInstructions}
              itemTotal={activeItem.price + activeDetails.customisationTotal}
              validationErrors={validationErrors}
              onClose={closeItem}
              onConfirm={confirmCustomisation}
              onSpecialInstructionsChange={setSpecialInstructions}
              onAddQuantityChange={setAddQuantity}
              onToggleRemovedComponent={toggleRemovedComponent}
              onSetOptionQuantity={setOptionQuantity}
            />,
            document.body,
          )
        : null}

      {activeItem && selection && !usesItemAddSheet(activeItem) ? (
        <div className="kiosk-modal-backdrop">
          <section className="kiosk-modal">
            <div className="kiosk-modal-heading">
              <div>
                <h2>{activeItem.name}</h2>
                <p>{activeItem.description}</p>
              </div>
              <button type="button" className="secondary-button" onClick={closeItem}>
                Close
              </button>
            </div>

            {activeItem.components.some((component) => component.removable) ? (
              <div className="kiosk-choice-group">
                <h3>Customise</h3>
                <div className="kiosk-choice-grid">
                  {activeItem.components
                    .filter((component) => component.removable)
                    .map((component) => (
                      <button
                        key={component.id}
                        type="button"
                        className={`kiosk-choice-button${selection.removedComponentIds.includes(component.id) ? " is-selected" : ""}`}
                        onClick={() => toggleRemovedComponent(component.id)}
                      >
                        {selection.removedComponentIds.includes(component.id) ? "Add back " : "Remove "}
                        {component.label}
                      </button>
                    ))}
                </div>
              </div>
            ) : null}

            {visibleOptionGroups.map((group) => (
              <div key={group.id} className="kiosk-choice-group">
                <h3>{group.name}</h3>
                <p>{group.isRequired ? "Required" : "Optional"}</p>
                <div className="kiosk-choice-grid">
                  {group.options.map((option) => {
                    const quantity = getSelectedQuantityForOption(selection, option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`kiosk-choice-button${quantity > 0 ? " is-selected" : ""}`}
                        onClick={() =>
                          setOptionQuantity(
                            group.id,
                            option.id,
                            group.selectionMode,
                            quantity > 0 ? 0 : 1,
                            option.maxQuantity,
                          )
                        }
                      >
                        <strong>{option.label}</strong>
                        {option.priceDelta ? <span>+ {formatMoney(option.priceDelta)}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {validationErrors.length > 0 ? <div className="kiosk-errors">{validationErrors.join(" ")}</div> : null}

            <div className="kiosk-modal-footer">
              <span>Total {formatMoney(activeItem.price + activeDetails.customisationTotal)}</span>
              <button type="button" className="primary-button" onClick={addActiveItem} disabled={validationErrors.length > 0}>
                Add to order
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
