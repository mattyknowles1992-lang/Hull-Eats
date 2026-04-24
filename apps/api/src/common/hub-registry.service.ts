import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";

import { hashPassword, verifyPassword } from "@hull-eats/auth";
import { prisma } from "@hull-eats/db";
import { loadedMunchMenuSections, loadedMunchStore } from "@hull-eats/sdk";
import type {
  ApplyMenuImportInput,
  CreateHubInput,
  CreateHubMenuItemInput,
  CreateHubMenuSectionInput,
  CreateHubUserInput,
  HubMenuImportBatch,
  HubMenuImportCandidate,
  HubMenuSection,
  HubSettings,
  HubSummary,
  HubUser,
  MerchantWorkspace,
  MerchantWorkspaceUpdateInput,
  PreviewMenuImportInput,
  PreviewMenuTextImportInput,
} from "@hull-eats/types";

const categoryLikeLine = /^[A-Za-z][A-Za-z\s&/+'-]{1,40}$/;
const ignoredImportLines = [
  /^read more$/i,
  /^show less$/i,
  /^highlights$/i,
  /^search in /i,
  /^\d+\s+items?$/i,
  /^no min\. order$/i,
  /^delivery$/i,
  /^fees apply/i,
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createImportCandidate(seed: string, index: number, input: Omit<HubMenuImportCandidate, "id">): HubMenuImportCandidate {
  return {
    id: `candidate-${seed}-${index}`,
    ...input,
  };
}

function extractPrice(value: string) {
  const match = value.match(/[\u00A3$]?\s*(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
}

function cleanImportLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function shouldIgnoreImportLine(value: string) {
  return ignoredImportLines.some((pattern) => pattern.test(value));
}

function parsePastedMenuText(rawText: string, seed: string): HubMenuImportCandidate[] {
  const lines = rawText
    .split(/\r?\n/)
    .map(cleanImportLine)
    .filter(Boolean);

  const candidates: HubMenuImportCandidate[] = [];
  let currentCategory = "Imported items";
  let pendingItemName = "";

  for (const line of lines) {
    if (shouldIgnoreImportLine(line)) {
      continue;
    }

    const slashParts = line
      .split("/")
      .map((part) => cleanImportLine(part))
      .filter(Boolean);

    if (slashParts.length >= 3) {
      const slashPrice = extractPrice(slashParts.at(-1) ?? "");
      if (slashPrice !== null) {
        candidates.push(
          createImportCandidate(seed, candidates.length + 1, {
            suggestedCategoryName: slashParts[0] ?? currentCategory,
            itemName: slashParts[1] ?? "Imported item",
            description: "Parsed from pasted storefront text. Review before publishing.",
            price: slashPrice,
            sourceLine: line,
          }),
        );
        pendingItemName = "";
        continue;
      }
    }

    const price = extractPrice(line);

    if (categoryLikeLine.test(line) && price === null) {
      currentCategory = line;
      pendingItemName = "";
      continue;
    }

    if (/^from\s*[\u00A3$]/i.test(line) || /^[\u00A3$]\s*\d/.test(line)) {
      if (pendingItemName && price !== null) {
        candidates.push(
          createImportCandidate(seed, candidates.length + 1, {
            suggestedCategoryName: currentCategory,
            itemName: pendingItemName,
            description: "Parsed from pasted storefront text. Review before publishing.",
            price,
            sourceLine: `${pendingItemName} / ${line}`,
          }),
        );
      }
      pendingItemName = "";
      continue;
    }

    if (price !== null) {
      const itemName =
        cleanImportLine(line.replace(/\s*(?:from\s*)?[\u00A3$]?\s*\d+(?:\.\d{1,2})?.*$/i, "")) || pendingItemName;
      if (itemName) {
        candidates.push(
          createImportCandidate(seed, candidates.length + 1, {
            suggestedCategoryName: currentCategory,
            itemName,
            description: "Parsed from pasted storefront text. Review before publishing.",
            price,
            sourceLine: line,
          }),
        );
      }
      pendingItemName = "";
      continue;
    }

    if (line.length <= 90) {
      pendingItemName = line;
    }
  }

  if (candidates.length > 0) {
    return candidates.slice(0, 40);
  }

  return [
    createImportCandidate(seed, 1, {
      suggestedCategoryName: "Imported items",
      itemName: "Review imported line item",
      description: "We could not confidently split the pasted text into items yet. Edit or remove this suggestion.",
      price: 0,
      sourceLine: rawText.slice(0, 120),
    }),
  ];
}

@Injectable()
export class HubRegistryService {
  private pilotEnsured = false;

  async listHubs(): Promise<HubSummary[]> {
    await this.ensurePilotHub();

    const merchants = await prisma.merchant.findMany({
      include: {
        stores: {
          orderBy: { createdAt: "asc" },
        },
        hubUsers: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const hubs = await Promise.all(
      merchants
        .filter((merchant) => merchant.stores.length > 0)
        .map((merchant) => this.buildHubSummary(merchant, merchant.stores[0]!, merchant.hubUsers)),
    );

    return hubs;
  }

  async listHubUsers() {
    await this.ensurePilotHub();

    const users = await prisma.hubUser.findMany({
      where: { isActive: true },
      include: {
        merchant: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return users.map((user) => ({
      id: user.id,
      hubId: user.merchantId,
      hubBusinessName: user.merchant.name,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      role: user.role.toLowerCase(),
      status: user.status.toLowerCase(),
    }));
  }

  async createHub(input: CreateHubInput) {
    await this.ensurePilotHub();

    const slug = slugify(input.businessName) || `hub-${Date.now()}`;
    const ownerName = `${input.businessName} Owner`;
    const ownerEmail = `${slug}@hub.local`;

    const [usernameExists, emailExists, slugExists] = await Promise.all([
      prisma.hubUser.findUnique({ where: { username: input.hubUsername.trim() } }),
      prisma.hubUser.findUnique({ where: { email: ownerEmail } }),
      prisma.merchant.findUnique({ where: { slug } }),
    ]);

    if (usernameExists) {
      throw new BadRequestException("That hub username is already in use.");
    }

    if (emailExists || slugExists) {
      throw new BadRequestException("A hub for that business already exists.");
    }

    const created = await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: {
          slug,
          name: input.businessName,
          isActive: true,
        },
      });

      const store = await tx.store.create({
        data: {
          merchantId: merchant.id,
          slug,
          name: input.businessName,
          type: this.mapStoreTypeToDb(input.type),
          storefrontStatus: "ONBOARDING",
          menuSetupComplete: false,
          addressLine1: "",
          city: "Hull",
          postcode: "",
          timezone: "Europe/London",
          onboardingMessage: "New hub created from the admin panel. Add categories, items, pricing, and images here.",
          deliveryFee: 0,
          minimumOrderAmount: 0,
          etaMinutes: this.parseLeadMinutes(input.deliveryLeadTime),
          isActive: true,
        },
      });

      const ownerUser = await tx.hubUser.create({
        data: {
          merchantId: merchant.id,
          fullName: ownerName,
          email: ownerEmail,
          username: input.hubUsername.trim(),
          passwordHash: hashPassword(input.hubPassword),
          role: "OWNER",
          status: "ACTIVE",
          isActive: true,
        },
      });

      return { merchant, store, ownerUser };
    });

    return {
      hub: await this.buildHubSummary(created.merchant, created.store, [created.ownerUser]),
      ownerUser: this.mapHubUser(created.ownerUser),
      temporaryPassword: input.hubPassword,
    };
  }

  async deleteHub(hubId: string) {
    await this.ensurePilotHub();

    const merchant = await prisma.merchant.findUnique({
      where: { id: hubId },
    });

    if (!merchant) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    await prisma.merchant.delete({
      where: { id: hubId },
    });

    return {
      deletedHubId: hubId,
      deletedBusinessName: merchant.name,
    };
  }

  async authenticate(username: string, password: string) {
    await this.ensurePilotHub();

    const hubUser = await prisma.hubUser.findUnique({
      where: { username: username.trim() },
    });

    if (!hubUser || !hubUser.isActive || hubUser.status === "DISABLED" || !verifyPassword(password, hubUser.passwordHash)) {
      throw new UnauthorizedException("Hub username or password did not match a provisioned business account.");
    }

    const workspace = await this.getWorkspaceById(hubUser.merchantId);
    const activeUser = workspace.users.find((entry) => entry.id === hubUser.id) ?? this.mapHubUser(hubUser);

    return {
      user: activeUser,
      workspace,
    };
  }

  async getWorkspaceById(hubId: string): Promise<MerchantWorkspace> {
    await this.ensurePilotHub();

    const record = await this.fetchMerchantWorkspaceRecord(hubId);
    return this.mapMerchantWorkspace(record);
  }

  async updateWorkspace(hubId: string, input: MerchantWorkspaceUpdateInput): Promise<MerchantWorkspace> {
    await this.ensurePilotHub();

    const record = await this.fetchMerchantWorkspaceRecord(hubId);
    const store = record.stores[0];

    if (!store) {
      throw new NotFoundException(`Hub ${hubId} does not have a store configured yet.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.merchant.update({
        where: { id: hubId },
        data: {
          name: input.settings.name,
        },
      });

      await tx.store.update({
        where: { id: store.id },
        data: {
          slug: slugify(input.settings.name) || store.slug,
          name: input.settings.name,
          city: input.settings.city,
          postcode: input.settings.postcode,
          cuisineLabel: input.settings.cuisineLabel,
          onboardingMessage: input.settings.onboardingMessage,
          heroImageUrl: input.settings.heroImageUrl,
          etaMinutes: input.settings.etaMinutes,
          deliveryFee: input.settings.deliveryFee,
          minimumOrderAmount: input.settings.minimumOrderAmount,
          isActive: true,
          storefrontStatus: input.settings.isOpen ? "LIVE" : "ONBOARDING",
        },
      });

      for (const [sectionIndex, section] of input.menuSections.entries()) {
        await tx.menuCategory.upsert({
          where: { id: section.id },
          update: {
            name: section.name,
            description: section.description,
            sortOrder: sectionIndex,
            isActive: true,
          },
          create: {
            id: section.id,
            storeId: store.id,
            name: section.name,
            description: section.description,
            sortOrder: sectionIndex,
            isActive: true,
          },
        });

        for (const [itemIndex, item] of section.items.entries()) {
          await tx.menuItem.upsert({
            where: { id: item.id },
            update: {
              name: item.name,
              description: item.description,
              price: item.price,
              imageUrl: item.imageUrl,
              isActive: item.isActive,
              trackStock: item.trackStock,
              stockQuantity: item.stockQuantity,
              stockStatus: this.mapStockStatusToDb(item.stockStatus),
              allowBackorder: item.allowBackorder,
              maxPerOrder: item.maxPerOrder,
              sortOrder: itemIndex,
            },
            create: {
              id: item.id,
              categoryId: section.id,
              name: item.name,
              description: item.description,
              price: item.price,
              imageUrl: item.imageUrl,
              isActive: item.isActive,
              trackStock: item.trackStock,
              stockQuantity: item.stockQuantity,
              stockStatus: this.mapStockStatusToDb(item.stockStatus),
              allowBackorder: item.allowBackorder,
              maxPerOrder: item.maxPerOrder,
              sortOrder: itemIndex,
            },
          });
        }
      }
    });

    return this.getWorkspaceById(hubId);
  }

  async createHubUser(hubId: string, input: CreateHubUserInput) {
    await this.ensurePilotHub();

    const merchant = await prisma.merchant.findUnique({ where: { id: hubId } });
    if (!merchant) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    const duplicate = await prisma.hubUser.findFirst({
      where: {
        OR: [{ username: input.username.trim() }, { email: input.email.trim() }],
      },
    });

    if (duplicate) {
      throw new BadRequestException("That username or email is already in use.");
    }

    const createdUser = await prisma.hubUser.create({
      data: {
        merchantId: hubId,
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        username: input.username.trim(),
        passwordHash: hashPassword(input.password),
        role: this.mapMembershipRoleToDb(input.role),
        status: "ACTIVE",
        isActive: true,
      },
    });

    return this.mapHubUser(createdUser);
  }

  async deleteHubUser(hubId: string, userId: string) {
    await this.ensurePilotHub();

    const user = await prisma.hubUser.findFirst({
      where: {
        id: userId,
        merchantId: hubId,
      },
    });

    if (!user) {
      throw new NotFoundException(`Hub user ${userId} was not found.`);
    }

    const ownerCount = await prisma.hubUser.count({
      where: {
        merchantId: hubId,
        role: "OWNER",
        isActive: true,
      },
    });

    if (user.role === "OWNER" && ownerCount <= 1) {
      throw new BadRequestException("Every hub must keep at least one owner.");
    }

    await prisma.hubUser.delete({
      where: { id: userId },
    });

    return {
      deletedUserId: userId,
    };
  }

  async createMenuSection(hubId: string, input: CreateHubMenuSectionInput) {
    await this.ensurePilotHub();

    const store = await this.findPrimaryStore(hubId);
    const currentCount = await prisma.menuCategory.count({
      where: { storeId: store.id },
    });

    const section = await prisma.menuCategory.create({
      data: {
        storeId: store.id,
        name: input.name,
        description: input.description,
        sortOrder: currentCount,
        isActive: true,
      },
    });

    return this.mapMenuSection(section, []);
  }

  async deleteMenuSection(hubId: string, sectionId: string) {
    await this.ensurePilotHub();

    const section = await prisma.menuCategory.findFirst({
      where: {
        id: sectionId,
        store: {
          merchantId: hubId,
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} was not found.`);
    }

    await prisma.menuCategory.delete({
      where: { id: sectionId },
    });

    return {
      deletedSectionId: sectionId,
    };
  }

  async createMenuItem(hubId: string, sectionId: string, input: CreateHubMenuItemInput) {
    await this.ensurePilotHub();

    const section = await prisma.menuCategory.findFirst({
      where: {
        id: sectionId,
        store: {
          merchantId: hubId,
        },
      },
      include: {
        menuItems: true,
      },
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} was not found.`);
    }

    const newItem = await prisma.menuItem.create({
      data: {
        categoryId: sectionId,
        name: input.name,
        description: input.description,
        price: input.price,
        isActive: true,
        isFeatured: false,
        trackStock: false,
        stockQuantity: null,
        stockStatus: "IN_STOCK",
        allowBackorder: false,
        maxPerOrder: null,
        sortOrder: section.menuItems.length,
      },
    });

    return this.mapMenuItem(newItem);
  }

  async deleteMenuItem(hubId: string, itemId: string) {
    await this.ensurePilotHub();

    const item = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        category: {
          store: {
            merchantId: hubId,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item ${itemId} was not found.`);
    }

    await prisma.menuItem.delete({
      where: { id: itemId },
    });

    return {
      deletedItemId: itemId,
    };
  }

  async previewMenuImport(hubId: string, input: PreviewMenuImportInput) {
    await this.ensurePilotHub();

    const store = await this.findPrimaryStore(hubId);
    const seed = String(Date.now());
    const batch = await prisma.menuImportBatch.create({
      data: {
        storeId: store.id,
        sourceType: "IMAGE",
        sourceLabel: input.imageName,
        status: "PENDING_REVIEW",
        candidates: {
          create: [
            {
              suggestedCategoryName: "Burgers",
              itemName: "Classic Smash Burger",
              description: "Seeded from uploaded menu image for review before publishing.",
              price: 8.99,
              sourceLine: "Burgers / Classic Smash Burger / £8.99",
              sortOrder: 0,
            },
            {
              suggestedCategoryName: "Loaded Fries",
              itemName: "BBQ Pulled Pork Fries",
              description: "Seeded from uploaded menu image for review before publishing.",
              price: 9.99,
              sourceLine: "Loaded Fries / BBQ Pulled Pork Fries / £9.99",
              sortOrder: 1,
            },
            {
              suggestedCategoryName: "Meal Deals",
              itemName: "Burger Meal Deal",
              description: "Burger, fries, and drink meal deal parsed from the uploaded page.",
              price: 12.99,
              sourceLine: `Meal Deals / Burger Meal Deal / £12.99 / ${seed}`,
              sortOrder: 2,
            },
          ],
        },
      },
      include: {
        candidates: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return this.mapImportBatch(batch);
  }

  async previewMenuTextImport(hubId: string, input: PreviewMenuTextImportInput) {
    await this.ensurePilotHub();

    const store = await this.findPrimaryStore(hubId);
    const seed = String(Date.now());
    const candidates = parsePastedMenuText(input.rawText, seed);

    const batch = await prisma.menuImportBatch.create({
      data: {
        storeId: store.id,
        sourceType: "TEXT",
        sourceLabel: "Pasted storefront text",
        status: "PENDING_REVIEW",
        candidates: {
          create: candidates.map((candidate, index) => ({
            suggestedCategoryName: candidate.suggestedCategoryName,
            itemName: candidate.itemName,
            description: candidate.description,
            price: candidate.price,
            sourceLine: candidate.sourceLine,
            sortOrder: index,
          })),
        },
      },
      include: {
        candidates: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return this.mapImportBatch(batch);
  }

  async applyMenuImport(hubId: string, importId: string, input: ApplyMenuImportInput) {
    await this.ensurePilotHub();

    const batch = await prisma.menuImportBatch.findFirst({
      where: {
        id: importId,
        store: {
          merchantId: hubId,
        },
      },
      include: {
        candidates: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException(`Import ${importId} was not found.`);
    }

    await prisma.$transaction(async (tx) => {
      for (const candidate of batch.candidates.filter((entry) => input.acceptedCandidateIds.includes(entry.id))) {
        let section = await tx.menuCategory.findFirst({
          where: {
            storeId: batch.storeId,
            name: candidate.suggestedCategoryName,
          },
        });

        if (!section) {
          const existingCount = await tx.menuCategory.count({
            where: { storeId: batch.storeId },
          });

          section = await tx.menuCategory.create({
            data: {
              storeId: batch.storeId,
              name: candidate.suggestedCategoryName,
              description: "Created from reviewed menu import.",
              sortOrder: existingCount,
              isActive: true,
            },
          });
        }

        const sectionItemCount = await tx.menuItem.count({
          where: { categoryId: section.id },
        });

        await tx.menuItem.create({
          data: {
            categoryId: section.id,
            name: candidate.itemName,
            description: candidate.description,
            price: candidate.price,
            isActive: true,
            isFeatured: false,
            trackStock: false,
            stockQuantity: null,
            stockStatus: "IN_STOCK",
            allowBackorder: false,
            maxPerOrder: null,
            sortOrder: sectionItemCount,
          },
        });
      }

      await tx.menuImportBatch.delete({
        where: { id: importId },
      });
    });

    return this.getWorkspaceById(hubId);
  }

  private async ensurePilotHub() {
    if (this.pilotEnsured) {
      return;
    }

    const merchantSlug = "loaded-munch";
    const storeSlug = loadedMunchStore.slug;
    const merchant = await prisma.merchant.upsert({
      where: { slug: merchantSlug },
      update: {
        name: loadedMunchStore.name,
        isActive: true,
      },
      create: {
        slug: merchantSlug,
        name: loadedMunchStore.name,
        isActive: true,
      },
    });

    const store = await prisma.store.upsert({
      where: { slug: storeSlug },
      update: {
        merchantId: merchant.id,
        name: loadedMunchStore.name,
        type: this.mapStoreTypeToDb(loadedMunchStore.type),
        storefrontStatus: "LIVE",
        menuSetupComplete: true,
        addressLine1: loadedMunchStore.name,
        city: loadedMunchStore.city,
        postcode: loadedMunchStore.postcode,
        timezone: "Europe/London",
        shortDescription: loadedMunchStore.cuisineLabel,
        cuisineLabel: loadedMunchStore.cuisineLabel,
        onboardingMessage: loadedMunchStore.onboardingMessage,
        heroImageUrl: loadedMunchStore.heroImageUrl,
        deliveryFee: loadedMunchStore.deliveryFee ?? 0,
        minimumOrderAmount: loadedMunchStore.minimumOrderAmount ?? 0,
        etaMinutes: loadedMunchStore.etaMinutes ?? 25,
        isActive: loadedMunchStore.isOpen,
      },
      create: {
        merchantId: merchant.id,
        slug: storeSlug,
        name: loadedMunchStore.name,
        type: this.mapStoreTypeToDb(loadedMunchStore.type),
        storefrontStatus: "LIVE",
        menuSetupComplete: true,
        addressLine1: loadedMunchStore.name,
        city: loadedMunchStore.city,
        postcode: loadedMunchStore.postcode,
        timezone: "Europe/London",
        shortDescription: loadedMunchStore.cuisineLabel,
        cuisineLabel: loadedMunchStore.cuisineLabel,
        onboardingMessage: loadedMunchStore.onboardingMessage,
        heroImageUrl: loadedMunchStore.heroImageUrl,
        deliveryFee: loadedMunchStore.deliveryFee ?? 0,
        minimumOrderAmount: loadedMunchStore.minimumOrderAmount ?? 0,
        etaMinutes: loadedMunchStore.etaMinutes ?? 25,
        isActive: loadedMunchStore.isOpen,
      },
    });

    await prisma.hubUser.upsert({
      where: { username: "loaded-munch-admin" },
      update: {
        merchantId: merchant.id,
        fullName: "Loaded Munch Owner",
        email: "owner@loadedmunch.co.uk",
        passwordHash: hashPassword("temp-hub-pass"),
        role: "OWNER",
        status: "ACTIVE",
        isActive: true,
      },
      create: {
        merchantId: merchant.id,
        fullName: "Loaded Munch Owner",
        email: "owner@loadedmunch.co.uk",
        username: "loaded-munch-admin",
        passwordHash: hashPassword("temp-hub-pass"),
        role: "OWNER",
        status: "ACTIVE",
        isActive: true,
      },
    });

    for (const [sectionIndex, section] of loadedMunchMenuSections.entries()) {
      let category = await prisma.menuCategory.findFirst({
        where: {
          storeId: store.id,
          name: section.name,
        },
      });

      if (!category) {
        category = await prisma.menuCategory.create({
          data: {
            storeId: store.id,
            name: section.name,
            description: section.description,
            sortOrder: sectionIndex,
            isActive: true,
          },
        });
      }

      for (const [itemIndex, item] of section.items.entries()) {
        const existingItem = await prisma.menuItem.findFirst({
          where: {
            categoryId: category.id,
            name: item.name,
          },
        });

        if (!existingItem) {
          await prisma.menuItem.create({
            data: {
              categoryId: category.id,
              name: item.name,
              description: item.description,
              price: item.price,
              isActive: item.isActive,
              trackStock: item.trackStock,
              stockQuantity: item.stockQuantity,
              stockStatus: this.mapStockStatusToDb(item.stockStatus),
              allowBackorder: item.allowBackorder,
              maxPerOrder: item.maxPerOrder,
              sortOrder: itemIndex,
            },
          });
        }
      }
    }

    this.pilotEnsured = true;
  }

  private async fetchMerchantWorkspaceRecord(hubId: string) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: hubId },
      include: {
        stores: {
          include: {
            menuCategories: {
              include: {
                menuItems: {
                  orderBy: { sortOrder: "asc" },
                },
              },
              orderBy: { sortOrder: "asc" },
            },
            menuImportBatches: {
              where: { status: "PENDING_REVIEW" },
              include: {
                candidates: {
                  orderBy: { sortOrder: "asc" },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        hubUsers: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!merchant) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    return merchant;
  }

  private async findPrimaryStore(hubId: string) {
    const store = await prisma.store.findFirst({
      where: { merchantId: hubId },
      orderBy: { createdAt: "asc" },
    });

    if (!store) {
      throw new NotFoundException(`Hub ${hubId} does not have a store configured yet.`);
    }

    return store;
  }

  private async buildHubSummary(merchant: any, store: any, users: any[]): Promise<HubSummary> {
    return {
      id: merchant.id,
      businessName: merchant.name,
      slug: store.slug,
      type: this.mapStoreTypeToApi(store.type),
      hubUsername: users.find((user) => user.role === "OWNER")?.username ?? users[0]?.username ?? "",
      deliveryLeadTime: `${store.etaMinutes ?? 25} min`,
      status: this.mapStorefrontStatusToApi(store.storefrontStatus),
      ownerName: users.find((user) => user.role === "OWNER")?.fullName ?? `${merchant.name} Owner`,
      orderVolumeToday: 0,
      orderVolumeWeek: 0,
      grossSalesWeek: "£0",
      averageOrderValue: "£0.00",
      activeOrders: [],
      notes: [
        "This hub is now persisted in the database and survives API restarts.",
        "Admin can provision the hub, then the merchant portal controls the live menu and users.",
      ],
    };
  }

  private mapMerchantWorkspace(record: any): MerchantWorkspace {
    const store = record.stores[0];
    if (!store) {
      throw new NotFoundException(`Hub ${record.id} does not have a store configured yet.`);
    }

    return {
      hub: {
        id: record.id,
        businessName: record.name,
        slug: store.slug,
        type: this.mapStoreTypeToApi(store.type),
        hubUsername: record.hubUsers.find((user: any) => user.role === "OWNER")?.username ?? record.hubUsers[0]?.username ?? "",
        deliveryLeadTime: `${store.etaMinutes ?? 25} min`,
        status: this.mapStorefrontStatusToApi(store.storefrontStatus),
        ownerName: record.hubUsers.find((user: any) => user.role === "OWNER")?.fullName ?? `${record.name} Owner`,
        orderVolumeToday: 0,
        orderVolumeWeek: 0,
        grossSalesWeek: "£0",
        averageOrderValue: "£0.00",
        activeOrders: [],
        notes: [
          "This merchant workspace is the persistent source of truth for menu edits and business-user access.",
        ],
      },
      settings: this.mapHubSettings(record.name, store),
      users: record.hubUsers.map((user: any) => this.mapHubUser(user)),
      menuSections: store.menuCategories.map((section: any) => this.mapMenuSection(section, section.menuItems)),
      pendingImports: store.menuImportBatches.map((batch: any) => this.mapImportBatch(batch)),
    };
  }

  private mapHubSettings(merchantName: string, store: any): HubSettings {
    return {
      name: merchantName,
      cuisineLabel: store.cuisineLabel ?? "",
      onboardingMessage: store.onboardingMessage ?? "",
      city: store.city,
      postcode: store.postcode,
      etaMinutes: store.etaMinutes ?? 25,
      deliveryFee: Number(store.deliveryFee ?? 0),
      minimumOrderAmount: Number(store.minimumOrderAmount ?? 0),
      isOpen: store.storefrontStatus === "LIVE",
      logoImageUrl: store.logoAssetId ?? "",
      heroImageUrl: store.heroImageUrl ?? "",
    };
  }

  private mapHubUser(user: any): HubUser {
    return {
      id: user.id,
      hubId: user.merchantId,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      role: user.role.toLowerCase(),
      status: user.status.toLowerCase(),
    };
  }

  private mapMenuSection(section: any, items: any[]): HubMenuSection {
    return {
      id: section.id,
      name: section.name,
      description: section.description ?? "",
      items: items.map((item) => this.mapMenuItem(item)),
    };
  }

  private mapMenuItem(item: any) {
    return {
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description ?? "",
      price: Number(item.price ?? 0),
      imageUrl: item.imageUrl ?? undefined,
      isActive: item.isActive,
      trackStock: item.trackStock,
      stockQuantity: item.stockQuantity,
      stockStatus: item.stockStatus.toLowerCase(),
      allowBackorder: item.allowBackorder,
      maxPerOrder: item.maxPerOrder,
      sortOrder: item.sortOrder,
    };
  }

  private mapImportBatch(batch: any): HubMenuImportBatch {
    return {
      id: batch.id,
      imageName: batch.sourceLabel,
      status: batch.status.toLowerCase(),
      candidates: batch.candidates.map((candidate: any) => ({
        id: candidate.id,
        suggestedCategoryName: candidate.suggestedCategoryName,
        itemName: candidate.itemName,
        description: candidate.description ?? "",
        price: Number(candidate.price),
        sourceLine: candidate.sourceLine,
      })),
    };
  }

  private mapStoreTypeToDb(type: string) {
    return type.toUpperCase() as "RESTAURANT" | "TAKEAWAY" | "SHOP";
  }

  private mapStoreTypeToApi(type: string) {
    return type.toLowerCase() as HubSummary["type"];
  }

  private mapStorefrontStatusToApi(status: string) {
    return status.toLowerCase() as HubSummary["status"];
  }

  private mapMembershipRoleToDb(role: string) {
    return role.toUpperCase() as "OWNER" | "MANAGER" | "STAFF";
  }

  private mapStockStatusToDb(status: string) {
    return status.toUpperCase() as "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  }

  private parseLeadMinutes(value: string) {
    const match = value.match(/(\d+)/);
    return match ? Number(match[1]) : 25;
  }
}
