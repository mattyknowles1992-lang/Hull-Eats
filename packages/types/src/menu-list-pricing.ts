import type { MenuItem } from "./catalog";

/** True when the item uses a required size group (pizza columns, drink sizes, etc.). */
export function menuItemUsesSizePricing(item: MenuItem): boolean {
  return item.optionGroups.some(
    (group) => group.isRequired && /size/i.test(group.name) && group.options.some((option) => option.label.trim()),
  );
}

/** Lowest price a customer could pay for this item on the menu. */
export function getMenuItemCustomerMinPrice(item: MenuItem): number {
  if (menuItemUsesSizePricing(item)) {
    const sizeGroup = item.optionGroups.find((group) => group.isRequired && /size/i.test(group.name));
    const optionPrices = (sizeGroup?.options ?? [])
      .filter((option) => option.label.trim())
      .map((option) => Number((item.price + option.priceDelta).toFixed(2)));
    return optionPrices.length > 0 ? Math.min(...optionPrices) : Number(item.price) || 0;
  }

  return Number(item.price) || 0;
}

/** Live customer menu items must have a positive list price (protects buyers from accidental £0 listings). */
export function isMenuItemPriceListable(item: MenuItem): boolean {
  return getMenuItemCustomerMinPrice(item) > 0;
}
