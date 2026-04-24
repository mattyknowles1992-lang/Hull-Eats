"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { MenuItem } from "@hull-eats/types";

import { addItemToBasket, getBasketItemCount, getBasketSubtotal, loadBasket, type StoreBasket } from "../../../src/lib/basket";

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

export function StoreMenuClient({ storeId, storeSlug, storeName, categories }: StoreMenuClientProps) {
  const [basket, setBasket] = useState<StoreBasket | null>(null);

  useEffect(() => {
    const sync = () => setBasket(loadBasket(storeSlug));

    sync();
    window.addEventListener("hull-eats-basket-updated", sync as EventListener);

    return () => {
      window.removeEventListener("hull-eats-basket-updated", sync as EventListener);
    };
  }, [storeSlug]);

  const itemCount = getBasketItemCount(basket);
  const subtotal = getBasketSubtotal(basket);

  return (
    <div className="menu-section-stack">
      {itemCount > 0 ? (
        <section className="basket-banner">
          <div>
            <p className="eyebrow">Basket ready</p>
            <h3>
              {itemCount} item{itemCount === 1 ? "" : "s"} / GBP {subtotal.toFixed(2)}
            </h3>
          </div>
          <Link href={`/checkout/${storeSlug}`} className="primary-button">
            Go to checkout
          </Link>
        </section>
      ) : null}

      {categories.map((category) => (
        <section key={category.id} className="menu-section-card">
          <div className="menu-section-header">
            <div>
              <p className="eyebrow">{storeName}</p>
              <h3>{category.name}</h3>
            </div>
            <span className="store-tag">{category.items.length} items</span>
          </div>
          {category.description ? <p className="menu-section-copy">{category.description}</p> : null}

          <div className="menu-item-grid">
            {category.items.map((item) => (
              <article key={item.id} className="menu-item-card">
                <div className="menu-item-top">
                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                  </div>
                  <strong>GBP {item.price.toFixed(2)}</strong>
                </div>
                <div className="menu-item-footer">
                  <button
                    type="button"
                    className="glass-button"
                    onClick={() =>
                      addItemToBasket(
                        {
                          storeId,
                          storeSlug,
                          storeName,
                        },
                        item,
                      )
                    }
                  >
                    Add
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
