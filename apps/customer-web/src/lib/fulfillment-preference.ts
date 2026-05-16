export type FulfillmentPreference = "delivery" | "pickup";

const storageKey = (storeSlug: string) => `hull-eats-fulfillment:${storeSlug}`;

export const getFulfillmentForStore = (storeSlug: string): FulfillmentPreference => {
  if (typeof window === "undefined") {
    return "delivery";
  }

  const saved = window.localStorage.getItem(storageKey(storeSlug));
  return saved === "pickup" ? "pickup" : "delivery";
};

export const setFulfillmentForStore = (storeSlug: string, value: FulfillmentPreference) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(storeSlug), value);
  window.dispatchEvent(new CustomEvent("hull-eats-fulfillment-updated", { detail: { storeSlug, value } }));
};

export const parseFulfillmentPreference = (value: string | null | undefined): FulfillmentPreference =>
  value === "pickup" ? "pickup" : "delivery";
