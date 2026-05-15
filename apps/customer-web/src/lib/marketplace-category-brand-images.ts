/**
 * Optional artwork in `public/brand/category_images/<stem>.png`.
 * Used only when a category or subcategory slug/label normalizes to the same stem as the filename (no guessing).
 */

const basePath = "/brand/category_images";

/**
 * Stems that exist on disk (must stay in sync with `public/brand/category_images/*.png`).
 * `electronics` is intentionally omitted — the asset file is named `eletronics.png`.
 */
export const BRAND_CATEGORY_IMAGE_STEMS = [
  "chicken",
  "desserts",
  "drinks",
  "eletronics",
  "kababs",
  "pastery",
  "sausages",
  "snacks",
  "takeaway",
  "vapes",
] as const;

const stemSet = new Set<string>(BRAND_CATEGORY_IMAGE_STEMS);

/** Lowercase alphanumeric only — comparable to file stem. */
export function normalizeCategoryImageKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * If any candidate normalizes to an existing `category_images` stem, return that PNG URL.
 * Otherwise return `fallbackUrl` (typically the original Unsplash URL).
 */
export function resolveBrandCategoryImage(candidates: string[], fallbackUrl: string): string {
  for (const raw of candidates) {
    if (!raw?.trim()) {
      continue;
    }
    const norm = normalizeCategoryImageKey(raw);
    if (stemSet.has(norm)) {
      return `${basePath}/${norm}.png`;
    }
  }
  return fallbackUrl;
}
