import type { StoreSummary } from "@hull-eats/types";

export const formatStoreAddress = (store: Pick<StoreSummary, "addressLine1" | "addressLine2" | "city" | "postcode">) => {
  const parts = [store.addressLine1, store.addressLine2, store.city, store.postcode].filter(
    (part): part is string => Boolean(part?.trim()),
  );
  return parts.join(", ");
};
