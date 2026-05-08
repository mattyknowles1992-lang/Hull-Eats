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

    if (input.paymentMode === "mock_paid" && !isKioskMockPayment) {
      throw new BadRequestException("Mock-paid checkout is only available for kiosk orders.");
    }

    return {
      checkoutSessionId: input.checkoutSessionId,
      order: await placeStoredCheckoutOrder(input.checkoutSessionId, {
        paymentStatus: isKioskMockPayment ? "paid" : "pending",
      }),
      paymentRequired: !isKioskMockPayment,
      nextStep: isKioskMockPayment ? "order_received" : "stripe_payment_intent",
    };
  }
}
