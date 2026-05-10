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
      provider: "dojo",
      status: "requires_confirmation",
      methodType: "card",
      amount: 15.49,
      currency: "GBP",
      dojoCustomerId: input.customerProfileId ? "dojo_customer_pending_credentials" : undefined,
      dojoPaymentIntentId: `dojo_intent_${Date.now()}`,
      clientSecret: "dojo_credentials_pending",
    });
  }

  @Post("webhooks/dojo")
  handleDojoWebhook(@Headers("dojo-signature") signature: string | undefined) {
    return {
      received: true,
      provider: "dojo",
      signaturePresent: Boolean(signature),
    };
  }
}
