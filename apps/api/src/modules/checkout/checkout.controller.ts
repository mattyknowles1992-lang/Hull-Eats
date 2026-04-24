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
      order: placeStoredCheckoutOrder(input.checkoutSessionId),
      paymentRequired: true,
      nextStep: "stripe_payment_intent",
    };
  }
}
