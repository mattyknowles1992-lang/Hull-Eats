import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";

import { hashPassword, verifyPassword } from "@hull-eats/auth";
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

type HubCredential = {
  userId: string;
  username: string;
  passwordHash: string;
};

type HubWorkspaceRecord = {
  workspace: MerchantWorkspace;
  credentials: HubCredential[];
};

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

function createDraftMenuItem(
  sectionId: string,
  sortOrder: number,
  input: {
    idSeed: string;
    name: string;
    description: string;
    price: number;
  },
) {
  return {
    id: `item-${input.idSeed}`,
    categoryId: sectionId,
    name: input.name,
    description: input.description,
    price: input.price,
    isActive: true,
    trackStock: false,
    stockQuantity: null,
    stockStatus: "in_stock" as const,
    allowBackorder: false,
    maxPerOrder: null,
    sortOrder,
  };
}

function extractPrice(value: string) {
  const match = value.match(/[£$]?\s*(\d+(?:\.\d{1,2})?)/);
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

    if (/^from\s*[£$]/i.test(line) || /^[£$]\s*\d/.test(line)) {
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
      const itemName = cleanImportLine(line.replace(/\s*(?:from\s*)?[£$]?\s*\d+(?:\.\d{1,2})?.*$/i, "")) || pendingItemName;
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

function createSeedImportBatch(imageName: string, seed: string): HubMenuImportBatch {
  return {
    id: `import-${seed}`,
    imageName,
    status: "pending_review",
    candidates: [
      createImportCandidate(seed, 1, {
        suggestedCategoryName: "Burgers",
        itemName: "Classic Smash Burger",
        description: "Seeded from uploaded menu image for review before publishing.",
        price: 8.99,
        sourceLine: "Burgers / Classic Smash Burger / £8.99",
      }),
      createImportCandidate(seed, 2, {
        suggestedCategoryName: "Loaded Fries",
        itemName: "BBQ Pulled Pork Fries",
        description: "Seeded from uploaded menu image for review before publishing.",
        price: 9.99,
        sourceLine: "Loaded Fries / BBQ Pulled Pork Fries / £9.99",
      }),
      createImportCandidate(seed, 3, {
        suggestedCategoryName: "Meal Deals",
        itemName: "Burger Meal Deal",
        description: "Burger, fries, and drink meal deal parsed from the uploaded page.",
        price: 12.99,
        sourceLine: "Meal Deals / Burger Meal Deal / £12.99",
      }),
    ],
  };
}

@Injectable()
export class HubRegistryService {
  private readonly workspaces = new Map<string, HubWorkspaceRecord>();

  constructor() {
    const loadedMunchHubId = "hub_loaded_munch";

    const loadedMunchSummary: HubSummary = {
      id: loadedMunchHubId,
      businessName: loadedMunchStore.name,
      slug: loadedMunchStore.slug,
      type: loadedMunchStore.type,
      hubUsername: "loaded-munch-admin",
      deliveryLeadTime: `${loadedMunchStore.etaMinutes ?? 25} min`,
      status: "live",
      ownerName: "Loaded Munch Owner",
      orderVolumeToday: 27,
      orderVolumeWeek: 186,
      grossSalesWeek: "£3,244",
      averageOrderValue: "£17.44",
      activeOrders: [
        { id: "HE-2033", customerName: "Tia L", status: "preparing", total: "£24.98", placedAgo: "3 min ago" },
        { id: "HE-2034", customerName: "Ben R", status: "assigned", total: "£31.47", placedAgo: "6 min ago" },
        { id: "HE-2035", customerName: "Ava J", status: "pending", total: "£18.76", placedAgo: "1 min ago" },
      ],
      notes: [
        "Launch partner hub for Hull Eats rollout and live testing.",
        "This merchant workspace is the source of truth for menu edits and business-user access.",
      ],
    };

    const loadedMunchSettings: HubSettings = {
      name: loadedMunchStore.name,
      cuisineLabel: loadedMunchStore.cuisineLabel ?? "",
      onboardingMessage: loadedMunchStore.onboardingMessage ?? "",
      city: loadedMunchStore.city,
      postcode: loadedMunchStore.postcode,
      etaMinutes: loadedMunchStore.etaMinutes ?? 25,
      deliveryFee: loadedMunchStore.deliveryFee ?? 0,
      minimumOrderAmount: loadedMunchStore.minimumOrderAmount ?? 0,
      isOpen: loadedMunchStore.isOpen,
      logoImageUrl: loadedMunchStore.logoImageUrl ?? "",
      heroImageUrl: loadedMunchStore.heroImageUrl ?? "",
    };

    const ownerUser: HubUser = {
      id: "hub-user-loaded-munch-admin",
      hubId: loadedMunchHubId,
      fullName: "Loaded Munch Owner",
      email: "owner@loadedmunch.co.uk",
      username: "loaded-munch-admin",
      role: "owner",
      status: "active",
    };

    this.workspaces.set(loadedMunchHubId, {
      workspace: {
        hub: loadedMunchSummary,
        settings: loadedMunchSettings,
        users: [ownerUser],
        menuSections: loadedMunchMenuSections as HubMenuSection[],
        pendingImports: [],
      },
      credentials: [
        {
          userId: ownerUser.id,
          username: ownerUser.username,
          passwordHash: hashPassword("temp-hub-pass"),
        },
      ],
    });
  }

  listHubs(): HubSummary[] {
    return Array.from(this.workspaces.values()).map(({ workspace }) => workspace.hub);
  }

  createHub(input: CreateHubInput) {
    const slug = slugify(input.businessName) || `hub-${this.workspaces.size + 1}`;
    const hubId = `hub_${slug}`;
    const ownerUserId = `hub-user-${slug}-owner`;
    const ownerName = `${input.businessName} Owner`;
    const ownerEmail = `${slug}@hub.local`;

    const hub: HubSummary = {
      id: hubId,
      businessName: input.businessName,
      slug,
      type: input.type,
      hubUsername: input.hubUsername,
      deliveryLeadTime: input.deliveryLeadTime,
      status: "onboarding",
      ownerName,
      orderVolumeToday: 0,
      orderVolumeWeek: 0,
      grossSalesWeek: "£0",
      averageOrderValue: "£0.00",
      activeOrders: [],
      notes: [
        "Hub created from the admin panel.",
        "For MVP simplicity, one hub maps to one live store on the marketplace.",
      ],
    };

    const ownerUser: HubUser = {
      id: ownerUserId,
      hubId,
      fullName: ownerName,
      email: ownerEmail,
      username: input.hubUsername,
      role: "owner",
      status: "active",
    };

    const workspace: MerchantWorkspace = {
      hub,
      settings: {
        name: input.businessName,
        cuisineLabel: "",
        onboardingMessage: "New hub created from the admin panel. Add categories, items, pricing, and images here.",
        city: "Hull",
        postcode: "",
        etaMinutes: 25,
        deliveryFee: 0,
        minimumOrderAmount: 0,
        isOpen: false,
        logoImageUrl: "",
        heroImageUrl: "",
      },
      users: [ownerUser],
      menuSections: [],
      pendingImports: [],
    };

    this.workspaces.set(hubId, {
      workspace,
      credentials: [
        {
          userId: ownerUserId,
          username: input.hubUsername,
          passwordHash: hashPassword(input.hubPassword),
        },
      ],
    });

    return {
      hub,
      ownerUser,
      temporaryPassword: input.hubPassword,
    };
  }

  authenticate(username: string, password: string) {
    for (const { workspace, credentials } of this.workspaces.values()) {
      const credential = credentials.find(
        (entry) =>
          entry.username.trim().toLowerCase() === username.trim().toLowerCase() &&
          verifyPassword(password, entry.passwordHash),
      );

      if (credential) {
        const user = workspace.users.find((entry) => entry.id === credential.userId);
        if (user) {
          return {
            user,
            workspace,
          };
        }
      }
    }

    throw new UnauthorizedException("Hub username or password did not match a provisioned business account.");
  }

  getWorkspaceById(hubId: string): MerchantWorkspace {
    const record = this.workspaces.get(hubId);
    if (!record) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    return record.workspace;
  }

  updateWorkspace(hubId: string, input: MerchantWorkspaceUpdateInput): MerchantWorkspace {
    const record = this.workspaces.get(hubId);
    if (!record) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    record.workspace = {
      ...record.workspace,
      settings: input.settings,
      menuSections: input.menuSections,
      hub: {
        ...record.workspace.hub,
        businessName: input.settings.name,
        deliveryLeadTime: `${input.settings.etaMinutes} min`,
        status: input.settings.isOpen ? "live" : "onboarding",
      },
    };

    this.workspaces.set(hubId, record);

    return record.workspace;
  }

  createHubUser(hubId: string, input: CreateHubUserInput) {
    const record = this.workspaces.get(hubId);
    if (!record) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    const userId = `hub-user-${hubId}-${slugify(input.username)}`;
    const createdUser: HubUser = {
      id: userId,
      hubId,
      fullName: input.fullName,
      email: input.email,
      username: input.username,
      role: input.role,
      status: "active",
    };

    record.workspace = {
      ...record.workspace,
      users: [createdUser, ...record.workspace.users],
    };
    record.credentials = [
      ...record.credentials,
      {
        userId,
        username: input.username,
        passwordHash: hashPassword(input.password),
      },
    ];

    this.workspaces.set(hubId, record);

    return createdUser;
  }

  createMenuSection(hubId: string, input: CreateHubMenuSectionInput) {
    const record = this.workspaces.get(hubId);
    if (!record) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    const newSection: HubMenuSection = {
      id: `section-${Date.now()}`,
      name: input.name,
      description: input.description || "",
      items: [],
    };

    record.workspace = {
      ...record.workspace,
      menuSections: [...record.workspace.menuSections, newSection],
    };

    this.workspaces.set(hubId, record);
    return newSection;
  }

  createMenuItem(hubId: string, sectionId: string, input: CreateHubMenuItemInput) {
    const record = this.workspaces.get(hubId);
    if (!record) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    const section = record.workspace.menuSections.find((entry) => entry.id === sectionId);
    if (!section) {
      throw new NotFoundException(`Section ${sectionId} was not found.`);
    }

    const newItem = createDraftMenuItem(sectionId, section.items.length, {
      idSeed: String(Date.now()),
      name: input.name,
      description: input.description,
      price: input.price,
    });

    record.workspace = {
      ...record.workspace,
      menuSections: record.workspace.menuSections.map((entry) =>
        entry.id === sectionId
          ? {
              ...entry,
              items: [...entry.items, newItem],
            }
          : entry,
      ),
    };

    this.workspaces.set(hubId, record);
    return newItem;
  }

  previewMenuImport(hubId: string, input: PreviewMenuImportInput) {
    const record = this.workspaces.get(hubId);
    if (!record) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    const seed = String(Date.now());
    const batch = createSeedImportBatch(input.imageName, seed);

    record.workspace = {
      ...record.workspace,
      pendingImports: [batch, ...record.workspace.pendingImports],
    };

    this.workspaces.set(hubId, record);
    return batch;
  }

  previewMenuTextImport(hubId: string, input: PreviewMenuTextImportInput) {
    const record = this.workspaces.get(hubId);
    if (!record) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    const seed = String(Date.now());
    const batch: HubMenuImportBatch = {
      id: `import-${seed}`,
      imageName: "Pasted storefront text",
      status: "pending_review",
      candidates: parsePastedMenuText(input.rawText, seed),
    };

    record.workspace = {
      ...record.workspace,
      pendingImports: [batch, ...record.workspace.pendingImports],
    };

    this.workspaces.set(hubId, record);
    return batch;
  }

  applyMenuImport(hubId: string, importId: string, input: ApplyMenuImportInput) {
    const record = this.workspaces.get(hubId);
    if (!record) {
      throw new NotFoundException(`Hub ${hubId} was not found.`);
    }

    const batch = record.workspace.pendingImports.find((entry) => entry.id === importId);
    if (!batch) {
      throw new NotFoundException(`Import ${importId} was not found.`);
    }

    let updatedSections = [...record.workspace.menuSections];
    const acceptedCandidates = batch.candidates.filter((candidate) => input.acceptedCandidateIds.includes(candidate.id));

    for (const candidate of acceptedCandidates) {
      let targetSection = updatedSections.find(
        (entry) => entry.name.trim().toLowerCase() === candidate.suggestedCategoryName.trim().toLowerCase(),
      );

      if (!targetSection) {
        targetSection = {
          id: `section-${Date.now()}-${candidate.id}`,
          name: candidate.suggestedCategoryName,
          description: "Created from reviewed menu import.",
          items: [],
        };
        updatedSections = [...updatedSections, targetSection];
      }

      const newItem = createDraftMenuItem(targetSection.id, targetSection.items.length, {
        idSeed: `${Date.now()}-${candidate.id}`,
        name: candidate.itemName,
        description: candidate.description,
        price: candidate.price,
      });

      targetSection.items = [...targetSection.items, newItem];
      updatedSections = updatedSections.map((entry) => (entry.id === targetSection?.id ? targetSection : entry));
    }

    record.workspace = {
      ...record.workspace,
      menuSections: updatedSections,
      pendingImports: record.workspace.pendingImports.filter((entry) => entry.id !== importId),
    };

    this.workspaces.set(hubId, record);
    return record.workspace;
  }
}
