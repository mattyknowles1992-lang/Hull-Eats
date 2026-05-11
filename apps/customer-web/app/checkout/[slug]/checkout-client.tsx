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
import { getBrowserSupabaseClient } from "../../../src/lib/supabase-browser";

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

type CheckoutPaymentMode = "cash_on_delivery" | "dojo_card";

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

function validateCheckoutForm(formState: CheckoutFormState) {
  if (!formState.customerName.trim()) {
    return "Enter your full name before placing the order.";
  }

  if (!formState.customerPhone.trim()) {
    return "Enter a phone number before placing the order.";
  }

  if (!formState.addressLine1.trim()) {
    return "Enter the delivery address before placing the order.";
  }

  if (!formState.city.trim()) {
    return "Enter the delivery city before placing the order.";
  }

  if (!formState.postcode.trim()) {
    return "Enter the delivery postcode before placing the order.";
  }

  return null;
}

export function CheckoutClient({ store, menuItems }: CheckoutClientProps) {
  const [basket, setBasket] = useState<StoreBasket | null>(null);
  const [formState, setFormState] = useState<CheckoutFormState>(initialFormState);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<Awaited<ReturnType<typeof createCheckoutSession>> | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Awaited<ReturnType<typeof placeCheckoutOrder>> | null>(null);
  const [paymentMode, setPaymentMode] = useState<CheckoutPaymentMode>("cash_on_delivery");
  const [customerProfileId, setCustomerProfileId] = useState("");
  const [showClearBasketConfirm, setShowClearBasketConfirm] = useState(false);

  useEffect(() => {
    const sync = () => setBasket(loadBasket(store.slug));

    sync();
    window.addEventListener("hull-eats-basket-updated", sync as EventListener);

    return () => {
      window.removeEventListener("hull-eats-basket-updated", sync as EventListener);
    };
  }, [store.slug]);

  useEffect(() => {
    void (async () => {
      try {
        const supabase = getBrowserSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;

        if (!userId) {
          return;
        }

        const { data: profileData } = await supabase
          .from("customer_profiles")
          .select("id,email,full_name,phone,default_address_id")
          .eq("supabase_auth_user_id", userId)
          .single();

        if (!profileData) {
          return;
        }

        const profile = profileData as unknown as {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          default_address_id: string | null;
        };

        const { data: addressData } = await supabase
          .from("customer_addresses")
          .select("address_line_1,city,postcode,delivery_notes")
          .eq("customer_profile_id", profile.id)
          .order("is_default", { ascending: false })
          .limit(1)
          .maybeSingle();

        const address = addressData as
          | {
              address_line_1: string;
              city: string;
              postcode: string;
              delivery_notes: string | null;
            }
          | null;

        setFormState((current) => ({
          customerName: current.customerName || profile.full_name || "",
          customerPhone: current.customerPhone || profile.phone || "",
          customerEmail: current.customerEmail || profile.email || "",
          addressLine1: current.addressLine1 || address?.address_line_1 || "",
          city: current.city || address?.city || "Hull",
          postcode: current.postcode || address?.postcode || "",
          notes: current.notes || address?.delivery_notes || "",
        }));
        setCustomerProfileId(profile.id);
      } catch {
        // Checkout still works for guest customers when Supabase is not configured locally.
      }
    })();
  }, []);

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
      customerProfileId: customerProfileId || undefined,
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
      const formError = validateCheckoutForm(formState);

      if (formError) {
        setErrorMessage(formError);
        return;
      }

      const session = await createCurrentCheckoutSession();
      setCheckoutSession(session);
      setPlacedOrder(null);

      if (!session.canPlaceOrder) {
        setErrorMessage("Make sure address details are filled and the basket meets any pricing rules before placing the order.");
        return;
      }

      if (paymentMode === "dojo_card") {
        setErrorMessage("Dojo card payments will be embedded here once the live credentials are connected. Use cash on delivery for testing.");
        return;
      }

      const result = await placeCheckoutOrder(session.id, paymentMode);
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
      setShowClearBasketConfirm(true);
      return;
    }

    confirmClearBasket();
  };

  const confirmClearBasket = () => {
    clearBasket(store.slug);
    setBasket(null);
    setCheckoutSession(null);
    setErrorMessage(null);
    setShowClearBasketConfirm(false);
  };

  const orderLines = checkoutSession?.lineItems ?? enrichedLines;

  if (placedOrder && checkoutSession) {
    return (
      <section className="checkout-grid">
        <section className="feature-panel">
          <p className="eyebrow">Order created</p>
          <h1 className="checkout-title">{placedOrder.order.orderNumber}</h1>
          <p className="checkout-copy">
            Your Loaded Munch order is now in the system. Payment method:{" "}
            {placedOrder.order.paymentMethod === "cash_on_delivery" ? "cash on delivery" : "card payment"}.
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
            <input className="form-input" value={formState.customerName} required onChange={(event) => updateField("customerName", event.target.value)} />
          </label>
          <label className="form-field">
            <span>Phone</span>
            <input
              className="form-input"
              value={formState.customerPhone}
              required
              inputMode="tel"
              autoComplete="tel"
              onChange={(event) => updateField("customerPhone", event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input
              className="form-input"
              value={formState.customerEmail}
              type="email"
              autoComplete="email"
              onChange={(event) => updateField("customerEmail", event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Address line 1</span>
            <input
              className="form-input"
              value={formState.addressLine1}
              required
              autoComplete="address-line1"
              onChange={(event) => updateField("addressLine1", event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>City</span>
            <input className="form-input" value={formState.city} required autoComplete="address-level2" onChange={(event) => updateField("city", event.target.value)} />
          </label>
          <label className="form-field">
            <span>Postcode</span>
            <input
              className="form-input"
              value={formState.postcode}
              required
              autoComplete="postal-code"
              onChange={(event) => updateField("postcode", event.target.value)}
            />
          </label>
          <label className="form-field form-field-full">
            <span>Order notes</span>
            <textarea className="form-input form-textarea" value={formState.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </label>
        </div>

        {errorMessage ? <p className="form-message form-message-error">{errorMessage}</p> : null}

        <section className="checkout-summary" style={{ marginTop: 18 }}>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Payment</p>
              <h2>Choose how to pay</h2>
              <p className="checkout-copy">Payments stay inside Hull Eats. Dojo card payment will be embedded here when the live credentials are connected.</p>
            </div>
          </div>
          <div className="button-row">
            <button
              type="button"
              className={paymentMode === "cash_on_delivery" ? "primary-button gold-button" : "glass-button"}
              onClick={() => setPaymentMode("cash_on_delivery")}
            >
              Pay cash on delivery
            </button>
            <button
              type="button"
              className={paymentMode === "dojo_card" ? "primary-button" : "glass-button"}
              onClick={() => setPaymentMode("dojo_card")}
            >
              Pay by card in app
            </button>
          </div>
          {paymentMode === "cash_on_delivery" ? (
            <div className="checkout-note">
              <strong>Cash order for testing</strong>
              <p>The order will go to the hub as cash on delivery, so drivers and owners can cash-up correctly.</p>
            </div>
          ) : (
            <div className="checkout-note">
              <strong>Dojo embedded payment ready</strong>
              <p>This section is reserved for the Dojo card component. It will not redirect to another URL once credentials are added.</p>
            </div>
          )}
        </section>

        <div className="button-row" style={{ marginTop: 18 }}>
          <button type="button" className="primary-button gold-button" onClick={handlePlaceOrder} disabled={isPlacingOrder || basketCount === 0}>
            {isPlacingOrder ? "Placing..." : paymentMode === "cash_on_delivery" ? "Place cash order" : "Continue to secure card payment"}
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

      {showClearBasketConfirm ? (
        <div className="confirmation-modal-backdrop" onClick={() => setShowClearBasketConfirm(false)}>
          <section className="confirmation-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="clear-basket-title">
            <p className="eyebrow">Clear basket</p>
            <h2 id="clear-basket-title">Remove all items?</h2>
            <p>This will remove every item currently in your order. You can add items again from the menu.</p>
            <div className="button-row">
              <button type="button" className="glass-button" onClick={() => setShowClearBasketConfirm(false)}>
                Keep basket
              </button>
              <button type="button" className="glass-button danger-button" onClick={confirmClearBasket}>
                Remove all items
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
