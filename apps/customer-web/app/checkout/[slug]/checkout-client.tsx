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

export function CheckoutClient({ store, menuItems }: CheckoutClientProps) {
  const [basket, setBasket] = useState<StoreBasket | null>(null);
  const [formState, setFormState] = useState<CheckoutFormState>(initialFormState);
  const [isReviewing, setIsReviewing] = useState(false);
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

  const handleReviewCheckout = async () => {
    if (!basket || basket.items.length === 0) {
      setErrorMessage("Add at least one item before reviewing checkout.");
      return;
    }

    setIsReviewing(true);
    setErrorMessage(null);

    try {
      const session = await createCheckoutSession({
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
        })),
      });

      setCheckoutSession(session);
      setPlacedOrder(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to review checkout right now.";
      setErrorMessage(message);
    } finally {
      setIsReviewing(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!checkoutSession) {
      setErrorMessage("Review the checkout totals before placing the order.");
      return;
    }

    setIsPlacingOrder(true);
    setErrorMessage(null);

    try {
      const result = await placeCheckoutOrder(checkoutSession.id);
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

  if (placedOrder) {
    return (
      <section className="checkout-grid">
        <section className="feature-panel">
          <p className="eyebrow">Order created</p>
          <h1 className="checkout-title">{placedOrder.order.orderNumber}</h1>
          <p className="checkout-copy">
            Your Loaded Munch pilot order is now in the system. Payment is still marked as pending so the next step is
            wiring Stripe PaymentIntents onto this checkout spine.
          </p>

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
              <strong>
                {placedOrder.order.currency} {placedOrder.order.totalAmount.toFixed(2)}
              </strong>
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
            <p className="checkout-copy">
              This is the first real Hull Eats checkout path: basket lines from the storefront, priced in the API, then
              converted into an order record.
            </p>
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
          <button type="button" className="primary-button" onClick={handleReviewCheckout} disabled={isReviewing || basketCount === 0}>
            {isReviewing ? "Reviewing..." : "Review total"}
          </button>
          {checkoutSession ? (
            <button type="button" className="glass-button" onClick={handlePlaceOrder} disabled={isPlacingOrder || !checkoutSession.canPlaceOrder}>
              {isPlacingOrder ? "Placing..." : "Place pilot order"}
            </button>
          ) : null}
        </div>
      </section>

      <aside className="sidebar-stack">
        <section className="feature-panel">
          <div className="section-heading compact">
            <div>
              <h2>Basket</h2>
              <p>{basketCount} item{basketCount === 1 ? "" : "s"} selected from {store.name}.</p>
            </div>
          </div>

          {enrichedLines.length > 0 ? (
            <div className="checkout-line-stack">
              {enrichedLines.map((line) => (
                <article key={line.menuItemId} className="checkout-line-card">
                  <div className="checkout-line-top">
                    <div>
                      <strong>{line.name}</strong>
                      <p>{line.description}</p>
                    </div>
                    <strong>GBP {(line.unitPrice * line.quantity).toFixed(2)}</strong>
                  </div>
                  <div className="checkout-line-footer">
                    <div className="quantity-stepper">
                      <button type="button" className="glass-button" onClick={() => updateBasketQuantity(store.slug, line.menuItemId, line.quantity - 1)}>
                        -
                      </button>
                      <span>{line.quantity}</span>
                      <button type="button" className="glass-button" onClick={() => updateBasketQuantity(store.slug, line.menuItemId, line.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <span className="muted-copy">GBP {line.unitPrice.toFixed(2)} each</span>
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
              <strong>GBP {localSubtotal.toFixed(2)}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Delivery fee</span>
              <strong>{checkoutSession ? `GBP ${checkoutSession.deliveryFee.toFixed(2)}` : "Review to calculate"}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Minimum order</span>
              <strong>
                GBP {(checkoutSession?.minimumOrderAmount ?? store.minimumOrderAmount ?? 0).toFixed(2)}
              </strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Checkout total</span>
              <strong>{checkoutSession ? `GBP ${checkoutSession.totalAmount.toFixed(2)}` : "Review to calculate"}</strong>
            </div>
          </div>

          {checkoutSession ? (
            <div className="checkout-note">
              <strong>{checkoutSession.canPlaceOrder ? "Ready to place" : "Needs attention"}</strong>
              <p>
                {checkoutSession.canPlaceOrder
                  ? "The API has validated this basket and address. The next platform step is Stripe payment capture."
                  : "Make sure address details are filled and the basket meets any pricing rules before placing the order."}
              </p>
            </div>
          ) : null}
        </section>

        <section className="feature-panel">
          <div className="section-heading compact">
            <div>
              <h2>Next payment step</h2>
              <p>Stripe still gets layered onto this flow next.</p>
            </div>
          </div>
          <p className="checkout-copy">
            This pass creates a real checkout session and order record with payment pending. Once Stripe is wired, the
            place-order step will confirm a PaymentIntent and let webhooks complete payment status automatically.
          </p>
        </section>
      </aside>
    </section>
  );
}
