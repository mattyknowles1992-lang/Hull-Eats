import { z } from "zod";

import { storeDeliveryPricingSchema } from "./delivery-pricing";

export const storeTypes = ["restaurant", "takeaway", "shop"] as const;
export const stockStatuses = ["in_stock", "low_stock", "out_of_stock"] as const;
export const storefrontStatuses = ["onboarding", "live", "paused"] as const;
export const menuOptionSelectionModes = ["single", "multiple"] as const;
export type StoreType = (typeof storeTypes)[number];
export type StockStatus = (typeof stockStatuses)[number];
export type StorefrontStatus = (typeof storefrontStatuses)[number];
export type MenuOptionSelectionMode = (typeof menuOptionSelectionModes)[number];

export const storeTypeSchema = z.enum(storeTypes);
export const stockStatusSchema = z.enum(stockStatuses);
export const storefrontStatusSchema = z.enum(storefrontStatuses);
export const menuOptionSelectionModeSchema = z.enum(menuOptionSelectionModes);

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
  /** Original list price when a live offer reduces `price` on the storefront. */
  compareAtPrice: z.number().nonnegative().optional(),
  isActive: z.boolean().default(true),
  imageUrl: z.string().url().optional(),
  trackStock: z.boolean().default(false),
  stockQuantity: z.number().int().nonnegative().nullable().default(null),
  stockStatus: stockStatusSchema.default("in_stock"),
  allowBackorder: z.boolean().default(false),
  maxPerOrder: z.number().int().positive().nullable().default(null),
  /** When true, checkout shows ID policy and couriers/customers are told the order needs in-person ID verification. */
  requiresIdVerification: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  /** Heading within the category on the customer menu (e.g. Cans, Milkshakes under Drinks). */
  menuSubGroup: z.string().max(80).optional(),
  components: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        quantity: z.number().int().positive().default(1),
        removable: z.boolean().default(false),
      }),
    )
    .default([]),
  optionGroups: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        description: z.string().default(""),
        selectionMode: menuOptionSelectionModeSchema.default("single"),
        isRequired: z.boolean().default(false),
        minSelections: z.number().int().nonnegative().default(0),
        maxSelections: z.number().int().positive().nullable().default(null),
        showWhenValueIds: z.array(z.string().min(1)).default([]),
        options: z.array(
          z.object({
            id: z.string().min(1),
            label: z.string().min(1),
            description: z.string().default(""),
            priceDelta: z.number().default(0),
            isDefault: z.boolean().default(false),
            maxQuantity: z.number().int().positive().default(1),
          }),
        ),
      }),
    )
    .default([]),
});

export const storeSummarySchema = z.object({
  id: z.string().min(1),
  merchantId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  type: storeTypeSchema,
  storefrontStatus: storefrontStatusSchema.default("live"),
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  isOpen: z.boolean(),
  cuisineLabel: z.string().optional(),
  heroImageUrl: z.string().url().optional(),
  logoImageUrl: z.string().url().optional(),
  etaMinutes: z.number().int().positive().optional(),
  minimumOrderAmount: z.number().nonnegative().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  /** Hub-configured mile bands, radius, and postcode districts (optional on older records). */
  deliveryPricing: storeDeliveryPricingSchema.optional(),
  menuSetupComplete: z.boolean().default(false),
  onboardingMessage: z.string().optional(),
});

export type DeliveryZone = z.infer<typeof deliveryZoneSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type StoreSummary = z.infer<typeof storeSummarySchema>;
