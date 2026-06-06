import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "node:crypto";

import { geocodeUkPostcode } from "./uk-postcode-geocode";
import { persistedMenuEntityIds, remapMenuSectionsForPersist } from "./hub-menu-persist";
import { Prisma } from "@prisma/client";

import { hashPassword, verifyPassword } from "@hull-eats/auth";
import { prisma } from "@hull-eats/db";
import {
  addHubCourierAssignmentInputSchema,
  createHubCourierInputSchema,
  createHubPromotionInputSchema,
  decodeHubMenuCategoryDescription,
  encodeHubMenuCategoryDescription,
  defaultKitchenTicketSettings,
  hubRolesCreatableBy,
  hullZoneHasCoverage,
  isSimpleRetailHubMenuTemplate,
  normaliseDeliveryPricing,
  normalizeHubPortalLocale,
  normalizeKitchenTicketSettings,
  normalizeOpeningHours,
  readHubMenuTemplateFromDeliveryConfig,
  readKitchenTicketFromDeliveryConfig,
  readMarketplaceCategorySlugFromDeliveryConfig,
  sanitizeHubMenuSectionMoneyFields,
  sanitizeMenuItemMoneyFields,
  sanitizeMenuMoneyAmount,
  type MembershipRole,
  type StoreOpeningHours,
  updateHubPromotionInputSchema,
} from "@hull-eats/types";
import {
  HUB_CONFIG_SNAPSHOT_LIMIT,
  hubConfigSnapshotPayloadSchema,
  type HubConfigSnapshot,
  type CreateHubConfigSnapshotInput,
  type RenameHubConfigSnapshotInput,
} from "@hull-eats/types";
import { CourierRegistryService } from "./courier-registry.service";
import type {
  AdminHubSummary,
  ApplyMenuImportInput,
  CreateHubInput,
  CreateHubMenuItemInput,
  CreateHubMenuSectionInput,
  CreateHubPromotionInput,
  CreateHubUserInput,
  ChangeHubPasswordInput,
  HubMenuImportBatch,
  HubMenuImportCandidate,
  HubMenuSection,
  HubPromotion,
  HubSettings,
  HubSummary,
  HubUser,
  MerchantWorkspace,
  MerchantWorkspaceUpdateInput,
  PreviewMenuImportInput,
  PreviewMenuTextImportInput,
  UpdateAdminHubLifecycleInput,
  UpdateHubPromotionInput,
} from "@hull-eats/types";

const categoryLikeLine = /^[A-Za-z][A-Za-z\s&/+'->]{1,60}$/;
const hubUserSelectWithoutLocale = {
  id: true,
  merchantId: true,
  fullName: true,
  email: true,
  username: true,
  role: true,
  status: true,
  isActive: true,
  mustChangePassword: true,
  preferredLocale: true,
  sessionVersion: true,
  createdAt: true,
} as const;
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

function normaliseMenuPathPart(value: string) {
  return cleanImportLine(value.replace(/\b(main|category|section|sub|subcategory)\b/gi, ""))
    .replace(/(^[-:>]+|[-:>]+$)/g, "")
    .trim();
}

function splitMenuPath(value: string) {
  return value
    .split(/\s*(?:>|\/|::)\s*/)
    .flatMap((part) => {
      const cleaned = cleanImportLine(part);

      if (/^[A-Za-z][A-Za-z\s&']*(?:-(?:main|category|section|sub|subcategory)|-[A-Za-z][A-Za-z\s&']*)+$/i.test(cleaned)) {
        return cleaned.split(/\s*-\s*/);
      }

      return [cleaned];
    })
    .map(normaliseMenuPathPart)
    .filter(Boolean);
}

function formatMenuPath(parts: string[]) {
  return parts.length > 0 ? parts.join(" / ") : "Imported items";
}

function parsePastedMenuText(rawText: string, seed: string): HubMenuImportCandidate[] {
  const lines = rawText
    .split(/\r?\n/)
    .map(cleanImportLine)
    .filter(Boolean);

  const candidates: HubMenuImportCandidate[] = [];
  let currentPath = ["Imported items"];
  let pendingItemName = "";

  for (const line of lines) {
    if (shouldIgnoreImportLine(line)) {
      continue;
    }

    const price = extractPrice(line);
    const lineWithoutPrice = cleanImportLine(line.replace(/\s*(?:from\s*)?[\u00A3$]?\s*\d+(?:\.\d{1,2})?.*$/i, ""));
    const pathParts = splitMenuPath(lineWithoutPrice);

    if (price !== null && pathParts.length >= 3) {
      candidates.push(
        createImportCandidate(seed, candidates.length + 1, {
          suggestedCategoryName: formatMenuPath(pathParts.slice(0, -1)),
          itemName: pathParts.at(-1) ?? "Imported item",
          description: "Parsed from pasted storefront text. Review before publishing.",
          price,
          sourceLine: line,
        }),
      );
      pendingItemName = "";
      continue;
    }

    if (price === null && pathParts.length >= 2 && /[>/]|-[A-Za-z]/.test(line)) {
      currentPath = pathParts;
      pendingItemName = "";
      continue;
    }

    if (categoryLikeLine.test(line) && price === null) {
      const markerMatch = line.match(/^(.*?)-\s*(main|category|section|sub|subcategory)$/i);
      if (markerMatch) {
        const label = normaliseMenuPathPart(markerMatch[1] ?? "");
        const marker = markerMatch[2]?.toLowerCase();
        currentPath = marker === "main" || marker === "category" || marker === "section" ? [label] : [...currentPath.slice(0, 1), label];
      } else {
        currentPath = [line];
      }
      pendingItemName = "";
      continue;
    }

    if (/^from\s*[\u00A3$]/i.test(line) || /^[\u00A3$]\s*\d/.test(line)) {
      if (pendingItemName && price !== null) {
        candidates.push(
          createImportCandidate(seed, candidates.length + 1, {
            suggestedCategoryName: formatMenuPath(currentPath),
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
        pathParts.length >= 2 ? pathParts.at(-1) : lineWithoutPrice || pendingItemName;
      const categoryName = pathParts.length >= 2 ? formatMenuPath(pathParts.slice(0, -1)) : formatMenuPath(currentPath);
      if (itemName) {
        candidates.push(
          createImportCandidate(seed, candidates.length + 1, {
            suggestedCategoryName: categoryName,
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

function generateHubCourierTempPassword(): string {
  return `Hull${randomBytes(4).toString("hex")}!`;
}

@Injectable()
export class HubRegistryService {
  constructor(
    @Inject(CourierRegistryService)
    private readonly courierRegistry: CourierRegistryService,
  ) {}

  async listHubs(): Promise<AdminHubSummary[]> {
    await this.ensurePilotHub();

    const merchants = await prisma.merchant.findMany({
      include: {
        stores: {
          orderBy: { createdAt: "asc" },
        },
        hubUsers: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: hubUserSelectWithoutLocale,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const hubs = await Promise.all(
      merchants.map((merchant) =>
        this.buildAdminHubSummary(merchant, this.selectPrimaryStore(merchant.slug, merchant.stores), merchant.hubUsers),
      ),
    );

    return hubs;
  }

  async listHubUsers() {
    await this.ensurePilotHub();

    const users = await prisma.hubUser.findMany({
      where: { isActive: true },
      select: {
        ...hubUserSelectWithoutLocale,
        merchant: {
          select: { name: true },
        },
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
    const ownerName = `${input.businessName.trim()} Owner`;
    const ownerEmail = input.ownerEmail.trim().toLowerCase();
    const hubUsername = ownerEmail;
    const businessPhone = input.businessPhone.trim();
    const addressLine1 = input.addressLine1.trim();
    const city = input.city.trim() || "Hull";
    const postcode = input.postcode.trim().toUpperCase();
    const cuisineLabel = input.cuisineLabel.trim();

    const [usernameExists, emailExists, slugExists] = await Promise.all([
      prisma.hubUser.findUnique({ where: { username: hubUsername }, select: { id: true } }),
      prisma.hubUser.findUnique({ where: { email: ownerEmail }, select: { id: true } }),
      prisma.merchant.findUnique({ where: { slug } }),
    ]);

    if (usernameExists) {
      throw new BadRequestException("That login email is already in use.");
    }

    if (emailExists || slugExists) {
      throw new BadRequestException("A hub for that business already exists.");
    }

    const created = await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: {
          slug,
          name: input.businessName,
          supportEmail: ownerEmail,
          supportPhone: businessPhone || null,
          isActive: true,
        },
      });

      const store = await tx.store.create({
        data: {
          merchantId: merchant.id,
          slug,
          name: input.businessName,
          type: this.mapStoreTypeToDb(input.storeType),
          storefrontStatus: "ONBOARDING",
          menuSetupComplete: false,
          addressLine1,
          city,
          postcode,
          timezone: "Europe/London",
          cuisineLabel: cuisineLabel || null,
          onboardingMessage:
            isSimpleRetailHubMenuTemplate(input.menuTemplate)
              ? "New retail hub — add categories and products in Menu Studio, then publish when ready."
              : "New hub created from the admin panel. Finish setup before making this business live.",
          deliveryFee: 0,
          minimumOrderAmount: 0,
          etaMinutes: 25,
          isActive: false,
          deliveryConfig: {
            mode: "business_radius",
            radiusMiles: 5,
            distanceRanges: [],
            postcodeZones: [],
            postcodeDistricts: [],
            mileFees: [0, 0, 0, 0, 0],
            originLatitude: null,
            originLongitude: null,
            orderFulfillment: "delivery_and_collection",
            menuTemplate: input.menuTemplate ?? "full_food",
            marketplaceCategorySlug: input.marketplaceCategorySlug?.trim() || null,
            kitchenTicket: isSimpleRetailHubMenuTemplate(input.menuTemplate)
              ? normalizeKitchenTicketSettings({ detailMode: "normal" })
              : defaultKitchenTicketSettings(),
          },
        },
      });

      const ownerUser = await tx.hubUser.create({
        data: {
          merchantId: merchant.id,
          fullName: ownerName,
          email: ownerEmail,
          username: hubUsername,
          passwordHash: hashPassword(input.hubPassword),
          role: "OWNER",
          status: "ACTIVE",
          isActive: true,
        },
      });

      return { merchant, store, ownerUser };
    });

    return {
      hub: await this.buildAdminHubSummary(created.merchant, created.store, [created.ownerUser]),
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

  async publishHub(hubId: string) {
    await this.ensurePilotHub();

    const store = await this.findPrimaryStore(hubId);
    const activeItemCount = await prisma.menuItem.count({
      where: {
        isActive: true,
        category: {
          storeId: store.id,
          isActive: true,
        },
      },
    });

    await prisma.store.update({
      where: { id: store.id },
      data: {
        storefrontStatus: "LIVE",
        menuSetupComplete: activeItemCount > 0,
        isActive: true,
        onboardingMessage:
          activeItemCount > 0
            ? "This hub is live on Hull Eats."
            : "This hub is live, but no active menu items have been added yet.",
      },
    });

    return {
      hub: await this.getAdminHubSummary(hubId),
    };
  }

  async updateAdminHubLifecycle(hubId: string, input: UpdateAdminHubLifecycleInput) {
    await this.ensurePilotHub();

    const record = await this.fetchAdminHubRecord(hubId);
    const store = this.selectPrimaryStore(record.slug, record.stores);

    if (!store) {
      if (
        input.listedOnMarketplace !== undefined ||
        input.acceptingOrders !== undefined ||
        input.homepageFeatured !== undefined ||
        input.homepageFeatureOrder !== undefined
      ) {
        throw new BadRequestException("This hub cannot go live until a store profile has been configured.");
      }
      return {
        hub: await this.buildAdminHubSummary(record, null, record.hubUsers),
      };
    }

    const nextListedOnMarketplace = input.listedOnMarketplace ?? (store.storefrontStatus === "LIVE");
    const nextAcceptingOrders = input.acceptingOrders ?? Boolean(store.isActive);
    const featureEligible = nextListedOnMarketplace && nextAcceptingOrders;

    if (input.homepageFeatured === true && !featureEligible) {
      throw new BadRequestException("Only live businesses that are accepting orders can be featured on the homepage.");
    }

    if (input.homepageFeatureOrder !== undefined && input.homepageFeatured === false) {
      throw new BadRequestException("Feature order can only be changed while the business is featured on the homepage.");
    }

    if (input.homepageFeatureOrder !== undefined && !featureEligible) {
      throw new BadRequestException("Only live businesses that are accepting orders can be featured on the homepage.");
    }

    const nextHomepageFeatured = !featureEligible
      ? false
      : input.homepageFeatured === undefined
        ? Boolean(store.homepageFeatured)
        : input.homepageFeatured;
    const nextHomepageFeatureOrder = !nextHomepageFeatured
      ? null
      : input.homepageFeatureOrder ?? store.homepageFeatureOrder ?? null;

    if (nextHomepageFeatured && nextHomepageFeatureOrder == null) {
      throw new BadRequestException("Featured businesses need a homepage feature order.");
    }

    const lifecycleUpdate: Prisma.StoreUpdateInput = {
      homepageFeatured: nextHomepageFeatured,
      homepageFeatureOrder: nextHomepageFeatureOrder,
    };
    if (input.listedOnMarketplace !== undefined) {
      lifecycleUpdate.storefrontStatus = input.listedOnMarketplace ? "LIVE" : "ONBOARDING";
    }
    if (input.acceptingOrders !== undefined) {
      lifecycleUpdate.isActive = input.acceptingOrders;
    }

    await prisma.store.update({
      where: { id: store.id },
      data: lifecycleUpdate,
    });

    return {
      hub: await this.getAdminHubSummary(hubId),
    };
  }

  async authenticate(usernameOrEmail: string, password: string) {
    await this.ensurePilotHub();

    const login = usernameOrEmail.trim();
    const normalizedLogin = login.toLowerCase();
    const hubUser = await prisma.hubUser.findFirst({
      where: {
        OR: [{ username: normalizedLogin }, { email: normalizedLogin }],
      },
      select: {
        ...hubUserSelectWithoutLocale,
        passwordHash: true,
      },
    });

    if (!hubUser || !hubUser.isActive || hubUser.status === "DISABLED" || !verifyPassword(password, hubUser.passwordHash)) {
      throw new UnauthorizedException("Hub email or password did not match a provisioned business account.");
    }

    const workspace = await this.getWorkspaceById(hubUser.merchantId);
    const activeUser = workspace.users.find((entry) => entry.id === hubUser.id) ?? this.mapHubUser(hubUser);

    return {
      user: activeUser,
      workspace,
      session: {
        id: hubUser.id,
        hubId: hubUser.merchantId,
        username: hubUser.username,
        role: hubUser.role.toLowerCase(),
        sessionVersion: hubUser.sessionVersion ?? 0,
      },
    };
  }

  async createAdminHubImpersonation(hubId: string, loginHint?: string) {
    await this.ensurePilotHub();

    const normalizedHint = loginHint?.trim().toLowerCase();
    const hintedUser =
      normalizedHint && normalizedHint.length > 0
        ? await prisma.hubUser.findFirst({
            where: {
              merchantId: hubId,
              isActive: true,
              status: { not: "DISABLED" },
              OR: [{ username: normalizedHint }, { email: normalizedHint }],
            },
            select: hubUserSelectWithoutLocale,
          })
        : null;

    const hubUser =
      hintedUser ??
      (await prisma.hubUser.findFirst({
        where: {
          merchantId: hubId,
          isActive: true,
          status: { not: "DISABLED" },
          role: "OWNER",
        },
        select: hubUserSelectWithoutLocale,
      })) ??
      (await prisma.hubUser.findFirst({
        where: {
          merchantId: hubId,
          isActive: true,
          status: { not: "DISABLED" },
        },
        orderBy: { createdAt: "asc" },
        select: hubUserSelectWithoutLocale,
      }));

    if (!hubUser) {
      throw new NotFoundException(`No active hub user was found for hub ${hubId}.`);
    }

    const workspace = await this.getWorkspaceById(hubUser.merchantId);
    const activeUser = workspace.users.find((entry) => entry.id === hubUser.id) ?? this.mapHubUser(hubUser);

    return {
      user: activeUser,
      workspace,
      session: {
        id: hubUser.id,
        hubId: hubUser.merchantId,
        username: hubUser.username,
        role: hubUser.role.toLowerCase(),
        sessionVersion: hubUser.sessionVersion ?? 0,
      },
    };
  }

  async getWorkspaceById(hubId: string): Promise<MerchantWorkspace> {
    await this.ensurePilotHub();

    const record = await this.fetchMerchantWorkspaceRecord(hubId);
    return this.mapMerchantWorkspace(record);
  }

  /**
   * Merchant menu/settings saves must never change admin marketplace listing (`storefrontStatus`).
   * Only `publishHub` and `updateAdminHubLifecycle` may set LIVE vs ONBOARDING.
   */
  private buildMerchantWorkspaceStorePatch(settings: HubSettings): Prisma.StoreUpdateInput {
    return {
      slug: slugify(settings.name),
      name: settings.name,
      city: settings.city,
      postcode: settings.postcode,
      cuisineLabel: settings.cuisineLabel,
      onboardingMessage: settings.onboardingMessage,
      heroImageUrl: settings.heroImageUrl,
      etaMinutes: settings.etaMinutes,
      deliveryFee: settings.deliveryFee,
      deliveryConfig: this.deliveryJsonFromHubSettings(settings),
      minimumOrderAmount: settings.minimumOrderAmount,
      isActive: settings.acceptingOrders,
      autoAcceptOrders: settings.autoAcceptOrders,
      autoAcceptMaxPrepMinutes: settings.autoAcceptMaxPrepMinutes,
    };
  }

  async updateWorkspace(hubId: string, input: MerchantWorkspaceUpdateInput): Promise<MerchantWorkspace> {
    await this.ensurePilotHub();

    const record = await this.fetchMerchantWorkspaceRecord(hubId);
    const store = this.selectPrimaryStore(record.slug, record.stores);

    if (!store) {
      throw new NotFoundException(`Hub ${hubId} does not have a store configured yet.`);
    }

    const settings = { ...input.settings };
    const existingPostcode = (store.postcode ?? "").trim().toUpperCase().replace(/\s+/g, "");
    const incomingPostcode = settings.postcode.trim().toUpperCase().replace(/\s+/g, "");
    if (incomingPostcode && incomingPostcode !== existingPostcode) {
      const geocoded = await geocodeUkPostcode(settings.postcode);
      if (geocoded) {
        settings.deliveryOriginLatitude = geocoded.latitude;
        settings.deliveryOriginLongitude = geocoded.longitude;
      }
    }

    const storePatch = this.buildMerchantWorkspaceStorePatch(settings);
    storePatch.slug = storePatch.slug || store.slug;

    // Keep the interactive transaction short — Supabase pooler closes long txs (~5s) and Prisma raises P2028.
    await prisma.$transaction(
      async (tx) => {
        await tx.merchant.update({
          where: { id: hubId },
          data: {
            name: settings.name,
          },
        });

        await tx.store.update({
          where: { id: store.id },
          data: storePatch,
        });
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    if (input.menuSections !== undefined) {
      await this.persistHubMenuSections(store.id, input.menuSections);
    }
    await this.persistStoreOpeningHours(store.id, settings.openingHours);

    return this.getWorkspaceById(hubId);
  }

  private async persistHubMenuSections(
    storeId: string,
    menuSections: NonNullable<MerchantWorkspaceUpdateInput["menuSections"]>,
  ) {
    if (menuSections.length === 0) {
      throw new BadRequestException("Cannot save an empty menu. Add at least one category first.");
    }

    const { sections: persistedSections } = remapMenuSectionsForPersist(
      menuSections as Parameters<typeof remapMenuSectionsForPersist>[0],
    );
    const sanitizedSections = persistedSections.map((section) => sanitizeHubMenuSectionMoneyFields(section));
    const { categoryIds: incomingSectionIds, itemIds: incomingItemIds } = persistedMenuEntityIds(sanitizedSections);

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

    for (const [sectionIndex, section] of sanitizedSections.entries()) {
      await prisma.menuCategory.upsert({
        where: { id: section.id },
        update: {
          name: section.name,
          description: encodeHubMenuCategoryDescription(section.presetKey, section.description ?? ""),
          defaultPrice: section.defaultPrice == null ? null : sanitizeMenuMoneyAmount(section.defaultPrice),
          sortOrder: sectionIndex,
          isActive: true,
        },
        create: {
          id: section.id,
          storeId,
          name: section.name,
          description: encodeHubMenuCategoryDescription(section.presetKey, section.description ?? ""),
          defaultPrice: section.defaultPrice == null ? null : sanitizeMenuMoneyAmount(section.defaultPrice),
          sortOrder: sectionIndex,
          isActive: true,
        },
      });

      await Promise.all(
        section.items.map((item, itemIndex) => {
          const safeItem = sanitizeMenuItemMoneyFields(item);
          return prisma.menuItem.upsert({
            where: { id: safeItem.id },
            update: {
              name: safeItem.name,
              description: safeItem.description,
              price: safeItem.price,
              imageUrl: safeItem.imageUrl,
              customisationConfig: this.buildCustomisationConfig(safeItem),
              isActive: safeItem.isActive,
              trackStock: safeItem.trackStock,
              stockQuantity: safeItem.stockQuantity,
              stockStatus: this.mapStockStatusToDb(safeItem.stockStatus),
              allowBackorder: safeItem.allowBackorder,
              maxPerOrder: safeItem.maxPerOrder,
              requiresIdVerification: safeItem.requiresIdVerification ?? false,
              sortOrder: itemIndex,
            },
            create: {
              id: safeItem.id,
              categoryId: section.id,
              name: safeItem.name,
              description: safeItem.description,
              price: safeItem.price,
              imageUrl: safeItem.imageUrl,
              customisationConfig: this.buildCustomisationConfig(safeItem),
              isActive: safeItem.isActive,
              trackStock: safeItem.trackStock,
              stockQuantity: safeItem.stockQuantity,
              stockStatus: this.mapStockStatusToDb(safeItem.stockStatus),
              allowBackorder: safeItem.allowBackorder,
              maxPerOrder: safeItem.maxPerOrder,
              requiresIdVerification: safeItem.requiresIdVerification ?? false,
              sortOrder: itemIndex,
            },
          });
        }),
      );
    }
  }

  private async resolveHubStoreId(hubId: string): Promise<string> {
    const store = await prisma.store.findFirst({
      where: { merchantId: hubId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!store) {
      throw new NotFoundException(`Hub ${hubId} does not have a store configured yet.`);
    }
    return store.id;
  }

  async listHubConfigSnapshots(hubId: string): Promise<HubConfigSnapshot[]> {
    await this.ensurePilotHub();
    const storeId = await this.resolveHubStoreId(hubId);
    const rows = await prisma.hubConfigSnapshot.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: HUB_CONFIG_SNAPSHOT_LIMIT,
    });
    return rows.map((row) => this.mapHubConfigSnapshot(row));
  }

  async createHubConfigSnapshot(hubId: string, input: CreateHubConfigSnapshotInput): Promise<HubConfigSnapshot> {
    await this.ensurePilotHub();
    const storeId = await this.resolveHubStoreId(hubId);
    const payload = hubConfigSnapshotPayloadSchema.parse({
      settings: input.settings,
      menuSections: input.menuSections,
    });

    const existing = await prisma.hubConfigSnapshot.findMany({
      where: { storeId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (existing.length >= HUB_CONFIG_SNAPSHOT_LIMIT) {
      const overflow = existing.length - HUB_CONFIG_SNAPSHOT_LIMIT + 1;
      const toDelete = existing.slice(0, overflow).map((row) => row.id);
      await prisma.hubConfigSnapshot.deleteMany({ where: { id: { in: toDelete } } });
    }

    const count = await prisma.hubConfigSnapshot.count({ where: { storeId } });
    const defaultName = `Backup ${count + 1}`;

    const created = await prisma.hubConfigSnapshot.create({
      data: {
        storeId,
        name: input.name?.trim() || defaultName,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    return this.mapHubConfigSnapshot(created);
  }

  async renameHubConfigSnapshot(hubId: string, snapshotId: string, input: RenameHubConfigSnapshotInput): Promise<HubConfigSnapshot> {
    await this.ensurePilotHub();
    const storeId = await this.resolveHubStoreId(hubId);
    const row = await prisma.hubConfigSnapshot.findFirst({
      where: { id: snapshotId, storeId },
    });
    if (!row) {
      throw new NotFoundException(`Config backup ${snapshotId} was not found for this hub.`);
    }
    const updated = await prisma.hubConfigSnapshot.update({
      where: { id: row.id },
      data: { name: input.name.trim() },
    });
    return this.mapHubConfigSnapshot(updated);
  }

  async restoreHubConfigSnapshot(hubId: string, snapshotId: string): Promise<MerchantWorkspace> {
    await this.ensurePilotHub();
    const storeId = await this.resolveHubStoreId(hubId);
    const row = await prisma.hubConfigSnapshot.findFirst({
      where: { id: snapshotId, storeId },
    });
    if (!row) {
      throw new NotFoundException(`Config backup ${snapshotId} was not found for this hub.`);
    }
    const payload = hubConfigSnapshotPayloadSchema.parse(row.payload);
    const store = await this.findPrimaryStore(hubId);
    return this.updateWorkspace(hubId, {
      settings: {
        ...payload.settings,
        // Backups may pre-date admin go-live; never roll back platform lifecycle on restore.
        isOpen: store.storefrontStatus === "LIVE",
        acceptingOrders: Boolean(store.isActive),
      },
      menuSections: payload.menuSections,
    });
  }

  private mapHubConfigSnapshot(row: { id: string; name: string; createdAt: Date; payload: unknown }): HubConfigSnapshot {
    const payload = hubConfigSnapshotPayloadSchema.parse(row.payload);
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      payload,
    };
  }

  async createHubUser(hubId: string, input: CreateHubUserInput, actorRole: MembershipRole) {
    await this.ensurePilotHub();

    const allowedRoles = hubRolesCreatableBy(actorRole);
    if (!allowedRoles.includes(input.role)) {
      throw new BadRequestException("You cannot create a hub user with that role.");
    }

    const merchant = await prisma.merchant.findUnique({ where: { id: hubId } });
    if (!merchant) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();

    const duplicate = await prisma.hubUser.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException("That username or email is already in use.");
    }

    const createdUser = await prisma.hubUser.create({
      data: {
        merchantId: hubId,
        fullName: input.fullName.trim(),
        email,
        username,
        passwordHash: hashPassword(input.password),
        role: this.mapMembershipRoleToDb(input.role),
        status: "ACTIVE",
        isActive: true,
        mustChangePassword: false,
      },
    });

    return this.mapHubUser(createdUser);
  }

  async changeHubUserPassword(hubId: string, userId: string, input: ChangeHubPasswordInput) {
    await this.ensurePilotHub();

    const user = await prisma.hubUser.findFirst({
      where: {
        id: userId,
        merchantId: hubId,
        isActive: true,
      },
      select: {
        ...hubUserSelectWithoutLocale,
        passwordHash: true,
      },
    });

    if (!user || user.status === "DISABLED" || !verifyPassword(input.currentPassword, user.passwordHash)) {
      throw new UnauthorizedException("Current password did not match this hub account.");
    }

    await prisma.hubUser.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(input.newPassword),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    });

    return {
      changed: true,
      user: this.mapHubUser({ ...user, mustChangePassword: false }),
    };
  }

  async deleteHubUser(hubId: string, userId: string) {
    await this.ensurePilotHub();

    const user = await prisma.hubUser.findFirst({
      where: {
        id: userId,
        merchantId: hubId,
      },
      select: hubUserSelectWithoutLocale,
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
        description: encodeHubMenuCategoryDescription(input.presetKey, input.description ?? ""),
        defaultPrice: input.defaultPrice,
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
        imageUrl: input.imageUrl ?? null,
        customisationConfig: this.buildCustomisationConfig(input),
        isActive: false,
        isFeatured: false,
        trackStock: false,
        stockQuantity: null,
        stockStatus: "IN_STOCK",
        allowBackorder: false,
        maxPerOrder: null,
        requiresIdVerification: input.requiresIdVerification ?? false,
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

  async listStorePromotions(hubId: string): Promise<HubPromotion[]> {
    await this.ensurePilotHub();
    const store = await this.findPrimaryStore(hubId);
    const rows = await prisma.storePromotion.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.mapStorePromotion(row));
  }

  async createStorePromotion(hubId: string, body: unknown): Promise<HubPromotion> {
    await this.ensurePilotHub();
    const input = createHubPromotionInputSchema.parse(body);
    const store = await this.findPrimaryStore(hubId);
    await this.assertPromotionTargetsValid(store.id, input);
    const row = await prisma.storePromotion.create({
      data: this.buildPromotionWriteData(store.id, input),
    });
    return this.mapStorePromotion(row);
  }

  async updateStorePromotion(hubId: string, promotionId: string, body: unknown): Promise<HubPromotion> {
    await this.ensurePilotHub();
    const patch = updateHubPromotionInputSchema.parse(body);
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException("No changes supplied.");
    }
    const store = await this.findPrimaryStore(hubId);
    const existing = await prisma.storePromotion.findFirst({
      where: { id: promotionId, storeId: store.id },
    });
    if (!existing) {
      throw new NotFoundException(`Offer ${promotionId} was not found.`);
    }
    const merged = this.mergePromotionPatch(this.mapStorePromotion(existing), patch);
    createHubPromotionInputSchema.parse(merged);
    await this.assertPromotionTargetsValid(store.id, merged);
    const full = this.buildPromotionWriteData(store.id, merged);
    const { storeId: _omitStoreId, ...updatePayload } = full;
    const row = await prisma.storePromotion.update({
      where: { id: promotionId },
      data: updatePayload,
    });
    return this.mapStorePromotion(row);
  }

  async deleteStorePromotion(hubId: string, promotionId: string): Promise<{ deletedPromotionId: string }> {
    await this.ensurePilotHub();
    const store = await this.findPrimaryStore(hubId);
    const existing = await prisma.storePromotion.findFirst({
      where: { id: promotionId, storeId: store.id },
    });
    if (!existing) {
      throw new NotFoundException(`Offer ${promotionId} was not found.`);
    }
    await prisma.storePromotion.delete({ where: { id: promotionId } });
    return { deletedPromotionId: promotionId };
  }

  async listHubCourierAssignments(hubId: string) {
    await this.ensurePilotHub();
    const store = await this.findPrimaryStore(hubId);
    const rows = await prisma.storeCourierAssignment.findMany({
      where: { storeId: store.id },
      include: {
        courierProfile: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      courierProfileId: row.courierProfileId,
      courierEmail: row.courierProfile.user.email,
      courierName: row.courierProfile.user.fullName,
      storeId: row.storeId,
      storeName: store.name,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async createHubCourier(hubId: string, body: unknown) {
    await this.ensurePilotHub();
    const input = createHubCourierInputSchema.parse(body);
    const store = await this.findPrimaryStore(hubId);
    const email = input.email.trim().toLowerCase();
    const username = (input.username?.trim().toLowerCase() || email).slice(0, 64);
    const password = input.password?.trim() || generateHubCourierTempPassword();

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { courierProfile: true },
    });
    if (existingUser?.courierProfile) {
      await prisma.storeCourierAssignment.upsert({
        where: {
          storeId_courierProfileId: {
            storeId: store.id,
            courierProfileId: existingUser.courierProfile.id,
          },
        },
        create: {
          storeId: store.id,
          courierProfileId: existingUser.courierProfile.id,
        },
        update: {},
      });

      const assignments = await this.listHubCourierAssignments(hubId);
      const account = await prisma.courierAccount.findUnique({
        where: { courierProfileId: existingUser.courierProfile.id },
      });

      return {
        courierProfileId: existingUser.courierProfile.id,
        fullName: existingUser.fullName,
        email,
        username: account?.username ?? username,
        alreadyExisted: true as const,
        message: "Driver linked to your hub. They sign in with their existing Hull Eats Courier password.",
        assignments,
      };
    }

    if (existingUser) {
      throw new BadRequestException("That email is already used for a non-courier account.");
    }

    const created = await this.courierRegistry.createCourier({
      fullName: input.fullName.trim(),
      email,
      phone: input.phone?.trim() ?? "",
      username,
      password,
      vehicleType: input.vehicleType?.trim() || "car",
      vehicleRegistration: input.vehicleRegistration?.trim(),
      status: "active",
    });

    await prisma.storeCourierAssignment.upsert({
      where: {
        storeId_courierProfileId: {
          storeId: store.id,
          courierProfileId: created.courierProfileId,
        },
      },
      create: {
        storeId: store.id,
        courierProfileId: created.courierProfileId,
      },
      update: {},
    });

    const assignments = await this.listHubCourierAssignments(hubId);

    return {
      courierProfileId: created.courierProfileId,
      fullName: created.fullName,
      email: created.email,
      username: created.username,
      temporaryPassword: password,
      alreadyExisted: false as const,
      assignments,
    };
  }

  async addHubCourierAssignment(hubId: string, body: unknown) {
    await this.ensurePilotHub();
    const input = addHubCourierAssignmentInputSchema.parse(body);
    const store = await this.findPrimaryStore(hubId);
    const email = input.email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        courierProfile: true,
      },
    });

    if (!user?.courierProfile) {
      throw new BadRequestException(
        "No courier account exists for that email. Use Add driver below to create their Hull Eats Courier login for this hub.",
      );
    }

    await prisma.storeCourierAssignment.upsert({
      where: {
        storeId_courierProfileId: {
          storeId: store.id,
          courierProfileId: user.courierProfile.id,
        },
      },
      create: {
        storeId: store.id,
        courierProfileId: user.courierProfile.id,
      },
      update: {},
    });

    return this.listHubCourierAssignments(hubId);
  }

  async removeHubCourierAssignment(hubId: string, courierProfileId: string) {
    await this.ensurePilotHub();
    const store = await this.findPrimaryStore(hubId);

    await prisma.storeCourierAssignment.deleteMany({
      where: {
        storeId: store.id,
        courierProfileId,
      },
    });

    return { removed: true as const, courierProfileId };
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
        const candidatePrice = Number(candidate.price);
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
              defaultPrice: candidatePrice > 0 ? candidate.price : null,
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
            price: candidatePrice > 0 ? candidate.price : section.defaultPrice ?? 0,
            customisationConfig: this.buildCustomisationConfig({ components: [], optionGroups: [] }),
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
    return;
  }

  private async fetchMerchantWorkspaceRecord(hubId: string) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: hubId },
      include: {
        stores: {
          include: {
            storeHours: {
              orderBy: { dayOfWeek: "asc" },
            },
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
          select: hubUserSelectWithoutLocale,
        },
      },
    });

    if (!merchant) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    return merchant;
  }

  private async fetchAdminHubRecord(hubId: string) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: hubId },
      include: {
        stores: {
          orderBy: { createdAt: "asc" },
        },
        hubUsers: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: hubUserSelectWithoutLocale,
        },
      },
    });

    if (!merchant) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    return merchant;
  }

  private selectPrimaryStore(merchantSlug: string, stores: any[]): any | null {
    return stores.find((store: any) => store.slug === merchantSlug) ?? stores[0] ?? null;
  }

  private async getAdminHubSummary(hubId: string) {
    const merchant = await this.fetchAdminHubRecord(hubId);
    return this.buildAdminHubSummary(merchant, this.selectPrimaryStore(merchant.slug, merchant.stores), merchant.hubUsers);
  }

  private async findPrimaryStore(hubId: string) {
    const stores = await prisma.store.findMany({
      where: { merchantId: hubId },
      orderBy: { createdAt: "asc" },
    });
    const merchant = await prisma.merchant.findUnique({
      where: { id: hubId },
      select: { slug: true },
    });
    const store = this.selectPrimaryStore(merchant?.slug ?? "", stores);

    if (!store) {
      throw new NotFoundException(`Hub ${hubId} does not have a store configured yet.`);
    }

    return store;
  }

  private async buildAdminHubSummary(merchant: any, store: any | null, users: any[]): Promise<AdminHubSummary> {
    const ownerUser = users.find((user) => user.role === "OWNER") ?? users[0] ?? null;
    const ownerName = ownerUser?.fullName ?? `${merchant.name} Owner`;
    const hubUsername = ownerUser?.username ?? "";
    const formatMoney = (value: number) =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: value >= 1000 ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(value);

    if (!store) {
      return {
        id: merchant.id,
        businessName: merchant.name,
        slug: merchant.slug,
        hasStore: false,
        primaryStoreId: null,
        type: null,
        storeSlug: null,
        hubUsername,
        deliveryLeadTime: null,
        status: "setup",
        listedOnMarketplace: false,
        acceptingOrders: false,
        homepageFeatured: false,
        homepageFeatureOrder: null,
        setupComplete: false,
        ownerName,
        orderVolumeToday: 0,
        orderVolumeWeek: 0,
        grossSalesWeek: formatMoney(0),
        averageOrderValue: formatMoney(0),
        activeOrders: [],
        notes: [
          "This hub exists, but no store profile has been configured yet.",
          "Complete the store setup before making this business live on Hull Eats.",
          `${users.length} active hub user${users.length === 1 ? "" : "s"} provisioned.`,
        ],
      };
    }

    const boundsRows = await prisma.$queryRaw<Array<{ today_start: Date; week_start: Date }>>`
      SELECT
        ((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London')::date)::timestamp AT TIME ZONE 'Europe/London' AS today_start,
        (((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London')::date - 6))::timestamp AT TIME ZONE 'Europe/London' AS week_start
    `;
    const todayStart = boundsRows[0]?.today_start ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekStart = boundsRows[0]?.week_start ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentOrders = await prisma.order.findMany({
      where: {
        storeId: store.id,
        placedAt: {
          gte: weekStart,
        },
      },
      orderBy: { placedAt: "desc" },
      take: 100,
    });

    const activeStatuses = new Set([
      "PENDING",
      "ACCEPTED",
      "PREPARING",
      "READY_FOR_DISPATCH",
      "ASSIGNED",
      "COURIER_ACCEPTED",
      "PICKED_UP",
    ]);
    const completedStatuses = new Set(["PENDING", "ACCEPTED", "PREPARING", "READY_FOR_DISPATCH", "ASSIGNED", "COURIER_ACCEPTED", "PICKED_UP", "DELIVERED"]);
    const weekOrders = recentOrders.filter((order) => completedStatuses.has(String(order.status).toUpperCase()));
    const todayOrders = weekOrders.filter((order) => order.placedAt >= todayStart);
    const grossSalesWeekValue = weekOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const averageOrderValue = weekOrders.length > 0 ? grossSalesWeekValue / weekOrders.length : 0;
    const formatPlacedAgo = (placedAt: Date) => {
      const diffMs = Math.max(0, Date.now() - placedAt.getTime());
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) {
        return "Just now";
      }
      if (diffMinutes < 60) {
        return `${diffMinutes} min ago`;
      }
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
      }
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    };

    const activeOrders = recentOrders
      .filter((order) => activeStatuses.has(String(order.status).toUpperCase()))
      .slice(0, 5)
      .map((order) => ({
        id: order.orderNumber,
        customerName: order.customerName,
        status: String(order.status).toLowerCase(),
        total: formatMoney(Number(order.totalAmount)),
        placedAgo: formatPlacedAgo(order.placedAt),
      }));

    const listedOnMarketplace = store.storefrontStatus === "LIVE";
    const acceptingOrders = Boolean(store.isActive);
    const homepageFeatured = Boolean(store.homepageFeatured) && this.canFeatureStoreOnHomepage(store);
    const homepageFeatureOrder = homepageFeatured ? store.homepageFeatureOrder ?? null : null;
    const status = this.deriveAdminHubStatus(store);
    const notes = [
      listedOnMarketplace ? "Store is currently visible on Hull Eats." : "Store is still in setup and hidden from customers.",
      acceptingOrders ? "Orders are currently enabled for this hub." : "Orders are currently paused for this hub.",
      homepageFeatured
        ? `Homepage featured in slot ${homepageFeatureOrder}.`
        : "Not currently featured on the customer homepage.",
      `${users.length} active hub user${users.length === 1 ? "" : "s"} provisioned.`,
    ];

    return {
      id: merchant.id,
      businessName: merchant.name,
      slug: store.slug || merchant.slug,
      hasStore: true,
      primaryStoreId: store.id,
      type: this.mapStoreTypeToApi(store.type),
      storeSlug: store.slug,
      hubUsername: users.find((user) => user.role === "OWNER")?.username ?? users[0]?.username ?? "",
      deliveryLeadTime: `${store.etaMinutes ?? 25} min`,
      status,
      listedOnMarketplace,
      acceptingOrders,
      homepageFeatured,
      homepageFeatureOrder,
      setupComplete: Boolean(store.menuSetupComplete),
      ownerName,
      orderVolumeToday: todayOrders.length,
      orderVolumeWeek: weekOrders.length,
      grossSalesWeek: formatMoney(grossSalesWeekValue),
      averageOrderValue: formatMoney(averageOrderValue),
      activeOrders,
      notes,
    };
  }

  private mapMerchantWorkspace(record: any): MerchantWorkspace {
    const store = this.selectPrimaryStore(record.slug, record.stores);
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
      acceptingOrders: Boolean(store.isActive),
      isOpen: store.storefrontStatus === "LIVE",
      logoImageUrl: store.logoAssetId ?? "",
      heroImageUrl: store.heroImageUrl ?? "",
      autoAcceptOrders: Boolean(store.autoAcceptOrders),
      autoAcceptMaxPrepMinutes: store.autoAcceptMaxPrepMinutes ?? 60,
      openingHours: this.mapStoreOpeningHours(store.storeHours ?? []),
      menuTemplate: readHubMenuTemplateFromDeliveryConfig(store.deliveryConfig),
      marketplaceCategorySlug: readMarketplaceCategorySlugFromDeliveryConfig(store.deliveryConfig),
      ...this.mapDeliveryFromStore(store),
    };
  }

  private deliveryJsonFromHubSettings(settings: HubSettings): Prisma.InputJsonValue {
    const enabledDistricts = settings.deliveryPostcodeZones
      .filter((zone) => hullZoneHasCoverage(zone))
      .map((zone) => zone.code.trim().toUpperCase());

    return {
      mode: settings.deliveryMode,
      radiusMiles: settings.deliveryRadiusMiles,
      distanceRanges: settings.deliveryDistanceRanges,
      postcodeZones: settings.deliveryPostcodeZones,
      postcodeDistricts: enabledDistricts,
      mileFees: [...settings.deliveryMileFees],
      originLatitude: settings.deliveryOriginLatitude ?? null,
      originLongitude: settings.deliveryOriginLongitude ?? null,
      orderFulfillment: settings.orderFulfillment,
      kitchenTicket: settings.kitchenTicket,
      menuTemplate: settings.menuTemplate ?? "full_food",
      marketplaceCategorySlug: settings.marketplaceCategorySlug?.trim() || null,
    };
  }

  private mapDeliveryFromStore(store: { deliveryConfig?: unknown }): Pick<
    HubSettings,
    | "deliveryMode"
    | "deliveryRadiusMiles"
    | "deliveryDistanceRanges"
    | "deliveryPostcodeZones"
    | "deliveryMileFees"
    | "deliveryOriginLatitude"
    | "deliveryOriginLongitude"
    | "orderFulfillment"
    | "kitchenTicket"
  > {
    const cfg = normaliseDeliveryPricing(store.deliveryConfig ?? {});
    return {
      deliveryMode: cfg.mode,
      deliveryRadiusMiles: cfg.radiusMiles,
      deliveryDistanceRanges: cfg.distanceRanges.map((range) => ({ ...range })),
      deliveryPostcodeZones: cfg.postcodeZones.map((zone) => ({ ...zone })),
      deliveryMileFees: [
        cfg.mileFees[0] ?? 0,
        cfg.mileFees[1] ?? 0,
        cfg.mileFees[2] ?? 0,
        cfg.mileFees[3] ?? 0,
        cfg.mileFees[4] ?? 0,
      ],
      deliveryOriginLatitude: cfg.originLatitude ?? null,
      deliveryOriginLongitude: cfg.originLongitude ?? null,
      orderFulfillment: cfg.orderFulfillment,
      kitchenTicket: readKitchenTicketFromDeliveryConfig(store.deliveryConfig),
    };
  }

  private mapStoreOpeningHours(rows: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>): StoreOpeningHours {
    if (!rows.length) {
      return normalizeOpeningHours(undefined);
    }

    return normalizeOpeningHours(
      rows.map((row) => ({
        dayOfWeek: row.dayOfWeek,
        isOpen: !row.isClosed,
        openTime: row.openTime,
        closeTime: row.closeTime,
      })),
    );
  }

  private async persistStoreOpeningHours(storeId: string, openingHours: StoreOpeningHours) {
    const normalized = normalizeOpeningHours(openingHours);

    try {
      await prisma.storeHour.deleteMany({ where: { storeId } });
      await prisma.storeHour.createMany({
        data: normalized.map((day) => ({
          storeId,
          dayOfWeek: day.dayOfWeek,
          openTime: day.openTime,
          closeTime: day.closeTime,
          isClosed: !day.isOpen,
        })),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
        throw new BadRequestException(
          "Opening hours table is not available yet. Run the latest database migration (store_hours) before saving a schedule.",
        );
      }
      throw error;
    }
  }

  async updateHubUserPreferredLocale(hubId: string, userId: string, preferredLocale: HubUser["preferredLocale"]) {
    await this.ensurePilotHub();

    const user = await prisma.hubUser.findFirst({
      where: {
        id: userId,
        merchantId: hubId,
        isActive: true,
      },
    });

    if (!user || user.status === "DISABLED") {
      throw new UnauthorizedException("Hub account not found.");
    }

    const updated = await prisma.hubUser.update({
      where: { id: user.id },
      data: { preferredLocale },
    });

    return {
      user: this.mapHubUser(updated),
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
      mustChangePassword: Boolean(user.mustChangePassword),
      preferredLocale: normalizeHubPortalLocale(user.preferredLocale),
    };
  }

  private mapMenuSection(section: any, items: any[]): HubMenuSection {
    const decoded = decodeHubMenuCategoryDescription(section.description);
    return {
      id: section.id,
      name: section.name,
      description: decoded.description,
      presetKey: decoded.presetKey ?? undefined,
      defaultPrice: section.defaultPrice === null || section.defaultPrice === undefined ? null : Number(section.defaultPrice),
      items: items.map((item) => this.mapMenuItem(item)),
    };
  }

  private buildCustomisationConfig(item: { components?: unknown; optionGroups?: unknown; menuSubGroup?: unknown }) {
    const components = Array.isArray(item.components) ? item.components : [];
    const optionGroups = Array.isArray(item.optionGroups) ? item.optionGroups : [];
    if (typeof item.menuSubGroup === "string" && item.menuSubGroup.trim()) {
      return {
        components,
        optionGroups,
        hubMenuSubGroup: item.menuSubGroup.trim(),
      };
    }
    return { components, optionGroups };
  }

  private mapStorePromotion(row: any): HubPromotion {
    const rawLines = row.bundleLines;
    let bundleLines: HubPromotion["bundleLines"] = null;
    if (Array.isArray(rawLines)) {
      bundleLines = rawLines
        .map((line: any) =>
          line && typeof line.menuItemId === "string" && typeof line.quantity === "number"
            ? { menuItemId: line.menuItemId, quantity: line.quantity }
            : null,
        )
        .filter(Boolean) as HubPromotion["bundleLines"];
    }

    return {
      id: row.id,
      title: row.title,
      isActive: row.isActive,
      kind: this.mapPromotionKindFromDb(row.kind),
      scope: this.mapPromotionScopeFromDb(row.scope),
      percentOff: row.percentOff != null ? Number(row.percentOff) : null,
      fixedAmountOff: row.fixedAmountOff != null ? Number(row.fixedAmountOff) : null,
      bundleFixedPrice: row.bundleFixedPrice != null ? Number(row.bundleFixedPrice) : null,
      menuItemIds: Array.isArray(row.menuItemIds) ? row.menuItemIds : [],
      categoryIds: Array.isArray(row.categoryIds) ? row.categoryIds : [],
      bundleLines,
      validDates: Array.isArray(row.validDates) ? [...row.validDates].sort() : [],
      dailyStartTime: row.dailyStartTime ?? null,
      dailyEndTime: row.dailyEndTime ?? null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
  }

  private mergePromotionPatch(current: HubPromotion, patch: UpdateHubPromotionInput): CreateHubPromotionInput {
    const next: CreateHubPromotionInput = {
      title: patch.title ?? current.title,
      isActive: patch.isActive ?? current.isActive,
      kind: patch.kind ?? current.kind,
      scope: patch.scope ?? current.scope,
      percentOff: patch.percentOff !== undefined ? patch.percentOff : current.percentOff,
      fixedAmountOff: patch.fixedAmountOff !== undefined ? patch.fixedAmountOff : current.fixedAmountOff,
      bundleFixedPrice: patch.bundleFixedPrice !== undefined ? patch.bundleFixedPrice : current.bundleFixedPrice,
      menuItemIds: patch.menuItemIds ?? [...current.menuItemIds],
      categoryIds: patch.categoryIds ?? [...current.categoryIds],
      bundleLines: patch.bundleLines !== undefined ? patch.bundleLines : current.bundleLines ? [...current.bundleLines] : null,
      validDates: patch.validDates ?? [...current.validDates],
      dailyStartTime: patch.dailyStartTime !== undefined ? patch.dailyStartTime : current.dailyStartTime,
      dailyEndTime: patch.dailyEndTime !== undefined ? patch.dailyEndTime : current.dailyEndTime,
    };
    return next;
  }

  private buildPromotionWriteData(storeId: string, input: CreateHubPromotionInput) {
    return {
      storeId,
      title: input.title.trim(),
      isActive: input.isActive,
      kind: this.mapPromotionKindToDb(input.kind),
      scope: this.mapPromotionScopeToDb(input.scope),
      percentOff: input.percentOff ?? null,
      fixedAmountOff: input.fixedAmountOff ?? null,
      bundleFixedPrice: input.bundleFixedPrice ?? null,
      menuItemIds: input.menuItemIds,
      categoryIds: input.categoryIds,
      bundleLines:
        input.bundleLines && input.bundleLines.length > 0 ? (input.bundleLines as Prisma.InputJsonValue) : Prisma.JsonNull,
      validDates: [...new Set(input.validDates)].sort(),
      dailyStartTime: input.dailyStartTime,
      dailyEndTime: input.dailyEndTime,
    };
  }

  private async assertPromotionTargetsValid(storeId: string, input: CreateHubPromotionInput) {
    const categories = await prisma.menuCategory.findMany({
      where: { storeId },
      select: { id: true },
    });
    const items = await prisma.menuItem.findMany({
      where: { category: { storeId } },
      select: { id: true },
    });
    const categorySet = new Set(categories.map((c) => c.id));
    const itemSet = new Set(items.map((i) => i.id));

    const assertItems = (ids: string[], label: string) => {
      for (const id of ids) {
        if (!itemSet.has(id)) {
          throw new BadRequestException(`${label} references an item that is not on this hub menu.`);
        }
      }
    };

    const assertCategories = (ids: string[]) => {
      for (const id of ids) {
        if (!categorySet.has(id)) {
          throw new BadRequestException("This offer references a category that is not on this hub menu.");
        }
      }
    };

    if (input.kind === "bogo_item") {
      assertItems(input.menuItemIds, "Buy-one-get-one-free");
      return;
    }

    if (input.kind === "bundle_fixed_price") {
      const lines = input.bundleLines ?? [];
      assertItems(
        lines.map((l) => l.menuItemId),
        "Bundle",
      );
      return;
    }

    if (input.scope === "categories") {
      assertCategories(input.categoryIds);
    }
    if (input.scope === "items") {
      assertItems(input.menuItemIds, "Selected items");
    }
  }

  private mapPromotionKindToDb(kind: CreateHubPromotionInput["kind"]) {
    const map: Record<CreateHubPromotionInput["kind"], "BOGO_ITEM" | "PERCENT_OFF" | "FIXED_AMOUNT_ITEM" | "BUNDLE_FIXED_PRICE"> = {
      bogo_item: "BOGO_ITEM",
      percent_off: "PERCENT_OFF",
      fixed_amount_item: "FIXED_AMOUNT_ITEM",
      bundle_fixed_price: "BUNDLE_FIXED_PRICE",
    };
    return map[kind];
  }

  private mapPromotionKindFromDb(value: string): HubPromotion["kind"] {
    const map: Record<string, HubPromotion["kind"]> = {
      BOGO_ITEM: "bogo_item",
      PERCENT_OFF: "percent_off",
      FIXED_AMOUNT_ITEM: "fixed_amount_item",
      BUNDLE_FIXED_PRICE: "bundle_fixed_price",
    };
    return map[value] ?? "percent_off";
  }

  private mapPromotionScopeToDb(scope: CreateHubPromotionInput["scope"]) {
    const map: Record<CreateHubPromotionInput["scope"], "ITEMS" | "CATEGORIES" | "WHOLE_MENU"> = {
      items: "ITEMS",
      categories: "CATEGORIES",
      whole_menu: "WHOLE_MENU",
    };
    return map[scope];
  }

  private mapPromotionScopeFromDb(value: string): HubPromotion["scope"] {
    const map: Record<string, HubPromotion["scope"]> = {
      ITEMS: "items",
      CATEGORIES: "categories",
      WHOLE_MENU: "whole_menu",
    };
    return map[value] ?? "whole_menu";
  }

  private mapMenuItem(item: any) {
    const customisationConfig =
      item.customisationConfig && typeof item.customisationConfig === "object" ? item.customisationConfig : {};

    return {
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description ?? "",
      price: Number(item.price ?? 0),
      imageUrl: typeof item.imageUrl === "string" && item.imageUrl.trim() ? item.imageUrl.trim() : undefined,
      isActive: item.isActive,
      trackStock: item.trackStock,
      stockQuantity: item.stockQuantity,
      stockStatus: item.stockStatus.toLowerCase(),
      allowBackorder: item.allowBackorder,
      maxPerOrder: item.maxPerOrder,
      sortOrder: item.sortOrder,
      requiresIdVerification: Boolean(item.requiresIdVerification),
      components: Array.isArray(customisationConfig.components) ? customisationConfig.components : [],
      optionGroups: Array.isArray(customisationConfig.optionGroups) ? customisationConfig.optionGroups : [],
      menuSubGroup:
        typeof customisationConfig.hubMenuSubGroup === "string" && customisationConfig.hubMenuSubGroup.trim()
          ? customisationConfig.hubMenuSubGroup.trim()
          : undefined,
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

  private deriveAdminHubStatus(store: { storefrontStatus: string; isActive: boolean } | null): AdminHubSummary["status"] {
    if (!store || store.storefrontStatus !== "LIVE") {
      return "setup";
    }
    if (!store.isActive) {
      return "paused";
    }
    return "live";
  }

  private canFeatureStoreOnHomepage(store: { storefrontStatus: string; isActive: boolean }) {
    return store.storefrontStatus === "LIVE" && Boolean(store.isActive);
  }

  private mapStorefrontStatusToApi(status: string) {
    return status.toLowerCase() as HubSummary["status"];
  }

  private mapMembershipRoleToDb(role: string) {
    return role.toUpperCase() as "OWNER" | "MANAGER" | "STAFF" | "VIEWER";
  }

  private mapStockStatusToDb(status: string) {
    return status.toUpperCase() as "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  }

  private parseLeadMinutes(value: string) {
    const match = value.match(/(\d+)/);
    return match ? Number(match[1]) : 25;
  }
}
