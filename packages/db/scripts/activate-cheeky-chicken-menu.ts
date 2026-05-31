import { prisma } from "@hull-eats/db";

import { CHEEKY_CHICKEN_HUB } from "./cheeky-chicken-menu-data.js";
import { loadRootEnv } from "./env.js";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function main() {
  loadRootEnv();

  const slug = slugify(CHEEKY_CHICKEN_HUB.businessName);
  const store = await prisma.store.findFirst({ where: { slug } });

  if (!store) {
    throw new Error(`Cheeky Chicken store not found (slug: ${slug}). Run db:provision-cheeky-chicken first.`);
  }

  const updated = await prisma.menuItem.updateMany({
    where: { category: { storeId: store.id } },
    data: { isActive: true, stockStatus: "IN_STOCK" },
  });

  console.log("");
  console.log(`Cheeky Chicken — marked ${updated.count} menu item(s) live.`);
  console.log(`  Store: ${store.name} (${slug})`);
  console.log("");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
