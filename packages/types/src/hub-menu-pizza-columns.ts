/** Hub-only marker on pizza category descriptions — stripped before customers see category notes. */
export const HULL_PIZZA_SIZE_COLUMNS_PREFIX = /^__HULL_PIZZA_SIZE_COLUMNS:([\s\S]*?)__(?:\r?\n)?/;

export function stripHubPizzaSizeColumnsMarker(text: string): string {
  return text.replace(HULL_PIZZA_SIZE_COLUMNS_PREFIX, "").trim();
}
