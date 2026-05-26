import type { OrderSummary, StoreSummary } from "@hull-eats/types";

const retiredDemoStoreId = "store_demo_retired";

export const demoStores: StoreSummary[] = [];

export const demoOrders: OrderSummary[] = [
  {
    id: "order_HE_0998",
    orderNumber: "HE-0998",
    storeId: retiredDemoStoreId,
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
    storeId: retiredDemoStoreId,
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
    storeId: retiredDemoStoreId,
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
