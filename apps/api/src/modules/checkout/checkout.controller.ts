import { BadRequestException, Body, Controller, Param, Post } from "@nestjs/common";

import { createCheckoutSessionInputSchema, placeOrderFromCheckoutInputSchema } from "@hull-eats/types";

import {
  createStoredCheckoutSession,
  getStoredCheckoutSession,
  placeStoredCheckoutOrder,
  refreshStoredCheckoutSession,
} from "../../common/checkout-engine";

@Controller("checkout")
export class CheckoutController {
  @Post("sessions")
  createCheckoutSession(@Body() body: unknown) {
    const input = createCheckoutSessionInputSchema.parse(body);
    return createStoredCheckoutSession(input);
  }

  @Post("sessions/:checkoutSessionId/refresh")
  refreshCheckoutSession(@Param("checkoutSessionId") checkoutSessionId: string) {
    return refreshStoredCheckoutSession(checkoutSessionId);
  }

  @Post("sessions/:checkoutSessionId/place-order")
  async placeOrderFromCheckout(@Param("checkoutSessionId") checkoutSessionId: string, @Body() body: unknown) {
    const input = placeOrderFromCheckoutInputSchema.parse({
      ...(typeof body === "object" && body !== null ? body : {}),
      checkoutSessionId,
    });
    const session = getStoredCheckoutSession(input.checkoutSessionId);
    const isKioskMockPayment = input.paymentMode === "mock_paid" && session.source === "kiosk";
    const isCashOnDelivery = input.paymentMode === "cash_on_delivery";

    if (input.paymentMode === "mock_paid" && !isKioskMockPayment) {
      throw new BadRequestException("Mock-paid checkout is only available for kiosk orders.");
    }

    if (input.paymentMode === "dojo_card") {
      throw new BadRequestException("Dojo embedded payments are configured in checkout but credentials are not connected yet. Use cash on delivery for testing.");
    }

    return {
      checkoutSessionId: input.checkoutSessionId,
      order: await placeStoredCheckoutOrder(input.checkoutSessionId, {
        paymentStatus: isKioskMockPayment ? "paid" : "pending",
        paymentMethod: isCashOnDelivery ? "cash_on_delivery" : "dojo_card",
      }),
      paymentRequired: !isKioskMockPayment && !isCashOnDelivery,
      nextStep: isCashOnDelivery ? "cash_on_delivery" : isKioskMockPayment ? "order_received" : "dojo_embedded_payment",
    };
  }
}
