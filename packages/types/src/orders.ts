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

export const orderPaymentMethods = [
  "dojo_card",
  "cash_on_delivery",
  "manual_invoice",
] as const;

export const fulfillmentTypes = ["delivery", "pickup"] as const;
export const orderSources = ["web", "ios_app", "android_app", "admin_portal", "kiosk"] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type DeliveryStatus = (typeof deliveryStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type OrderPaymentMethod = (typeof orderPaymentMethods)[number];
export type FulfillmentType = (typeof fulfillmentTypes)[number];
export type OrderSource = (typeof orderSources)[number];

export const orderStatusSchema = z.enum(orderStatuses);
export const deliveryStatusSchema = z.enum(deliveryStatuses);
export const paymentStatusSchema = z.enum(paymentStatuses);
export const orderPaymentMethodSchema = z.enum(orderPaymentMethods);
export const fulfillmentTypeSchema = z.enum(fulfillmentTypes);
export const orderSourceSchema = z.enum(orderSources);

export const orderLineInputSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().positive(),
  notes: z.string().max(280).optional(),
  removedComponentIds: z.array(z.string().min(1)).default([]),
  selectedOptionQuantities: z.record(z.string(), z.number().int().positive()).default({}),
});

export const orderLineRemovedComponentSchema = z.object({
  componentId: z.string().min(1),
  label: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const orderLineSelectedOptionSchema = z.object({
  groupId: z.string().min(1),
  groupName: z.string().min(1),
  valueId: z.string().min(1),
  valueName: z.string().min(1),
  quantity: z.number().int().positive(),
  priceDelta: z.number(),
});

export const orderLineComponentSnapshotSchema = z.object({
  componentId: z.string().min(1),
  label: z.string().min(1),
  quantity: z.number().int().positive(),
  removed: z.boolean().default(false),
});

export const createOrderInputSchema = z.object({
  storeId: z.string().min(1),
  fulfillmentType: fulfillmentTypeSchema,
  source: orderSourceSchema.default("web"),
  customerAddressId: z.string().min(1).optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional(),
  customerProfileId: z.string().min(1).optional(),
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
  paymentMethod: orderPaymentMethodSchema.default("dojo_card"),
  totalAmount: z.number().nonnegative(),
  currency: z.string().length(3),
  placedAt: z.string().datetime(),
  prepTimeMinutes: z.number().int().nullable(),
});

/** Line items included on the public track-order payload for customer receipts. */
export const trackedOrderLineItemSchema = z.object({
  id: z.string().min(1).optional(),
  menuItemId: z.string().min(1).nullable().optional(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  notes: z.string().max(500).nullable().optional(),
});

export const courierLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracyMeters: z.number().nonnegative().optional(),
  heading: z.number().optional(),
  updatedAt: z.string().datetime(),
});

export const courierDeliverySchema = z.object({
  deliveryId: z.string().min(1),
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  status: deliveryStatusSchema,
  storeName: z.string().min(1),
  pickupAddress: z.string().min(1),
  dropoffAddress: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  confirmationCode: z.string().min(4).max(8),
  navigationUrl: z.string().url(),
  courierName: z.string().min(1).optional(),
  courierRating: z.number().optional(),
  startedAt: z.string().datetime().optional(),
  pickedUpAt: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional(),
  courierLocation: courierLocationSchema.optional(),
});

export const courierStartDeliveryInputSchema = z.object({
  scanCode: z.string().min(1).optional(),
  orderNumber: z.string().min(1).optional(),
  driverId: z.string().min(1).optional(),
}).refine((input) => input.scanCode || input.orderNumber, {
  message: "Scan code or order number is required.",
});

export const courierLocationInputSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracyMeters: z.number().nonnegative().optional(),
  heading: z.number().optional(),
});

export const courierCompleteDeliveryInputSchema = z.object({
  confirmationCode: z.string().min(4).max(8),
});

export const trackedOrderSchema = orderSummarySchema.extend({
  delivery: courierDeliverySchema.optional(),
  items: z.array(trackedOrderLineItemSchema).default([]),
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type OrderLineRemovedComponent = z.infer<typeof orderLineRemovedComponentSchema>;
export type OrderLineSelectedOption = z.infer<typeof orderLineSelectedOptionSchema>;
export type OrderLineComponentSnapshot = z.infer<typeof orderLineComponentSnapshotSchema>;
export type MerchantAcceptOrderInput = z.infer<typeof merchantAcceptOrderSchema>;
export type MerchantRejectOrderInput = z.infer<typeof merchantRejectOrderSchema>;
export type ManualDriverAssignmentInput = z.infer<typeof manualDriverAssignmentSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type CourierLocation = z.infer<typeof courierLocationSchema>;
export type CourierDelivery = z.infer<typeof courierDeliverySchema>;
export type CourierStartDeliveryInput = z.infer<typeof courierStartDeliveryInputSchema>;
export type CourierLocationInput = z.infer<typeof courierLocationInputSchema>;
export type CourierCompleteDeliveryInput = z.infer<typeof courierCompleteDeliveryInputSchema>;
export type TrackedOrder = z.infer<typeof trackedOrderSchema>;
export type TrackedOrderLineItem = z.infer<typeof trackedOrderLineItemSchema>;
