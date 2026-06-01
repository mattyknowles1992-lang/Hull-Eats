/**
 * Wires extras-library toppings to all pizza-category items via category extras config.
 * Customer menu enrichment adds the "Extras" group at API read time.
 */
import { randomUUID } from "node:crypto";

import { decodeHubMenuCategoryDescription, HUB_MENU_EXTRAS_LIBRARY_PRESET } from "@hull-eats/types";
import { prisma } from "@hull-eats/db";

import {
  applyPizzaCategoryExtrasToSections,
  CATEGORY_EXTRAS_CONFIG_ITEM_ID,
  type CategoryExtrasAssignment,
} from "./pizza-category-extras-lib.js";
import { loadRootEnv } from "./env.js";

const PIZZA_CATEGORY_NAME = /\b(pizzas?|calzones?|garlic\s+bread|pizza\s+fries)\b/i;

function parseAssignmentsFromDescription(description: string): CategoryExtrasAssignment[] {
  const match = description.match(/^__HULL_CATEGORY_EXTRAS:(.+?)__$/s);
  if (!match?.[1]) {
    return [];
  }
  try {
    const parsed = JSON.parse(match[1]) as { assignments?: CategoryExtrasAssignment[] };
    return Array.isArray(parsed.assignments) ? parsed.assignments : [];
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  loadRootEnv();

  const stores = await prisma.store.findMany({
    select: { id: true, slug: true, name: true },
  });

  let hubsUpdated = 0;

  for (const store of stores) {
    const categories = await prisma.menuCategory.findMany({
      where: { storeId: store.id, isActive: true },
      include: { menuItems: { where: { isActive: true } } },
      orderBy: { sortOrder: "asc" },
    });

    const extrasCategory = categories.find((category) => {
      const decoded = decodeHubMenuCategoryDescription(category.description ?? "");
      return decoded.presetKey === HUB_MENU_EXTRAS_LIBRARY_PRESET;
    });

    if (!extrasCategory) {
      continue;
    }

    const toppings = extrasCategory.menuItems.filter((item) => item.id !== CATEGORY_EXTRAS_CONFIG_ITEM_ID);
    if (toppings.length === 0) {
      continue;
    }

    const pizzaCategories = categories.filter((category) => {
      if (category.id === extrasCategory.id) {
        return false;
      }
      const decoded = decodeHubMenuCategoryDescription(category.description ?? "");
      return decoded.presetKey === "pizza" || PIZZA_CATEGORY_NAME.test(category.name);
    });

    if (pizzaCategories.length === 0) {
      continue;
    }

    const hubSections = categories.map((category) => {
      const decoded = decodeHubMenuCategoryDescription(category.description ?? "");
      return {
        id: category.id,
        name: category.name,
        description: category.description ?? "",
        presetKey: decoded.presetKey,
        defaultPrice: Number(category.defaultPrice ?? 0),
        items: category.menuItems.map((item) => ({
          id: item.id,
          categoryId: category.id,
          name: item.name,
          description: item.description ?? "",
          price: Number(item.price),
          isActive: item.isActive,
          trackStock: item.trackStock,
          stockQuantity: item.stockQuantity,
          stockStatus: item.stockStatus as "in_stock" | "out_of_stock" | "low_stock",
          allowBackorder: item.allowBackorder,
          maxPerOrder: item.maxPerOrder,
          requiresIdVerification: false,
          sortOrder: item.sortOrder,
          components: [],
          optionGroups: [],
        })),
      };
    });

    const nextSections = applyPizzaCategoryExtrasToSections(hubSections);
    const nextExtras = nextSections.find((section) => section.presetKey === HUB_MENU_EXTRAS_LIBRARY_PRESET);
    const configItem = nextExtras?.items.find((item) => item.id === CATEGORY_EXTRAS_CONFIG_ITEM_ID);
    if (!configItem?.description) {
      continue;
    }

    const assignments = parseAssignmentsFromDescription(configItem.description);
    if (assignments.length === 0) {
      continue;
    }

    const existingConfig = await prisma.menuItem.findFirst({
      where: {
        categoryId: extrasCategory.id,
        description: { startsWith: "__HULL_CATEGORY_EXTRAS:" },
      },
      select: { id: true },
    });

    if (existingConfig) {
      await prisma.menuItem.update({
        where: { id: existingConfig.id },
        data: { description: configItem.description, isActive: false, price: 0 },
      });
    } else {
      await prisma.menuItem.create({
        data: {
          id: randomUUID(),
          categoryId: extrasCategory.id,
          name: "Category extras data",
          description: configItem.description,
          price: 0,
          isActive: false,
          sortOrder: 9999,
        },
      });
    }

    console.log(
      `${store.slug}: linked ${toppings.length} extras to ${assignments.length} pizza categories (${assignments.reduce((n, row) => n + row.itemIds.length, 0)} items)`,
    );
    hubsUpdated += 1;
  }

  console.log(`\nDone. ${hubsUpdated} hub(s) now have pizza category extras.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
