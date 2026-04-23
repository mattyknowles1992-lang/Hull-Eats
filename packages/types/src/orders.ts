import { z } from "zod";

export const orderStatuses = [
  "pending",
  "accepted",
  "rejected",
  "preparing",
  "ready_for_dispatch",
  "assigned",
  "courier_accepted",
  "picked_up",
  "delivered",
  "cancelled",
] as const;

export const deliveryStatuses = [
  "unassigned",
  "assigned",
  "accepted",
  "picked_up",
  "delivered",
  "failed",
] as const;

export const paymentStatuses = [
  "pending",
  "authorized",
  "paid",
  "failed",
  "refunded",
] as const;

export const fulfillmentTypes = ["delivery", "pickup"] as const;
export const orderSources = ["web", "ios_app", "android_app", "admin_portal"] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type DeliveryStatus = (typeof deliveryStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type FulfillmentType = (typeof fulfillmentTypes)[number];
export type OrderSource = (typeof orderSources)[number];

export const orderStatusSchema = z.enum(orderStatuses);
export const deliveryStatusSchema = z.enum(deliveryStatuses);
export const paymentStatusSchema = z.enum(paymentStatuses);
export const fulfillmentTypeSchema = z.enum(fulfillmentTypes);
export const orderSourceSchema = z.enum(orderSources);

export const orderLineInputSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().positive(),
  notes: z.string().max(280).optional(),
});

export const createOrderInputSchema = z.object({
  storeId: z.string().min(1),
  fulfillmentType: fulfillmentTypeSchema,
  source: orderSourceSchema.default("web"),
  customerAddressId: z.string().min(1).optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional(),
  deliveryZoneId: z.string().min(1).optional(),
  addressLine1: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  postcode: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(orderLineInputSchema).min(1),
});

export const merchantAcceptOrderSchema = z.object({
  prepTimeMinutes: z.number().int().min(1).max(180),
});

export const merchantRejectOrderSchema = z.object({
  reason: z.string().min(1).max(280),
});

export const manualDriverAssignmentSchema = z.object({
  courierProfileId: z.string().min(1),
});

export const orderSummarySchema = z.object({
  id: z.string().min(1),
  orderNumber: z.string().min(1),
  storeId: z.string().min(1),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  fulfillmentType: fulfillmentTypeSchema,
  source: orderSourceSchema.default("web"),
  totalAmount: z.number().nonnegative(),
  currency: z.string().length(3),
  placedAt: z.string().datetime(),
  prepTimeMinutes: z.number().int().nullable(),
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type MerchantAcceptOrderInput = z.infer<typeof merchantAcceptOrderSchema>;
export type MerchantRejectOrderInput = z.infer<typeof merchantRejectOrderSchema>;
export type ManualDriverAssignmentInput = z.infer<typeof manualDriverAssignmentSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
