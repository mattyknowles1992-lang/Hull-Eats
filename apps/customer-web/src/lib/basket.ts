import type { MenuItem } from "@hull-eats/types";
import { parseExtraIncludedQuantity } from "@hull-eats/types";

export type BasketSelectedOption = {
  groupId: string;
  groupName: string;
  valueId: string;
  valueName: string;
  quantity: number;
  priceDelta: number;
};

export type BasketRemovedComponent = {
  componentId: string;
  label: string;
  quantity: number;
};

export type BasketComponentSnapshot = {
  componentId: string;
  label: string;
  quantity: number;
  removed: boolean;
};

export type BasketLine = {
  lineId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  /** Copied from menu item when added; used for checkout copy without re-fetching menu. */
  requiresIdVerification?: boolean;
  notes?: string;
  selectedOptionQuantities: Record<string, number>;
  removedComponentIds: string[];
  selectedOptions: BasketSelectedOption[];
  removedComponents: BasketRemovedComponent[];
  components: BasketComponentSnapshot[];
};

export type StoreBasket = {
  storeId: string;
  storeSlug: string;
  storeName: string;
  items: BasketLine[];
};

export type BasketCustomisationSelection = {
  selectedOptionQuantities: Record<string, number>;
  removedComponentIds: string[];
};

const basketKey = (storeSlug: string) => `hull-eats:basket:${storeSlug}`;

const isBrowser = () => typeof window !== "undefined";

const emitBasketUpdate = (storeSlug: string) => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent("hull-eats-basket-updated", { detail: { storeSlug } }));
};

const sortValues = (values: string[]) => [...values].sort((left, right) => left.localeCompare(right));

const normaliseOptionQuantities = (selectedOptionQuantities: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(selectedOptionQuantities)
      .filter(([, quantity]) => quantity > 0)
      .sort(([left], [right]) => left.localeCompare(right)),
  );

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
        (group) => group.showWhenValueIds.length === 0 || group.showWhenValueIds.some((valueId) => selectedValueIds.includes(valueId)),
      )
      .map((group) => group.id),
  );
};

export const synchroniseSelection = (item: MenuItem, selection: BasketCustomisationSelection): BasketCustomisationSelection => {
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
      return;
    }

    const selectedEntries = group.options.filter((option) => (nextQuantities[option.id] ?? 0) > 0);

    if (group.selectionMode === "single") {
      if (selectedEntries.length > 1) {
        const [firstSelected] = selectedEntries;

        selectedEntries.slice(1).forEach((option) => {
          delete nextQuantities[option.id];
        });

        if (firstSelected) {
          nextQuantities[firstSelected.id] = 1;
        }
      }

      if (selectedEntries.length === 0 && group.isRequired) {
        const fallback = group.options.find((option) => option.isDefault) ?? group.options[0];

        if (fallback) {
          nextQuantities[fallback.id] = 1;
        }
      }
    }

    if (group.selectionMode === "multiple" && getGroupSelectionCount(item, group.id, nextQuantities) === 0) {
      const defaultOptions = group.options.filter((option) => option.isDefault);
      const requiredMinimum = getGroupMinimum(group);

      if (requiredMinimum > 0 && defaultOptions.length > 0) {
        let remaining = requiredMinimum;

        defaultOptions.forEach((option) => {
          if (remaining <= 0) {
            return;
          }

          const quantity = Math.min(option.maxQuantity, remaining);
          nextQuantities[option.id] = quantity;
          remaining -= quantity;
        });
      }
    }
  });

  return {
    removedComponentIds: sortValues(selection.removedComponentIds),
    selectedOptionQuantities: normaliseOptionQuantities(nextQuantities),
  };
};

export const getDefaultCustomisationSelection = (item: MenuItem): BasketCustomisationSelection => {
  const selectedOptionQuantities = item.optionGroups.reduce<Record<string, number>>((current, group) => {
    const defaultOptions = group.options.filter((option) => option.isDefault);

    if (group.selectionMode === "single") {
      const fallback = defaultOptions[0];

      if (fallback) {
        current[fallback.id] = 1;
      }

      return current;
    }

    defaultOptions.forEach((option) => {
      current[option.id] = 1;
    });

    return current;
  }, {});

  return synchroniseSelection(item, {
    selectedOptionQuantities,
    removedComponentIds: [],
  });
};

export const getVisibleOptionGroups = (item: MenuItem, selectedOptionQuantities: Record<string, number>) =>
  item.optionGroups.filter(
    (group) =>
      group.options.length > 0 &&
      (group.showWhenValueIds.length === 0 ||
        group.showWhenValueIds.some((valueId) => (selectedOptionQuantities[valueId] ?? 0) > 0)),
  );

export const getSelectedQuantityForOption = (selection: BasketCustomisationSelection, optionId: string) =>
  selection.selectedOptionQuantities[optionId] ?? 0;

export const getSelectionValidationErrors = (item: MenuItem, selection: BasketCustomisationSelection) =>
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

export const getBasketLineDetails = (item: MenuItem, selection: BasketCustomisationSelection) => {
  const visibleGroups = getVisibleOptionGroups(item, selection.selectedOptionQuantities);
  const selectedOptions = visibleGroups.flatMap((group) =>
    group.options
      .filter((option) => (selection.selectedOptionQuantities[option.id] ?? 0) > 0)
      .map((option) => {
        const quantity = selection.selectedOptionQuantities[option.id] ?? 0;
        const includedFree = parseExtraIncludedQuantity(option.description);
        const billableQuantity = Math.max(0, quantity - includedFree);
        return {
          groupId: group.id,
          groupName: group.name,
          valueId: option.id,
          valueName: option.label,
          quantity,
          priceDelta: Number((option.priceDelta * billableQuantity).toFixed(2)),
        };
      }),
  );

  const removedComponents = item.components
    .filter((component) => selection.removedComponentIds.includes(component.id))
    .map((component) => ({
      componentId: component.id,
      label: component.label,
      quantity: component.quantity,
    }));

  const components = item.components.map((component) => ({
    componentId: component.id,
    label: component.label,
    quantity: component.quantity,
    removed: selection.removedComponentIds.includes(component.id),
  }));

  const customisationTotal = Number(
    selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0).toFixed(2),
  );

  return {
    selectedOptions,
    removedComponents,
    components,
    customisationTotal,
  };
};

const buildLineSignature = (
  menuItemId: string,
  selection: BasketCustomisationSelection,
  notes?: string,
) =>
  JSON.stringify({
    menuItemId,
    selectedOptionQuantities: normaliseOptionQuantities(selection.selectedOptionQuantities),
    removedComponentIds: sortValues(selection.removedComponentIds),
    notes: notes?.trim() || "",
  });

export const loadBasket = (storeSlug: string): StoreBasket | null => {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(basketKey(storeSlug));

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoreBasket;

    return {
      ...parsed,
      items: (parsed.items ?? []).map((line) => ({
        ...line,
        requiresIdVerification: line.requiresIdVerification ?? false,
        selectedOptionQuantities: line.selectedOptionQuantities ?? {},
        removedComponentIds: line.removedComponentIds ?? [],
        selectedOptions: line.selectedOptions ?? [],
        removedComponents: line.removedComponents ?? [],
        components: line.components ?? [],
      })),
    };
  } catch {
    return null;
  }
};

export const saveBasket = (basket: StoreBasket) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(basketKey(basket.storeSlug), JSON.stringify(basket));
  emitBasketUpdate(basket.storeSlug);
};

export const clearBasket = (storeSlug: string) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(basketKey(storeSlug));
  emitBasketUpdate(storeSlug);
};

export const addConfiguredItemToBasket = (
  store: Pick<StoreBasket, "storeId" | "storeSlug" | "storeName">,
  item: MenuItem,
  selection: BasketCustomisationSelection,
  options?: { quantity?: number; notes?: string },
) => {
  const current =
    loadBasket(store.storeSlug) ?? {
      ...store,
      items: [],
    };

  const quantity = Math.max(1, Math.floor(options?.quantity ?? 1));
  const notes = options?.notes?.trim() || undefined;
  const details = getBasketLineDetails(item, selection);
  const signature = buildLineSignature(item.id, selection, notes);
  const existing = current.items.find((entry) => entry.lineId === signature);

  if (existing) {
    existing.quantity += quantity;
  } else {
    current.items.push({
      lineId: signature,
      menuItemId: item.id,
      name: item.name,
      quantity,
      unitPrice: Number((item.price + details.customisationTotal).toFixed(2)),
      requiresIdVerification: item.requiresIdVerification ?? false,
      notes,
      selectedOptionQuantities: normaliseOptionQuantities(selection.selectedOptionQuantities),
      removedComponentIds: sortValues(selection.removedComponentIds),
      selectedOptions: details.selectedOptions,
      removedComponents: details.removedComponents,
      components: details.components,
    });
  }

  saveBasket(current);
};

export const updateBasketQuantity = (storeSlug: string, lineId: string, quantity: number) => {
  const current = loadBasket(storeSlug);

  if (!current) {
    return;
  }

  current.items = current.items
    .map((entry) => (entry.lineId === lineId ? { ...entry, quantity } : entry))
    .filter((entry) => entry.quantity > 0);

  saveBasket(current);
};

export const getBasketItemCount = (basket: StoreBasket | null) =>
  basket?.items.reduce((count, entry) => count + entry.quantity, 0) ?? 0;

export const getBasketSubtotal = (basket: StoreBasket | null) =>
  Number((basket?.items.reduce((sum, entry) => sum + entry.unitPrice * entry.quantity, 0) ?? 0).toFixed(2));
