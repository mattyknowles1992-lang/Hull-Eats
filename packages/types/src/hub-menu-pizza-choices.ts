/** Hub-only marker on pizza category descriptions — stripped before customers see category notes. */
export const HULL_PIZZA_CATEGORY_CHOICES_PREFIX = /__HULL_PIZZA_CATEGORY_CHOICES:([\s\S]*?)__(?:\r?\n|$)/;

export function stripHubPizzaCategoryChoicesMarker(text: string): string {
  return text.replace(HULL_PIZZA_CATEGORY_CHOICES_PREFIX, "").trim();
}
