import { fileURLToPath } from "node:url";

import { prisma } from "@hull-eats/db";
import { hubConfigSnapshotPayloadSchema } from "@hull-eats/types";
import type { HubMenuSection, MenuItem } from "@hull-eats/types";

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

function activateMenuItem(item: MenuItem): MenuItem {
  return {
    ...item,
    isActive: true,
    stockStatus: item.stockStatus === "out_of_stock" ? "out_of_stock" : "in_stock",
  };
}

export function activateAllMenuSectionsLive(menuSections: HubMenuSection[]): HubMenuSection[] {
  return menuSections.map((section) => ({
    ...section,
    items: section.items.map((item) => activateMenuItem(item)),
  }));
}

export async function activateStoreMenuLive(storeId: string) {
  const beforeHidden = await prisma.menuItem.count({
    where: { category: { storeId }, isActive: false },
  });

  const itemUpdate = await prisma.menuItem.updateMany({
    where: { category: { storeId } },
    data: { isActive: true, stockStatus: "IN_STOCK" },
  });

  const snapshots = await prisma.hubConfigSnapshot.findMany({
    where: { storeId },
    select: { id: true, payload: true },
  });

  let snapshotsPatched = 0;
  for (const snapshot of snapshots) {
    try {
      const payload = hubConfigSnapshotPayloadSchema.parse(snapshot.payload);
      const nextSections = activateAllMenuSectionsLive(payload.menuSections);
      const hadHidden = payload.menuSections.some((section) => section.items.some((item) => !item.isActive));
      if (!hadHidden) {
        continue;
      }
      await prisma.hubConfigSnapshot.update({
        where: { id: snapshot.id },
        data: {
          payload: {
            ...payload,
            menuSections: nextSections,
          },
        },
      });
      snapshotsPatched += 1;
    } catch {
      // Skip malformed snapshot payloads.
    }
  }

  const afterHidden = await prisma.menuItem.count({
    where: { category: { storeId }, isActive: false },
  });

  return {
    itemsUpdated: itemUpdate.count,
    hiddenBefore: beforeHidden,
    hiddenAfter: afterHidden,
    snapshotsPatched,
  };
}

async function main() {
  loadRootEnv();

  const slug = slugify(CHEEKY_CHICKEN_HUB.businessName);
  const store = await prisma.store.findFirst({ where: { slug } });

  if (!store) {
    throw new Error(`Cheeky Chicken store not found (slug: ${slug}). Run db:provision-cheeky-chicken first.`);
  }

  const result = await activateStoreMenuLive(store.id);

  console.log("");
  console.log(`Cheeky Chicken — all menu items set live.`);
  console.log(`  Store: ${store.name} (${slug})`);
  console.log(`  Menu items updated: ${result.itemsUpdated}`);
  console.log(`  Hidden before → after: ${result.hiddenBefore} → ${result.hiddenAfter}`);
  if (result.snapshotsPatched > 0) {
    console.log(`  Config backups patched: ${result.snapshotsPatched}`);
  }
  console.log("");
  console.log("Refresh Menu Studio in the browser so the hub reloads from the database.");
  console.log("");
}

/** @deprecated Use activateStoreMenuLive */
export const activateCheekyChickenStoreMenu = activateStoreMenuLive;

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
