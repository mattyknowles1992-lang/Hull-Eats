import { z } from "zod";

export const hubPromotionKindSchema = z.enum(["bogo_item", "percent_off", "fixed_amount_item", "bundle_fixed_price"]);

export const hubPromotionScopeSchema = z.enum(["items", "categories", "whole_menu"]);

export const hubPromotionBundleLineSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const hmTime = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm (24h)");

const promotionCoreSchema = z.object({
  title: z.string().min(1).max(140),
  isActive: z.boolean().default(true),
  kind: hubPromotionKindSchema,
  scope: hubPromotionScopeSchema,
  percentOff: z.number().min(0).max(100).nullable().default(null),
  fixedAmountOff: z.number().nonnegative().nullable().default(null),
  bundleFixedPrice: z.number().nonnegative().nullable().default(null),
  menuItemIds: z.array(z.string().min(1)).default([]),
  categoryIds: z.array(z.string().min(1)).default([]),
  bundleLines: z.array(hubPromotionBundleLineSchema).nullable().default(null),
  validDates: z.array(isoDate).min(1, "Select at least one calendar day for this offer."),
  dailyStartTime: hmTime.nullable().default(null),
  dailyEndTime: hmTime.nullable().default(null),
});

function refinePromotionBusinessRules(data: z.infer<typeof promotionCoreSchema>, ctx: z.RefinementCtx) {
  const hasStart = data.dailyStartTime != null && data.dailyStartTime !== "";
  const hasEnd = data.dailyEndTime != null && data.dailyEndTime !== "";
  if (hasStart !== hasEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Set both start and end time, or leave both empty for all-day offers.",
      path: hasStart ? ["dailyEndTime"] : ["dailyStartTime"],
    });
  }

  if (data.kind === "bogo_item") {
    if (data.menuItemIds.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pick at least one menu item for buy-one-get-one-free.", path: ["menuItemIds"] });
    }
    return;
  }

  if (data.kind === "bundle_fixed_price") {
    if (!data.bundleLines || data.bundleLines.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add at least one item to the bundle.", path: ["bundleLines"] });
    }
    if (data.bundleFixedPrice == null || data.bundleFixedPrice <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Set a bundle deal price greater than zero.", path: ["bundleFixedPrice"] });
    }
    return;
  }

  if (data.kind === "percent_off") {
    if (data.percentOff == null || data.percentOff <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Set a percentage off greater than zero.", path: ["percentOff"] });
    }
  }

  if (data.kind === "fixed_amount_item") {
    if (data.fixedAmountOff == null || data.fixedAmountOff <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Set a fixed amount off per item greater than zero.", path: ["fixedAmountOff"] });
    }
  }

  if (data.kind === "percent_off" || data.kind === "fixed_amount_item") {
    if (data.scope === "whole_menu") {
      return;
    }
    if (data.scope === "categories" && data.categoryIds.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select at least one category.", path: ["categoryIds"] });
    }
    if (data.scope === "items" && data.menuItemIds.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select at least one menu item.", path: ["menuItemIds"] });
    }
  }
}

export const createHubPromotionInputSchema = promotionCoreSchema.superRefine(refinePromotionBusinessRules);

export const hubPromotionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  isActive: z.boolean(),
  kind: hubPromotionKindSchema,
  scope: hubPromotionScopeSchema,
  percentOff: z.number().min(0).max(100).nullable(),
  fixedAmountOff: z.number().nonnegative().nullable(),
  bundleFixedPrice: z.number().nonnegative().nullable(),
  menuItemIds: z.array(z.string().min(1)),
  categoryIds: z.array(z.string().min(1)),
  bundleLines: z.array(hubPromotionBundleLineSchema).nullable(),
  validDates: z.array(isoDate),
  dailyStartTime: hmTime.nullable(),
  dailyEndTime: hmTime.nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const updateHubPromotionInputSchema = promotionCoreSchema.partial();

export type HubPromotionKind = z.infer<typeof hubPromotionKindSchema>;
export type HubPromotionScope = z.infer<typeof hubPromotionScopeSchema>;
export type HubPromotionBundleLine = z.infer<typeof hubPromotionBundleLineSchema>;
export type HubPromotion = z.infer<typeof hubPromotionSchema>;
export type CreateHubPromotionInput = z.infer<typeof createHubPromotionInputSchema>;
export type UpdateHubPromotionInput = z.infer<typeof updateHubPromotionInputSchema>;
