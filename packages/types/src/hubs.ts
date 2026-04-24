import { z } from "zod";

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
});

export const hubMenuSectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
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
  ownerName: z.string().min(1),
  ownerEmail: z.string().email(),
  type: storeTypeSchema,
  hubUsername: z.string().min(1),
  hubPassword: z.string().min(1),
  deliveryLeadTime: z.string().min(1),
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

export const merchantWorkspaceUpdateInputSchema = z.object({
  settings: hubSettingsSchema,
  menuSections: z.array(hubMenuSectionSchema),
});

export const createHubMenuSectionInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
});

export const createHubMenuItemInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  price: z.number().nonnegative(),
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
export type MerchantWorkspaceUpdateInput = z.infer<typeof merchantWorkspaceUpdateInputSchema>;
export type CreateHubMenuSectionInput = z.infer<typeof createHubMenuSectionInputSchema>;
export type CreateHubMenuItemInput = z.infer<typeof createHubMenuItemInputSchema>;
export type PreviewMenuImportInput = z.infer<typeof previewMenuImportInputSchema>;
export type PreviewMenuTextImportInput = z.infer<typeof previewMenuTextImportInputSchema>;
export type ApplyMenuImportInput = z.infer<typeof applyMenuImportInputSchema>;
