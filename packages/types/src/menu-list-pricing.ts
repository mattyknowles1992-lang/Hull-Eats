import type { MenuItem } from "./catalog";

function findRequiredSizeGroup(item: MenuItem) {
  return item.optionGroups.find(
    (group) => group.isRequired && /size/i.test(group.name) && group.options.some((option) => option.label.trim()),
  );
}

/** True when the item uses a required size group (pizza columns, drink sizes, etc.). */
export function menuItemUsesSizePricing(item: MenuItem): boolean {
  return Boolean(findRequiredSizeGroup(item));
}

export type MenuItemSizePriceLine = {
  label: string;
  price: number;
};

/** Full customer price per required size option (base item price + size delta). */
export function getMenuItemSizePriceLines(item: MenuItem): MenuItemSizePriceLine[] {
  const sizeGroup = findRequiredSizeGroup(item);
  if (!sizeGroup) {
    return [];
  }

  return sizeGroup.options
    .filter((option) => option.label.trim())
    .map((option) => ({
      label: option.label.trim(),
      price: Number((item.price + option.priceDelta).toFixed(2)),
    }));
}

/** Lowest price a customer could pay for this item on the menu. */
export function getMenuItemCustomerMinPrice(item: MenuItem): number {
  if (menuItemUsesSizePricing(item)) {
    const optionPrices = getMenuItemSizePriceLines(item).map((line) => line.price);
    return optionPrices.length > 0 ? Math.min(...optionPrices) : Number(item.price) || 0;
  }

  return Number(item.price) || 0;
}

/** Live customer menu items must have a positive list price (protects buyers from accidental £0 listings). */
export function isMenuItemPriceListable(item: MenuItem): boolean {
  return getMenuItemCustomerMinPrice(item) > 0;
}
