import { randomUUID } from "node:crypto";

import type { MenuItem } from "@hull-eats/types";

type MenuItemPersistInput = Omit<MenuItem, "categoryId"> & { categoryId?: string };

const PERSISTED_MENU_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistedMenuId(id: string): boolean {
  return PERSISTED_MENU_ID_PATTERN.test(id.trim());
}

export type HubMenuSectionPersistInput = {
  id: string;
  name: string;
  description?: string | null;
  presetKey?: string | null;
  defaultPrice: number | null;
  items: MenuItemPersistInput[];
};

/** Assign stable UUIDs for hub draft ids before writing menu_categories / menu_items. */
export function remapMenuSectionsForPersist(menuSections: HubMenuSectionPersistInput[]): {
  sections: HubMenuSectionPersistInput[];
  idMap: Map<string, string>;
} {
  const idMap = new Map<string, string>();

  const resolveId = (rawId: string): string => {
    const id = rawId.trim();
    if (!id) {
      return id;
    }
    const existing = idMap.get(id);
    if (existing) {
      return existing;
    }
    const resolved = isPersistedMenuId(id) ? id : randomUUID();
    idMap.set(id, resolved);
    return resolved;
  };

  const collectIds = (sections: HubMenuSectionPersistInput[]) => {
    for (const section of sections) {
      resolveId(section.id);
      for (const item of section.items) {
        resolveId(item.id);
        if (item.categoryId) {
          resolveId(item.categoryId);
        }
        for (const component of item.components) {
          resolveId(component.id);
        }
        for (const group of item.optionGroups) {
          resolveId(group.id);
          for (const valueId of group.showWhenValueIds) {
            resolveId(valueId);
          }
          for (const option of group.options) {
            resolveId(option.id);
          }
        }
      }
    }
  };

  collectIds(menuSections);

  const remapItem = (item: MenuItemPersistInput, categoryId: string): MenuItem => ({
    ...item,
    id: resolveId(item.id),
    categoryId,
    components: item.components.map((component) => ({
      ...component,
      id: resolveId(component.id),
    })),
    optionGroups: item.optionGroups.map((group) => ({
      ...group,
      id: resolveId(group.id),
      showWhenValueIds: group.showWhenValueIds.map((valueId) => resolveId(valueId)),
      options: group.options.map((option) => ({
        ...option,
        id: resolveId(option.id),
      })),
    })),
  });

  const sections = menuSections.map((section) => {
    const sectionId = resolveId(section.id);
    return {
      ...section,
      id: sectionId,
      items: section.items.map((item) => remapItem(item, sectionId)),
    };
  });

  return { sections, idMap };
}

export function persistedMenuEntityIds(sections: HubMenuSectionPersistInput[]): {
  categoryIds: string[];
  itemIds: string[];
} {
  const categoryIds = sections.map((section) => section.id).filter(isPersistedMenuId);
  const itemIds = sections.flatMap((section) => section.items.map((item) => item.id)).filter(isPersistedMenuId);
  return { categoryIds, itemIds };
}
