import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { createOrderInputSchema, orderSummarySchema } from "@hull-eats/types";

import { demoMenuByStore, demoOrders, demoStores } from "../../common/demo-data";

@Controller("public")
export class PublicController {
  @Get("stores")
  listStores() {
    return demoStores;
  }

  @Get("stores/:storeId")
  getStore(@Param("storeId") storeId: string) {
    return demoStores.find((store) => store.id === storeId || store.slug === storeId) ?? demoStores[0];
  }

  @Get("stores/:storeId/menu")
  getStoreMenu(@Param("storeId") storeId: string) {
    const store = demoStores.find((entry) => entry.id === storeId || entry.slug === storeId) ?? demoStores[0]!;
    const key = store.slug;
    const items = demoMenuByStore[key] ?? [];

    return {
      storeId: key,
      menuSetupComplete: store.menuSetupComplete,
      onboardingMessage: store.onboardingMessage,
      categories:
        items.length > 0
          ? [
              {
                id: "cat-primary",
                name: "Available now",
                items,
              },
            ]
          : [],
    };
  }

  @Get("stores/:storeId/categories")
  getStoreCategories(@Param("storeId") storeId: string) {
    return this.getStoreMenu(storeId).categories.map((category) => ({
      id: category.id,
      name: category.name,
      itemCount: category.items.length,
    }));
  }

  @Get("stores/:storeId/items")
  getStoreItems(@Param("storeId") storeId: string) {
    const key = demoStores.find((store) => store.id === storeId || store.slug === storeId)?.slug ?? "harbour-kitchen-hull";

    return demoMenuByStore[key] ?? [];
  }

  @Post("orders/quote")
  quoteOrder(@Body() body: unknown) {
    const input = createOrderInputSchema.parse(body);

    return {
      storeId: input.storeId,
      itemCount: input.items.length,
      subtotalAmount: 12.5,
      deliveryFee: input.fulfillmentType === "delivery" ? 2.99 : 0,
      totalAmount: input.fulfillmentType === "delivery" ? 15.49 : 12.5,
      currency: "GBP",
    };
  }

  @Post("orders")
  createOrder(@Body() body: unknown) {
    const input = createOrderInputSchema.parse(body);

    return orderSummarySchema.parse({
      id: `order_${Date.now()}`,
      orderNumber: `HE-${Math.floor(Math.random() * 9000) + 1000}`,
      storeId: input.storeId,
      status: "pending",
      paymentStatus: "paid",
      fulfillmentType: input.fulfillmentType,
      source: input.source,
      totalAmount: 15.49,
      currency: "GBP",
      placedAt: new Date().toISOString(),
      prepTimeMinutes: null,
    });
  }

  @Get("orders/:orderId/track")
  trackOrder(@Param("orderId") orderId: string) {
    return demoOrders.find((order) => order.id === orderId || order.orderNumber === orderId) ?? demoOrders[0];
  }
}
