/** Local brand artwork under `public/brand/category_images/`. */

const base = "/brand/category_images";

export const brandCategoryImages = {
  takeaway: `${base}/takeaway.png`,
  vapes: `${base}/vapes.png`,
  chicken: `${base}/chicken.png`,
  desserts: `${base}/desserts.png`,
  drinks: `${base}/drinks.png`,
  /** Filename matches asset bundle (typo in original file). */
  electronics: `${base}/eletronics.png`,
  kababs: `${base}/kababs.png`,
  pastery: `${base}/pastery.png`,
  sausages: `${base}/sausages.png`,
  snacks: `${base}/snacks.png`,
} as const;

/** Rail chip + default hero for each primary marketplace category slug. */
export const marketplaceMainCategoryImageBySlug = {
  takeaways: brandCategoryImages.takeaway,
  restaurants: brandCategoryImages.chicken,
  groceries: brandCategoryImages.snacks,
  bakery: brandCategoryImages.pastery,
  butcher: brandCategoryImages.sausages,
  alcohol: brandCategoryImages.drinks,
  vapes: brandCategoryImages.vapes,
  convenience: brandCategoryImages.snacks,
  desserts: brandCategoryImages.desserts,
  speciality: brandCategoryImages.kababs,
  electronics: brandCategoryImages.electronics,
  gifts: brandCategoryImages.desserts,
} as const satisfies Record<string, string>;

export type MarketplaceMainCategorySlug = keyof typeof marketplaceMainCategoryImageBySlug;

export function marketplaceCategoryHeroImages(slug: string): string[] {
  const primary =
    marketplaceMainCategoryImageBySlug[slug as MarketplaceMainCategorySlug] ?? brandCategoryImages.takeaway;
  switch (slug) {
    case "takeaways":
      return [brandCategoryImages.takeaway, brandCategoryImages.chicken, brandCategoryImages.kababs];
    case "restaurants":
      return [brandCategoryImages.chicken, brandCategoryImages.takeaway, brandCategoryImages.kababs];
    case "groceries":
      return [brandCategoryImages.snacks, brandCategoryImages.drinks, brandCategoryImages.pastery];
    case "bakery":
      return [brandCategoryImages.pastery, brandCategoryImages.desserts, brandCategoryImages.snacks];
    case "butcher":
      return [brandCategoryImages.sausages, brandCategoryImages.chicken, brandCategoryImages.takeaway];
    case "alcohol":
      return [brandCategoryImages.drinks, brandCategoryImages.snacks, brandCategoryImages.desserts];
    case "vapes":
      return [brandCategoryImages.vapes, brandCategoryImages.electronics, brandCategoryImages.snacks];
    case "convenience":
      return [brandCategoryImages.snacks, brandCategoryImages.drinks, brandCategoryImages.desserts];
    case "desserts":
      return [brandCategoryImages.desserts, brandCategoryImages.pastery, brandCategoryImages.drinks];
    case "speciality":
      return [brandCategoryImages.kababs, brandCategoryImages.sausages, brandCategoryImages.pastery];
    case "electronics":
      return [brandCategoryImages.electronics, brandCategoryImages.vapes, brandCategoryImages.snacks];
    case "gifts":
      return [brandCategoryImages.desserts, brandCategoryImages.pastery, brandCategoryImages.snacks];
    default:
      return [primary, primary, primary];
  }
}

/** Subcategory thumbnails — only uses the brand pack (no Unsplash). */
export function marketplaceSubcategoryImage(parentSlug: string, label: string): string {
  const lower = label.toLowerCase();

  if (/(kebab|shawarma|doner)/.test(lower)) {
    return brandCategoryImages.kababs;
  }
  if (/(chicken|wing|strip)/.test(lower)) {
    return brandCategoryImages.chicken;
  }
  if (/(drink|beer|wine|spirit|cider|mixer|cola|juice|water|tonic|soft|no alcohol)/.test(lower)) {
    return brandCategoryImages.drinks;
  }
  if (/(dessert|sweet|waffle|cookie|ice cream|gelato|cake|shake|milkshake|churro|brownie)/.test(lower)) {
    return brandCategoryImages.desserts;
  }
  if (/(pastry|bread|croissant|bake|savoury|pie|pasty)/.test(lower)) {
    return brandCategoryImages.pastery;
  }
  if (/(sausage|steak|meat|bbq|barbecue|butcher|marinade|breakfast|bacon)/.test(lower)) {
    return brandCategoryImages.sausages;
  }
  if (/(snack|crisp|essential|cupboard|frozen|household|fresh food|convenience)/.test(lower)) {
    return brandCategoryImages.snacks;
  }
  if (/(vape|pod|liquid|eliquid|device)/.test(lower)) {
    return brandCategoryImages.vapes;
  }
  if (/(charger|cable|headphone|phone|battery|tech|gadget|accessories)/.test(lower)) {
    return brandCategoryImages.electronics;
  }
  if (/(burger|pizza|curry|wrap|loaded fries|takeaway|kitchen|meal)/.test(lower)) {
    return brandCategoryImages.takeaway;
  }
  if (/(flower|card|gift|celebration|hamper|treat box|self care)/.test(lower)) {
    return brandCategoryImages.desserts;
  }
  if (/(cheese|deli|artisan|premium|local maker)/.test(lower)) {
    return brandCategoryImages.kababs;
  }

  return (
    marketplaceMainCategoryImageBySlug[parentSlug as MarketplaceMainCategorySlug] ?? brandCategoryImages.takeaway
  );
}
