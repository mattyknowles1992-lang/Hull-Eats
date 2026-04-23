import { Body, Controller, Param, Post } from "@nestjs/common";

import { checkoutSessionSchema, createCheckoutSessionInputSchema } from "@hull-eats/types";

import { demoStores } from "../../common/demo-data";

@Controller("checkout")
export class CheckoutController {
  @Post("sessions")
  createCheckoutSession(@Body() body: unknown) {
    const input = createCheckoutSessionInputSchema.parse(body);
    const store = demoStores.find((entry) => entry.id === input.storeId || entry.slug === input.storeId) ?? demoStores[0]!;

    return checkoutSessionSchema.parse({
      id: `checkout_${Date.now()}`,
      storeId: store.id,
      source: input.source,
      fulfillmentType: input.fulfillmentType,
      status: input.customerAddressId ? "pricing_pending" : "address_pending",
      customerAddressId: input.customerAddressId,
      subtotalAmount: 0,
      deliveryFee: Number(store.deliveryFee ?? 0),
      totalAmount: Number(store.deliveryFee ?? 0),
      currency: "GBP",
      canPlaceOrder: false,
      menuSetupComplete: store.menuSetupComplete,
    });
  }

  @Post("sessions/:checkoutSessionId/refresh")
  refreshCheckoutSession(@Param("checkoutSessionId") checkoutSessionId: string) {
    return {
      checkoutSessionId,
      status: "pricing_pending",
      message: "Checkout pricing refresh placeholder. Real stock and pricing logic will attach here next.",
    };
  }
}

