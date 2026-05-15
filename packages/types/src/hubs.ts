import { z } from "zod";

import { deliveryModeSchema, hullPostcodeZoneSchema } from "./delivery-pricing";

import { menuItemSchema, storeTypeSchema, storefrontStatusSchema } from "./catalog";
import { membershipRoleSchema } from "./rbac";

export const hubUserStatusSchema = z.enum(["active", "invited"]);

export const hubActiveOrderSchema = z.object({
  id: z.string().min(1),
  customerName: z.string().min(1),
  status: z.string().min(1),
  total: z.string().min(1),
  placedAgo: z.string().min(1),
});

export const hubSummarySchema = z.object({
  id: z.string().min(1),
  businessName: z.string().min(1),
  slug: z.string().min(1),
  type: storeTypeSchema,
  hubUsername: z.string().min(1),
  deliveryLeadTime: z.string().min(1),
  status: storefrontStatusSchema,
  ownerName: z.string().min(1),
  orderVolumeToday: z.number().int().nonnegative(),
  orderVolumeWeek: z.number().int().nonnegative(),
  grossSalesWeek: z.string().min(1),
  averageOrderValue: z.string().min(1),
  activeOrders: z.array(hubActiveOrderSchema).default([]),
  notes: z.array(z.string().min(1)).default([]),
});

export const hubUserSchema = z.object({
  id: z.string().min(1),
  hubId: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  role: membershipRoleSchema,
  status: hubUserStatusSchema.default("active"),
});

export const hubSettingsSchema = z.object({
  name: z.string().min(1),
  cuisineLabel: z.string().default(""),
  onboardingMessage: z.string().default(""),
  city: z.string().min(1),
  postcode: z.string().min(1),
  etaMinutes: z.number().int().positive(),
  deliveryFee: z.number().nonnegative(),
  minimumOrderAmount: z.number().nonnegative(),
  isOpen: z.boolean(),
  logoImageUrl: z.string().default(""),
  heroImageUrl: z.string().default(""),
  /** When true, new web orders are accepted immediately using quoted prep (capped below). Kitchen print queues on accept. */
  autoAcceptOrders: z.boolean().default(false),
  /** When auto-accepting, quoted prep minutes is min(store ETA, this value). */
  autoAcceptMaxPrepMinutes: z.number().int().min(5).max(180).default(60),
  /** How delivery area is defined: circle from shop, or per Hull outward district. */
  deliveryMode: deliveryModeSchema.default("business_radius"),
  /** Max road distance (miles) from the store origin (business-radius mode). */
  deliveryRadiusMiles: z.number().min(0.1).max(40).default(5),
  /** Hull outward districts with per-zone radius (postcode-zone mode). */
  deliveryPostcodeZones: z.array(hullPostcodeZoneSchema).default([]),
  /** Five bands: under 1, 2, 3, 4, and 5 miles. Zeros mean “not set” for that band. */
  deliveryMileFees: z.array(z.number().nonnegative()).length(5).default([0, 0, 0, 0, 0]),
  deliveryOriginLatitude: z.number().min(-90).max(90).nullable().optional(),
  deliveryOriginLongitude: z.number().min(-180).max(180).nullable().optional(),
});

export const hubMenuSectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  /** When set, used for hub UI (e.g. pizza size builder). Stored in DB via description prefix — see hub-menu-presets. */
  presetKey: z.string().max(64).nullable().optional(),
  defaultPrice: z.number().nonnegative().nullable().default(null),
  items: z.array(menuItemSchema).default([]),
});

export const hubMenuImportCandidateSchema = z.object({
  id: z.string().min(1),
  suggestedCategoryName: z.string().min(1),
  itemName: z.string().min(1),
  description: z.string().default(""),
  price: z.number().nonnegative(),
  sourceLine: z.string().min(1),
});

export const hubMenuImportBatchSchema = z.object({
  id: z.string().min(1),
  imageName: z.string().min(1),
  status: z.enum(["pending_review", "applied", "discarded"]).default("pending_review"),
  candidates: z.array(hubMenuImportCandidateSchema).default([]),
});

export const merchantWorkspaceSchema = z.object({
  hub: hubSummarySchema,
  settings: hubSettingsSchema,
  users: z.array(hubUserSchema),
  menuSections: z.array(hubMenuSectionSchema),
  pendingImports: z.array(hubMenuImportBatchSchema).default([]),
});

export const createHubInputSchema = z.object({
  businessName: z.string().min(1),
  ownerEmail: z.string().email(),
  hubPassword: z.string().min(1),
});

export const createHubUserInputSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  password: z.string().min(1),
  role: membershipRoleSchema,
});

export const merchantLoginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const changeHubPasswordInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const merchantWorkspaceUpdateInputSchema = z.object({
  settings: hubSettingsSchema,
  menuSections: z.array(hubMenuSectionSchema),
});

export const createHubMenuSectionInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  defaultPrice: z.number().nonnegative().nullable().default(null),
  presetKey: z.string().max(64).nullable().optional(),
});

export const createHubMenuItemInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  price: z.number().nonnegative(),
  imageUrl: menuItemSchema.shape.imageUrl,
  requiresIdVerification: menuItemSchema.shape.requiresIdVerification.optional().default(false),
  components: menuItemSchema.shape.components.default([]),
  optionGroups: menuItemSchema.shape.optionGroups.default([]),
});

export const previewMenuImportInputSchema = z.object({
  imageName: z.string().min(1),
});

export const previewMenuTextImportInputSchema = z.object({
  rawText: z.string().min(1),
});

export const applyMenuImportInputSchema = z.object({
  acceptedCandidateIds: z.array(z.string().min(1)).default([]),
});

export type HubActiveOrder = z.infer<typeof hubActiveOrderSchema>;
export type HubSummary = z.infer<typeof hubSummarySchema>;
export type HubUser = z.infer<typeof hubUserSchema>;
export type HubSettings = z.infer<typeof hubSettingsSchema>;
export type HubMenuSection = z.infer<typeof hubMenuSectionSchema>;
export type HubMenuImportCandidate = z.infer<typeof hubMenuImportCandidateSchema>;
export type HubMenuImportBatch = z.infer<typeof hubMenuImportBatchSchema>;
export type MerchantWorkspace = z.infer<typeof merchantWorkspaceSchema>;
export type CreateHubInput = z.infer<typeof createHubInputSchema>;
export type CreateHubUserInput = z.infer<typeof createHubUserInputSchema>;
export type MerchantLoginInput = z.infer<typeof merchantLoginInputSchema>;
export type ChangeHubPasswordInput = z.infer<typeof changeHubPasswordInputSchema>;
export type MerchantWorkspaceUpdateInput = z.infer<typeof merchantWorkspaceUpdateInputSchema>;
export type CreateHubMenuSectionInput = z.infer<typeof createHubMenuSectionInputSchema>;
export type CreateHubMenuItemInput = z.infer<typeof createHubMenuItemInputSchema>;
export type PreviewMenuImportInput = z.infer<typeof previewMenuImportInputSchema>;
export type PreviewMenuTextImportInput = z.infer<typeof previewMenuTextImportInputSchema>;
export type ApplyMenuImportInput = z.infer<typeof applyMenuImportInputSchema>;
