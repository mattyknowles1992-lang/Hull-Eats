import { z } from "zod";

import { orderSummarySchema } from "./orders";

export const customerAddressTypes = ["home", "work", "other"] as const;
export const customerDeliveryPlanOptions = ["pay_as_you_go", "hull_eats_plus"] as const;

export type CustomerAddressType = (typeof customerAddressTypes)[number];
export type CustomerDeliveryPlanOption = (typeof customerDeliveryPlanOptions)[number];

export const customerAddressTypeSchema = z.enum(customerAddressTypes);
export const customerDeliveryPlanOptionSchema = z.enum(customerDeliveryPlanOptions);

export const customerProfileSchema = z.object({
  id: z.string().min(1),
  supabaseAuthUserId: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  emailVerifiedAt: z.string().datetime().optional(),
  accountStatus: z.enum(["active", "disabled"]).default("active"),
  marketingOptIn: z.boolean().default(false),
  preferredDeliveryPlan: customerDeliveryPlanOptionSchema.optional(),
  signupPromoCode: z.string().optional(),
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

export const customerSignupAddressSchema = z.object({
  label: z.string().min(1),
  type: customerAddressTypeSchema.default("home"),
  fullName: z.string().min(1),
  phone: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  deliveryNotes: z.string().optional(),
});

export const createCustomerSignupInputSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  promoCode: z.string().optional(),
  deliveryPlan: customerDeliveryPlanOptionSchema,
  marketingOptIn: z.boolean().default(false),
  address: customerSignupAddressSchema,
});

export const customerOrderHistorySchema = z.object({
  customer: customerProfileSchema,
  recentOrders: z.array(orderSummarySchema),
});

export type CustomerProfile = z.infer<typeof customerProfileSchema>;
export type CustomerAddress = z.infer<typeof customerAddressSchema>;
export type CreateCustomerAddressInput = z.infer<typeof createCustomerAddressInputSchema>;
export type CustomerSignupAddress = z.infer<typeof customerSignupAddressSchema>;
export type CreateCustomerSignupInput = z.infer<typeof createCustomerSignupInputSchema>;
export type CustomerOrderHistory = z.infer<typeof customerOrderHistorySchema>;
