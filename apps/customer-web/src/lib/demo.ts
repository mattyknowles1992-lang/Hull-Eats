import type { MenuItem, OrderSummary, StoreSummary } from "@hull-eats/types";
import { loadedMunchMenuItems, loadedMunchMenuSections, loadedMunchStore } from "@hull-eats/sdk";

type StoreMenuDemo = {
  headline: string;
  categories: Array<{
    id: string;
    name: string;
    description?: string;
    items: MenuItem[];
  }>;
  items: MenuItem[];
};

export const featuredStores: StoreSummary[] = [
  loadedMunchStore,
];

export const storeMenus: Record<string, StoreMenuDemo> = {
  "loaded-munch-hull": {
    headline:
      "Loaded Munch is set up as a live partner hub with a seeded menu so Hull Eats can launch from a real takeaway base while future menu edits still belong in the merchant portal.",
    categories: loadedMunchMenuSections,
    items: loadedMunchMenuItems,
  },
};

export const trackedOrder: OrderSummary = {
  id: "order_HE_1002",
  orderNumber: "HE-1002",
  storeId: loadedMunchStore.id,
  status: "assigned",
  paymentStatus: "paid",
  fulfillmentType: "delivery",
  source: "ios_app",
  totalAmount: 24.98,
  currency: "GBP",
  placedAt: new Date().toISOString(),
  prepTimeMinutes: 18,
};
