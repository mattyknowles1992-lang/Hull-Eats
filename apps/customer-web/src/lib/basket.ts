import type { MenuItem } from "@hull-eats/types";

export type BasketLine = {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type StoreBasket = {
  storeId: string;
  storeSlug: string;
  storeName: string;
  items: BasketLine[];
};

const basketKey = (storeSlug: string) => `hull-eats:basket:${storeSlug}`;

const isBrowser = () => typeof window !== "undefined";

const emitBasketUpdate = (storeSlug: string) => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent("hull-eats-basket-updated", { detail: { storeSlug } }));
};

export const loadBasket = (storeSlug: string): StoreBasket | null => {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(basketKey(storeSlug));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoreBasket;
  } catch {
    return null;
  }
};

export const saveBasket = (basket: StoreBasket) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(basketKey(basket.storeSlug), JSON.stringify(basket));
  emitBasketUpdate(basket.storeSlug);
};

export const clearBasket = (storeSlug: string) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(basketKey(storeSlug));
  emitBasketUpdate(storeSlug);
};

export const addItemToBasket = (
  store: Pick<StoreBasket, "storeId" | "storeSlug" | "storeName">,
  item: Pick<MenuItem, "id" | "name" | "price">,
) => {
  const current =
    loadBasket(store.storeSlug) ?? {
      ...store,
      items: [],
    };

  const existing = current.items.find((entry) => entry.menuItemId === item.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    current.items.push({
      menuItemId: item.id,
      name: item.name,
      quantity: 1,
      unitPrice: item.price,
    });
  }

  saveBasket(current);
};

export const updateBasketQuantity = (storeSlug: string, menuItemId: string, quantity: number) => {
  const current = loadBasket(storeSlug);

  if (!current) {
    return;
  }

  current.items = current.items
    .map((entry) => (entry.menuItemId === menuItemId ? { ...entry, quantity } : entry))
    .filter((entry) => entry.quantity > 0);

  saveBasket(current);
};

export const getBasketItemCount = (basket: StoreBasket | null) =>
  basket?.items.reduce((count, entry) => count + entry.quantity, 0) ?? 0;

export const getBasketSubtotal = (basket: StoreBasket | null) =>
  Number((basket?.items.reduce((sum, entry) => sum + entry.unitPrice * entry.quantity, 0) ?? 0).toFixed(2));
