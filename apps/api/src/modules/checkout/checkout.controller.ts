import { Body, Controller, Param, Post } from "@nestjs/common";

import { createCheckoutSessionInputSchema, placeOrderFromCheckoutInputSchema } from "@hull-eats/types";

import {
  createStoredCheckoutSession,
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
  placeOrderFromCheckout(@Param("checkoutSessionId") checkoutSessionId: string, @Body() body: unknown) {
    const input = placeOrderFromCheckoutInputSchema.parse({
      ...(typeof body === "object" && body !== null ? body : {}),
      checkoutSessionId,
    });

    return {
      checkoutSessionId: input.checkoutSessionId,
      order: placeStoredCheckoutOrder(input.checkoutSessionId, {
        paymentStatus: input.paymentMode === "mock_paid" ? "paid" : "pending",
      }),
      paymentRequired: input.paymentMode !== "mock_paid",
      nextStep: input.paymentMode === "mock_paid" ? "order_received" : "stripe_payment_intent",
    };
  }
}
