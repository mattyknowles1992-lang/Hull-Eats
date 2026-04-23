import { z } from "zod";

import { orderSummarySchema } from "./orders";

export const customerAddressTypes = ["home", "work", "other"] as const;

export type CustomerAddressType = (typeof customerAddressTypes)[number];

export const customerAddressTypeSchema = z.enum(customerAddressTypes);

export const customerProfileSchema = z.object({
  id: z.string().min(1),
  supabaseAuthUserId: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  defaultAddressId: z.string().optional(),
});

export const customerAddressSchema = z.object({
  id: z.string().min(1),
  customerProfileId: z.string().min(1),
  label: z.string().min(1),
  type: customerAddressTypeSchema,
  fullName: z.string().min(1),
  phone: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  deliveryNotes: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const createCustomerAddressInputSchema = customerAddressSchema.omit({
  id: true,
  customerProfileId: true,
});

export const customerOrderHistorySchema = z.object({
  customer: customerProfileSchema,
  recentOrders: z.array(orderSummarySchema),
});

export type CustomerProfile = z.infer<typeof customerProfileSchema>;
export type CustomerAddress = z.infer<typeof customerAddressSchema>;
export type CreateCustomerAddressInput = z.infer<typeof createCustomerAddressInputSchema>;
export type CustomerOrderHistory = z.infer<typeof customerOrderHistorySchema>;

