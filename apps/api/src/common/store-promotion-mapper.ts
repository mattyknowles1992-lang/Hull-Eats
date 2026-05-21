import type { HubPromotion } from "@hull-eats/types";

export function mapStorePromotionRow(row: {
  id: string;
  title: string;
  isActive: boolean;
  kind: string;
  scope: string;
  percentOff: unknown;
  fixedAmountOff: unknown;
  bundleFixedPrice: unknown;
  menuItemIds: string[];
  categoryIds: string[];
  bundleLines: unknown;
  validDates: string[];
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): HubPromotion {
  const rawLines = row.bundleLines;
  let bundleLines: HubPromotion["bundleLines"] = null;
  if (Array.isArray(rawLines)) {
    bundleLines = rawLines
      .map((line: unknown) => {
        if (!line || typeof line !== "object") {
          return null;
        }
        const record = line as { menuItemId?: unknown; quantity?: unknown };
        return typeof record.menuItemId === "string" && typeof record.quantity === "number"
          ? { menuItemId: record.menuItemId, quantity: record.quantity }
          : null;
      })
      .filter(Boolean) as HubPromotion["bundleLines"];
  }

  return {
    id: row.id,
    title: row.title,
    isActive: row.isActive,
    kind: mapPromotionKindFromDb(row.kind),
    scope: mapPromotionScopeFromDb(row.scope),
    percentOff: row.percentOff != null ? Number(row.percentOff) : null,
    fixedAmountOff: row.fixedAmountOff != null ? Number(row.fixedAmountOff) : null,
    bundleFixedPrice: row.bundleFixedPrice != null ? Number(row.bundleFixedPrice) : null,
    menuItemIds: Array.isArray(row.menuItemIds) ? row.menuItemIds : [],
    categoryIds: Array.isArray(row.categoryIds) ? row.categoryIds : [],
    bundleLines,
    validDates: Array.isArray(row.validDates) ? [...row.validDates].sort() : [],
    dailyStartTime: row.dailyStartTime ?? null,
    dailyEndTime: row.dailyEndTime ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

function mapPromotionKindFromDb(value: string): HubPromotion["kind"] {
  const map: Record<string, HubPromotion["kind"]> = {
    BOGO_ITEM: "bogo_item",
    PERCENT_OFF: "percent_off",
    FIXED_AMOUNT_ITEM: "fixed_amount_item",
    BUNDLE_FIXED_PRICE: "bundle_fixed_price",
  };
  return map[value] ?? "percent_off";
}

function mapPromotionScopeFromDb(value: string): HubPromotion["scope"] {
  const map: Record<string, HubPromotion["scope"]> = {
    ITEMS: "items",
    CATEGORIES: "categories",
    WHOLE_MENU: "whole_menu",
  };
  return map[value] ?? "whole_menu";
}
