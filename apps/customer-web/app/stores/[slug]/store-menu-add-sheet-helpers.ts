import type { MenuItem } from "@hull-eats/types";

const SAUCES_INCLUDED_MARKER = /__HULL_SAUCES_INCLUDED__/;
const SAUCES_EXTRA_MARKER = /__HULL_SAUCES_EXTRA__/;
const EXTRAS_MARKER = /__HULL_EXTRAS__/;
const MEAL_CHOICE_MARKER = /__HULL_MEAL_CHOICE__/;
const PART_CHOICE_MARKER = /^__HULL_PART_CHOICE:(burger|kebab):([a-z0-9_-]+)__$/;

function parsePartChoiceSlot(group: MenuItem["optionGroups"][number]): { line: string; slot: string } | null {
  const match = (group.description ?? "").trim().match(PART_CHOICE_MARKER);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return { line: match[1], slot: match[2] };
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
      PART_CHOICE_MARKER.test(description.trim())
    );
  });
}

export function usesItemAddSheet(item: MenuItem): boolean {
  if (/__HULL_PIZZA_KIND:/i.test(item.description)) {
    return true;
  }

  if (item.optionGroups.some((group) => group.isRequired && /size/i.test(group.name))) {
    return true;
  }

  return usesBurgerAddSheet(item);
}

export function showsAddSheetSaladSection(item: MenuItem): boolean {
  return item.components.some((component) => component.removable);
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
