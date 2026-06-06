import { z } from "zod";

import {
  getHubMenuOrderTicketConfig,
  HUB_MENU_CATEGORY_CUSTOM_ID,
  hubMenuCategorySelectOptions,
  isHubMenuOrderTicketCategory,
  isHubMenuStaffLibrarySection,
  type HubMenuCategoryPresetChoice,
  type HubMenuOrderTicketConfig,
} from "./hub-menu-presets";

export const hubMenuTemplateSchema = z.enum(["full_food", "simple_retail"]);
export type HubMenuTemplate = z.infer<typeof hubMenuTemplateSchema>;

export const HUB_MARKETPLACE_CATEGORY_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: "", label: "Not set (use business type only)" },
  { slug: "takeaways", label: "Takeaways" },
  { slug: "restaurants", label: "Restaurants" },
  { slug: "groceries", label: "Groceries" },
  { slug: "bakery", label: "Bakery" },
  { slug: "butcher", label: "Butcher" },
  { slug: "alcohol", label: "Alcohol" },
  { slug: "vapes", label: "Vapes" },
  { slug: "convenience", label: "Convenience" },
  { slug: "desserts", label: "Desserts" },
  { slug: "speciality", label: "Speciality" },
  { slug: "electronics", label: "Electronics" },
  { slug: "gifts", label: "Gifts" },
];

export function isSimpleRetailHubMenuTemplate(template: HubMenuTemplate | null | undefined): boolean {
  return template === "simple_retail";
}

export function isFullFoodHubMenuTemplate(template: HubMenuTemplate | null | undefined): boolean {
  return !template || template === "full_food";
}

export function readHubMenuTemplateFromDeliveryConfig(deliveryConfig: unknown): HubMenuTemplate {
  if (!deliveryConfig || typeof deliveryConfig !== "object") {
    return "full_food";
  }
  const raw = (deliveryConfig as { menuTemplate?: unknown }).menuTemplate;
  const parsed = hubMenuTemplateSchema.safeParse(raw);
  return parsed.success ? parsed.data : "full_food";
}

export function readMarketplaceCategorySlugFromDeliveryConfig(deliveryConfig: unknown): string {
  if (!deliveryConfig || typeof deliveryConfig !== "object") {
    return "";
  }
  const raw = (deliveryConfig as { marketplaceCategorySlug?: unknown }).marketplaceCategorySlug;
  return typeof raw === "string" ? raw.trim() : "";
}

export function hubMenuCategorySelectOptionsForTemplate(
  template: HubMenuTemplate | null | undefined,
): HubMenuCategoryPresetChoice[] {
  if (isSimpleRetailHubMenuTemplate(template)) {
    return hubMenuCategorySelectOptions().filter((option) => option.id === HUB_MENU_CATEGORY_CUSTOM_ID);
  }
  return hubMenuCategorySelectOptions();
}

export function isHubMenuOrderTicketCategoryForTemplate(
  section: { presetKey?: string | null; name?: string } | null | undefined,
  template: HubMenuTemplate | null | undefined = "full_food",
): boolean {
  if (isSimpleRetailHubMenuTemplate(template)) {
    return Boolean(section && !isHubMenuStaffLibrarySection(section));
  }
  return isHubMenuOrderTicketCategory(section);
}

const SIMPLE_RETAIL_ORDER_TICKET_CONFIG: HubMenuOrderTicketConfig = {
  useSubGroupHeaders: false,
  showPhoto: true,
  showVariations: false,
  showAgeCheck: true,
  showSpiceHeat: false,
  showDrinkSizes: false,
  showBulkPaste: true,
  introTitle: "Add products in a list",
  introBody: "Add each product on its own row with name and price — like a shop shelf or counter list.",
  namePlaceholder: "e.g. Product name",
};

export function getHubMenuOrderTicketConfigForTemplate(
  section: { presetKey?: string | null; name?: string } | null | undefined,
  template: HubMenuTemplate | null | undefined = "full_food",
): HubMenuOrderTicketConfig | null {
  if (isSimpleRetailHubMenuTemplate(template)) {
    return section && !isHubMenuStaffLibrarySection(section) ? SIMPLE_RETAIL_ORDER_TICKET_CONFIG : null;
  }
  return getHubMenuOrderTicketConfig(section);
}
