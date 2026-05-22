import type { MenuItem } from "@hull-eats/types";

export type MenuCustomisationSelection = {
  selectedOptionQuantities: Record<string, number>;
  removedComponentIds: string[];
};

const getGroupSelectionCount = (item: MenuItem, groupId: string, selectedOptionQuantities: Record<string, number>) => {
  const group = item.optionGroups.find((entry) => entry.id === groupId);
  if (!group) {
    return 0;
  }
  return group.options.reduce((sum, option) => sum + (selectedOptionQuantities[option.id] ?? 0), 0);
};

const getGroupMinimum = (group: MenuItem["optionGroups"][number]) => {
  if (!group.isRequired) {
    return group.minSelections;
  }
  return Math.max(group.minSelections, 1);
};

const getVisibleGroupIds = (item: MenuItem, selectedOptionQuantities: Record<string, number>) => {
  const selectedValueIds = Object.entries(selectedOptionQuantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([valueId]) => valueId);

  return new Set(
    item.optionGroups
      .filter(
        (group) =>
          group.showWhenValueIds.length === 0 ||
          group.showWhenValueIds.some((valueId) => selectedValueIds.includes(valueId)),
      )
      .map((group) => group.id),
  );
};

export const synchroniseMenuSelection = (item: MenuItem, selection: MenuCustomisationSelection): MenuCustomisationSelection => {
  const nextQuantities = { ...selection.selectedOptionQuantities };
  const visibleGroupIds = getVisibleGroupIds(item, nextQuantities);

  item.optionGroups.forEach((group) => {
    const groupOptionIds = new Set(group.options.map((option) => option.id));
    if (!visibleGroupIds.has(group.id)) {
      Object.keys(nextQuantities).forEach((optionId) => {
        if (groupOptionIds.has(optionId)) {
          delete nextQuantities[optionId];
        }
      });
    }
  });

  return {
    selectedOptionQuantities: nextQuantities,
    removedComponentIds: selection.removedComponentIds.filter((componentId) =>
      item.components.some((component) => component.id === componentId),
    ),
  };
};

export const getDefaultMenuCustomisationSelection = (item: MenuItem): MenuCustomisationSelection => {
  const selectedOptionQuantities: Record<string, number> = {};

  item.optionGroups.forEach((group) => {
    const defaultOptions = group.options.filter((option) => option.isDefault);
    const optionsToSelect = defaultOptions.length > 0 ? defaultOptions : group.isRequired ? group.options.slice(0, 1) : [];

    if (group.selectionMode === "single") {
      const first = optionsToSelect[0];
      if (first) {
        selectedOptionQuantities[first.id] = 1;
      }
      return;
    }

    let remaining = group.maxSelections ?? optionsToSelect.length;
    optionsToSelect.forEach((option) => {
      if (remaining <= 0) {
        return;
      }
      const quantity = Math.min(option.maxQuantity, remaining);
      selectedOptionQuantities[option.id] = quantity;
      remaining -= quantity;
    });
  });

  return synchroniseMenuSelection(item, {
    selectedOptionQuantities,
    removedComponentIds: [],
  });
};

export const getVisibleOptionGroups = (item: MenuItem, selectedOptionQuantities: Record<string, number>) =>
  item.optionGroups.filter(
    (group) =>
      group.showWhenValueIds.length === 0 ||
      group.showWhenValueIds.some((valueId) => (selectedOptionQuantities[valueId] ?? 0) > 0),
  );

export const getSelectedQuantityForOption = (selection: MenuCustomisationSelection, optionId: string) =>
  selection.selectedOptionQuantities[optionId] ?? 0;

export const getMenuCustomisationValidationErrors = (item: MenuItem, selection: MenuCustomisationSelection) =>
  getVisibleOptionGroups(item, selection.selectedOptionQuantities).flatMap((group) => {
    const selectedCount = getGroupSelectionCount(item, group.id, selection.selectedOptionQuantities);
    const minimumSelections = getGroupMinimum(group);
    const maximumSelections = group.selectionMode === "single" ? 1 : group.maxSelections;
    const issues: string[] = [];

    if (selectedCount < minimumSelections) {
      issues.push(`${group.name}: choose at least ${minimumSelections}.`);
    }
    if (maximumSelections !== null && selectedCount > maximumSelections) {
      issues.push(`${group.name}: choose no more than ${maximumSelections}.`);
    }
    return issues;
  });

export const getMenuCustomisationExtraTotal = (item: MenuItem, selection: MenuCustomisationSelection) => {
  const visibleGroups = getVisibleOptionGroups(item, selection.selectedOptionQuantities);
  return Number(
    visibleGroups
      .flatMap((group) =>
        group.options
          .filter((option) => (selection.selectedOptionQuantities[option.id] ?? 0) > 0)
          .map((option) => option.priceDelta * (selection.selectedOptionQuantities[option.id] ?? 0)),
      )
      .reduce((sum, value) => sum + value, 0)
      .toFixed(2),
  );
};

export function getGroupCountLabel(group: MenuItem["optionGroups"][number]) {
  if (group.selectionMode === "single") {
    return group.isRequired ? "Pick one (required)" : "Pick one (optional)";
  }
  const max = group.maxSelections;
  if (group.isRequired) {
    return max ? `Pick up to ${max} (required)` : "Pick any amount (required)";
  }
  return max ? `Pick up to ${max} (optional)` : "Pick any amount (optional)";
}
