/**
 * Applies standard test pizza sizes (7", 10", 12", 16" @ £10 each) to every pizza hub in the database.
 * Safe to re-run — overwrites category size tables and pizza-row size groups.
 */
import type { MenuItem } from "@hull-eats/types";
import {
  applyPizzaSizeTableToEncodedCategoryDescription,
  applyStandardTestPizzaSizesToMenuItem,
  buildStandardTestPizzaSizeTable,
  decodeHubMenuCategoryDescription,
  isHubMenuSectionPizza,
  menuItemHasPizzaKindMarker,
} from "@hull-eats/types";
import { prisma } from "@hull-eats/db";

import { loadRootEnv } from "./env.js";

const PIZZA_CATEGORY_NAME = /\b(pizzas?|calzones?|garlic\s+bread)\b/i;
const NON_PIZZA_ITEM_NAME = /\b(dip|sauce|drink|can of|bottle|coke|pepsi|water)\b/i;

function isPizzaCategory(name: string, presetKey: string | null): boolean {
  if (presetKey === "pizza") {
    return true;
  }
  if (isHubMenuSectionPizza({ presetKey, name })) {
    return true;
  }
  return PIZZA_CATEGORY_NAME.test(name);
}

function shouldSizeMenuItem(item: { name: string; description: string }, categoryIsPizza: boolean, presetKey: string | null): boolean {
  if (menuItemHasPizzaKindMarker({ description: item.description } as MenuItem)) {
    return true;
  }
  if (!categoryIsPizza) {
    return false;
  }
  if (NON_PIZZA_ITEM_NAME.test(item.name)) {
    return false;
  }
  if (presetKey === "pizza") {
    return true;
  }
  return /\b(pizza|calzone|garlic)\b/i.test(item.name);
}

function parseCustomisationConfig(raw: unknown): { optionGroups: MenuItem["optionGroups"]; components: MenuItem["components"] } {
  if (!raw || typeof raw !== "object") {
    return { optionGroups: [], components: [] };
  }
  const config = raw as { optionGroups?: unknown; components?: unknown };
  return {
    optionGroups: Array.isArray(config.optionGroups) ? (config.optionGroups as MenuItem["optionGroups"]) : [],
    components: Array.isArray(config.components) ? (config.components as MenuItem["components"]) : [],
  };
}

async function main(): Promise<void> {
  loadRootEnv();

  const sizeTable = buildStandardTestPizzaSizeTable();
  const categories = await prisma.menuCategory.findMany({
    where: { isActive: true },
    include: {
      menuItems: true,
      store: { select: { slug: true, name: true } },
    },
  });

  let categoriesUpdated = 0;
  let itemsUpdated = 0;

  for (const category of categories) {
    const decoded = decodeHubMenuCategoryDescription(category.description ?? "");
    const presetKey = decoded.presetKey;
    if (!isPizzaCategory(category.name, presetKey)) {
      continue;
    }

    const nextDescription = applyPizzaSizeTableToEncodedCategoryDescription(category.description ?? "", sizeTable);
    if (nextDescription !== category.description) {
      await prisma.menuCategory.update({
        where: { id: category.id },
        data: { description: nextDescription },
      });
      categoriesUpdated += 1;
    }

    for (const row of category.menuItems) {
      if (!shouldSizeMenuItem(row, true, presetKey)) {
        continue;
      }

      const parsed = parseCustomisationConfig(row.customisationConfig);
      const draft: MenuItem = {
        id: row.id,
        categoryId: category.id,
        name: row.name,
        description: row.description ?? "",
        price: Number(row.price),
        isActive: row.isActive,
        trackStock: row.trackStock,
        stockQuantity: row.stockQuantity,
        stockStatus: row.stockStatus as MenuItem["stockStatus"],
        allowBackorder: row.allowBackorder,
        maxPerOrder: row.maxPerOrder,
        requiresIdVerification: false,
        sortOrder: row.sortOrder,
        components: parsed.components,
        optionGroups: parsed.optionGroups,
      };

      const sized = applyStandardTestPizzaSizesToMenuItem(draft);

      await prisma.menuItem.update({
        where: { id: row.id },
        data: {
          price: sized.price,
          customisationConfig: {
            components: sized.components,
            optionGroups: sized.optionGroups,
          },
        },
      });
      itemsUpdated += 1;
      console.log(`  ${category.store.slug}: ${row.name} → sizes @ £${sized.price}`);
    }

    console.log(`Updated pizza category "${category.name}" (${category.store.slug})`);
  }

  console.log(`\nDone. ${categoriesUpdated} categories, ${itemsUpdated} pizza items set to 7"/10"/12"/16" @ £10.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
