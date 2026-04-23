import { Body, Controller, Headers, Post } from "@nestjs/common";

import { createPaymentIntentInputSchema, paymentRecordSchema } from "@hull-eats/types";

@Controller("payments")
export class PaymentsController {
  @Post("intents")
  createPaymentIntent(@Body() body: unknown) {
    const input = createPaymentIntentInputSchema.parse(body);

    return paymentRecordSchema.parse({
      id: `payment_${Date.now()}`,
      orderId: input.orderId,
      provider: "stripe",
      status: "requires_confirmation",
      methodType: "card",
      amount: 15.49,
      currency: "GBP",
      stripeCustomerId: input.customerProfileId ? "cus_demo_customer" : undefined,
      stripePaymentIntentId: `pi_${Date.now()}`,
      clientSecret: "pi_demo_secret",
    });
  }

  @Post("webhooks/stripe")
  handleStripeWebhook(@Headers("stripe-signature") signature: string | undefined) {
    return {
      received: true,
      provider: "stripe",
      signaturePresent: Boolean(signature),
    };
  }
}
