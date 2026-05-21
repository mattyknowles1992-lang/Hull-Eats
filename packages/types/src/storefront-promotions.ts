import { z } from "zod";

import type { MenuItem } from "./catalog";
import { hubPromotionKindSchema, type HubPromotion } from "./promotions";

const STORE_TIMEZONE = "Europe/London";

export const storefrontPromotionBannerSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  headline: z.string().min(1),
  detail: z.string().optional(),
  kind: hubPromotionKindSchema,
});

export type StorefrontPromotionBanner = z.infer<typeof storefrontPromotionBannerSchema>;

export type StorefrontMenuCategory = {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
};

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export function storeLocalDateKey(now: Date, timeZone = STORE_TIMEZONE): string {
  return now.toLocaleDateString("en-CA", { timeZone });
}

export function storeLocalHm(now: Date, timeZone = STORE_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function isHubPromotionActiveNow(promotion: HubPromotion, now = new Date(), timeZone = STORE_TIMEZONE): boolean {
  if (!promotion.isActive) {
    return false;
  }

  const today = storeLocalDateKey(now, timeZone);
  if (!promotion.validDates.includes(today)) {
    return false;
  }

  const start = promotion.dailyStartTime;
  const end = promotion.dailyEndTime;
  if (!start || !end) {
    return true;
  }

  const hm = storeLocalHm(now, timeZone);
  if (start <= end) {
    return hm >= start && hm <= end;
  }

  return hm >= start || hm <= end;
}

export function promotionAppliesToMenuItem(
  promotion: HubPromotion,
  item: { id: string; categoryId: string },
): boolean {
  if (promotion.scope === "whole_menu") {
    return true;
  }

  if (promotion.scope === "categories") {
    return promotion.categoryIds.includes(item.categoryId);
  }

  return promotion.menuItemIds.includes(item.id);
}

export function promotionAdjustsItemPrice(promotion: HubPromotion): boolean {
  return promotion.kind === "percent_off" || promotion.kind === "fixed_amount_item";
}

export function computePromotionOfferPrice(listPrice: number, promotion: HubPromotion): number | null {
  if (!promotionAdjustsItemPrice(promotion)) {
    return null;
  }

  if (promotion.kind === "percent_off") {
    if (promotion.percentOff == null || promotion.percentOff <= 0) {
      return null;
    }
    return roundMoney(listPrice * (1 - promotion.percentOff / 100));
  }

  if (promotion.fixedAmountOff == null || promotion.fixedAmountOff <= 0) {
    return null;
  }

  return roundMoney(Math.max(0, listPrice - promotion.fixedAmountOff));
}

export function storefrontPromotionBannerFromHub(promotion: HubPromotion): StorefrontPromotionBanner {
  const detail = describeStorefrontPromotion(promotion);
  return {
    id: promotion.id,
    title: promotion.title,
    headline: promotion.title,
    detail,
    kind: promotion.kind,
  };
}

export function describeStorefrontPromotion(promotion: HubPromotion): string | undefined {
  switch (promotion.kind) {
    case "percent_off":
      return promotion.percentOff != null ? `${promotion.percentOff}% off selected menu` : undefined;
    case "fixed_amount_item":
      return promotion.fixedAmountOff != null ? `£${promotion.fixedAmountOff.toFixed(2)} off selected items` : undefined;
    case "bogo_item":
      return "Buy one, get one free on selected items";
    case "bundle_fixed_price":
      return promotion.bundleFixedPrice != null
        ? `Bundle deal for £${promotion.bundleFixedPrice.toFixed(2)}`
        : "Bundle deal available";
    default:
      return undefined;
  }
}

export function applyStorefrontPromotionsToMenu<T extends StorefrontMenuCategory>(
  categories: T[],
  promotions: HubPromotion[],
  now = new Date(),
): { categories: T[]; activePromotions: StorefrontPromotionBanner[] } {
  const active = promotions.filter((promotion) => isHubPromotionActiveNow(promotion, now));
  const activePromotions = active.map((promotion) => storefrontPromotionBannerFromHub(promotion));

  if (active.length === 0) {
    return { categories, activePromotions };
  }

  const pricedPromotions = active.filter(promotionAdjustsItemPrice);

  const categoriesWithOffers = categories.map((category) => ({
    ...category,
    items: category.items.map((item) => {
      const listPrice = item.price;
      let bestOffer: number | null = null;

      for (const promotion of pricedPromotions) {
        if (!promotionAppliesToMenuItem(promotion, item)) {
          continue;
        }

        const offerPrice = computePromotionOfferPrice(listPrice, promotion);
        if (offerPrice == null || offerPrice >= listPrice) {
          continue;
        }

        if (bestOffer == null || offerPrice < bestOffer) {
          bestOffer = offerPrice;
        }
      }

      if (bestOffer == null) {
        return item;
      }

      return {
        ...item,
        compareAtPrice: listPrice,
        price: bestOffer,
      };
    }),
  }));

  return { categories: categoriesWithOffers, activePromotions };
}
