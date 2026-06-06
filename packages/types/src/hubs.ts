import { z } from "zod";

import { defaultKitchenTicketSettings, kitchenTicketSettingsSchema } from "./kitchen-ticket";

import {
  deliveryDistanceRangeSchema,
  deliveryModeSchema,
  hubOrderFulfillmentSchema,
  hullPostcodeZoneSchema,
  mergeHullPostcodeZones,
  normalizeDeliveryDistanceRanges,
  type HullPostcodeZone,
} from "./delivery-pricing";

import { menuItemSchema, storeTypeSchema, storefrontStatusSchema, type MenuItem } from "./catalog";
import { hubMenuTemplateSchema } from "./hub-menu-template";
import { sanitizeMenuItemMoneyFields, sanitizeMenuMoneyAmount } from "./menu-money";
import { membershipRoleSchema } from "./rbac";
import { normalizeOpeningHours, storeOpeningHoursSchema, type StoreOpeningHours } from "./store-opening-hours";
import { hubPortalLocaleSchema } from "./hub-portal-locale";

export const hubUserStatusSchema = z.enum(["active", "invited", "disabled"]);

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

export const adminHubStatusSchema = z.enum(["setup", "live", "paused"]);

export const adminHubSummarySchema = z.object({
  id: z.string().min(1),
  businessName: z.string().min(1),
  slug: z.string().min(1),
  hasStore: z.boolean().default(false),
  primaryStoreId: z.string().min(1).nullable().default(null),
  type: storeTypeSchema.nullable().default(null),
  storeSlug: z.string().min(1).nullable().default(null),
  hubUsername: z.string().default(""),
  deliveryLeadTime: z.string().nullable().default(null),
  status: adminHubStatusSchema,
  listedOnMarketplace: z.boolean().default(false),
  acceptingOrders: z.boolean().default(false),
  homepageFeatured: z.boolean().default(false),
  homepageFeatureOrder: z.number().int().positive().nullable().default(null),
  setupComplete: z.boolean().default(false),
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
  mustChangePassword: z.boolean().default(false),
  preferredLocale: hubPortalLocaleSchema.default("en-GB"),
});

export const updateHubUserLocaleInputSchema = z.object({
  preferredLocale: hubPortalLocaleSchema,
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
  acceptingOrders: z.boolean().default(true),
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
  /** Radius mode: optional custom pricing blocks by maximum distance. */
  deliveryDistanceRanges: z.array(deliveryDistanceRangeSchema).default([]),
  /** Hull outward districts with per-zone radius (postcode-zone mode). */
  deliveryPostcodeZones: z.array(hullPostcodeZoneSchema).default([]),
  /** Legacy five bands: under 1, 2, 3, 4, and 5 miles. Retained for old hubs and hidden editor fallback. */
  deliveryMileFees: z.array(z.number().nonnegative()).length(5).default([0, 0, 0, 0, 0]),
  deliveryOriginLatitude: z.number().min(-90).max(90).nullable().optional(),
  deliveryOriginLongitude: z.number().min(-180).max(180).nullable().optional(),
  /** Whether customers can order for delivery, collection, or both. */
  orderFulfillment: hubOrderFulfillmentSchema.default("delivery_and_collection"),
  /** Weekly open/close times in Europe/London (Hull, UK). */
  openingHours: storeOpeningHoursSchema,
  /** Kitchen and delivery print ticket layout (also gates burger/kebab parts libraries when in-depth). */
  kitchenTicket: kitchenTicketSettingsSchema.default(defaultKitchenTicketSettings()),
  /** Menu Studio layout: full takeaway tooling vs simplified retail list builder. */
  menuTemplate: hubMenuTemplateSchema.default("full_food"),
  /** Hull Marketplace discovery category slug (optional). */
  marketplaceCategorySlug: z.string().default(""),
});

const optionalHttpUrl = z.preprocess((value) => {
  if (value == null) {
    return undefined;
  }
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}, z.string().url().optional());

/** Menu item photos from upload (data URL) or hosted URL. */
export const hubMenuImageUrlSchema = z.preprocess((value) => {
  if (value == null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(trimmed);
    return trimmed;
  } catch {
    return undefined;
  }
}, z.string().optional());

/** Menu line on hub PATCH — category comes from the parent section when omitted. */
export const hubMenuSectionItemSchema = menuItemSchema.extend({
  categoryId: menuItemSchema.shape.categoryId.optional(),
  imageUrl: hubMenuImageUrlSchema,
  menuSubGroup: menuItemSchema.shape.menuSubGroup,
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

/** PATCH workspace — relaxed menu lines (categoryId filled in prepareMerchantWorkspaceUpdateBody). */
export const hubMenuSectionUpdateSchema = hubMenuSectionSchema.extend({
  items: z.array(hubMenuSectionItemSchema).default([]),
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
  businessPhone: z.string().default(""),
  addressLine1: z.string().default(""),
  city: z.string().default("Hull"),
  postcode: z.string().default(""),
  cuisineLabel: z.string().default(""),
  storeType: storeTypeSchema.default("takeaway"),
  menuTemplate: hubMenuTemplateSchema.default("full_food"),
  marketplaceCategorySlug: z.string().default(""),
});

export const createHubUserInputSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  password: z.string().min(1),
  role: membershipRoleSchema,
});

export const updateAdminHubLifecycleInputSchema = z
  .object({
    listedOnMarketplace: z.boolean().optional(),
    acceptingOrders: z.boolean().optional(),
    homepageFeatured: z.boolean().optional(),
    homepageFeatureOrder: z.number().int().positive().optional(),
  })
  .refine(
    (value) =>
      value.listedOnMarketplace !== undefined ||
      value.acceptingOrders !== undefined ||
      value.homepageFeatured !== undefined ||
      value.homepageFeatureOrder !== undefined,
    {
      message: "Provide at least one lifecycle change.",
    },
  );

export const merchantLoginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const merchantPasswordResetCodeSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code.");

export const merchantPasswordResetRequestInputSchema = z.object({
  email: z.string().email(),
});

export const merchantPasswordResetVerifyInputSchema = z.object({
  email: z.string().email(),
  code: merchantPasswordResetCodeSchema,
});

export const merchantPasswordResetCompleteInputSchema = z.object({
  email: z.string().email(),
  code: merchantPasswordResetCodeSchema,
});

export const merchantPasswordResetRequestResultSchema = z.object({
  accepted: z.boolean(),
  deliveryMode: z.enum(["stub", "preview", "email"]).default("stub"),
  debugCode: z.string().optional(),
});

export const merchantPasswordResetVerifyResultSchema = z.object({
  verified: z.boolean(),
});

export const merchantPasswordResetCompleteResultSchema = z.object({
  reset: z.boolean(),
  loginEmail: z.string().email(),
  temporaryPassword: z.string().min(1),
});

export const changeHubPasswordInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const coerceInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};

const coerceNonNegative = (value: unknown, fallback = 0) => sanitizeMenuMoneyAmount(value, fallback);

const normalizeMileFees = (value: unknown): [number, number, number, number, number] => {
  const source = Array.isArray(value) ? value.map((entry) => coerceNonNegative(entry, 0)) : [];
  const padded = [...source];
  while (padded.length < 5) {
    padded.push(0);
  }
  return padded.slice(0, 5) as [number, number, number, number, number];
};

/** Normalise hub PATCH bodies before API Zod validation (sector 0, menu URLs, category ids). */
export const prepareMerchantWorkspaceUpdateBody = (raw: unknown): unknown => {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const body = raw as {
    settings?: Record<string, unknown>;
    menuSections?: unknown[];
  };

  const settings = body.settings;
  const hasMenuSections = Array.isArray(body.menuSections);
  const menuSections = hasMenuSections ? body.menuSections : undefined;

  const normalizedSettings = settings
      ? {
          ...settings,
          etaMinutes: Math.max(1, coerceInt(settings.etaMinutes, 25)),
          deliveryFee: coerceNonNegative(settings.deliveryFee, 0),
          minimumOrderAmount: coerceNonNegative(settings.minimumOrderAmount, 0),
          deliveryRadiusMiles: Math.min(40, Math.max(0.1, coerceNonNegative(settings.deliveryRadiusMiles, 5) || 5)),
          deliveryDistanceRanges: normalizeDeliveryDistanceRanges(settings.deliveryDistanceRanges, settings.deliveryMileFees as number[] | undefined),
          autoAcceptMaxPrepMinutes: Math.min(180, Math.max(5, coerceInt(settings.autoAcceptMaxPrepMinutes, 60))),
          deliveryMileFees: normalizeMileFees(settings.deliveryMileFees),
          deliveryPostcodeZones: mergeHullPostcodeZones(settings.deliveryPostcodeZones as HullPostcodeZone[] | undefined),
          deliveryOriginLatitude:
            settings.deliveryOriginLatitude == null || settings.deliveryOriginLatitude === ""
              ? null
              : Number(settings.deliveryOriginLatitude),
          deliveryOriginLongitude:
            settings.deliveryOriginLongitude == null || settings.deliveryOriginLongitude === ""
              ? null
              : Number(settings.deliveryOriginLongitude),
          openingHours: normalizeOpeningHours(settings.openingHours) as StoreOpeningHours,
        }
      : settings;

  return {
    ...body,
    settings: normalizedSettings,
    ...(hasMenuSections
      ? {
          menuSections: menuSections!.map((section) => {
      if (!section || typeof section !== "object") {
        return section;
      }
      const row = section as { id?: string; items?: unknown[] };
      return {
        ...row,
        defaultPrice:
          (row as { defaultPrice?: unknown }).defaultPrice == null
            ? null
            : sanitizeMenuMoneyAmount((row as { defaultPrice?: unknown }).defaultPrice),
        items: Array.isArray(row.items)
          ? row.items.map((item) => {
              if (!item || typeof item !== "object") {
                return item;
              }
              const line = item as Record<string, unknown>;
              const imageUrl =
                typeof line.imageUrl === "string" && line.imageUrl.trim() === "" ? undefined : line.imageUrl;
              const menuSubGroup =
                typeof line.menuSubGroup === "string" && line.menuSubGroup.trim() ? line.menuSubGroup.trim() : undefined;
              return sanitizeMenuItemMoneyFields({
                ...line,
                categoryId: String(line.categoryId ?? row.id ?? ""),
                imageUrl,
                menuSubGroup,
                price: line.price,
                optionGroups: Array.isArray(line.optionGroups) ? line.optionGroups : [],
              } as MenuItem);
            })
          : [],
      };
          }),
        }
      : {}),
  };
};

const merchantWorkspaceUpdateBodySchema = z.object({
  settings: hubSettingsSchema,
  menuSections: z.array(hubMenuSectionUpdateSchema).optional(),
});

export const merchantWorkspaceUpdateInputSchema = z.preprocess(
  prepareMerchantWorkspaceUpdateBody,
  merchantWorkspaceUpdateBodySchema,
);

export type MerchantWorkspaceUpdateInput = z.infer<typeof merchantWorkspaceUpdateBodySchema>;

/** Parse and sanitise a hub save payload (use in API and merchant portal before PATCH). */
export const parseMerchantWorkspaceUpdateInput = (raw: unknown): MerchantWorkspaceUpdateInput =>
  merchantWorkspaceUpdateInputSchema.parse(raw);

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
export type AdminHubStatus = z.infer<typeof adminHubStatusSchema>;
export type AdminHubSummary = z.infer<typeof adminHubSummarySchema>;
export type HubUser = z.infer<typeof hubUserSchema>;
export type UpdateHubUserLocaleInput = z.infer<typeof updateHubUserLocaleInputSchema>;
export type HubSettings = z.infer<typeof hubSettingsSchema>;
export type HubMenuSection = z.infer<typeof hubMenuSectionSchema>;
export type HubMenuImportCandidate = z.infer<typeof hubMenuImportCandidateSchema>;
export type HubMenuImportBatch = z.infer<typeof hubMenuImportBatchSchema>;
export type MerchantWorkspace = z.infer<typeof merchantWorkspaceSchema>;
export type CreateHubInput = z.infer<typeof createHubInputSchema>;
export type CreateHubUserInput = z.infer<typeof createHubUserInputSchema>;
export type UpdateAdminHubLifecycleInput = z.infer<typeof updateAdminHubLifecycleInputSchema>;
export type MerchantLoginInput = z.infer<typeof merchantLoginInputSchema>;
export type MerchantPasswordResetRequestInput = z.infer<typeof merchantPasswordResetRequestInputSchema>;
export type MerchantPasswordResetVerifyInput = z.infer<typeof merchantPasswordResetVerifyInputSchema>;
export type MerchantPasswordResetCompleteInput = z.infer<typeof merchantPasswordResetCompleteInputSchema>;
export type MerchantPasswordResetRequestResult = z.infer<typeof merchantPasswordResetRequestResultSchema>;
export type MerchantPasswordResetVerifyResult = z.infer<typeof merchantPasswordResetVerifyResultSchema>;
export type MerchantPasswordResetCompleteResult = z.infer<typeof merchantPasswordResetCompleteResultSchema>;
export type ChangeHubPasswordInput = z.infer<typeof changeHubPasswordInputSchema>;
export type CreateHubMenuSectionInput = z.infer<typeof createHubMenuSectionInputSchema>;
export type CreateHubMenuItemInput = z.infer<typeof createHubMenuItemInputSchema>;
export type PreviewMenuImportInput = z.infer<typeof previewMenuImportInputSchema>;
export type PreviewMenuTextImportInput = z.infer<typeof previewMenuTextImportInputSchema>;
export type ApplyMenuImportInput = z.infer<typeof applyMenuImportInputSchema>;
