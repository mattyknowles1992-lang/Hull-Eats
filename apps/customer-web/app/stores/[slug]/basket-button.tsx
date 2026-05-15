"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { StoreSummary } from "@hull-eats/types";

import { getBasketItemCount, getBasketSubtotal, loadBasket, type StoreBasket } from "../../../src/lib/basket";

type BasketButtonProps = {
  store: StoreSummary;
};

const formatMoney = (value: number) => `£${value.toFixed(2)}`;

export function BasketButton({ store }: BasketButtonProps) {
  const [basket, setBasket] = useState<StoreBasket | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const previousItemCountRef = useRef(0);

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

  return (
    <Link href={`/checkout/${store.slug}`} className={`basket-topbar-button${itemCount > 0 ? " has-items" : ""}${justUpdated ? " just-updated" : ""}`}>
      <span>Basket</span>
      {itemCount > 0 ? (
        <strong>
          {itemCount} / {formatMoney(subtotal)}
        </strong>
      ) : (
        <strong>Empty</strong>
      )}
    </Link>
  );
}
