import { randomUUID } from "node:crypto";

import { hashPassword } from "@hull-eats/auth";
import type { HubMenuSection, MenuItem } from "@hull-eats/types";
import { encodeHubMenuCategoryDescription } from "@hull-eats/types";
import { prisma } from "@hull-eats/db";
import { StoreType } from "@prisma/client";

import { buildCheekyChickenMenuSections, buildCheekyChickenDeliveryConfig, buildCheekyChickenOpeningHours, CHEEKY_CHICKEN_BUSINESS, CHEEKY_CHICKEN_HUB } from "./cheeky-chicken-menu-data.js";
import { activateCheekyChickenStoreMenu } from "./activate-cheeky-chicken-menu.js";
import { loadRootEnv } from "./env.js";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function buildCustomisationConfig(item: MenuItem) {
  return {
    components: item.components ?? [],
    optionGroups: item.optionGroups ?? [],
  };
}

async function persistStoreOpeningHours(storeId: string) {
  const openingHours = buildCheekyChickenOpeningHours();
  await prisma.storeHour.deleteMany({ where: { storeId } });
  await prisma.storeHour.createMany({
    data: openingHours.map((day) => ({
      storeId,
      dayOfWeek: day.dayOfWeek,
      openTime: day.openTime,
      closeTime: day.closeTime,
      isClosed: !day.isOpen,
    })),
  });
}

async function persistBusinessSettings(storeId: string) {
  await prisma.store.update({
    where: { id: storeId },
    data: {
      deliveryFee: CHEEKY_CHICKEN_BUSINESS.deliveryFee,
      minimumOrderAmount: CHEEKY_CHICKEN_BUSINESS.minimumOrderAmount,
      etaMinutes: CHEEKY_CHICKEN_BUSINESS.etaMinutes,
      onboardingMessage: CHEEKY_CHICKEN_BUSINESS.onboardingMessage,
      deliveryConfig: buildCheekyChickenDeliveryConfig(),
    },
  });
}

async function persistMenuSections(storeId: string, menuSections: HubMenuSection[]) {
  if (menuSections.length === 0) {
    throw new Error("Menu sections cannot be empty.");
  }

  const incomingSectionIds = menuSections.map((section) => section.id);
  const incomingItemIds = menuSections.flatMap((section) => section.items.map((item) => item.id));

  await prisma.menuItem.deleteMany({
    where: {
      category: { storeId },
      ...(incomingItemIds.length > 0 ? { id: { notIn: incomingItemIds } } : {}),
    },
  });

  await prisma.menuCategory.deleteMany({
    where: {
      storeId,
      ...(incomingSectionIds.length > 0 ? { id: { notIn: incomingSectionIds } } : {}),
    },
  });

  for (const [sectionIndex, section] of menuSections.entries()) {
    await prisma.menuCategory.upsert({
      where: { id: section.id },
      update: {
        name: section.name,
        description: encodeHubMenuCategoryDescription(section.presetKey ?? null, section.description ?? ""),
        defaultPrice: section.defaultPrice,
        sortOrder: sectionIndex,
        isActive: true,
      },
      create: {
        id: section.id,
        storeId,
        name: section.name,
        description: encodeHubMenuCategoryDescription(section.presetKey ?? null, section.description ?? ""),
        defaultPrice: section.defaultPrice,
        sortOrder: sectionIndex,
        isActive: true,
      },
    });

    for (const [itemIndex, item] of section.items.entries()) {
      await prisma.menuItem.upsert({
        where: { id: item.id },
        update: {
          name: item.name,
          description: item.description ?? "",
          price: item.price,
          imageUrl: item.imageUrl ?? null,
          customisationConfig: buildCustomisationConfig(item),
          isActive: item.isActive,
          trackStock: item.trackStock,
          stockQuantity: item.stockQuantity,
          stockStatus: item.stockStatus.toUpperCase() as "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK",
          allowBackorder: item.allowBackorder,
          maxPerOrder: item.maxPerOrder,
          requiresIdVerification: item.requiresIdVerification ?? false,
          sortOrder: itemIndex,
        },
        create: {
          id: item.id,
          categoryId: section.id,
          name: item.name,
          description: item.description ?? "",
          price: item.price,
          imageUrl: item.imageUrl ?? null,
          customisationConfig: buildCustomisationConfig(item),
          isActive: item.isActive,
          trackStock: item.trackStock,
          stockQuantity: item.stockQuantity,
          stockStatus: item.stockStatus.toUpperCase() as "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK",
          allowBackorder: item.allowBackorder,
          maxPerOrder: item.maxPerOrder,
          requiresIdVerification: item.requiresIdVerification ?? false,
          sortOrder: itemIndex,
        },
      });
    }
  }
}

async function main() {
  loadRootEnv();

  const slug = slugify(CHEEKY_CHICKEN_HUB.businessName);
  const ownerEmail = CHEEKY_CHICKEN_HUB.ownerEmail.trim().toLowerCase();
  const menuSections = buildCheekyChickenMenuSections();

  let merchant = await prisma.merchant.findUnique({ where: { slug } });
  let store = merchant ? await prisma.store.findFirst({ where: { merchantId: merchant.id }, orderBy: { createdAt: "asc" } }) : null;
  let createdHub = false;

  if (!merchant || !store) {
    createdHub = true;
    merchant = await prisma.merchant.create({
      data: {
        id: randomUUID(),
        slug,
        name: CHEEKY_CHICKEN_HUB.businessName,
        supportEmail: ownerEmail,
        isActive: true,
      },
    });

    store = await prisma.store.create({
      data: {
        id: randomUUID(),
        merchantId: merchant.id,
        slug,
        name: CHEEKY_CHICKEN_HUB.businessName,
        type: StoreType.TAKEAWAY,
        storefrontStatus: "ONBOARDING",
        menuSetupComplete: false,
        addressLine1: "Cheeky Chicken",
        city: CHEEKY_CHICKEN_HUB.city,
        postcode: CHEEKY_CHICKEN_HUB.postcode,
        timezone: "Europe/London",
        cuisineLabel: CHEEKY_CHICKEN_HUB.cuisineLabel,
        onboardingMessage: CHEEKY_CHICKEN_BUSINESS.onboardingMessage,
        deliveryFee: CHEEKY_CHICKEN_BUSINESS.deliveryFee,
        minimumOrderAmount: CHEEKY_CHICKEN_BUSINESS.minimumOrderAmount,
        etaMinutes: CHEEKY_CHICKEN_BUSINESS.etaMinutes,
        deliveryConfig: buildCheekyChickenDeliveryConfig(),
        isActive: false,
      },
    });

    const existingUser = await prisma.hubUser.findFirst({
      where: { OR: [{ email: ownerEmail }, { username: ownerEmail }] },
    });

    if (existingUser) {
      await prisma.hubUser.update({
        where: { id: existingUser.id },
        data: {
          merchantId: merchant.id,
          fullName: `${CHEEKY_CHICKEN_HUB.businessName} Owner`,
          email: ownerEmail,
          username: ownerEmail,
          passwordHash: hashPassword(CHEEKY_CHICKEN_HUB.password),
          role: "OWNER",
          status: "ACTIVE",
          isActive: true,
          mustChangePassword: false,
        },
      });
    } else {
      await prisma.hubUser.create({
        data: {
          id: randomUUID(),
          merchantId: merchant.id,
          fullName: `${CHEEKY_CHICKEN_HUB.businessName} Owner`,
          email: ownerEmail,
          username: ownerEmail,
          passwordHash: hashPassword(CHEEKY_CHICKEN_HUB.password),
          role: "OWNER",
          status: "ACTIVE",
          isActive: true,
        },
      });
    }
  } else {
    await prisma.hubUser.updateMany({
      where: { merchantId: merchant.id, role: "OWNER" },
      data: {
        passwordHash: hashPassword(CHEEKY_CHICKEN_HUB.password),
        email: ownerEmail,
        username: ownerEmail,
      },
    });
  }

  await persistBusinessSettings(store.id);
  await persistStoreOpeningHours(store.id);
  await persistMenuSections(store.id, menuSections);

  const activation = await activateCheekyChickenStoreMenu(store.id);

  const itemCount = menuSections.reduce((total, section) => total + section.items.length, 0);
  const customerCategories = menuSections.filter((section) => !section.presetKey?.includes("library")).length;

  console.log("");
  console.log("Cheeky Chicken hub ready");
  console.log(`  Hub: ${CHEEKY_CHICKEN_HUB.businessName}`);
  console.log(`  Slug: ${slug}`);
  console.log(`  Merchant id: ${merchant.id}`);
  console.log(`  Store id: ${store.id}`);
  console.log(`  Login email: ${ownerEmail}`);
  console.log(`  Password: ${CHEEKY_CHICKEN_HUB.password}`);
  console.log(`  Menu sections: ${menuSections.length} (${customerCategories} customer categories)`);
  console.log(`  Menu items: ${itemCount} (${activation.itemsUpdated} saved live)`);
  console.log(`  Hidden items in DB: ${activation.hiddenAfter}`);
  console.log(`  Meal upgrade: £${CHEEKY_CHICKEN_HUB.mealUpgradePrice.toFixed(2)} (Regular fries & can)`);
  console.log(`  Min order: £${CHEEKY_CHICKEN_BUSINESS.minimumOrderAmount.toFixed(2)}`);
  console.log(`  Delivery from: £${CHEEKY_CHICKEN_BUSINESS.deliveryFee.toFixed(2)} (${CHEEKY_CHICKEN_BUSINESS.deliveryDistanceRanges.length} distance tiers)`);
  console.log(`  Opening: Mon–Sun ${CHEEKY_CHICKEN_BUSINESS.openingTime}–${CHEEKY_CHICKEN_BUSINESS.closingTime}`);
  console.log(`  Collection: Mon–Sun ${CHEEKY_CHICKEN_BUSINESS.pickupFromTime}–${CHEEKY_CHICKEN_BUSINESS.closingTime} (note in hub message; shared opening-hours schedule is delivery window)`);
  console.log(`  Hub ${createdHub ? "created" : "updated"} — customer menu items are provisioned live.`);
  console.log("");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
