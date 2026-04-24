import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { createOrderInputSchema, orderSummarySchema } from "@hull-eats/types";

import { createStoredCheckoutSession } from "../../common/checkout-engine";
import { demoMenuByStore, demoMenuSectionsByStore, demoOrders, demoStores } from "../../common/demo-data";

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
    const sections = demoMenuSectionsByStore[key] ?? [];

    return {
      storeId: key,
      menuSetupComplete: store.menuSetupComplete,
      onboardingMessage: store.onboardingMessage,
      categories:
        sections.length > 0
          ? sections.map((section: (typeof sections)[number]) => ({
              id: section.id,
              name: section.name,
              description: section.description,
              items: section.items,
            }))
          : items.length > 0
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
    return this.getStoreMenu(storeId).categories.map((category: (ReturnType<PublicController["getStoreMenu"]>["categories"])[number]) => ({
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
    const session = createStoredCheckoutSession({
      storeId: input.storeId,
      source: input.source,
      fulfillmentType: input.fulfillmentType,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      customerAddressId: input.customerAddressId,
      addressLine1: input.addressLine1,
      city: input.city,
      postcode: input.postcode,
      notes: input.notes,
      items: input.items,
    });

    return {
      storeId: input.storeId,
      itemCount: session.itemCount,
      subtotalAmount: session.subtotalAmount,
      deliveryFee: session.deliveryFee,
      totalAmount: session.totalAmount,
      currency: session.currency,
      minimumOrderAmount: session.minimumOrderAmount,
      isMinimumOrderMet: session.isMinimumOrderMet,
      canPlaceOrder: session.canPlaceOrder,
    };
  }

  @Post("orders")
  createOrder(@Body() body: unknown) {
    const input = createOrderInputSchema.parse(body);
    const session = createStoredCheckoutSession({
      storeId: input.storeId,
      source: input.source,
      fulfillmentType: input.fulfillmentType,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      customerAddressId: input.customerAddressId,
      addressLine1: input.addressLine1,
      city: input.city,
      postcode: input.postcode,
      notes: input.notes,
      items: input.items,
    });

    return orderSummarySchema.parse({
      id: `order_${Date.now()}`,
      orderNumber: `HE-${Math.floor(Math.random() * 9000) + 1000}`,
      storeId: input.storeId,
      status: "pending",
      paymentStatus: "pending",
      fulfillmentType: input.fulfillmentType,
      source: input.source,
      totalAmount: session.totalAmount,
      currency: session.currency,
      placedAt: new Date().toISOString(),
      prepTimeMinutes: null,
    });
  }

  @Get("orders/:orderId/track")
  trackOrder(@Param("orderId") orderId: string) {
    return demoOrders.find((order) => order.id === orderId || order.orderNumber === orderId) ?? demoOrders[0];
  }
}
