import type { MenuItem } from "@hull-eats/types";

const SAUCES_INCLUDED_MARKER = /__HULL_SAUCES_INCLUDED__/;
const SAUCES_EXTRA_MARKER = /__HULL_SAUCES_EXTRA__/;
const EXTRAS_MARKER = /__HULL_EXTRAS__/;
const MEAL_CHOICE_MARKER = /__HULL_MEAL_CHOICE__/;
const MEAL_DISABLED_MARKER = /__HULL_MEAL_DISABLED__/;
const PART_CHOICE_MARKER = /^__HULL_PART_CHOICE:(burger|kebab):([a-z0-9_-]+)__$/;
const SALAD_INCLUDED_MARKER = /__HULL_SALAD_INCLUDED__/;
const SALAD_EXTRA_MARKER = /__HULL_SALAD_EXTRA__/;

export const MEAL_ON_ITS_OWN_LABEL = "On its own";

function parsePartChoiceSlot(group: MenuItem["optionGroups"][number]): { line: string; slot: string } | null {
  const match = (group.description ?? "").trim().match(PART_CHOICE_MARKER);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return { line: match[1], slot: match[2] };
}

export function isMealChoiceGroup(group: MenuItem["optionGroups"][number]): boolean {
  return MEAL_CHOICE_MARKER.test(group.description ?? "") && !MEAL_DISABLED_MARKER.test(group.description ?? "");
}

export function isPizzaMenuItem(item: MenuItem): boolean {
  if (/__HULL_PIZZA_KIND:/i.test(item.description)) {
    return true;
  }
  return item.optionGroups.some((group) => group.isRequired && /size/i.test(group.name));
}

export function hasHubExtrasGroup(item: MenuItem): boolean {
  return item.optionGroups.some((group) => EXTRAS_MARKER.test(group.description ?? ""));
}

export function usesBurgerAddSheet(item: MenuItem): boolean {
  if (item.components.some((component) => component.removable)) {
    return true;
  }

  return item.optionGroups.some((group) => {
    const description = group.description ?? "";
    return (
      SAUCES_INCLUDED_MARKER.test(description) ||
      SAUCES_EXTRA_MARKER.test(description) ||
      EXTRAS_MARKER.test(description) ||
      MEAL_CHOICE_MARKER.test(description) ||
      PART_CHOICE_MARKER.test(description.trim()) ||
      SALAD_INCLUDED_MARKER.test(description) ||
      SALAD_EXTRA_MARKER.test(description)
    );
  });
}

export function usesItemAddSheet(item: MenuItem): boolean {
  if (isPizzaMenuItem(item)) {
    return true;
  }

  if (usesBurgerAddSheet(item)) {
    return true;
  }

  return item.optionGroups.length > 0 || item.components.some((component) => component.removable);
}

export function showsAddSheetSaladSection(item: MenuItem): boolean {
  if (!item.components.some((component) => component.removable)) {
    return false;
  }

  if (hasHubExtrasGroup(item)) {
    return false;
  }

  if (item.optionGroups.some((group) => parsePartChoiceSlot(group)?.slot === "salad")) {
    return false;
  }

  return true;
}

/** Burger-style items with hub extras use the extras list instead of separate sauce / part-salad groups. */
export function filterAddSheetOptionGroups(
  groups: MenuItem["optionGroups"],
  item: MenuItem,
): MenuItem["optionGroups"] {
  const burgerStyle = hasHubExtrasGroup(item) && !isPizzaMenuItem(item);
  if (!burgerStyle) {
    return groups;
  }

  return groups.filter((group) => {
    const description = group.description ?? "";
    if (SAUCES_INCLUDED_MARKER.test(description) || SAUCES_EXTRA_MARKER.test(description)) {
      return false;
    }
    if (SALAD_INCLUDED_MARKER.test(description) || SALAD_EXTRA_MARKER.test(description)) {
      return false;
    }
    const partChoice = parsePartChoiceSlot(group);
    if (partChoice?.slot === "salad") {
      return false;
    }
    return true;
  });
}

function groupSortRank(group: MenuItem["optionGroups"][number]): number {
  const description = group.description ?? "";

  if (group.isRequired && /size/i.test(group.name)) {
    return 0;
  }
  if (MEAL_CHOICE_MARKER.test(description)) {
    return 1;
  }
  if (description.trim().startsWith("__HULL_PIZZA_BASE__")) {
    return 2;
  }
  if (description.trim().startsWith("__HULL_PIZZA_CRUST__") || /^crust/i.test(group.name)) {
    return 3;
  }

  const partChoice = parsePartChoiceSlot(group);
  if (partChoice?.slot === "salad") {
    return 4;
  }

  if (SAUCES_INCLUDED_MARKER.test(description)) {
    return 5;
  }
  if (SAUCES_EXTRA_MARKER.test(description)) {
    return 6;
  }
  if (EXTRAS_MARKER.test(description)) {
    return 7;
  }
  if (partChoice) {
    return 8;
  }

  return 9;
}

export function sortAddSheetOptionGroups(groups: MenuItem["optionGroups"]): MenuItem["optionGroups"] {
  return [...groups].sort((left, right) => groupSortRank(left) - groupSortRank(right));
}

export function getAddSheetGroupTitle(group: MenuItem["optionGroups"][number]): string {
  const description = group.description ?? "";

  if (isMealChoiceGroup(group)) {
    return "How would you like it?";
  }
  if (SAUCES_INCLUDED_MARKER.test(description)) {
    return "Add your sauce";
  }
  if (SAUCES_EXTRA_MARKER.test(description)) {
    return "Extra sauce";
  }
  if (EXTRAS_MARKER.test(description)) {
    return "Extras";
  }

  const partChoice = parsePartChoiceSlot(group);
  if (partChoice?.slot === "salad") {
    return "Add your salad";
  }

  const name = group.name.trim() || "Options";
  return group.isRequired ? `${name} (required)` : name;
}

export function getAddSheetOptionPriceLabel(option: MenuItem["optionGroups"][number]["options"][number]): string | null {
  if (option.priceDelta > 0) {
    return `+${option.priceDelta.toFixed(2)}`;
  }
  return null;
}
