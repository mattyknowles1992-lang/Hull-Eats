import type { MenuItem, OrderSummary, StoreSummary } from "@hull-eats/types";
import { loadedMunchMenuItems, loadedMunchMenuSections, loadedMunchStore, type DemoMenuSection } from "@hull-eats/sdk";

export const demoStores: StoreSummary[] = [
  loadedMunchStore,
];

export const demoMenuByStore: Record<string, MenuItem[]> = {
  "loaded-munch-hull": loadedMunchMenuItems,
};

export const demoMenuSectionsByStore: Record<string, DemoMenuSection[]> = {
  "loaded-munch-hull": loadedMunchMenuSections,
};

export const demoOrders: OrderSummary[] = [
  {
    id: "order_HE_0998",
    orderNumber: "HE-0998",
    storeId: loadedMunchStore.id,
    status: "preparing",
    paymentStatus: "paid",
    paymentMethod: "dojo_card",
    fulfillmentType: "delivery",
    source: "web",
    totalAmount: 27.97,
    currency: "GBP",
    placedAt: new Date().toISOString(),
    prepTimeMinutes: 18,
  },
  {
    id: "order_HE_1001",
    orderNumber: "HE-1001",
    storeId: loadedMunchStore.id,
    status: "pending",
    paymentStatus: "paid",
    paymentMethod: "dojo_card",
    fulfillmentType: "delivery",
    source: "web",
    totalAmount: 14.49,
    currency: "GBP",
    placedAt: new Date().toISOString(),
    prepTimeMinutes: null,
  },
  {
    id: "order_HE_1002",
    orderNumber: "HE-1002",
    storeId: loadedMunchStore.id,
    status: "assigned",
    paymentStatus: "paid",
    paymentMethod: "dojo_card",
    fulfillmentType: "delivery",
    source: "ios_app",
    totalAmount: 24.98,
    currency: "GBP",
    placedAt: new Date().toISOString(),
    prepTimeMinutes: 18,
  },
];
