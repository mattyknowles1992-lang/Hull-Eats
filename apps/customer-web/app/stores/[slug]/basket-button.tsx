"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { StoreSummary } from "@hull-eats/types";
import { computeDeliveryQuote, DELIVERY_NOT_AVAILABLE_TO_POSTCODE_MESSAGE, normaliseDeliveryPricing } from "@hull-eats/types";

import { getBasketItemCount, getBasketSubtotal, loadBasket, type StoreBasket } from "../../../src/lib/basket";
import { getDeliveryPostcodeForStore } from "../../../src/lib/delivery-postcode";

type BasketButtonProps = {
  store: StoreSummary;
};

const formatMoney = (value: number) => `£${value.toFixed(2)}`;

export function BasketButton({ store }: BasketButtonProps) {
  const [basket, setBasket] = useState<StoreBasket | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const [savedPostcode, setSavedPostcode] = useState("");
  const previousItemCountRef = useRef(0);

  useEffect(() => {
    const syncPostcode = () => setSavedPostcode(getDeliveryPostcodeForStore(store.slug));
    syncPostcode();
    window.addEventListener("hull-eats-delivery-postcode-updated", syncPostcode as EventListener);
    return () => window.removeEventListener("hull-eats-delivery-postcode-updated", syncPostcode as EventListener);
  }, [store.slug]);

  useEffect(() => {
    let timeoutId: number | undefined;
    const sync = () => {
      const nextBasket = loadBasket(store.slug);
      const nextItemCount = getBasketItemCount(nextBasket);

      if (nextItemCount > previousItemCountRef.current) {
        setJustUpdated(true);
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => setJustUpdated(false), 1200);
      }

      previousItemCountRef.current = nextItemCount;
      setBasket(nextBasket);
    };

    sync();
    window.addEventListener("hull-eats-basket-updated", sync as EventListener);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("hull-eats-basket-updated", sync as EventListener);
      window.removeEventListener("storage", sync);
      window.clearTimeout(timeoutId);
    };
  }, [store.slug]);

  const itemCount = getBasketItemCount(basket);
  const subtotal = getBasketSubtotal(basket);

  const deliveryQuote = useMemo(
    () =>
      computeDeliveryQuote({
        fulfillmentType: "delivery",
        storeBasePostcode: store.postcode,
        legacyDeliveryFee: store.deliveryFee,
        pricing: store.deliveryPricing ? normaliseDeliveryPricing(store.deliveryPricing) : null,
        customerPostcode: savedPostcode || undefined,
      }),
    [store, savedPostcode],
  );

  const deliveryLine = useMemo(() => {
    if (itemCount === 0) {
      return null;
    }

    if (deliveryQuote.blocked) {
      return <span className="basket-delivery-hint">{deliveryQuote.reason ?? DELIVERY_NOT_AVAILABLE_TO_POSTCODE_MESSAGE}</span>;
    }

    const fee = deliveryQuote.fee;
    const total = Number((subtotal + fee).toFixed(2));
    const estimate = deliveryQuote.needsPostcode ? "est. " : "";

    return (
      <span className="basket-delivery-hint">
        {estimate}
        {formatMoney(fee)} delivery · {formatMoney(total)} total
      </span>
    );
  }, [deliveryQuote, itemCount, subtotal]);

  return (
    <Link href={`/checkout/${store.slug}`} className={`basket-topbar-button${itemCount > 0 ? " has-items" : ""}${justUpdated ? " just-updated" : ""}`}>
      <span>Basket</span>
      {itemCount > 0 ? (
        <strong>
          {itemCount} / {formatMoney(subtotal)}
          {deliveryLine ? (
            <>
              <br />
              {deliveryLine}
            </>
          ) : null}
        </strong>
      ) : (
        <strong>Empty</strong>
      )}
    </Link>
  );
}
