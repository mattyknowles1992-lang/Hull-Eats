import { z } from "zod";

import { createOrderInputSchema, fulfillmentTypeSchema, orderSourceSchema } from "./orders";

export const checkoutSessionStatuses = [
  "draft",
  "address_pending",
  "pricing_pending",
  "payment_pending",
  "ready_to_place",
  "completed",
  "expired",
] as const;

export type CheckoutSessionStatus = (typeof checkoutSessionStatuses)[number];

export const checkoutSessionStatusSchema = z.enum(checkoutSessionStatuses);

export const createCheckoutSessionInputSchema = z.object({
  storeId: z.string().min(1),
  source: orderSourceSchema.default("web"),
  fulfillmentType: fulfillmentTypeSchema.default("delivery"),
  customerAddressId: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
});

export const checkoutSessionSchema = z.object({
  id: z.string().min(1),
  storeId: z.string().min(1),
  source: orderSourceSchema,
  fulfillmentType: fulfillmentTypeSchema,
  status: checkoutSessionStatusSchema,
  customerAddressId: z.string().min(1).optional(),
  subtotalAmount: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  currency: z.string().length(3),
  canPlaceOrder: z.boolean(),
  menuSetupComplete: z.boolean(),
});

export const placeOrderFromCheckoutInputSchema = createOrderInputSchema.extend({
  checkoutSessionId: z.string().min(1),
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionInputSchema>;
export type CheckoutSession = z.infer<typeof checkoutSessionSchema>;
export type PlaceOrderFromCheckoutInput = z.infer<typeof placeOrderFromCheckoutInputSchema>;

