import { z } from "zod";

export const storeTypes = ["restaurant", "takeaway", "shop"] as const;
export const stockStatuses = ["in_stock", "low_stock", "out_of_stock"] as const;
export const storefrontStatuses = ["onboarding", "live", "paused"] as const;
export type StoreType = (typeof storeTypes)[number];
export type StockStatus = (typeof stockStatuses)[number];
export type StorefrontStatus = (typeof storefrontStatuses)[number];

export const storeTypeSchema = z.enum(storeTypes);
export const stockStatusSchema = z.enum(stockStatuses);
export const storefrontStatusSchema = z.enum(storefrontStatuses);

export const deliveryZoneSchema = z.object({
  id: z.string().min(1),
  storeId: z.string().min(1),
  name: z.string().min(1),
  postcodePatterns: z.array(z.string().min(1)),
  deliveryFee: z.number().nonnegative(),
  minimumOrderAmount: z.number().nonnegative(),
  isActive: z.boolean().default(true),
});

export const menuItemSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  price: z.number().nonnegative(),
  isActive: z.boolean().default(true),
  imageUrl: z.string().url().optional(),
  trackStock: z.boolean().default(false),
  stockQuantity: z.number().int().nonnegative().nullable().default(null),
  stockStatus: stockStatusSchema.default("in_stock"),
  allowBackorder: z.boolean().default(false),
  maxPerOrder: z.number().int().positive().nullable().default(null),
  sortOrder: z.number().int().default(0),
});

export const storeSummarySchema = z.object({
  id: z.string().min(1),
  merchantId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  type: storeTypeSchema,
  storefrontStatus: storefrontStatusSchema.default("live"),
  city: z.string().min(1),
  postcode: z.string().min(1),
  isOpen: z.boolean(),
  cuisineLabel: z.string().optional(),
  heroImageUrl: z.string().url().optional(),
  logoImageUrl: z.string().url().optional(),
  etaMinutes: z.number().int().positive().optional(),
  minimumOrderAmount: z.number().nonnegative().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  menuSetupComplete: z.boolean().default(false),
  onboardingMessage: z.string().optional(),
});

export type DeliveryZone = z.infer<typeof deliveryZoneSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type StoreSummary = z.infer<typeof storeSummarySchema>;
