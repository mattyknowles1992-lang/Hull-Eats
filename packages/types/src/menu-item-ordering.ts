import type { MenuItem } from "./catalog";
import { isHubMenuMealDealsCategory } from "./hub-menu-presets";
import { isMealDealCustomerItem } from "./meal-deals";

/**
 * True when the hub published customisation the customer must confirm before adding to basket.
 * Plain name+price items with no options skip straight to basket.
 */
export function menuItemRequiresCustomerConfiguration(
  item: MenuItem,
  categoryPresetKey?: string | null,
): boolean {
  if (isHubMenuMealDealsCategory({ presetKey: categoryPresetKey })) {
    return true;
  }
  if (isMealDealCustomerItem(item)) {
    return true;
  }
  if (/__HULL_PIZZA_KIND:/i.test(item.description ?? "")) {
    return true;
  }
  if (item.optionGroups.length > 0) {
    return true;
  }
  if (item.components.some((component) => component.removable)) {
    return true;
  }
  return false;
}
