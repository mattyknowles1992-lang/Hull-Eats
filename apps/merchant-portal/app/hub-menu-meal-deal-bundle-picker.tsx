"use client";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import { HubMenuMealDealStepsEditor } from "./hub-menu-meal-deal-steps-editor";

type Props = {
  item: MenuItem;
  menuSections: HubMenuSection[];
  readOnly?: boolean;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
};

/** Meal deal bundle configuration — flexible steps (products, categories, or full menu). */
export function HubMenuMealDealBundlePicker({ item, menuSections, readOnly, onUpdateItem }: Props) {
  return (
    <HubMenuMealDealStepsEditor
      item={item}
      menuSections={menuSections}
      readOnly={readOnly}
      onUpdateItem={onUpdateItem}
    />
  );
}
