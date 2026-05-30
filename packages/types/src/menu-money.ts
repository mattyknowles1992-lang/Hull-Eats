import type { MenuItem } from "./catalog";

/** Postgres DECIMAL(10, 2) max magnitude (strictly less than 10^8). */
export const MAX_MENU_MONEY_AMOUNT = 99_999_999.99;

export function sanitizeMenuMoneyAmount(raw: unknown, fallback = 0): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return sanitizeMenuMoneyAmount(fallback, 0);
  }
  return Math.min(Number(value.toFixed(2)), MAX_MENU_MONEY_AMOUNT);
}

export function sanitizeMenuItemMoneyFields<T extends Pick<MenuItem, "price" | "optionGroups">>(item: T): T {
  return {
    ...item,
    price: sanitizeMenuMoneyAmount(item.price),
    optionGroups: item.optionGroups.map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        priceDelta: sanitizeMenuMoneyAmount(option.priceDelta),
      })),
    })),
  };
}

export function sanitizeHubMenuSectionMoneyFields<
  T extends { defaultPrice: number | null; items: Array<Pick<MenuItem, "price" | "optionGroups">> },
>(section: T): T {
  return {
    ...section,
    defaultPrice:
      section.defaultPrice == null ? null : sanitizeMenuMoneyAmount(section.defaultPrice),
    items: section.items.map((item) => sanitizeMenuItemMoneyFields(item)),
  };
}
