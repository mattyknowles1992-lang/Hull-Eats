"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { MenuItem, StoreSummary } from "@hull-eats/types";

import { createCheckoutSession, placeCheckoutOrder } from "../../../src/lib/api";
import {
  clearBasket,
  getBasketItemCount,
  getBasketSubtotal,
  loadBasket,
  updateBasketQuantity,
  type StoreBasket,
} from "../../../src/lib/basket";

type CheckoutClientProps = {
  store: StoreSummary;
  menuItems: MenuItem[];
};

type CheckoutFormState = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  addressLine1: string;
  city: string;
  postcode: string;
  notes: string;
};

const initialFormState: CheckoutFormState = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  addressLine1: "",
  city: "Hull",
  postcode: "",
  notes: "",
};

const formatMoney = (value: number) => `£${value.toFixed(2)}`;

const getLineComponents = <T extends { components?: unknown }>(line: T) => (Array.isArray(line.components) ? line.components : []);
const getLineSelectedOptions = <T extends { selectedOptions?: unknown }>(line: T) =>
  Array.isArray(line.selectedOptions) ? line.selectedOptions : [];

export function CheckoutClient({ store, menuItems }: CheckoutClientProps) {
  const [basket, setBasket] = useState<StoreBasket | null>(null);
  const [formState, setFormState] = useState<CheckoutFormState>(initialFormState);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<Awaited<ReturnType<typeof createCheckoutSession>> | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Awaited<ReturnType<typeof placeCheckoutOrder>> | null>(null);

  useEffect(() => {
    const sync = () => setBasket(loadBasket(store.slug));

    sync();
    window.addEventListener("hull-eats-basket-updated", sync as EventListener);

    return () => {
      window.removeEventListener("hull-eats-basket-updated", sync as EventListener);
    };
  }, [store.slug]);

  const basketCount = getBasketItemCount(basket);
  const localSubtotal = getBasketSubtotal(basket);

  const enrichedLines = useMemo(
    () =>
      (basket?.items ?? []).map((line) => {
        const menuItem = menuItems.find((item) => item.id === line.menuItemId);

        return {
          ...line,
          description: menuItem?.description ?? "",
        };
      }),
    [basket?.items, menuItems],
  );

  const updateField = <K extends keyof CheckoutFormState>(field: K, value: CheckoutFormState[K]) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const createCurrentCheckoutSession = async () => {
    if (!basket || basket.items.length === 0) {
      throw new Error("Add at least one item before placing the order.");
    }

    return createCheckoutSession({
      storeId: store.id,
      source: "web",
      fulfillmentType: "delivery",
      customerName: formState.customerName.trim(),
      customerPhone: formState.customerPhone.trim(),
      customerEmail: formState.customerEmail.trim() || undefined,
      addressLine1: formState.addressLine1.trim(),
      city: formState.city.trim(),
      postcode: formState.postcode.trim(),
      notes: formState.notes.trim() || undefined,
      items: basket.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        removedComponentIds: item.removedComponentIds,
        selectedOptionQuantities: item.selectedOptionQuantities,
      })),
    });
  };

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    setErrorMessage(null);

    try {
      const session = await createCurrentCheckoutSession();
      setCheckoutSession(session);
      setPlacedOrder(null);

      if (!session.canPlaceOrder) {
        setErrorMessage("Make sure address details are filled and the basket meets any pricing rules before placing the order.");
        return;
      }

      const result = await placeCheckoutOrder(session.id);
      setPlacedOrder(result);
      clearBasket(store.slug);
      setBasket(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to place the order right now.";
      setErrorMessage(message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleClearBasket = () => {
    if (!basket || basket.items.length === 0) {
      return;
    }

    if (basket.items.length > 1) {
      const confirmed = window.confirm("Are you sure? This will remove all items in your order.");

      if (!confirmed) {
        return;
      }
    }

    clearBasket(store.slug);
    setBasket(null);
    setCheckoutSession(null);
    setErrorMessage(null);
  };

  const orderLines = checkoutSession?.lineItems ?? enrichedLines;

  if (placedOrder && checkoutSession) {
    return (
      <section className="checkout-grid">
        <section className="feature-panel">
          <p className="eyebrow">Order created</p>
          <h1 className="checkout-title">{placedOrder.order.orderNumber}</h1>
          <p className="checkout-copy">
            Your Loaded Munch order is now in the system. The customisations below are exactly what should carry into
            kitchen view and printer output.
          </p>

          <div className="checkout-line-stack">
            {checkoutSession.lineItems.map((line) => (
              <article key={line.lineId} className="checkout-line-card">
                <div className="checkout-line-top">
                  <div>
                    <strong>{line.name}</strong>
                    <p>{line.quantity} x this customised item</p>
                  </div>
                  <strong>{formatMoney(line.lineTotal)}</strong>
                </div>
                <div className="line-detail-stack">
                  {getLineComponents(line).map((component) => (
                    <span key={component.componentId} className={component.removed ? "line-detail line-detail-removed" : "line-detail"}>
                      {component.quantity} x {component.label}
                      {component.removed ? " / removed" : ""}
                    </span>
                  ))}
                  {getLineSelectedOptions(line).map((option) => (
                    <span key={option.valueId} className="line-detail line-detail-selected">
                      {option.quantity} x {option.groupName}: {option.valueName}
                      {option.priceDelta > 0 ? ` / +${formatMoney(option.priceDelta)}` : ""}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="checkout-summary">
            <div className="glance-row">
              <span className="muted-copy">Store</span>
              <strong>{store.name}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Status</span>
              <strong>{placedOrder.order.status}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Total</span>
              <strong>{formatMoney(placedOrder.order.totalAmount)}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Next step</span>
              <strong>{placedOrder.nextStep.replaceAll("_", " ")}</strong>
            </div>
          </div>

          <div className="button-row" style={{ marginTop: 18 }}>
            <Link href={`/stores/${store.slug}`} className="primary-button">
              Back to storefront
            </Link>
            <Link href={`/track/${placedOrder.order.orderNumber}`} className="primary-button">
              Track delivery
            </Link>
            <Link href="/" className="glass-button">
              Browse more stores
            </Link>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="checkout-grid">
      <section className="feature-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1 className="checkout-title">Loaded Munch order</h1>
            <p className="checkout-copy">Review your address, basket, and customisations before placing the order.</p>
          </div>
        </div>

        <div className="form-grid">
          <label className="form-field">
            <span>Full name</span>
            <input className="form-input" value={formState.customerName} onChange={(event) => updateField("customerName", event.target.value)} />
          </label>
          <label className="form-field">
            <span>Phone</span>
            <input className="form-input" value={formState.customerPhone} onChange={(event) => updateField("customerPhone", event.target.value)} />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input className="form-input" value={formState.customerEmail} onChange={(event) => updateField("customerEmail", event.target.value)} />
          </label>
          <label className="form-field">
            <span>Address line 1</span>
            <input className="form-input" value={formState.addressLine1} onChange={(event) => updateField("addressLine1", event.target.value)} />
          </label>
          <label className="form-field">
            <span>City</span>
            <input className="form-input" value={formState.city} onChange={(event) => updateField("city", event.target.value)} />
          </label>
          <label className="form-field">
            <span>Postcode</span>
            <input className="form-input" value={formState.postcode} onChange={(event) => updateField("postcode", event.target.value)} />
          </label>
          <label className="form-field form-field-full">
            <span>Order notes</span>
            <textarea className="form-input form-textarea" value={formState.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </label>
        </div>

        {errorMessage ? <p className="form-message form-message-error">{errorMessage}</p> : null}

        <div className="button-row" style={{ marginTop: 18 }}>
          <button type="button" className="primary-button gold-button" onClick={handlePlaceOrder} disabled={isPlacingOrder || basketCount === 0}>
            {isPlacingOrder ? "Placing..." : "Place order"}
          </button>
        </div>
      </section>

      <aside className="sidebar-stack">
        <section className="feature-panel">
          <div className="section-heading compact">
            <div>
              <h2>Basket</h2>
              <p>
                {basketCount} item{basketCount === 1 ? "" : "s"} selected from {store.name}.
              </p>
            </div>
            {basketCount > 0 ? (
              <button type="button" className="glass-button danger-button" onClick={handleClearBasket}>
                Clear basket
              </button>
            ) : null}
          </div>

          {orderLines.length > 0 ? (
            <div className="checkout-line-stack">
              {orderLines.map((line) => (
                <article key={line.lineId} className="checkout-line-card">
                  <div className="checkout-line-top">
                    <div>
                      <strong>{line.name}</strong>
                      <p>{line.quantity} x item</p>
                    </div>
                    <strong>{formatMoney(line.unitPrice * line.quantity)}</strong>
                  </div>

                  {getLineComponents(line).length > 0 || getLineSelectedOptions(line).length > 0 ? (
                    <div className="line-detail-stack">
                      {getLineComponents(line).map((component) => (
                        <span key={component.componentId} className={component.removed ? "line-detail line-detail-removed" : "line-detail"}>
                          {component.quantity} x {component.label}
                          {component.removed ? " / removed" : ""}
                        </span>
                      ))}
                      {getLineSelectedOptions(line).map((option) => (
                        <span key={option.valueId} className="line-detail line-detail-selected">
                          {option.quantity} x {option.groupName}: {option.valueName}
                          {option.priceDelta > 0 ? ` / +${formatMoney(option.priceDelta)}` : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="checkout-line-footer">
                    <div className="quantity-stepper">
                      <button type="button" className="glass-button" onClick={() => updateBasketQuantity(store.slug, line.lineId, line.quantity - 1)}>
                        -
                      </button>
                      <span>{line.quantity}</span>
                      <button type="button" className="glass-button" onClick={() => updateBasketQuantity(store.slug, line.lineId, line.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <span className="muted-copy">{formatMoney(line.unitPrice)} each</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="checkout-copy">Your basket is empty. Add a few Loaded Munch items before checking out.</p>
          )}

          <div className="checkout-summary">
            <div className="glance-row">
              <span className="muted-copy">Local subtotal</span>
              <strong>{formatMoney(localSubtotal)}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Delivery fee</span>
              <strong>{checkoutSession ? formatMoney(checkoutSession.deliveryFee) : "Review to calculate"}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Minimum order</span>
              <strong>{formatMoney(checkoutSession?.minimumOrderAmount ?? store.minimumOrderAmount ?? 0)}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Checkout total</span>
              <strong>{checkoutSession ? formatMoney(checkoutSession.totalAmount) : "Review to calculate"}</strong>
            </div>
          </div>

          {checkoutSession ? (
            <div className="checkout-note">
              <strong>{checkoutSession.canPlaceOrder ? "Ready to place" : "Needs attention"}</strong>
              <p>
                {checkoutSession.canPlaceOrder
                  ? "The API has validated this basket, address, and customisations."
                  : "Make sure address details are filled and the basket meets any pricing rules before placing the order."}
              </p>
            </div>
          ) : null}
        </section>
      </aside>
    </section>
  );
}
