import type { MenuItem } from "@hull-eats/types";

export function usesItemAddSheet(item: MenuItem): boolean {
  if (/__HULL_PIZZA_KIND:/i.test(item.description)) {
    return true;
  }

  return item.optionGroups.some((group) => group.isRequired && /size/i.test(group.name));
}

function groupSortRank(group: MenuItem["optionGroups"][number]): number {
  if (group.isRequired && /size/i.test(group.name)) {
    return 0;
  }
  if ((group.description ?? "").trim().startsWith("__HULL_PIZZA_BASE__")) {
    return 1;
  }
  if ((group.description ?? "").trim().startsWith("__HULL_PIZZA_CRUST__") || /^crust/i.test(group.name)) {
    return 2;
  }
  if ((group.description ?? "").includes("__HULL_EXTRAS__")) {
    return 3;
  }
  return 4;
}

export function sortAddSheetOptionGroups(groups: MenuItem["optionGroups"]): MenuItem["optionGroups"] {
  return [...groups].sort((left, right) => groupSortRank(left) - groupSortRank(right));
}

export function getAddSheetGroupTitle(group: MenuItem["optionGroups"][number]): string {
  if ((group.description ?? "").includes("__HULL_EXTRAS__")) {
    return "Extra";
  }

  const name = group.name.trim() || "Options";
  return group.isRequired ? `${name}(Required)` : name;
}

export function getAddSheetOptionPriceLabel(option: MenuItem["optionGroups"][number]["options"][number]): string | null {
  if (option.priceDelta > 0) {
    return `+${option.priceDelta.toFixed(2)}`;
  }
  return null;
}
