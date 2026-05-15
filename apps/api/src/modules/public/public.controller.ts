import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { createOrderInputSchema, customerCancelOrderInputSchema, orderSummarySchema } from "@hull-eats/types";

import { createStoredCheckoutSession } from "../../common/checkout-engine";
import { CustomerNotificationsService } from "../../common/customer-notifications.service";
import { findTrackedOrder } from "../../common/courier-delivery-store";
import { listLiveMarketplaceStores, resolveMarketplaceMenu, resolveMarketplaceStore } from "../../common/marketplace-catalog";
import { customerCancelOrderWithinGrace } from "../../common/order-repository";

@Controller("public")
export class PublicController {
  constructor(private readonly customerNotifications: CustomerNotificationsService) {}

  @Get("stores")
  async listStores() {
    return listLiveMarketplaceStores();
  }

  @Get("stores/:storeId")
  async getStore(@Param("storeId") storeId: string) {
    return resolveMarketplaceStore(storeId);
  }

  @Get("stores/:storeId/menu")
  async getStoreMenu(@Param("storeId") storeId: string) {
    const menu = await resolveMarketplaceMenu(storeId);
    return {
      storeId: menu.storeId,
      menuSetupComplete: menu.menuSetupComplete,
      onboardingMessage: menu.onboardingMessage,
      categories: menu.categories,
    };
  }

  @Get("stores/:storeId/categories")
  async getStoreCategories(@Param("storeId") storeId: string) {
    const menu = await resolveMarketplaceMenu(storeId);
    return menu.categories.map((category) => ({
      id: category.id,
      name: category.name,
      itemCount: category.items.length,
    }));
  }

  @Get("stores/:storeId/items")
  async getStoreItems(@Param("storeId") storeId: string) {
    const menu = await resolveMarketplaceMenu(storeId);
    return menu.categories.flatMap((category) => category.items);
  }

  @Post("orders/quote")
  async quoteOrder(@Body() body: unknown) {
    const input = createOrderInputSchema.parse(body);
    const session = await createStoredCheckoutSession({
      storeId: input.storeId,
      source: input.source,
      fulfillmentType: input.fulfillmentType,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      customerProfileId: input.customerProfileId,
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
  async createOrder(@Body() body: unknown) {
    const input = createOrderInputSchema.parse(body);
    const session = await createStoredCheckoutSession({
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
      customerProfileId: input.customerProfileId,
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: "cash_on_delivery",
      fulfillmentType: input.fulfillmentType,
      source: input.source,
      totalAmount: session.totalAmount,
      currency: session.currency,
      placedAt: new Date().toISOString(),
      prepTimeMinutes: null,
    });
  }

  @Post("orders/cancel")
  cancelOrderWithinGrace(@Body() body: unknown) {
    const input = customerCancelOrderInputSchema.parse(body);
    return customerCancelOrderWithinGrace(input);
  }

  @Get("orders/:orderId/track")
  trackOrder(@Param("orderId") orderId: string) {
    return findTrackedOrder(orderId);
  }

  @Post("notifications/push-tokens")
  registerPushToken(@Body() body: unknown) {
    const input = body as {
      token?: string;
      platform?: string;
      orderId?: string;
      orderNumber?: string;
      customerEmail?: string;
      customerPhone?: string;
      customerProfileId?: string;
    };

    return this.customerNotifications.registerPushToken(input);
  }
}
