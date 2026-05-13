import { z } from "zod";

import {
  fulfillmentTypeSchema,
  orderLineComponentSnapshotSchema,
  orderLineInputSchema,
  orderLineRemovedComponentSchema,
  orderLineSelectedOptionSchema,
  orderPaymentMethodSchema,
  orderSourceSchema,
} from "./orders";

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
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional(),
  customerProfileId: z.string().min(1).optional(),
  customerAddressId: z.string().min(1).optional(),
  addressLine1: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  postcode: z.string().min(1).optional(),
  promoCode: z.string().max(64).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(orderLineInputSchema).min(1),
});

export const checkoutSessionLineSchema = z.object({
  lineId: z.string().min(1),
  menuItemId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  customisationTotal: z.number(),
  lineTotal: z.number().nonnegative(),
  requiresIdVerification: z.boolean().default(false),
  notes: z.string().max(280).optional(),
  components: z.array(orderLineComponentSnapshotSchema).default([]),
  removedComponents: z.array(orderLineRemovedComponentSchema).default([]),
  selectedOptions: z.array(orderLineSelectedOptionSchema).default([]),
});

export const checkoutSessionSchema = z.object({
  id: z.string().min(1),
  storeId: z.string().min(1),
  storeName: z.string().min(1),
  source: orderSourceSchema,
  fulfillmentType: fulfillmentTypeSchema,
  status: checkoutSessionStatusSchema,
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional(),
  customerProfileId: z.string().min(1).optional(),
  customerAddressId: z.string().min(1).optional(),
  addressLine1: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  postcode: z.string().min(1).optional(),
  promoCode: z.string().max(64).optional(),
  notes: z.string().max(500).optional(),
  lineItems: z.array(checkoutSessionLineSchema),
  itemCount: z.number().int().nonnegative(),
  subtotalAmount: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  /** True when delivery fee is a preview until the customer postcode is confirmed. */
  deliveryFeeIsEstimate: z.boolean().optional(),
  /** Set when delivery cannot be offered to the supplied address. */
  deliveryWarning: z.string().optional(),
  totalAmount: z.number().nonnegative(),
  currency: z.string().length(3),
  canPlaceOrder: z.boolean(),
  menuSetupComplete: z.boolean(),
  minimumOrderAmount: z.number().nonnegative(),
  isMinimumOrderMet: z.boolean(),
  availablePaymentMethods: z.array(orderPaymentMethodSchema).default(["dojo_card", "cash_on_delivery"]),
});

export const placeOrderFromCheckoutInputSchema = z.object({
  checkoutSessionId: z.string().min(1),
  paymentMode: z.enum(["dojo_card", "cash_on_delivery", "mock_paid"]).default("dojo_card"),
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionInputSchema>;
export type CheckoutSession = z.infer<typeof checkoutSessionSchema>;
export type CheckoutSessionLine = z.infer<typeof checkoutSessionLineSchema>;
export type PlaceOrderFromCheckoutInput = z.infer<typeof placeOrderFromCheckoutInputSchema>;
