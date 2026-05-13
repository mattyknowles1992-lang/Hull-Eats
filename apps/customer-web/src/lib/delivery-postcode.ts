const deliveryPostcodeStorageKey = (storeSlug: string) => `hull-eats:delivery-postcode:${storeSlug}`;

const isBrowser = () => typeof window !== "undefined";

export const getDeliveryPostcodeForStore = (storeSlug: string): string => {
  if (!isBrowser()) {
    return "";
  }

  try {
    return window.localStorage.getItem(deliveryPostcodeStorageKey(storeSlug))?.trim() ?? "";
  } catch {
    return "";
  }
};

export const setDeliveryPostcodeForStore = (storeSlug: string, postcode: string) => {
  if (!isBrowser()) {
    return;
  }

  try {
    const trimmed = postcode.trim();
    if (!trimmed) {
      window.localStorage.removeItem(deliveryPostcodeStorageKey(storeSlug));
    } else {
      window.localStorage.setItem(deliveryPostcodeStorageKey(storeSlug), trimmed);
    }
    window.dispatchEvent(new CustomEvent("hull-eats-delivery-postcode-updated", { detail: { storeSlug } }));
  } catch {
    // ignore quota / private mode
  }
};
