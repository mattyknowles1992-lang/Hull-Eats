import { z } from "zod";

export const paymentProviders = ["stripe"] as const;
export const paymentMethodTypes = ["card", "apple_pay", "google_pay"] as const;
export const paymentRecordStatuses = [
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "processing",
  "succeeded",
  "canceled",
  "failed",
  "refunded",
] as const;

export type PaymentProvider = (typeof paymentProviders)[number];
export type PaymentMethodType = (typeof paymentMethodTypes)[number];
export type PaymentRecordStatus = (typeof paymentRecordStatuses)[number];

export const paymentProviderSchema = z.enum(paymentProviders);
export const paymentMethodTypeSchema = z.enum(paymentMethodTypes);
export const paymentRecordStatusSchema = z.enum(paymentRecordStatuses);

export const createPaymentIntentInputSchema = z.object({
  orderId: z.string().min(1),
  customerProfileId: z.string().min(1).optional(),
});

export const paymentRecordSchema = z.object({
  id: z.string().min(1),
  orderId: z.string().min(1),
  provider: paymentProviderSchema,
  status: paymentRecordStatusSchema,
  methodType: paymentMethodTypeSchema.optional(),
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  stripeCustomerId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  clientSecret: z.string().optional(),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentInputSchema>;
export type PaymentRecord = z.infer<typeof paymentRecordSchema>;

