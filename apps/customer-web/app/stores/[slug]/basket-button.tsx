"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getBasketItemCount, getBasketSubtotal, loadBasket, type StoreBasket } from "../../../src/lib/basket";

type BasketButtonProps = {
  storeSlug: string;
};

const formatMoney = (value: number) => `£${value.toFixed(2)}`;

export function BasketButton({ storeSlug }: BasketButtonProps) {
  const [basket, setBasket] = useState<StoreBasket | null>(null);

  useEffect(() => {
    const sync = () => setBasket(loadBasket(storeSlug));

    sync();
    window.addEventListener("hull-eats-basket-updated", sync as EventListener);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("hull-eats-basket-updated", sync as EventListener);
      window.removeEventListener("storage", sync);
    };
  }, [storeSlug]);

  const itemCount = getBasketItemCount(basket);
  const subtotal = getBasketSubtotal(basket);

  return (
    <Link href={`/checkout/${storeSlug}`} className={`basket-topbar-button${itemCount > 0 ? " has-items" : ""}`}>
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
