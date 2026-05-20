"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  HubMenuSection,
  HubSettings,
  HubUser,
  MembershipRole,
  MerchantWorkspace,
  MenuItem,
  OrderSummary,
} from "@hull-eats/types";
import { parseMerchantWorkspaceUpdateInput } from "@hull-eats/types";
import {
  HUB_MENU_CATEGORY_CUSTOM_ID,
  createDefaultHullPostcodeZones,
  getHubAccess,
  hubMenuCategorySelectOptions,
  hubRoleLabel,
  hubRolesCreatableBy,
  isHubMenuSectionPizza,
} from "@hull-eats/types";

import { HubConfigBackups } from "./hub-config-backups";
import { HubDeliveryConfig } from "./hub-delivery-config";
import { HubMenuCustomisationBuilder } from "./hub-menu-customisation";
import { HubMenuStudio } from "./hub-menu-studio";
import { HE_BRAND } from "./portal-brand";
import { HubDriversWorkbench } from "./hub-drivers-workbench";
import { HubOffersWorkbench } from "./hub-offers-workbench";
import {
  buildLocalMenuCategory,
  buildLocalMenuItem,
  buildMenuPublishSummary,
  buildMenuTemplate,
  cloneMenuItemDraft,
  computeMenuPublishIssues,
  menuTemplateCards,
  type MenuTemplateKind,
} from "./menu-studio-core";
import { PizzaSizeDraftPanel, buildPizzaSizeOptionGroupFromRows, createInitialPizzaSizeRows } from "./pizza-size-draft";
import type { PizzaSizeRow } from "./pizza-size-draft";

const HUB_CATEGORY_PRESET_OPTIONS = hubMenuCategorySelectOptions();

type HubRole = MembershipRole;
type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
type HubSection =
  | "home"
  | "orders"
  | "drivers"
  | "orderHistory"
  | "earnings"
  | "reports"
  | "menu"
  | "offers"
  | "businessProfile"
  | "deliveryRanges"
  | "users"
  | "settings"
  | "help";

const defaultApiBaseUrl = process.env.NODE_ENV === "production" ? "https://hull-eats-api.onrender.com" : "http://localhost:4000";
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl).replace(/\/$/, "");
const customerWebBaseUrl = (process.env.NEXT_PUBLIC_CUSTOMER_WEB_URL ?? "https://hull-eats.onrender.com").replace(/\/$/, "");
const merchantSessionStorageKey = "hull-eats-merchant-session";

type MerchantLoginResponse = {
  token: string;
  user: HubUser;
  workspace: MerchantWorkspace;
};

type CreateCategoryFormState = {
  presetId: string;
  name: string;
  description: string;
  defaultPrice: string;
};

type MerchantDriverTracking = {
  drivers: Array<{
    courierProfileId: string;
    courierName: string;
    currentStatus: string;
    rating: number | null;
    latestLocation?: {
      latitude: number;
      longitude: number;
      accuracyMeters?: number;
      heading?: number;
      updatedAt: string;
    };
    orders: Array<{
      orderId: string;
      orderNumber: string;
      status: string;
      customerName: string;
      dropoffAddress: string;
      paymentStatus: string;
      paymentMethod: string;
      cashDue: number;
      totalAmount: number;
      scannedAt: string | null;
      pickedUpAt: string | null;
      locationUpdatedAt: string | null;
    }>;
    totalCashDue: number;
    orderCount: number;
  }>;
  totals: {
    driverCount: number;
    orderCount: number;
    cashDue: number;
    cashOrderCount: number;
  };
  liveMapAllowed?: boolean;
  liveMapMessage?: string;
};

type CreateItemFormState = {
  sectionId: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  requiresIdVerification: boolean;
};

type CreateUserFormState = {
  fullName: string;
  email: string;
  username: string;
  password: string;
  role: HubRole;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type StoredMerchantSession = {
  token: string;
  hubId: string;
  user: HubUser;
};

const initialCreateUserState: CreateUserFormState = {
  fullName: "",
  email: "",
  username: "",
  password: "",
  role: "owner",
};

const initialPasswordFormState: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const initialCreateCategoryState: CreateCategoryFormState = {
  presetId: HUB_MENU_CATEGORY_CUSTOM_ID,
  name: "",
  description: "",
  defaultPrice: "",
};

const initialCreateItemState: CreateItemFormState = {
  sectionId: "",
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  requiresIdVerification: false,
};

const emptyHubSettings: HubSettings = {
  name: "",
  cuisineLabel: "",
  onboardingMessage: "",
  city: "",
  postcode: "",
  etaMinutes: 25,
  deliveryFee: 0,
  minimumOrderAmount: 0,
  isOpen: false,
  logoImageUrl: "",
  heroImageUrl: "",
  autoAcceptOrders: false,
  autoAcceptMaxPrepMinutes: 60,
  deliveryMode: "business_radius",
  deliveryRadiusMiles: 5,
  deliveryPostcodeZones: createDefaultHullPostcodeZones(),
  deliveryMileFees: [0, 0, 0, 0, 0],
  deliveryOriginLatitude: null,
  deliveryOriginLongitude: null,
  orderFulfillment: "delivery_and_collection",
};

const moneyInput = (value: number) => value.toFixed(2);
const formatMoney = (value: number) => `£${value.toFixed(2)}`;

type HubWorkspaceSnapshot = {
  settings: HubSettings;
  menuSections: HubMenuSection[];
};

const cloneHubSettings = (settings: HubSettings): HubSettings => ({
  ...settings,
  deliveryPostcodeZones: settings.deliveryPostcodeZones.map((zone) => ({ ...zone })),
  deliveryMileFees: [...settings.deliveryMileFees] as HubSettings["deliveryMileFees"],
});

const cloneMenuSections = (sections: HubMenuSection[]): HubMenuSection[] =>
  JSON.parse(JSON.stringify(sections)) as HubMenuSection[];

const hubWorkspaceSnapshotsEqual = (left: HubWorkspaceSnapshot, right: HubWorkspaceSnapshot) =>
  JSON.stringify(left.settings) === JSON.stringify(right.settings) &&
  JSON.stringify(left.menuSections) === JSON.stringify(right.menuSections);

const hullTrackingBounds = {
  minLatitude: 53.70,
  maxLatitude: 53.83,
  minLongitude: -0.48,
  maxLongitude: -0.18,
};

const clampPercentage = (value: number) => Math.min(96, Math.max(4, value));

const mapHullPosition = (latitude: number, longitude: number) => ({
  left: `${clampPercentage(((longitude - hullTrackingBounds.minLongitude) / (hullTrackingBounds.maxLongitude - hullTrackingBounds.minLongitude)) * 100)}%`,
  top: `${clampPercentage((1 - (latitude - hullTrackingBounds.minLatitude) / (hullTrackingBounds.maxLatitude - hullTrackingBounds.minLatitude)) * 100)}%`,
});

const formatTrackingTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No ping yet";

async function loginToHub(usernameOrEmail: string, password: string): Promise<MerchantLoginResponse> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ username: usernameOrEmail, password }),
  });

  if (!response.ok) {
    throw new Error(`Hub login failed with status ${response.status}`);
  }

  return (await response.json()) as MerchantLoginResponse;
}

async function fetchWorkspace(token: string, hubId: string) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/workspace`, {
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Hub workspace fetch failed with status ${response.status}`);
  }

  return (await response.json()) as MerchantWorkspace;
}

async function saveWorkspace(token: string, hubId: string, input: { settings: HubSettings; menuSections: HubMenuSection[] }) {
  let payload: ReturnType<typeof parseMerchantWorkspaceUpdateInput>;
  try {
    payload = parseMerchantWorkspaceUpdateInput(input);
  } catch (error) {
    const issues =
      error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues: unknown }).issues)
        ? (error as { issues: Array<{ path?: (string | number)[]; message?: string }> }).issues
        : null;
    if (issues?.length) {
      throw new Error(
        issues.map((issue) => `${issue.path?.join(".") ?? "request"}: ${issue.message ?? "invalid"}`).join("; "),
      );
    }
    throw error;
  }

  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/workspace`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `Hub workspace save failed (${response.status})`;
    try {
      const body = (await response.json()) as {
        message?: string;
        issues?: Array<{ path?: string; message?: string }>;
      };
      if (body.issues?.length) {
        detail = body.issues.map((issue) => `${issue.path ?? "request"}: ${issue.message ?? "invalid"}`).join("; ");
      } else if (body.message) {
        detail = body.message;
      }
    } catch {
      // keep default detail
    }
    throw new Error(detail);
  }

  return (await response.json()) as MerchantWorkspace;
}

async function changeHubPassword(token: string, hubId: string, input: { currentPassword: string; newPassword: string }) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/password`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Password change failed with status ${response.status}`);
  }

  return (await response.json()) as { changed: boolean; user: HubUser };
}

async function createBusinessUser(
  token: string,
  hubId: string,
  input: { fullName: string; email: string; username: string; password: string; role: HubRole },
) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/users`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Business user create failed with status ${response.status}`);
  }

  return (await response.json()) as HubUser;
}

async function deleteBusinessUser(token: string, hubId: string, userId: string) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/users/${userId}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Business user delete failed with status ${response.status}`);
  }

  return (await response.json()) as { deletedUserId: string };
}

async function createMenuCategory(token: string, hubId: string, input: CreateCategoryFormState): Promise<HubMenuSection> {
  const presetKey = input.presetId && input.presetId !== HUB_MENU_CATEGORY_CUSTOM_ID ? input.presetId : undefined;
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/menu-sections`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      defaultPrice: input.defaultPrice.trim() ? Number(input.defaultPrice) : null,
      presetKey,
    }),
  });

  if (!response.ok) {
    throw new Error(`Menu category create failed with status ${response.status}`);
  }

  return (await response.json()) as HubMenuSection;
}

async function deleteMenuCategory(token: string, hubId: string, sectionId: string) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/menu-sections/${sectionId}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Menu category delete failed with status ${response.status}`);
  }

  return (await response.json()) as { deletedSectionId: string };
}

async function createMenuItem(
  token: string,
  hubId: string,
  sectionId: string,
  input: {
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
    requiresIdVerification?: boolean;
    components: MenuItem["components"];
    optionGroups: MenuItem["optionGroups"];
  },
) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/menu-sections/${sectionId}/items`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Menu item create failed with status ${response.status}`);
  }

  return (await response.json()) as HubMenuSection["items"][number];
}

async function deleteMenuItem(token: string, hubId: string, itemId: string) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/menu-items/${itemId}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Menu item delete failed with status ${response.status}`);
  }

  return (await response.json()) as { deletedItemId: string };
}

async function previewMenuImport(token: string, hubId: string, imageName: string) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/menu-imports/preview`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageName }),
  });

  if (!response.ok) {
    throw new Error(`Menu import preview failed with status ${response.status}`);
  }

  return (await response.json()) as MerchantWorkspace["pendingImports"][number];
}

async function previewMenuTextImport(token: string, hubId: string, rawText: string) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/menu-imports/text-preview`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rawText }),
  });

  if (!response.ok) {
    throw new Error(`Menu text import preview failed with status ${response.status}`);
  }

  return (await response.json()) as MerchantWorkspace["pendingImports"][number];
}

async function applyMenuImport(token: string, hubId: string, importId: string, acceptedCandidateIds: string[]) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/menu-imports/${importId}/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ acceptedCandidateIds }),
  });

  if (!response.ok) {
    throw new Error(`Menu import apply failed with status ${response.status}`);
  }

  return (await response.json()) as MerchantWorkspace;
}

async function fetchMerchantOrders(token: string): Promise<OrderSummary[]> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/orders`, {
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Merchant orders fetch failed with status ${response.status}`);
  }

  return (await response.json()) as OrderSummary[];
}

async function fetchMerchantDriverTracking(token: string): Promise<MerchantDriverTracking> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/drivers/tracking`, {
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Merchant driver tracking fetch failed with status ${response.status}`);
  }

  return (await response.json()) as MerchantDriverTracking;
}

type MerchantOrderPrintResponse = {
  payload: {
    qrCodeData?: string;
  };
  preview: string;
  queued?: boolean;
  printJobId?: string;
  message?: string;
};

async function printMerchantOrderReceipt(token: string, orderId: string): Promise<MerchantOrderPrintResponse> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/orders/${encodeURIComponent(orderId)}/print`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Receipt print failed with status ${response.status}`);
  }

  return (await response.json()) as MerchantOrderPrintResponse;
}

async function acceptMerchantOrder(token: string, orderId: string, prepTimeMinutes: number): Promise<OrderSummary> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/orders/${encodeURIComponent(orderId)}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prepTimeMinutes }),
  });

  if (!response.ok) {
    throw new Error(`Accept order failed with status ${response.status}`);
  }

  return (await response.json()) as OrderSummary;
}

async function rejectMerchantOrder(token: string, orderId: string, reason: string): Promise<OrderSummary> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/orders/${encodeURIComponent(orderId)}/reject`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw new Error(`Reject order failed with status ${response.status}`);
  }

  return (await response.json()) as OrderSummary;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export default function MerchantPortalPage() {
  const [merchantToken, setMerchantToken] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [activeHubId, setActiveHubId] = useState("");
  const [activeHubSlug, setActiveHubSlug] = useState("");
  const [hubUsers, setHubUsers] = useState<HubUser[]>([]);
  const [activeUser, setActiveUser] = useState<HubUser | null>(null);
  const [hubSettings, setHubSettings] = useState<HubSettings>(emptyHubSettings);
  const [menuSections, setMenuSections] = useState<HubMenuSection[]>([]);
  const [pendingImports, setPendingImports] = useState<MerchantWorkspace["pendingImports"]>([]);
  const [merchantOrders, setMerchantOrders] = useState<OrderSummary[]>([]);
  const [ordersClockTick, setOrdersClockTick] = useState(0);
  const [newUser, setNewUser] = useState<CreateUserFormState>(initialCreateUserState);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(initialPasswordFormState);
  const [newCategory, setNewCategory] = useState<CreateCategoryFormState>(initialCreateCategoryState);
  const [newItem, setNewItem] = useState<CreateItemFormState>(initialCreateItemState);
  const [pizzaSizeRows, setPizzaSizeRows] = useState<PizzaSizeRow[]>(() => createInitialPizzaSizeRows());
  const [selectedImportCandidateIds, setSelectedImportCandidateIds] = useState<string[]>([]);
  const [selectedImportImageName, setSelectedImportImageName] = useState("");
  const [pastedMenuText, setPastedMenuText] = useState("");
  const [loginError, setLoginError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [savedHubSnapshot, setSavedHubSnapshot] = useState<HubWorkspaceSnapshot | null>(null);
  const [userNotice, setUserNotice] = useState("");
  const [menuNotice, setMenuNotice] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [orderNotice, setOrderNotice] = useState("");
  const [driverNotice, setDriverNotice] = useState("");
  const [offersNotice, setOffersNotice] = useState("");
  const [driverTracking, setDriverTracking] = useState<MerchantDriverTracking | null>(null);
  const [activeHubSection, setActiveHubSection] = useState<HubSection>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeHubPanel, setActiveHubPanel] = useState<
    "menu" | "import" | "businessProfile" | "deliveryRanges" | "settings" | "account"
  >("menu");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [isCreatingNewItem, setIsCreatingNewItem] = useState(false);
  const [showChoiceSetupForItemId, setShowChoiceSetupForItemId] = useState<string | null>(null);
  const [menuPublishDialogOpen, setMenuPublishDialogOpen] = useState(false);
  const [menuPublishing, setMenuPublishing] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showAccountPasswords, setShowAccountPasswords] = useState(false);
  const [showHubPasswordCurrent, setShowHubPasswordCurrent] = useState(false);
  const [showHubPasswordNew, setShowHubPasswordNew] = useState(false);
  const [showHubPasswordConfirm, setShowHubPasswordConfirm] = useState(false);
  const [showCreateUserPassword, setShowCreateUserPassword] = useState(false);

  const menuPublishIssues = useMemo(() => computeMenuPublishIssues(menuSections), [menuSections]);

  const menuStats = useMemo(() => {
    const totalItems = menuSections.reduce((sum, section) => sum + section.items.length, 0);
    const activeItems = menuSections.reduce((sum, section) => sum + section.items.filter((item) => item.isActive).length, 0);
    const customisableItems = menuSections.reduce(
      (sum, section) => sum + section.items.filter((item) => item.components.length > 0 || item.optionGroups.length > 0).length,
      0,
    );

    return {
      totalItems,
      activeItems,
      categories: menuSections.length,
      customisableItems,
    };
  }, [menuSections]);

  useEffect(() => {
    if (activeHubSection !== "orders") {
      return;
    }

    const id = window.setInterval(() => setOrdersClockTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(id);
  }, [activeHubSection]);

  const selectedCategory = useMemo(
    () => menuSections.find((section) => section.id === selectedCategoryId) ?? menuSections[0] ?? null,
    [menuSections, selectedCategoryId],
  );

  const selectedItem = useMemo(() => {
    if (isCreatingNewItem || !selectedCategory || !selectedItemId) {
      return null;
    }
    return selectedCategory.items.find((item) => item.id === selectedItemId) ?? null;
  }, [isCreatingNewItem, selectedCategory, selectedItemId]);

  const newItemTargetSection = useMemo(
    () => menuSections.find((section) => section.id === newItem.sectionId) ?? null,
    [menuSections, newItem.sectionId],
  );
  const newItemSectionIsPizza = isHubMenuSectionPizza(newItemTargetSection);

  useEffect(() => {
    setPizzaSizeRows(createInitialPizzaSizeRows());
  }, [newItem.sectionId]);

  const openHubSection = (section: HubSection) => {
    setMobileNavOpen(false);
    setActiveHubSection(section);

    if (section === "orders") {
      void loadMerchantOrders();
      return;
    }

    if (section === "drivers") {
      void loadDriverTracking();
      return;
    }

    if (section === "menu") {
      setActiveHubPanel("menu");
      return;
    }

    if (section === "businessProfile") {
      setActiveHubPanel("businessProfile");
      return;
    }

    if (section === "deliveryRanges") {
      setActiveHubPanel("deliveryRanges");
      return;
    }

    if (section === "settings") {
      setActiveHubPanel("settings");
      return;
    }

    if (section === "users") {
      setActiveHubPanel("account");
    }
  };

  useEffect(() => {
    if (!menuSections.length) {
      setSelectedCategoryId("");
      setSelectedItemId("");
      setIsCreatingNewItem(false);
      return;
    }

    const nextCategory = menuSections.find((section) => section.id === selectedCategoryId) ?? menuSections[0]!;
    if (nextCategory.id !== selectedCategoryId) {
      setSelectedCategoryId(nextCategory.id);
    }

    if (isCreatingNewItem) {
      return;
    }

    if (!nextCategory.items.length) {
      if (selectedItemId) {
        setSelectedItemId("");
      }
      return;
    }

    const nextItem = nextCategory.items.find((item) => item.id === selectedItemId) ?? nextCategory.items[0]!;
    if (nextItem.id !== selectedItemId) {
      setSelectedItemId(nextItem.id);
    }
  }, [isCreatingNewItem, menuSections, selectedCategoryId, selectedItemId]);

  const beginCreateItem = useCallback(
    (sectionId: string) => {
      const section = menuSections.find((entry) => entry.id === sectionId);
      setIsCreatingNewItem(true);
      setSelectedCategoryId(sectionId);
      setSelectedItemId("");
      setNewItem({
        ...initialCreateItemState,
        sectionId,
        price: section?.defaultPrice != null ? String(section.defaultPrice) : "",
      });
      setPizzaSizeRows(createInitialPizzaSizeRows());
      setMenuNotice("");
    },
    [menuSections],
  );

  const cancelCreateItem = useCallback(() => {
    setIsCreatingNewItem(false);
    const section = menuSections.find((entry) => entry.id === selectedCategoryId);
    setSelectedItemId(section?.items[0]?.id ?? "");
    setNewItem((current) => ({ ...initialCreateItemState, sectionId: current.sectionId }));
    setPizzaSizeRows(createInitialPizzaSizeRows());
  }, [menuSections, selectedCategoryId]);

  const commitSavedHubSnapshot = useCallback((settings: HubSettings, sections: HubMenuSection[]) => {
    setSavedHubSnapshot({
      settings: cloneHubSettings(settings),
      menuSections: cloneMenuSections(sections),
    });
  }, []);

  const syncSavedMenuSnapshot = useCallback((sections: HubMenuSection[]) => {
    setSavedHubSnapshot((current) =>
      current
        ? {
            ...current,
            menuSections: cloneMenuSections(sections),
          }
        : null,
    );
  }, []);

  const hasUnsavedHubChanges = useMemo(() => {
    if (!savedHubSnapshot || !merchantToken) {
      return false;
    }

    return !hubWorkspaceSnapshotsEqual(
      { settings: hubSettings, menuSections },
      savedHubSnapshot,
    );
  }, [hubSettings, menuSections, merchantToken, savedHubSnapshot]);

  const menuPublishSummary = useMemo(
    () => buildMenuPublishSummary(menuSections, savedHubSnapshot?.menuSections ?? null, hasUnsavedHubChanges),
    [menuSections, savedHubSnapshot, hasUnsavedHubChanges],
  );

  const hubAccess = useMemo(() => (activeUser ? getHubAccess(activeUser.role) : null), [activeUser]);

  const creatableHubRoles = useMemo(
    () => (activeUser ? hubRolesCreatableBy(activeUser.role) : []),
    [activeUser],
  );

  useEffect(() => {
    if (!hasUnsavedHubChanges) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedHubChanges]);

  const updateMenuSections = (updater: (current: HubMenuSection[]) => HubMenuSection[]) => {
    setMenuSections((current) => updater(current));
    setSaveNotice("");
  };

  const applyWorkspace = (workspace: MerchantWorkspace, user: HubUser | null) => {
    setActiveHubId(workspace.hub.id);
    setActiveHubSlug(workspace.hub.slug);
    setActiveUser(user);
    setHubUsers(workspace.users);
    setHubSettings({
      ...workspace.settings,
      deliveryPostcodeZones:
        workspace.settings.deliveryPostcodeZones.length > 0
          ? workspace.settings.deliveryPostcodeZones
          : createDefaultHullPostcodeZones(),
    });
    setMenuSections(workspace.menuSections);
    setPendingImports(workspace.pendingImports ?? []);
    setSelectedCategoryId(workspace.menuSections[0]?.id ?? "");
    setSelectedItemId(workspace.menuSections[0]?.items[0]?.id ?? "");
    setNewItem((current) => ({
      ...current,
      sectionId: workspace.menuSections[0]?.id ?? "",
    }));
    commitSavedHubSnapshot(workspace.settings, workspace.menuSections);
  };

  const loadMerchantOrders = async (token = merchantToken, options: { silent?: boolean } = {}) => {
    if (!token) {
      return;
    }

    try {
      const orders = await fetchMerchantOrders(token);
      setMerchantOrders(orders);
      if (!options.silent) {
        setOrderNotice(`Loaded ${orders.length} orders.`);
      }
    } catch (error) {
      setOrderNotice(error instanceof Error ? error.message : "Order fetch failed.");
    }
  };

  const handleAcceptMerchantOrder = async (order: OrderSummary) => {
    if (!merchantToken) {
      return;
    }

    if (!hubAccess?.canOperateOrders) {
      setOrderNotice("Your account cannot accept or reject orders.");
      return;
    }

    try {
      await acceptMerchantOrder(merchantToken, order.id, hubSettings.etaMinutes);
      await loadMerchantOrders(merchantToken, { silent: true });
      setOrderNotice(`Accepted ${order.orderNumber}. Kitchen receipt queued if a printer is configured.`);
    } catch (error) {
      setOrderNotice(error instanceof Error ? error.message : "Accept failed.");
    }
  };

  const handleRejectMerchantOrder = async (order: OrderSummary) => {
    if (!merchantToken) {
      return;
    }

    if (!hubAccess?.canOperateOrders) {
      setOrderNotice("Your account cannot accept or reject orders.");
      return;
    }

    const reason = window.prompt("Reason for rejecting this order?", "Unable to fulfil right now");
    if (reason === null) {
      return;
    }

    const trimmed = reason.trim() || "Unable to fulfil right now";

    try {
      await rejectMerchantOrder(merchantToken, order.id, trimmed);
      await loadMerchantOrders(merchantToken, { silent: true });
      setOrderNotice(`Rejected ${order.orderNumber}.`);
    } catch (error) {
      setOrderNotice(error instanceof Error ? error.message : "Reject failed.");
    }
  };

  const loadDriverTracking = async (token = merchantToken, options: { silent?: boolean } = {}) => {
    if (!token) {
      return;
    }

    try {
      const tracking = await fetchMerchantDriverTracking(token);
      setDriverTracking(tracking);
      if (!options.silent) {
        setDriverNotice(`Loaded ${tracking.totals.driverCount} drivers and ${tracking.totals.orderCount} assigned delivery orders.`);
      }
    } catch (error) {
      setDriverNotice(error instanceof Error ? error.message : "Driver tracking fetch failed.");
    }
  };

  const handlePrintOrderReceipt = async (order: OrderSummary) => {
    if (!merchantToken) {
      return;
    }

    const receiptWindow = window.open("", "_blank", "width=420,height=720");
    if (receiptWindow) {
      receiptWindow.document.write("<p>Creating receipt...</p>");
      receiptWindow.document.close();
    }

    try {
      const receipt = await printMerchantOrderReceipt(merchantToken, order.id);
      setOrderNotice(receipt.message ?? "Receipt created.");

      if (receiptWindow) {
        const qrCodeData = receipt.payload.qrCodeData;
        const qrCodeImage = qrCodeData
          ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(qrCodeData)}`
          : "";
        const logoUrl = `${customerWebBaseUrl}/brand/hull-eats-logo.jpeg`;
        receiptWindow.document.open();
        receiptWindow.document.write(`
          <html>
            <head>
              <title>${escapeHtml(order.orderNumber)} receipt</title>
              <style>
                * { box-sizing: border-box; }
                body { margin: 0; background: #f3f5f7; color: #111; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
                .print-action { margin: 14px auto; display: block; min-height: 42px; padding: 0 16px; border: 0; border-radius: 999px; background: #111; color: #fff; font-weight: 900; cursor: pointer; }
                .receipt { max-width: 380px; margin: 16px auto; padding: 18px; background: #fff; border: 1px solid #d8dde3; border-radius: 14px; box-shadow: 0 18px 45px rgba(15, 17, 21, 0.12); }
                .title { text-align: center; border-bottom: 3px double #111; padding-bottom: 12px; margin-bottom: 14px; }
                .logo { display: block; width: 64px; height: 64px; margin: 0 auto 8px; border-radius: 18px; object-fit: cover; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18); }
                .title strong { display: block; font-size: 26px; letter-spacing: 0.12em; }
                .title small { display: block; margin-top: 3px; font-size: 11px; font-weight: 900; letter-spacing: 0.03em; }
                .title span { display: inline-block; margin-top: 10px; padding: 6px 10px; border: 2px solid #111; border-radius: 999px; font-size: 15px; font-weight: 900; }
                .bag-note { margin: 0 0 12px; padding: 9px 10px; border: 2px dashed #111; border-radius: 10px; text-align: center; font-size: 11px; font-weight: 900; text-transform: uppercase; }
                .qr { display: grid; gap: 8px; justify-items: center; margin: 18px 0 0; padding: 14px; border: 3px solid #111; border-radius: 12px; }
                .qr img { width: 180px; height: 180px; image-rendering: pixelated; }
                .qr span { font-size: 12px; font-weight: 900; text-align: center; text-transform: uppercase; }
                .backup { margin: 12px 0 0; padding: 10px; border: 2px dashed #111; border-radius: 10px; font-size: 12px; font-weight: 900; text-align: center; }
                pre { white-space: pre-wrap; font-size: 13px; line-height: 1.5; margin: 0; }
                @media print { body { background: #fff; } .print-action { display: none; } .receipt { max-width: none; margin: 0; padding: 0; border: 0; border-radius: 0; box-shadow: none; } }
              </style>
            </head>
            <body>
              <button class="print-action" onclick="window.print()">Print receipt</button>
              <main class="receipt">
                <div class="title">
                  <img class="logo" alt="Hull Eats" src="${escapeHtml(logoUrl)}" />
                  <strong>HULL EATS</strong>
                  <small>Anything you want. Delivered.</small>
                  <span>${escapeHtml(order.orderNumber)}</span>
                </div>
                <div class="bag-note">Customer bag receipt</div>
                <pre>${escapeHtml(receipt.preview)}</pre>
                ${
                  qrCodeImage
                    ? `<div class="qr"><img alt="Courier scan QR" src="${qrCodeImage}" /><span>Scan with courier app</span></div>`
                    : ""
                }
                <div class="backup">QR backup: enter order number ${escapeHtml(order.orderNumber)} in the courier app.</div>
              </main>
            </body>
          </html>
        `);
        receiptWindow.document.close();
      }
    } catch (error) {
      setOrderNotice(error instanceof Error ? error.message : "Receipt print failed.");
      receiptWindow?.close();
    }
  };

  useEffect(() => {
    const storedSession = window.localStorage.getItem(merchantSessionStorageKey);
    if (!storedSession) {
      return;
    }

    void (async () => {
      try {
        const parsed = JSON.parse(storedSession) as StoredMerchantSession;
        if (!parsed.token || !parsed.hubId || !parsed.user) {
          throw new Error("Stored merchant session is incomplete.");
        }

        const workspace = await fetchWorkspace(parsed.token, parsed.hubId);
        setMerchantToken(parsed.token);
        applyWorkspace(workspace, parsed.user);
        await loadMerchantOrders(parsed.token);
      } catch {
        window.localStorage.removeItem(merchantSessionStorageKey);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeHubSection !== "orders" || !merchantToken) {
      return;
    }

    void loadMerchantOrders(merchantToken, { silent: true });
    const intervalId = window.setInterval(() => {
      void loadMerchantOrders(merchantToken, { silent: true });
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [activeHubSection, merchantToken]);

  useEffect(() => {
    if (activeHubSection !== "drivers" || !merchantToken) {
      return;
    }

    void loadDriverTracking(merchantToken, { silent: true });
    const intervalId = window.setInterval(() => {
      void loadDriverTracking(merchantToken, { silent: true });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [activeHubSection, merchantToken]);

  const handleLogin = async () => {
    try {
      const response = await loginToHub(loginUsername, loginPassword);
      setMerchantToken(response.token);
      applyWorkspace(response.workspace, response.user);
      window.localStorage.setItem(
        merchantSessionStorageKey,
        JSON.stringify({
          token: response.token,
          hubId: response.workspace.hub.id,
          user: response.user,
        } satisfies StoredMerchantSession),
      );
      setLoginError("");
      setSaveNotice("");
      setUserNotice("");
      setMenuNotice("");
      setPasswordNotice("");
      setOrderNotice("");
      void loadMerchantOrders(response.token);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Hub login failed.";
      setLoginError(message);
    }
  };

  const handleSignOut = () => {
    window.localStorage.removeItem(merchantSessionStorageKey);
    setMerchantToken("");
    setLoginUsername("");
    setLoginPassword("");
    setActiveHubId("");
    setActiveHubSlug("");
    setHubUsers([]);
    setActiveUser(null);
    setHubSettings(emptyHubSettings);
    setMenuSections([]);
    setPendingImports([]);
    setMerchantOrders([]);
    setSelectedCategoryId("");
    setSelectedItemId("");
    setPasswordForm(initialPasswordFormState);
    setSavedHubSnapshot(null);
    setSaveNotice("");
    setUserNotice("");
    setMenuNotice("");
    setPasswordNotice("");
    setOrderNotice("");
  };

  const handleChangePassword = async () => {
    if (!merchantToken || !activeHubId) {
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordNotice("Enter your current password and the new password twice.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordNotice("The new password confirmation does not match.");
      return;
    }

    try {
      await changeHubPassword(merchantToken, activeHubId, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(initialPasswordFormState);
      setPasswordNotice("Password changed. This browser will stay signed in until you sign out or the session expires.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Password change failed.";
      setPasswordNotice(message);
    }
  };

  const handleHubFieldChange = <K extends keyof HubSettings>(field: K, value: HubSettings[K]) => {
    setHubSettings((current) => ({
      ...current,
      [field]: value,
    }));
    setSaveNotice("");
  };

  const patchHubDeliverySettings = (patch: Partial<HubSettings>) => {
    setHubSettings((current) => ({ ...current, ...patch }));
    setSaveNotice("");
  };

  const handleMileFeeBandChange = (index: number, value: number) => {
    setHubSettings((current) => {
      const next = [...current.deliveryMileFees];
      next[index] = Math.max(0, value);
      return { ...current, deliveryMileFees: next as HubSettings["deliveryMileFees"] };
    });
    setSaveNotice("");
  };

  const updateSection = <K extends keyof HubMenuSection>(sectionId: string, field: K, value: HubMenuSection[K]) => {
    updateMenuSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              [field]: value,
            }
          : section,
      ),
    );
  };

  const updateItem = (sectionId: string, itemId: string, updater: (item: MenuItem) => MenuItem) => {
    updateMenuSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) => (item.id === itemId ? updater(item) : item)),
            }
          : section,
      ),
    );
  };

  const handleSaveHub = async () => {
    if (!merchantToken || !activeHubId) {
      return;
    }

    if (!hubAccess?.canEditWorkspace) {
      setSaveNotice("Your account is view-only and cannot save hub or menu changes.");
      return;
    }

    setMenuPublishing(true);
    try {
      const workspace = await saveWorkspace(merchantToken, activeHubId, {
        settings: hubSettings,
        menuSections,
      });
      setHubSettings({
        ...workspace.settings,
        deliveryPostcodeZones:
          workspace.settings.deliveryPostcodeZones.length > 0
            ? workspace.settings.deliveryPostcodeZones
            : createDefaultHullPostcodeZones(),
      });
      setMenuSections(workspace.menuSections);
      setHubUsers(workspace.users);
      setPendingImports(workspace.pendingImports ?? []);
      commitSavedHubSnapshot(workspace.settings, workspace.menuSections);
      setMenuPublishDialogOpen(false);
      setSaveNotice(`Live menu published for ${workspace.hub.businessName}.`);
      setMenuNotice("Customers will see your updated menu on Hull Eats.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Menu publish failed.";
      setSaveNotice(message);
      setMenuNotice(message);
    } finally {
      setMenuPublishing(false);
    }
  };

  const handleRequestPublishMenu = () => {
    setMenuPublishDialogOpen(true);
  };

  const handleCreateUser = async () => {
    if (!merchantToken || !activeHubId) {
      return;
    }

    if (!hubAccess?.canManageUsers) {
      setUserNotice("Only hub owners can create business logins.");
      return;
    }

    if (!newUser.fullName.trim() || !newUser.email.trim() || !newUser.username.trim() || !newUser.password.trim()) {
      setUserNotice("Fill in name, email, username, and password before creating a business user.");
      return;
    }

    const alreadyExists = hubUsers.some(
      (user) =>
        user.username.toLowerCase() === newUser.username.trim().toLowerCase() ||
        user.email.toLowerCase() === newUser.email.trim().toLowerCase(),
    );

    if (alreadyExists) {
      setUserNotice("That username or email is already in use for this hub.");
      return;
    }

    try {
      const createdUser = await createBusinessUser(merchantToken, activeHubId, {
        fullName: newUser.fullName.trim(),
        email: newUser.email.trim(),
        username: newUser.username.trim(),
        password: newUser.password,
        role: newUser.role,
      });

      setHubUsers((current) => [createdUser, ...current]);
      setNewUser(initialCreateUserState);
      setUserNotice(`User created. ${createdUser.username} can now sign in to this hub.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Business user creation failed.";
      setUserNotice(message);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!merchantToken || !activeHubId) {
      return;
    }

    if (!hubAccess?.canManageUsers) {
      setUserNotice("Only hub owners can remove business logins.");
      return;
    }

    try {
      await deleteBusinessUser(merchantToken, activeHubId, userId);
      setHubUsers((current) => current.filter((user) => user.id !== userId));
      setUserNotice(`${username} has been removed from this hub.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Business user delete failed.";
      setUserNotice(message);
    }
  };

  const handleNewCategoryPresetChange = (presetId: string) => {
    const opt = HUB_CATEGORY_PRESET_OPTIONS.find((o) => o.id === presetId);
    setNewCategory((cur) => ({
      ...cur,
      presetId,
      name: presetId === HUB_MENU_CATEGORY_CUSTOM_ID ? cur.name : opt?.defaultName ?? "",
      description: presetId === HUB_MENU_CATEGORY_CUSTOM_ID ? cur.description : opt?.defaultDescription ?? "",
    }));
  };

  const handleCreateCategory = () => {
    if (!newCategory.name.trim()) {
      setMenuNotice("Enter a category name before creating it.");
      return;
    }

    const createdCategory = buildLocalMenuCategory(newCategory);
    updateMenuSections((current) => [...current, createdCategory]);
    setSelectedCategoryId(createdCategory.id);
    setNewCategory(initialCreateCategoryState);
    beginCreateItem(createdCategory.id);
    setMenuNotice(`Added ${createdCategory.name} to your draft. Save & publish menu when ready.`);
  };

  const handleDeleteCategory = (sectionId: string, sectionName: string) => {
    const itemCount = menuSections.find((section) => section.id === sectionId)?.items.length ?? 0;
    const detail =
      itemCount > 0
        ? ` This removes ${itemCount} item${itemCount === 1 ? "" : "s"} from your draft.`
        : "";
    if (
      !window.confirm(
        `Remove "${sectionName}" from your menu?${detail}\n\nCustomers are not affected until you save & publish.`,
      )
    ) {
      return;
    }

    updateMenuSections((current) => current.filter((section) => section.id !== sectionId));
    if (selectedCategoryId === sectionId) {
      const remaining = menuSections.filter((section) => section.id !== sectionId);
      setSelectedCategoryId(remaining[0]?.id ?? "");
      setSelectedItemId(remaining[0]?.items[0]?.id ?? "");
    }
    setMenuNotice(`${sectionName} removed from draft. Publish to update the live menu.`);
  };

  const handleCreateItem = () => {
    const targetSection = menuSections.find((section) => section.id === newItem.sectionId);
    const isPizza = isHubMenuSectionPizza(targetSection);

    if (!newItem.sectionId || !newItem.name.trim()) {
      setMenuNotice("Choose a category and item name before creating the item.");
      return;
    }

    let price: number;
    let optionGroups: MenuItem["optionGroups"];

    if (isPizza) {
      const built = buildPizzaSizeOptionGroupFromRows(pizzaSizeRows);
      if ("error" in built) {
        setMenuNotice(built.error);
        return;
      }
      price = built.basePrice;
      optionGroups = built.optionGroups;
    } else {
      const effectivePrice = newItem.price.trim() ? Number(newItem.price) : targetSection?.defaultPrice;
      if (effectivePrice === null || effectivePrice === undefined || Number.isNaN(effectivePrice)) {
        setMenuNotice("Enter an item price or set a category default price before creating the item.");
        return;
      }
      price = effectivePrice;
      optionGroups = [];
    }

    const createdItem = buildLocalMenuItem({
      categoryId: newItem.sectionId,
      name: newItem.name,
      description: newItem.description,
      price,
      imageUrl: newItem.imageUrl.trim() || undefined,
      requiresIdVerification: newItem.requiresIdVerification,
      components: [],
      optionGroups,
      isActive: false,
    });

    updateMenuSections((current) =>
      current.map((section) =>
        section.id === newItem.sectionId ? { ...section, items: [...section.items, createdItem] } : section,
      ),
    );
    setIsCreatingNewItem(false);
    setSelectedCategoryId(newItem.sectionId);
    setSelectedItemId(createdItem.id);
    setShowChoiceSetupForItemId(createdItem.id);
    setNewItem((current) => ({
      ...initialCreateItemState,
      sectionId: current.sectionId,
    }));
    setPizzaSizeRows(createInitialPizzaSizeRows());
    setMenuNotice(`Added ${createdItem.name} to your draft (hidden until you set Live and publish).`);
  };

  const handleApplyCategoryPrice = (sectionId: string) => {
    const section = menuSections.find((entry) => entry.id === sectionId);

    if (!section || section.defaultPrice === null || section.defaultPrice === undefined) {
      setMenuNotice("Set a category default price before applying it to all items.");
      return;
    }

    updateMenuSections((current) =>
      current.map((entry) =>
        entry.id === sectionId
          ? {
              ...entry,
              items: entry.items.map((item) => ({ ...item, price: section.defaultPrice ?? item.price })),
            }
          : entry,
      ),
    );
    setMenuNotice(`${section.name} items now use ${formatMoney(section.defaultPrice)} in your draft. Save & publish menu when ready.`);
  };

  const handleApplyMenuTemplate = (kind: MenuTemplateKind) => {
    if (!selectedCategory || !selectedItem) {
      setMenuNotice("Choose an item before applying a layout.");
      return;
    }

    const template = buildMenuTemplate(kind);
    updateItem(selectedCategory.id, selectedItem.id, (current) => ({
      ...current,
      components: template.components,
      optionGroups: template.optionGroups,
    }));
    setShowChoiceSetupForItemId(null);
    setMenuNotice(
      kind === "simple"
        ? `${selectedItem.name} is a simple fixed-price item.`
        : `${selectedItem.name} now has the "${menuTemplateCards.find((card) => card.kind === kind)?.title ?? "custom"}" choice layout.`,
    );
  };

  const handleDuplicateItem = (item: MenuItem) => {
    if (!selectedCategory) {
      return;
    }

    const createdItem = cloneMenuItemDraft(item);
    updateMenuSections((current) =>
      current.map((section) =>
        section.id === selectedCategory.id ? { ...section, items: [...section.items, createdItem] } : section,
      ),
    );
    setSelectedItemId(createdItem.id);
    setShowChoiceSetupForItemId(null);
    setMenuNotice(`Duplicated as ${createdItem.name} (hidden until you publish).`);
  };

  const handleDeleteItem = (itemId: string, itemName: string) => {
    if (!window.confirm(`Remove "${itemName}" from your menu?\n\nCustomers are not affected until you save & publish.`)) {
      return;
    }

    updateMenuSections((current) =>
      current.map((section) => ({
        ...section,
        items: section.items.filter((item) => item.id !== itemId),
      })),
    );
    if (selectedItemId === itemId) {
      const section = menuSections.find((entry) => entry.items.some((item) => item.id === itemId));
      const remaining = section?.items.filter((item) => item.id !== itemId) ?? [];
      setSelectedItemId(remaining[0]?.id ?? "");
    }
    setMenuNotice(`${itemName} removed from draft. Publish to update the live menu.`);
  };

  const handlePreviewImport = async () => {
    if (!merchantToken || !activeHubId || !selectedImportImageName) {
      setMenuNotice("Choose an image file before previewing a menu import.");
      return;
    }

    try {
      const createdBatch = await previewMenuImport(merchantToken, activeHubId, selectedImportImageName);
      setPendingImports((current) => [createdBatch, ...current]);
      setSelectedImportImageName("");
      setSelectedImportCandidateIds(createdBatch.candidates.map((candidate) => candidate.id));
      setMenuNotice(`Created preview batch for ${createdBatch.imageName}. Tick the right items before applying.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Menu import preview failed.";
      setMenuNotice(message);
    }
  };

  const handlePreviewPastedMenu = async () => {
    if (!merchantToken || !activeHubId || !pastedMenuText.trim()) {
      setMenuNotice("Paste menu text before previewing imported items.");
      return;
    }

    try {
      const createdBatch = await previewMenuTextImport(merchantToken, activeHubId, pastedMenuText.trim());
      setPendingImports((current) => [createdBatch, ...current]);
      setPastedMenuText("");
      setSelectedImportCandidateIds(createdBatch.candidates.map((candidate) => candidate.id));
      setMenuNotice("Parsed pasted menu text into review candidates.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Menu text import preview failed.";
      setMenuNotice(message);
    }
  };

  const handleApplyImport = async (importId: string) => {
    if (!merchantToken || !activeHubId) {
      return;
    }

    try {
      const workspace = await applyMenuImport(merchantToken, activeHubId, importId, selectedImportCandidateIds);
      setMenuSections(workspace.menuSections);
      setPendingImports(workspace.pendingImports ?? []);
      setSelectedImportCandidateIds([]);
      setMenuNotice(
        "Import saved as hidden items in your hub. Set each item to Live, then save & publish menu for customers to see them.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Menu import apply failed.";
      setMenuNotice(message);
    }
  };

  if (!merchantToken) {
    return (
      <main style={pageShell}>
        <section style={loginHero}>
          <section style={loginPanel}>
            <h1 style={panelTitle}>Login to your hub</h1>

            <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
              <label style={field}>
                <span style={darkFieldLabel}>Email or username</span>
                <input style={lightInput} value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} />
              </label>
              <label style={field}>
                <span style={darkFieldLabel}>Password</span>
                <span style={passwordFieldWrap}>
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    style={{ ...lightInput, paddingRight: 88 }}
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                  />
                  <button type="button" style={passwordRevealButton} onClick={() => setShowLoginPassword((current) => !current)}>
                    {showLoginPassword ? "Hide" : "Show"}
                  </button>
                </span>
              </label>
              <button type="button" style={primaryButton} onClick={handleLogin}>
                Open hub
              </button>
            </div>

            {loginError ? <p style={errorMessageStyle}>{loginError}</p> : null}
          </section>
        </section>
      </main>
    );
  }

  const saveHubButtonStyle = hasUnsavedHubChanges
    ? { ...primaryButton, ...saveHubButtonDirtyStyle }
    : primaryButton;

  const handleRestoreConfigBackup = (workspace: { settings: HubSettings; menuSections: HubMenuSection[] }) => {
    const settings = {
      ...workspace.settings,
      deliveryPostcodeZones:
        workspace.settings.deliveryPostcodeZones.length > 0
          ? workspace.settings.deliveryPostcodeZones
          : createDefaultHullPostcodeZones(),
    };
    setHubSettings(settings);
    setMenuSections(workspace.menuSections);
    commitSavedHubSnapshot(settings, workspace.menuSections);
    setSaveNotice("Backup restored and saved to your hub.");
  };

  return (
    <main className="hub-app-shell" style={hubAppShell}>
      {mobileNavOpen ? (
        <button
          type="button"
          className="hub-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <div className="hub-mobile-bar">
        <strong>{hubSettings.name || "Merchant hub"}</strong>
        <button type="button" className="hub-nav-toggle" onClick={() => setMobileNavOpen(true)}>
          Menu
        </button>
      </div>
      <aside className={`hub-sidebar${mobileNavOpen ? " is-open" : ""}`}>
        <div style={sidebarBrand}>
          <span style={sidebarMark}>HE</span>
          <span>
            <strong>{hubSettings.name || "Merchant hub"}</strong>
            <small>{hubSettings.isOpen ? "Open" : "Setup"}</small>
          </span>
        </div>

        <nav style={sidebarNav} aria-label="Hub navigation">
          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>Home</span>
            <button type="button" style={activeHubSection === "home" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("home")}>
              Dashboard
            </button>
          </div>

          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>Orders</span>
            <button type="button" style={activeHubSection === "orders" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("orders")}>
              Live orders
            </button>
            <button type="button" style={activeHubSection === "drivers" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("drivers")}>
              Drivers & cash-up
            </button>
            <button type="button" style={activeHubSection === "orderHistory" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("orderHistory")}>
              Order history
            </button>
          </div>

          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>Performance</span>
            <button type="button" style={activeHubSection === "earnings" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("earnings")}>
              Earnings
            </button>
            <button type="button" style={activeHubSection === "reports" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("reports")}>
              Reports
            </button>
          </div>

          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>Menu management</span>
            <button type="button" style={activeHubSection === "menu" && activeHubPanel === "menu" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("menu")}>
              Menu builder
            </button>
            <button
              type="button"
              style={activeHubSection === "menu" && activeHubPanel === "import" ? sidebarButtonActive : sidebarButton}
              onClick={() => {
                setActiveHubSection("menu");
                setActiveHubPanel("import");
              }}
            >
              Paste menu
            </button>
            <button type="button" style={activeHubSection === "offers" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("offers")}>
              Offers &amp; deals
            </button>
          </div>

          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>Business</span>
            <button type="button" style={activeHubSection === "businessProfile" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("businessProfile")}>
              Business profile
            </button>
            <button type="button" style={activeHubSection === "deliveryRanges" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("deliveryRanges")}>
              Delivery ranges
            </button>
            <button type="button" style={activeHubSection === "settings" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("settings")}>
              Settings
            </button>
            <button type="button" style={activeHubSection === "users" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("users")}>
              Users
            </button>
          </div>

          <button type="button" style={activeHubSection === "help" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("help")}>
            Help and support
          </button>
        </nav>
      </aside>

      <section className="hub-main-area">
        <header className="hub-main-header" style={hubMainHeader}>
          <div style={{ display: "grid", gap: 8 }}>
            <p style={eyebrow}>Hub workspace</p>
            <h1 style={hubTitle}>{hubSettings.name || "Merchant hub"}</h1>
            <p style={heroCopy}>Run orders, menu changes, earnings, users, and store setup from one clear workspace.</p>
          </div>

          <div className="hub-main-header-actions" style={{ display: "grid", gap: 12, justifyItems: "start" }}>
            {activeUser ? (
              <span style={activeUserChip}>
                {activeUser.fullName} / {hubRoleLabel(activeUser.role)}
              </span>
            ) : null}
            <div className="he-btn-row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className={hasUnsavedHubChanges ? "he-portal-primary is-dirty" : "he-portal-primary"}
                style={saveHubButtonStyle}
                onClick={handleSaveHub}
                disabled={!hubAccess?.canEditWorkspace}
              >
                {hasUnsavedHubChanges ? "Save hub changes *" : "Save hub changes"}
              </button>
              {activeHubSlug ? (
                <>
                  <a href={`${customerWebBaseUrl}/stores/${activeHubSlug}/kiosk`} target="_blank" rel="noreferrer" style={secondaryButtonLink}>
                    Self service kiosk
                  </a>
                  <a href={`${customerWebBaseUrl}/stores/${activeHubSlug}/kiosk?launch=1`} target="_blank" rel="noreferrer" style={secondaryButtonLink}>
                    Launch kiosk
                  </a>
                </>
              ) : null}
              <button type="button" style={secondaryButton} onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </div>
        </header>

        {hasUnsavedHubChanges ? (
          <div className="he-unsaved-banner" style={unsavedHubBanner} role="status" aria-live="polite">
            <div style={unsavedHubBannerCopy}>
              <strong>Unsaved changes</strong>
              <p style={unsavedHubBannerCopyParagraph}>
                Delivery, business, and menu edits are not live for customers until you save. Use{" "}
                <strong>Save hub changes</strong> (or <strong>Publish changes</strong> on the menu screen).
              </p>
            </div>
            <button type="button" style={saveHubButtonStyle} onClick={handleSaveHub} disabled={!hubAccess?.canEditWorkspace}>
              Save now
            </button>
          </div>
        ) : null}

        {hubAccess && !hubAccess.canEditWorkspace ? (
          <p style={successMessageStyle} role="status">
            View-only access: you can browse this hub but cannot save menu, delivery, or offer changes.
          </p>
        ) : null}

        {saveNotice ? <p style={successMessageStyle}>{saveNotice}</p> : null}
        {menuNotice ? <p style={successMessageStyle}>{menuNotice}</p> : null}
        {userNotice ? <p style={successMessageStyle}>{userNotice}</p> : null}
        {passwordNotice ? <p style={successMessageStyle}>{passwordNotice}</p> : null}
        {orderNotice ? <p style={successMessageStyle}>{orderNotice}</p> : null}
        {driverNotice ? <p style={successMessageStyle}>{driverNotice}</p> : null}
        {offersNotice ? <p style={successMessageStyle}>{offersNotice}</p> : null}

        {activeHubSection === "home" ? (
          <section className="he-dashboard-grid" style={dashboardGrid}>
            <article style={dashboardHeroCard}>
              <p style={eyebrowDark}>Today</p>
              <h2 style={sectionTitle}>Ready for service</h2>
              <p style={panelCopyDark}>
                Your menu has {menuStats.activeItems} live items across {menuStats.categories} categories.
              </p>
              <div className="he-section-actions" style={sectionActionRow}>
                <button type="button" style={primaryButton} onClick={() => openHubSection("menu")}>
                  Edit menu
                </button>
                <button type="button" style={secondaryButton} onClick={() => openHubSection("orders")}>
                  View orders
                </button>
              </div>
            </article>
            <article style={dashboardCard}>
              <span style={summaryLabel}>Live menu items</span>
              <strong style={summaryValue}>{menuStats.activeItems}</strong>
            </article>
            <article style={dashboardCard}>
              <span style={summaryLabel}>Total menu items</span>
              <strong style={summaryValue}>{menuStats.totalItems}</strong>
            </article>
            <article style={dashboardCard}>
              <span style={summaryLabel}>Customisable items</span>
              <strong style={summaryValue}>{menuStats.customisableItems}</strong>
            </article>
          </section>
        ) : null}

        {activeHubSection === "orders" ? (
          <section style={placeholderPanel}>
            <p style={eyebrowDark}>Live orders</p>
            <div style={itemTopRow}>
              <div>
                <h2 style={sectionTitle}>Incoming orders</h2>
                <p style={panelCopyDark}>Web, app, and kiosk orders appear here. Use refresh while live notifications are being connected.</p>
              </div>
              <button type="button" style={secondaryButton} onClick={() => void loadMerchantOrders()}>
                Refresh orders
              </button>
            </div>
            <div style={orderListGrid}>
              {merchantOrders.map((order) => {
                void ordersClockTick;
                const isPending = order.status === "pending";
                const hubSecondsLeft =
                  isPending && order.merchantResponseDeadlineAt
                    ? Math.max(0, Math.ceil((new Date(order.merchantResponseDeadlineAt).getTime() - Date.now()) / 1000))
                    : null;

                return (
                <article key={order.id} style={orderListCard}>
                  <div>
                    <strong style={orderNumberStyle}>{order.orderNumber}</strong>
                    <p style={panelCopyDark}>
                      {order.source.replaceAll("_", " ")} / {order.fulfillmentType} / {order.paymentStatus} / {order.paymentMethod.replaceAll("_", " ")}
                    </p>
                    {isPending && hubSecondsLeft !== null ? (
                      <p style={{ ...panelCopyDark, marginTop: 8, fontWeight: 800, color: hubSecondsLeft <= 15 ? "#b42318" : "#101216" }}>
                        Awaiting your response — auto-cancel in {hubSecondsLeft}s
                      </p>
                    ) : null}
                    {isPending && hubSecondsLeft === null ? (
                      <p style={{ ...panelCopyDark, marginTop: 8, fontWeight: 800 }}>
                        Awaiting your response — accept or reject to continue.
                      </p>
                    ) : null}
                  </div>
                  <div style={itemBadgeRow}>
                    <span style={darkBadge}>{order.status}</span>
                    {isPending && hubAccess?.canOperateOrders ? (
                      <>
                        <button
                          type="button"
                          style={{ ...primaryButton, minHeight: 40, padding: "0 14px", borderRadius: 14, fontSize: 14 }}
                          onClick={() => void handleAcceptMerchantOrder(order)}
                        >
                          Accept ({hubSettings.etaMinutes} min)
                        </button>
                        <button type="button" style={secondaryButtonSmall} onClick={() => void handleRejectMerchantOrder(order)}>
                          Reject
                        </button>
                      </>
                    ) : null}
                    {hubAccess?.canOperateOrders ? (
                    <button type="button" style={secondaryButtonSmall} onClick={() => void handlePrintOrderReceipt(order)}>
                      Print receipt
                    </button>
                    ) : null}
                    <span style={orangeBadge}>£{order.totalAmount.toFixed(2)}</span>
                  </div>
                </article>
              );
              })}
              {merchantOrders.length === 0 ? <div style={emptyStateCard}>No orders loaded yet. Refresh after placing a kiosk test order.</div> : null}
            </div>
          </section>
        ) : null}

        {activeHubSection === "drivers" && merchantToken && activeHubId ? (
          <HubDriversWorkbench
            apiBaseUrl={apiBaseUrl}
            token={merchantToken}
            hubId={activeHubId}
            storeName={hubSettings.name || "Your store"}
            driverTracking={driverTracking}
            onRefreshTracking={() => void loadDriverTracking()}
            onNotice={(message) => {
              setDriverNotice(message);
              window.setTimeout(() => setDriverNotice(""), 4500);
            }}
          />
        ) : null}

        {activeHubSection === "orderHistory" ? (
          <section style={placeholderPanel}>
            <p style={eyebrowDark}>Order history</p>
            <h2 style={sectionTitle}>Completed orders and refunds</h2>
            <p style={panelCopyDark}>Past orders, customer notes, delivery status, and issue handling will be shown here as orders begin flowing through Hull Eats.</p>
          </section>
        ) : null}

        {activeHubSection === "earnings" ? (
          <section style={placeholderPanel}>
            <p style={eyebrowDark}>Earnings</p>
            <h2 style={sectionTitle}>Payouts and performance</h2>
            <p style={panelCopyDark}>Daily sales, fees, payout status, and top items will live here after payment reporting is connected.</p>
          </section>
        ) : null}

        {activeHubSection === "reports" ? (
          <section style={placeholderPanel}>
            <p style={eyebrowDark}>Reports</p>
            <h2 style={sectionTitle}>Menu and service insights</h2>
            <p style={panelCopyDark}>Use this area for product performance, busy periods, missing images, stock issues, and preparation-time reports.</p>
          </section>
        ) : null}

        {activeHubSection === "offers" && merchantToken && activeHubId ? (
          <HubOffersWorkbench
            apiBaseUrl={apiBaseUrl}
            token={merchantToken}
            hubId={activeHubId}
            menuSections={menuSections}
            onNotice={(message) => {
              setOffersNotice(message);
              window.setTimeout(() => setOffersNotice(""), 4500);
            }}
          />
        ) : null}

        {activeHubSection === "help" ? (
          <section className="he-dashboard-grid" style={dashboardGrid}>
            <article style={dashboardHeroCard}>
              <p style={eyebrowDark}>Help and support</p>
              <h2 style={sectionTitle}>Keep menu work quick</h2>
              <p style={panelCopyDark}>Paste a menu, build categories, or use the menu builder when an item needs sizes, sauces, removals, or extras.</p>
            </article>
            <article style={dashboardCard}>
              <span style={summaryLabel}>Menu categories</span>
              <strong style={summaryValue}>{menuStats.categories}</strong>
            </article>
            <article style={dashboardCard}>
              <span style={summaryLabel}>Users</span>
              <strong style={summaryValue}>{hubUsers.length}</strong>
            </article>
          </section>
        ) : null}

        {activeHubSection === "menu" ||
        activeHubSection === "businessProfile" ||
        activeHubSection === "deliveryRanges" ||
        activeHubSection === "settings" ||
        activeHubSection === "users" ? (
        <section style={workbenchShell}>
          <div style={workbenchNav}>
            {activeHubSection === "menu" ? (
              <>
                <button type="button" style={activeHubPanel === "menu" ? workbenchTabActive : workbenchTab} onClick={() => setActiveHubPanel("menu")}>
                  Menu builder
                </button>
                <button type="button" style={activeHubPanel === "import" ? workbenchTabActive : workbenchTab} onClick={() => setActiveHubPanel("import")}>
                  Paste or upload menu
                </button>
              </>
            ) : null}

            {activeHubSection === "businessProfile" ? (
              <button type="button" style={activeHubPanel === "businessProfile" ? workbenchTabActive : workbenchTab} onClick={() => setActiveHubPanel("businessProfile")}>
                Business profile
              </button>
            ) : null}

            {activeHubSection === "deliveryRanges" ? (
              <button type="button" style={activeHubPanel === "deliveryRanges" ? workbenchTabActive : workbenchTab} onClick={() => setActiveHubPanel("deliveryRanges")}>
                Delivery ranges
              </button>
            ) : null}

            {activeHubSection === "settings" ? (
              <button type="button" style={activeHubPanel === "settings" ? workbenchTabActive : workbenchTab} onClick={() => setActiveHubPanel("settings")}>
                Settings
              </button>
            ) : null}

            {activeHubSection === "users" ? (
              <button type="button" style={workbenchTabActive} onClick={() => setActiveHubPanel("account")}>
                Users and password
              </button>
            ) : null}
          </div>

          {activeHubPanel === "menu" ? (
            <HubMenuStudio
              menuSections={menuSections}
              selectedCategory={selectedCategory}
              selectedItem={selectedItem}
              isCreatingNewItem={isCreatingNewItem}
              showChoiceSetupForItemId={showChoiceSetupForItemId}
              newCategory={newCategory}
              newItem={newItem}
              pizzaSizeRows={pizzaSizeRows}
              publishIssues={menuPublishIssues}
              hasUnsavedHubChanges={hasUnsavedHubChanges}
              activeHubSlug={activeHubSlug}
              customerWebBaseUrl={customerWebBaseUrl}
              categoryPresetOptions={HUB_CATEGORY_PRESET_OPTIONS}
              onNewCategoryPresetChange={handleNewCategoryPresetChange}
              onNewCategoryChange={(patch) => setNewCategory((current) => ({ ...current, ...patch }))}
              onNewItemChange={(patch) => setNewItem((current) => ({ ...current, ...patch }))}
              onPizzaSizeRowsChange={setPizzaSizeRows}
              onSelectCategory={(sectionId) => {
                setIsCreatingNewItem(false);
                setSelectedCategoryId(sectionId);
                const section = menuSections.find((s) => s.id === sectionId);
                setSelectedItemId(section?.items[0]?.id ?? "");
                setNewItem((current) => ({ ...current, sectionId }));
              }}
              onSelectItem={(itemId) => {
                setIsCreatingNewItem(false);
                setSelectedItemId(itemId);
              }}
              onBeginCreateItem={beginCreateItem}
              onCancelCreateItem={cancelCreateItem}
              onCreateItem={handleCreateItem}
              onCreateCategory={handleCreateCategory}
              onDuplicateItem={handleDuplicateItem}
              onDeleteCategory={() => {
                if (selectedCategory) {
                  handleDeleteCategory(selectedCategory.id, selectedCategory.name);
                }
              }}
              onDeleteItem={() => {
                if (selectedItem) {
                  handleDeleteItem(selectedItem.id, selectedItem.name);
                }
              }}
              onApplyTemplate={handleApplyMenuTemplate}
              onDismissChoiceSetup={() => setShowChoiceSetupForItemId(null)}
              onRequestPublish={handleRequestPublishMenu}
              publishDialogOpen={menuPublishDialogOpen}
              publishSummary={menuPublishSummary}
              menuPublishing={menuPublishing}
              onCancelPublish={() => setMenuPublishDialogOpen(false)}
              onConfirmPublish={() => void handleSaveHub()}
              onOpenImport={() => setActiveHubPanel("import")}
              onUpdateSectionField={(field, value) => {
                if (selectedCategory) {
                  updateSection(selectedCategory.id, field, value);
                }
              }}
              onApplyCategoryPrice={() => {
                if (selectedCategory) {
                  handleApplyCategoryPrice(selectedCategory.id);
                }
              }}
              onUpdateItem={(updater) => {
                if (selectedCategory && selectedItem) {
                  updateItem(selectedCategory.id, selectedItem.id, updater);
                }
              }}
              saveButtonStyle={saveHubButtonStyle}
              readOnly={!hubAccess?.canEditWorkspace}
            />
          ) : null}


          {activeHubPanel === "import" ? (
            <section style={compactEditorCard}>
              <div style={panelHeader}>
                <p style={eyebrowDark}>Fastest setup</p>
                <h2 style={sectionTitle}>Paste an existing menu</h2>
                <p style={panelCopyDark}>
                  Paste from Just Eat, Uber Eats, Deliveroo, a PDF, or your own notes. Use category paths like
                  Drinks / Fizzy / Coke, Drinks &gt; Milkshakes &gt; Oreo, or Drinks-main then Fizzy-sub.
                </p>
              </div>
              <div style={fastActionGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Menu text</span>
                  <textarea
                    style={{ ...lightInput, minHeight: 190, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                    value={pastedMenuText}
                    onChange={(event) => setPastedMenuText(event.target.value)}
                    placeholder={"Loaded Fries\nSalt & Pepper Loaded Fries\nfrom £8.49\n\nSmash Burgers\nClassic Smash\nfrom £7.99"}
                  />
                </label>
                <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
                  <button type="button" onClick={handlePreviewPastedMenu} style={primaryButton}>
                    Preview pasted menu
                  </button>
                  <label style={field}>
                    <span style={darkFieldLabel}>Menu page image</span>
                    <input type="file" accept="image/*" style={lightInput} onChange={(event) => setSelectedImportImageName(event.target.files?.[0]?.name ?? "")} />
                  </label>
                  <button type="button" onClick={handlePreviewImport} style={secondaryButton}>
                    Preview image
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {pendingImports.map((batch) => (
                  <article key={batch.id} style={importBatchCard}>
                    <strong style={{ color: "#0f1115" }}>{batch.imageName}</strong>
                    <div style={{ display: "grid", gap: 10, maxHeight: 360, overflow: "auto" }}>
                      {batch.candidates.map((candidate) => (
                        <label key={candidate.id} style={candidateRow}>
                          <input
                            type="checkbox"
                            checked={selectedImportCandidateIds.includes(candidate.id)}
                            onChange={(event) =>
                              setSelectedImportCandidateIds((current) =>
                                event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id),
                              )
                            }
                          />
                          <span>
                            <strong>{candidate.suggestedCategoryName} / {candidate.itemName}</strong>
                            <br />
                            <span style={subtleInfo}>{formatMoney(candidate.price)}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <button type="button" onClick={() => handleApplyImport(batch.id)} style={primaryButton}>
                      Add ticked items
                    </button>
                  </article>
                ))}
                {pendingImports.length === 0 ? <div style={emptyStateCard}>No imports waiting for review.</div> : null}
              </div>
            </section>
          ) : null}

          {activeHubPanel === "businessProfile" ? (
            <section style={compactEditorCard}>
              <div className="he-two-col" style={twoColumnGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Business name</span>
                  <input style={lightInput} value={hubSettings.name} onChange={(event) => handleHubFieldChange("name", event.target.value)} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Cuisine label</span>
                  <input style={lightInput} value={hubSettings.cuisineLabel} onChange={(event) => handleHubFieldChange("cuisineLabel", event.target.value)} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>City</span>
                  <input style={lightInput} value={hubSettings.city} onChange={(event) => handleHubFieldChange("city", event.target.value)} />
                </label>
                <label style={{ ...field, gridColumn: "1 / -1" }}>
                  <span style={darkFieldLabel}>Marketplace description</span>
                  <textarea
                    style={{ ...lightInput, minHeight: 110, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                    value={hubSettings.onboardingMessage}
                    onChange={(event) => handleHubFieldChange("onboardingMessage", event.target.value)}
                  />
                </label>
                <label style={{ ...field, gridColumn: "1 / -1" }}>
                  <span style={darkFieldLabel}>Hero image URL</span>
                  <input
                    style={lightInput}
                    value={hubSettings.heroImageUrl}
                    onChange={(event) => handleHubFieldChange("heroImageUrl", event.target.value)}
                  />
                </label>
              </div>
            </section>
          ) : null}

          {activeHubPanel === "deliveryRanges" ? (
            <section style={compactEditorCard}>
              <div className="he-two-col" style={twoColumnGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Shop postcode</span>
                  <input
                    style={lightInput}
                    value={hubSettings.postcode}
                    onChange={(event) => handleHubFieldChange("postcode", event.target.value)}
                    placeholder="e.g. HU5 1SN"
                  />
                  <p style={subtleInfo}>Used for your shop pin on the map and distance-based delivery fees.</p>
                </label>
              </div>
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid rgba(15, 17, 21, 0.1)" }}>
                <HubDeliveryConfig
                  settings={hubSettings}
                  onChange={patchHubDeliverySettings}
                  apiBaseUrl={apiBaseUrl}
                  hubId={activeHubId}
                  merchantToken={merchantToken}
                  styles={hubDeliveryConfigStyles}
                />
                <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                  <span style={darkFieldLabel}>Mile band fees (£)</span>
                  <p style={subtleInfo}>Distance from your shop to the customer postcode picks the band.</p>
                  {["Under 1 mile", "Under 2 miles", "Under 3 miles", "Under 4 miles", "Under 5 miles"].map((label, index) => (
                    <label key={label} style={field}>
                      <span style={darkFieldLabel}>{label}</span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        style={lightInput}
                        value={hubSettings.deliveryMileFees[index]}
                        onChange={(event) => handleMileFeeBandChange(index, Number(event.target.value) || 0)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {activeHubPanel === "settings" ? (
            <section style={compactEditorCard}>
              <div className="he-two-col" style={twoColumnGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Delivery ETA (minutes)</span>
                  <input type="number" min={1} style={lightInput} value={hubSettings.etaMinutes} onChange={(event) => handleHubFieldChange("etaMinutes", Math.max(1, Number(event.target.value) || 1))} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Flat delivery fallback (£)</span>
                  <input type="number" step="0.01" style={lightInput} value={hubSettings.deliveryFee} onChange={(event) => handleHubFieldChange("deliveryFee", Number(event.target.value) || 0)} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Minimum order</span>
                  <input type="number" step="0.01" style={lightInput} value={hubSettings.minimumOrderAmount} onChange={(event) => handleHubFieldChange("minimumOrderAmount", Number(event.target.value) || 0)} />
                </label>
                <label style={{ display: "flex", gridColumn: "1 / -1", gap: 12, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={hubSettings.autoAcceptOrders}
                    onChange={(event) => handleHubFieldChange("autoAcceptOrders", event.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={darkFieldLabel}>Auto-accept new orders</span>
                </label>
                {hubSettings.autoAcceptOrders ? (
                  <label style={field}>
                    <span style={darkFieldLabel}>Max prep when auto-accepting (minutes)</span>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      style={lightInput}
                      value={hubSettings.autoAcceptMaxPrepMinutes}
                      onChange={(event) =>
                        handleHubFieldChange("autoAcceptMaxPrepMinutes", Math.min(180, Math.max(5, Number(event.target.value) || 60)))
                      }
                    />
                  </label>
                ) : null}
                <label style={field}>
                  <span style={darkFieldLabel}>Open now</span>
                  <select style={lightInput} value={hubSettings.isOpen ? "open" : "closed"} onChange={(event) => handleHubFieldChange("isOpen", event.target.value === "open")}>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>
              {merchantToken && activeHubId ? (
                <HubConfigBackups
                  apiBaseUrl={apiBaseUrl}
                  hubId={activeHubId}
                  merchantToken={merchantToken}
                  hubSettings={hubSettings}
                  menuSections={menuSections}
                  onRestore={handleRestoreConfigBackup}
                  onNotice={setSaveNotice}
                />
              ) : null}
            </section>
          ) : null}

          {activeHubPanel === "account" ? (
            <section style={compactEditorCard}>
              <div style={quickAddGrid}>
                <div style={quickAddCard}>
                  <h3 style={quickAddTitle}>Change password</h3>
                  <button type="button" style={secondaryButtonSmall} onClick={() => setShowAccountPasswords((current) => !current)}>
                    {showAccountPasswords ? "Hide passwords" : "Show passwords"}
                  </button>
                  <input type={showAccountPasswords ? "text" : "password"} style={lightInput} value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} placeholder="Current password" />
                  <input type={showAccountPasswords ? "text" : "password"} style={lightInput} value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} placeholder="New password" />
                  <input type={showAccountPasswords ? "text" : "password"} style={lightInput} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder="Confirm password" />
                  <button type="button" onClick={handleChangePassword} style={primaryButton}>Change password</button>
                </div>
                <div style={quickAddCard}>
                  <h3 style={quickAddTitle}>Hub users</h3>
                  {hubUsers.map((user) => (
                    <div key={user.id} style={listRow}>
                      <span style={{ color: "#101216", fontWeight: 800 }}>{user.fullName}</span>
                      <span style={subtleInfo}>{user.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </section>
        ) : null}

        <details style={{ display: "none" }}>
          <summary style={legacySummary}>Advanced full-page editor</summary>
        <section style={summaryGrid}>
          <article style={overviewCard}>
            <span style={summaryLabel}>Categories</span>
            <strong style={summaryValue}>{menuStats.categories}</strong>
          </article>
          <article style={overviewCard}>
            <span style={summaryLabel}>Menu items</span>
            <strong style={summaryValue}>{menuStats.totalItems}</strong>
          </article>
          <article style={overviewCard}>
            <span style={summaryLabel}>Customisable items</span>
            <strong style={summaryValue}>{menuStats.customisableItems}</strong>
          </article>
          <article style={overviewCard}>
            <span style={summaryLabel}>Live items</span>
            <strong style={summaryValue}>{menuStats.activeItems}</strong>
          </article>
        </section>

        <section style={fastStartGrid}>
          <article style={fastStartCard}>
            <div style={panelHeader}>
              <p style={eyebrowDark}>Start here</p>
              <h2 style={sectionTitle}>Fast menu setup</h2>
              <p style={panelCopyDark}>
                The quickest route is to paste an existing menu, review the detected items, then save. Use quick add for
                small changes like a new burger, tray, drink, or dessert.
              </p>
            </div>

            <div style={fastActionGrid}>
              <label style={field}>
                <span style={darkFieldLabel}>Paste menu text</span>
                <textarea
                  style={{ ...lightInput, minHeight: 170, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                  value={pastedMenuText}
                  onChange={(event) => setPastedMenuText(event.target.value)}
                  placeholder={"Loaded Fries\nSalt & Pepper Loaded Fries\nfrom £8.49\n\nSmash Burgers\nClassic Smash\nfrom £7.99"}
                />
              </label>

              <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
                <button type="button" onClick={handlePreviewPastedMenu} style={primaryButton}>
                  Preview pasted menu
                </button>
                <button type="button" style={saveHubButtonStyle} onClick={handleSaveHub}>
                  {hasUnsavedHubChanges ? "Save menu changes *" : "Save menu changes"}
                </button>
                <div style={emptyStateCard}>
                  Tip: paste the menu in sections with category names on their own line. You can untick anything before
                  it goes live.
                </div>
              </div>
            </div>

            {pendingImports.length > 0 ? (
              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {pendingImports.slice(0, 1).map((batch) => (
                  <article key={batch.id} style={importBatchCard}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong style={{ color: "#0f1115", fontSize: 16 }}>{batch.imageName}</strong>
                      <span style={subtleInfo}>{batch.candidates.length} items ready to review</span>
                    </div>

                    <div style={{ display: "grid", gap: 10, maxHeight: 320, overflow: "auto", paddingRight: 4 }}>
                      {batch.candidates.map((candidate) => {
                        const checked = selectedImportCandidateIds.includes(candidate.id);

                        return (
                          <label key={candidate.id} style={candidateRow}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setSelectedImportCandidateIds((current) =>
                                  event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id),
                                )
                              }
                            />
                            <div style={{ display: "grid", gap: 4 }}>
                              <strong style={{ color: "#0f1115" }}>
                                {candidate.suggestedCategoryName} / {candidate.itemName}
                              </strong>
                              <span style={subtleInfo}>
                                {formatMoney(candidate.price)} / {candidate.sourceLine}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <button type="button" onClick={() => handleApplyImport(batch.id)} style={primaryButton}>
                      Add ticked items to menu
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </article>

          <article style={fastStartCard}>
            <div style={panelHeader}>
              <p style={eyebrowDark}>Quick add</p>
              <h2 style={sectionTitle}>One item at a time</h2>
              <p style={panelCopyDark}>For small edits, create a category or item without touching the advanced builder.</p>
            </div>

              <div style={quickAddGrid}>
                <div style={quickAddCard}>
                  <h3 style={quickAddTitle}>Category</h3>
                  <label style={field}>
                    <span style={darkFieldLabel}>Category type</span>
                    <select
                      style={lightInput}
                      value={newCategory.presetId}
                      onChange={(event) => handleNewCategoryPresetChange(event.target.value)}
                    >
                      {HUB_CATEGORY_PRESET_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={field}>
                    <span style={darkFieldLabel}>Name</span>
                    <input
                      style={lightInput}
                      value={newCategory.name}
                      onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Loaded Fries"
                    />
                  </label>
                  <label style={field}>
                    <span style={darkFieldLabel}>Note (optional)</span>
                    <input
                      style={lightInput}
                      value={newCategory.description}
                      onChange={(event) => setNewCategory((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Shown to staff in the hub"
                    />
                  </label>
                  <button type="button" style={primaryButton} onClick={handleCreateCategory}>
                    Add category
                  </button>
                </div>

                <div style={quickAddCard}>
                  <h3 style={quickAddTitle}>Menu item</h3>
                  <label style={field}>
                    <span style={darkFieldLabel}>Category</span>
                    <select
                      style={lightInput}
                      value={newItem.sectionId}
                      onChange={(event) => setNewItem((current) => ({ ...current, sectionId: event.target.value }))}
                    >
                      <option value="">Choose category</option>
                      {menuSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={field}>
                    <span style={darkFieldLabel}>Item name</span>
                    <input
                      style={lightInput}
                      value={newItem.name}
                      onChange={(event) => setNewItem((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Classic Smash Burger"
                    />
                  </label>
                  {newItemSectionIsPizza ? (
                    <PizzaSizeDraftPanel rows={pizzaSizeRows} onChange={setPizzaSizeRows} />
                  ) : (
                    <label style={field}>
                      <span style={darkFieldLabel}>Price</span>
                      <input
                        type="number"
                        step="0.01"
                        style={lightInput}
                        value={newItem.price}
                        onChange={(event) => setNewItem((current) => ({ ...current, price: event.target.value }))}
                        placeholder="7.99"
                      />
                    </label>
                  )}
                  <label style={field}>
                    <span style={darkFieldLabel}>Product image URL</span>
                    <input
                      style={lightInput}
                      value={newItem.imageUrl}
                      onChange={(event) => setNewItem((current) => ({ ...current, imageUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                  </label>
                  <label style={toggleLabel}>
                    <input
                      type="checkbox"
                      checked={newItem.requiresIdVerification}
                      onChange={(event) => setNewItem((current) => ({ ...current, requiresIdVerification: event.target.checked }))}
                    />
                    <span>Verify with ID at delivery (age-restricted)</span>
                  </label>
                  <button type="button" style={primaryButton} onClick={handleCreateItem}>
                    Add item
                  </button>
                </div>
              </div>
          </article>

          <article style={fastStartCard}>
            <div style={panelHeader}>
              <p style={eyebrowDark}>Account</p>
              <h2 style={sectionTitle}>Change password</h2>
              <p style={panelCopyDark}>Owners and staff can update the signed-in hub password here.</p>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <label style={field}>
                <span style={darkFieldLabel}>Current password</span>
                <span style={passwordFieldWrap}>
                  <input
                    type={showHubPasswordCurrent ? "text" : "password"}
                    style={{ ...lightInput, paddingRight: 88 }}
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  />
                  <button type="button" style={passwordRevealButton} onClick={() => setShowHubPasswordCurrent((current) => !current)}>
                    {showHubPasswordCurrent ? "Hide" : "Show"}
                  </button>
                </span>
              </label>
              <label style={field}>
                <span style={darkFieldLabel}>New password</span>
                <span style={passwordFieldWrap}>
                  <input
                    type={showHubPasswordNew ? "text" : "password"}
                    style={{ ...lightInput, paddingRight: 88 }}
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                  />
                  <button type="button" style={passwordRevealButton} onClick={() => setShowHubPasswordNew((current) => !current)}>
                    {showHubPasswordNew ? "Hide" : "Show"}
                  </button>
                </span>
              </label>
              <label style={field}>
                <span style={darkFieldLabel}>Confirm new password</span>
                <span style={passwordFieldWrap}>
                  <input
                    type={showHubPasswordConfirm ? "text" : "password"}
                    style={{ ...lightInput, paddingRight: 88 }}
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  />
                  <button type="button" style={passwordRevealButton} onClick={() => setShowHubPasswordConfirm((current) => !current)}>
                    {showHubPasswordConfirm ? "Hide" : "Show"}
                  </button>
                </span>
              </label>
              <button type="button" onClick={handleChangePassword} style={primaryButton}>
                Change password
              </button>
            </div>
          </article>
        </section>

        <section style={portalGrid}>
          <div style={{ display: "grid", gap: 18 }}>
            <section style={panelCard}>
              <div style={panelHeader}>
                <p style={eyebrowDark}>Hub settings</p>
                <h2 style={sectionTitle}>Business details</h2>
                <p style={panelCopyDark}>This is the core storefront information pushed into the marketplace.</p>
              </div>

              <div className="he-two-col" style={twoColumnGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Business name</span>
                  <input style={lightInput} value={hubSettings.name} onChange={(event) => handleHubFieldChange("name", event.target.value)} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Cuisine label</span>
                  <input
                    style={lightInput}
                    value={hubSettings.cuisineLabel}
                    onChange={(event) => handleHubFieldChange("cuisineLabel", event.target.value)}
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>City</span>
                  <input style={lightInput} value={hubSettings.city} onChange={(event) => handleHubFieldChange("city", event.target.value)} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Postcode</span>
                  <input style={lightInput} value={hubSettings.postcode} onChange={(event) => handleHubFieldChange("postcode", event.target.value)} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Delivery ETA (minutes)</span>
                  <input
                    type="number"
                    min={1}
                    style={lightInput}
                    value={hubSettings.etaMinutes}
                    onChange={(event) => handleHubFieldChange("etaMinutes", Math.max(1, Number(event.target.value) || 1))}
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Flat delivery fallback (£)</span>
                  <input
                    type="number"
                    step="0.01"
                    style={lightInput}
                    value={hubSettings.deliveryFee}
                    onChange={(event) => handleHubFieldChange("deliveryFee", Number(event.target.value) || 0)}
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Minimum order</span>
                  <input
                    type="number"
                    step="0.01"
                    style={lightInput}
                    value={hubSettings.minimumOrderAmount}
                    onChange={(event) => handleHubFieldChange("minimumOrderAmount", Number(event.target.value) || 0)}
                  />
                </label>
                <label style={{ display: "flex", gridColumn: "1 / -1", gap: 12, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={hubSettings.autoAcceptOrders}
                    onChange={(event) => handleHubFieldChange("autoAcceptOrders", event.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={darkFieldLabel}>Auto-accept new orders (uses delivery ETA, capped below)</span>
                </label>
                {hubSettings.autoAcceptOrders ? (
                  <label style={field}>
                    <span style={darkFieldLabel}>Max prep when auto-accepting (minutes)</span>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      style={lightInput}
                      value={hubSettings.autoAcceptMaxPrepMinutes}
                      onChange={(event) =>
                        handleHubFieldChange("autoAcceptMaxPrepMinutes", Math.min(180, Math.max(5, Number(event.target.value) || 60)))
                      }
                    />
                  </label>
                ) : null}
                <label style={field}>
                  <span style={darkFieldLabel}>Open now</span>
                  <select
                    style={lightInput}
                    value={hubSettings.isOpen ? "open" : "closed"}
                    onChange={(event) => handleHubFieldChange("isOpen", event.target.value === "open")}
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <label style={{ ...field, gridColumn: "1 / -1" }}>
                  <span style={darkFieldLabel}>Marketplace description</span>
                  <textarea
                    style={{ ...lightInput, minHeight: 110, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                    value={hubSettings.onboardingMessage}
                    onChange={(event) => handleHubFieldChange("onboardingMessage", event.target.value)}
                  />
                </label>
                <label style={{ ...field, gridColumn: "1 / -1" }}>
                  <span style={darkFieldLabel}>Hero image URL</span>
                  <input
                    style={lightInput}
                    value={hubSettings.heroImageUrl}
                    onChange={(event) => handleHubFieldChange("heroImageUrl", event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section style={panelCard}>
              <HubDeliveryConfig
                settings={hubSettings}
                onChange={patchHubDeliverySettings}
                apiBaseUrl={apiBaseUrl}
                hubId={activeHubId}
                merchantToken={merchantToken}
                styles={hubDeliveryConfigStyles}
              />
              <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                <span style={darkFieldLabel}>Mile band fees (£)</span>
                <p style={subtleInfo}>Distance from your shop to the customer postcode picks the band. Zeros use your flat fallback above or £3 default.</p>
                {["Under 1 mile", "Under 2 miles", "Under 3 miles", "Under 4 miles", "Under 5 miles"].map((label, index) => (
                  <label key={label} style={field}>
                    <span style={darkFieldLabel}>{label}</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      style={lightInput}
                      value={hubSettings.deliveryMileFees[index]}
                      onChange={(event) => handleMileFeeBandChange(index, Number(event.target.value) || 0)}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section style={panelCard}>
              <div style={panelHeader}>
                <p style={eyebrowDark}>Menu structure</p>
                <h2 style={sectionTitle}>Create categories and items</h2>
                <p style={panelCopyDark}>Create the category first, then create the item shell and configure ingredients and options underneath.</p>
              </div>

              <div style={quickAddGrid}>
                <div style={quickAddCard}>
                  <h3 style={quickAddTitle}>New category</h3>
                  <label style={field}>
                    <span style={darkFieldLabel}>Category type</span>
                    <select
                      style={lightInput}
                      value={newCategory.presetId}
                      onChange={(event) => handleNewCategoryPresetChange(event.target.value)}
                    >
                      {HUB_CATEGORY_PRESET_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={field}>
                    <span style={darkFieldLabel}>Category name</span>
                    <input
                      style={lightInput}
                      value={newCategory.name}
                      onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Smash Burgers"
                    />
                  </label>
                  <label style={field}>
                    <span style={darkFieldLabel}>Category description</span>
                    <textarea
                      style={{ ...lightInput, minHeight: 96, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                      value={newCategory.description}
                      onChange={(event) => setNewCategory((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Signature smashed burgers"
                    />
                  </label>
                  <button type="button" style={primaryButton} onClick={handleCreateCategory}>
                    Create category
                  </button>
                </div>

                <div style={quickAddCard}>
                  <h3 style={quickAddTitle}>New item shell</h3>
                  <label style={field}>
                    <span style={darkFieldLabel}>Category</span>
                    <select
                      style={lightInput}
                      value={newItem.sectionId}
                      onChange={(event) => setNewItem((current) => ({ ...current, sectionId: event.target.value }))}
                    >
                      <option value="">Choose category</option>
                      {menuSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={field}>
                    <span style={darkFieldLabel}>Item name</span>
                    <input
                      style={lightInput}
                      value={newItem.name}
                      onChange={(event) => setNewItem((current) => ({ ...current, name: event.target.value }))}
                      placeholder="The Piggy Cow"
                    />
                  </label>
                  {newItemSectionIsPizza ? (
                    <PizzaSizeDraftPanel rows={pizzaSizeRows} onChange={setPizzaSizeRows} />
                  ) : (
                    <label style={field}>
                      <span style={darkFieldLabel}>Price</span>
                      <input
                        type="number"
                        step="0.01"
                        style={lightInput}
                        value={newItem.price}
                        onChange={(event) => setNewItem((current) => ({ ...current, price: event.target.value }))}
                        placeholder="14.99"
                      />
                    </label>
                  )}
                  <label style={field}>
                    <span style={darkFieldLabel}>Description</span>
                    <textarea
                      style={{ ...lightInput, minHeight: 96, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                      value={newItem.description}
                      onChange={(event) => setNewItem((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Two 3oz smashed beef patties with melted cheese..."
                    />
                  </label>
                  <label style={field}>
                    <span style={darkFieldLabel}>Product image URL</span>
                    <input
                      style={lightInput}
                      value={newItem.imageUrl}
                      onChange={(event) => setNewItem((current) => ({ ...current, imageUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                  </label>
                  <label style={toggleLabel}>
                    <input
                      type="checkbox"
                      checked={newItem.requiresIdVerification}
                      onChange={(event) => setNewItem((current) => ({ ...current, requiresIdVerification: event.target.checked }))}
                    />
                    <span>Verify with ID at delivery (age-restricted)</span>
                  </label>
                  <button type="button" style={primaryButton} onClick={handleCreateItem}>
                    Create item shell
                  </button>
                </div>
              </div>
            </section>

            <section style={panelCard}>
              <div style={panelHeader}>
                <p style={eyebrowDark}>Menu builder</p>
                <h2 style={sectionTitle}>Build every item by hand</h2>
                <p style={panelCopyDark}>
                  Each business can have a different structure. Use ingredients for what comes in the item and option groups for meal upgrades, extras, drinks, sauces, removals, and follow-up choices.
                </p>
              </div>

              <div style={{ display: "grid", gap: 18 }}>
                {menuSections.length === 0 ? <div style={emptyStateCard}>No categories yet. Create one above to start building the menu.</div> : null}

                {menuSections.map((section) => (
                  <article key={section.id} style={categoryCard}>
                    <div style={categoryHeader}>
                      <div style={{ display: "grid", gap: 8, flex: 1 }}>
                        <label style={field}>
                          <span style={darkFieldLabel}>Category name</span>
                          <input style={lightInput} value={section.name} onChange={(event) => updateSection(section.id, "name", event.target.value)} />
                        </label>
                        <label style={field}>
                          <span style={darkFieldLabel}>Category description</span>
                          <textarea
                            style={{ ...lightInput, minHeight: 84, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                            value={section.description ?? ""}
                            onChange={(event) => updateSection(section.id, "description", event.target.value)}
                          />
                        </label>
                      </div>
                      <div style={categoryStat}>
                        <span style={summaryLabel}>Items</span>
                        <strong style={{ ...summaryValue, fontSize: 22 }}>{section.items.length}</strong>
                        <button
                          type="button"
                          style={{ ...secondaryButtonSmall, marginTop: 12, width: "100%" }}
                          onClick={() => handleDeleteCategory(section.id, section.name)}
                        >
                          Remove category
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 16 }}>
                      {section.items.map((item) => (
                        <article key={item.id} style={itemEditorCard}>
                          <div style={itemTopRow}>
                            <div>
                              <h3 style={itemTitle}>{item.name || "Untitled item"}</h3>
                              <div style={itemBadgeRow}>
                                <span style={darkBadge}>{formatMoney(item.price)}</span>
                                <span style={orangeBadge}>
                                  {item.components.length} ingredients / {item.optionGroups.length} groups
                                </span>
                              </div>
                            </div>
                            <button type="button" style={secondaryButtonSmall} onClick={() => handleDeleteItem(item.id, item.name)}>
                              Remove item
                            </button>
                          </div>

                          <div style={builderGrid}>
                            <label style={field}>
                              <span style={darkFieldLabel}>Item name</span>
                              <input
                                style={lightInput}
                                value={item.name}
                                onChange={(event) => updateItem(section.id, item.id, (current) => ({ ...current, name: event.target.value }))}
                              />
                            </label>
                            <label style={field}>
                              <span style={darkFieldLabel}>Price</span>
                              <input
                                type="number"
                                step="0.01"
                                style={lightInput}
                                value={moneyInput(item.price)}
                                onChange={(event) => updateItem(section.id, item.id, (current) => ({ ...current, price: Number(event.target.value) || 0 }))}
                              />
                            </label>
                            <label style={field}>
                              <span style={darkFieldLabel}>Stock status</span>
                              <select
                                style={lightInput}
                                value={item.stockStatus}
                                onChange={(event) =>
                                  updateItem(section.id, item.id, (current) => ({ ...current, stockStatus: event.target.value as StockStatus }))
                                }
                              >
                                <option value="in_stock">In stock</option>
                                <option value="low_stock">Low stock</option>
                                <option value="out_of_stock">Out of stock</option>
                              </select>
                            </label>
                            <label style={field}>
                              <span style={darkFieldLabel}>Stock quantity</span>
                              <input
                                type="number"
                                min={0}
                                style={lightInput}
                                value={item.stockQuantity ?? ""}
                                onChange={(event) =>
                                  updateItem(section.id, item.id, (current) => ({
                                    ...current,
                                    stockQuantity: event.target.value === "" ? null : Math.max(0, Number(event.target.value) || 0),
                                  }))
                                }
                              />
                            </label>
                          </div>

                          <label style={field}>
                            <span style={darkFieldLabel}>Description</span>
                            <textarea
                              style={{ ...lightInput, minHeight: 96, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                              value={item.description}
                              onChange={(event) => updateItem(section.id, item.id, (current) => ({ ...current, description: event.target.value }))}
                            />
                          </label>

                          <label style={field}>
                            <span style={darkFieldLabel}>Product image URL</span>
                            <input
                              style={lightInput}
                              value={item.imageUrl ?? ""}
                              onChange={(event) =>
                                updateItem(section.id, item.id, (current) => ({ ...current, imageUrl: event.target.value || undefined }))
                              }
                              placeholder="https://..."
                            />
                          </label>

                          <div style={toggleRow}>
                            <label style={toggleLabel}>
                              <input
                                type="checkbox"
                                checked={item.isActive}
                                onChange={(event) => updateItem(section.id, item.id, (current) => ({ ...current, isActive: event.target.checked }))}
                              />
                              <span>Show item live in marketplace</span>
                            </label>
                            <label style={toggleLabel}>
                              <input
                                type="checkbox"
                                checked={item.trackStock}
                                onChange={(event) => updateItem(section.id, item.id, (current) => ({ ...current, trackStock: event.target.checked }))}
                              />
                              <span>Track stock quantity</span>
                            </label>
                            <label style={toggleLabel}>
                              <input
                                type="checkbox"
                                checked={item.allowBackorder}
                                onChange={(event) => updateItem(section.id, item.id, (current) => ({ ...current, allowBackorder: event.target.checked }))}
                              />
                              <span>Allow backorder</span>
                            </label>
                          </div>

                          <HubMenuCustomisationBuilder
                            item={item}
                            onChangeComponents={(components) => updateItem(section.id, item.id, (current) => ({ ...current, components }))}
                            onChangeOptionGroups={(optionGroups) => updateItem(section.id, item.id, (current) => ({ ...current, optionGroups }))}
                          />
                        </article>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
          <aside style={{ display: "grid", gap: 18 }}>
            <section style={panelCard}>
              <div style={panelHeader}>
                <div>
                  <p style={eyebrowDark}>Menu import</p>
                  <h2 style={sectionTitle}>Upload or paste and review</h2>
                  <p style={panelCopyDark}>
                    Upload a menu page image or paste menu text from another storefront, then tick only the correct categories and items before applying them.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={field}>
                  <span style={darkFieldLabel}>Paste menu from another storefront</span>
                  <textarea
                    style={{ ...lightInput, minHeight: 150, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                    value={pastedMenuText}
                    onChange={(event) => setPastedMenuText(event.target.value)}
                    placeholder={"Smash Burgers\nThe Piggy Cow\nfrom £14.99\nCheesy Smash Stack\nfrom £10.79"}
                  />
                </label>

                <button type="button" onClick={handlePreviewPastedMenu} style={secondaryButton}>
                  Paste and preview items
                </button>

                <label style={field}>
                  <span style={darkFieldLabel}>Menu page image</span>
                  <input
                    type="file"
                    accept="image/*"
                    style={lightInput}
                    onChange={(event) => setSelectedImportImageName(event.target.files?.[0]?.name ?? "")}
                  />
                </label>

                <button type="button" onClick={handlePreviewImport} style={primaryButton}>
                  Upload and preview items
                </button>
              </div>

              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {pendingImports.length === 0 ? (
                  <div style={emptyStateCard}>
                    No pending menu imports. Upload an image or paste menu text to stage categories and items for review.
                  </div>
                ) : null}

                {pendingImports.map((batch) => (
                  <article key={batch.id} style={importBatchCard}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong style={{ color: "#0f1115", fontSize: 16 }}>{batch.imageName}</strong>
                      <span style={subtleInfo}>{batch.candidates.length} candidates pending review</span>
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      {batch.candidates.map((candidate) => {
                        const checked = selectedImportCandidateIds.includes(candidate.id);

                        return (
                          <label key={candidate.id} style={candidateRow}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setSelectedImportCandidateIds((current) =>
                                  event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id),
                                )
                              }
                            />
                            <div style={{ display: "grid", gap: 4 }}>
                              <strong style={{ color: "#0f1115" }}>
                                {candidate.suggestedCategoryName} / {candidate.itemName}
                              </strong>
                              <span style={subtleInfo}>
                                {formatMoney(candidate.price)} / {candidate.sourceLine}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <button type="button" onClick={() => handleApplyImport(batch.id)} style={primaryButton}>
                      Accept ticked items
                    </button>
                  </article>
                ))}
              </div>
            </section>

            {hubAccess?.canManageUsers ? (
            <section style={panelCard}>
              <div style={panelHeader}>
                <div>
                  <p style={eyebrowDark}>Business users</p>
                  <h2 style={sectionTitle}>Create hub login</h2>
                  <p style={panelCopyDark}>Owners can add manager, staff, or view-only logins for this hub.</p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={field}>
                  <span style={darkFieldLabel}>Full name</span>
                  <input
                    style={lightInput}
                    value={newUser.fullName}
                    onChange={(event) => setNewUser((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="Loaded Munch Owner"
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Email</span>
                  <input
                    type="email"
                    style={lightInput}
                    value={newUser.email}
                    onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
                    placeholder="owner@loadedmunch.co.uk"
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Username</span>
                  <input
                    style={lightInput}
                    value={newUser.username}
                    onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))}
                    placeholder="loaded-munch-owner"
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Password</span>
                  <span style={passwordFieldWrap}>
                    <input
                      type={showCreateUserPassword ? "text" : "password"}
                      style={{ ...lightInput, paddingRight: 88 }}
                      value={newUser.password}
                      onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Create password"
                    />
                    <button type="button" style={passwordRevealButton} onClick={() => setShowCreateUserPassword((current) => !current)}>
                      {showCreateUserPassword ? "Hide" : "Show"}
                    </button>
                  </span>
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Role</span>
                  <select
                    style={lightInput}
                    value={newUser.role}
                    onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value as HubRole }))}
                  >
                    {creatableHubRoles.map((role) => (
                      <option key={role} value={role}>
                        {hubRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="button" onClick={handleCreateUser} style={primaryButton}>
                  Create business user
                </button>
              </div>
            </section>
            ) : (
              <section style={panelCard}>
                <p style={panelCopyDark}>Only hub owners can create or remove business logins.</p>
              </section>
            )}

            <section style={panelCard}>
              <div style={panelHeader}>
                <div>
                  <p style={eyebrowDark}>Account security</p>
                  <h2 style={sectionTitle}>Change password</h2>
                  <p style={panelCopyDark}>Update the password for the signed-in hub account.</p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={field}>
                  <span style={darkFieldLabel}>Current password</span>
                  <span style={passwordFieldWrap}>
                    <input
                      type={showHubPasswordCurrent ? "text" : "password"}
                      style={{ ...lightInput, paddingRight: 88 }}
                      value={passwordForm.currentPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                    />
                    <button type="button" style={passwordRevealButton} onClick={() => setShowHubPasswordCurrent((current) => !current)}>
                      {showHubPasswordCurrent ? "Hide" : "Show"}
                    </button>
                  </span>
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>New password</span>
                  <span style={passwordFieldWrap}>
                    <input
                      type={showHubPasswordNew ? "text" : "password"}
                      style={{ ...lightInput, paddingRight: 88 }}
                      value={passwordForm.newPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                    />
                    <button type="button" style={passwordRevealButton} onClick={() => setShowHubPasswordNew((current) => !current)}>
                      {showHubPasswordNew ? "Hide" : "Show"}
                    </button>
                  </span>
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Confirm new password</span>
                  <span style={passwordFieldWrap}>
                    <input
                      type={showHubPasswordConfirm ? "text" : "password"}
                      style={{ ...lightInput, paddingRight: 88 }}
                      value={passwordForm.confirmPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    />
                    <button type="button" style={passwordRevealButton} onClick={() => setShowHubPasswordConfirm((current) => !current)}>
                      {showHubPasswordConfirm ? "Hide" : "Show"}
                    </button>
                  </span>
                </label>
                <button type="button" onClick={handleChangePassword} style={primaryButton}>
                  Change password
                </button>
              </div>
            </section>

            <section style={panelCard}>
              <div style={panelHeader}>
                <div>
                  <p style={eyebrowDark}>Current access</p>
                  <h2 style={sectionTitle}>Hub users</h2>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {hubUsers.map((user) => (
                  <article key={user.id} style={userCard}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong style={{ color: "#0f1115", fontSize: 16 }}>{user.fullName}</strong>
                      <span style={{ color: "#596271" }}>{user.email}</span>
                    </div>
                    <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
                      <span style={darkBadge}>{hubRoleLabel(user.role)}</span>
                      <span style={subtleInfo}>Username: {user.username}</span>
                      {hubAccess?.canManageUsers && user.id !== activeUser?.id ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        style={{ ...secondaryButtonSmall, minHeight: 34, padding: "0 12px", fontSize: 13 }}
                      >
                        Remove user
                      </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section style={panelCard}>
              <div style={panelHeader}>
                <div>
                  <p style={eyebrowDark}>How to build items</p>
                  <h2 style={sectionTitle}>Builder logic</h2>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {[
                  "Use ingredients for the parts already in the item, like bun, patties, cheese, onions, or lettuce.",
                  "Use option groups for customer decisions like meal choice, sauces, drinks, fries, and extra toppings.",
                  "Use minimum and maximum selections to force exact choices or allow multiple extras.",
                  "Use show-only-after value ids for dependent groups like fries and can only after Make it a Meal is chosen.",
                ].map((entry) => (
                  <div key={entry} style={listRow}>
                    <span style={orangeDot} />
                    <span style={{ color: "#49515c", lineHeight: 1.5 }}>{entry}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
        </details>
      </section>
    </main>
  );
}

const pageShell: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(18, 183, 232, 0.12), transparent 24%), linear-gradient(180deg, #f6efe5 0%, #f2ebe0 100%)",
  color: "#101216",
  fontFamily: "Manrope, system-ui, sans-serif",
  padding: "24px 18px 56px",
};

const hubAppShell: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f7f8fa",
  color: "#101216",
  fontFamily: "Manrope, system-ui, sans-serif",
};

const sidebarBrand: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 8px 16px",
  borderBottom: "1px solid rgba(15, 17, 21, 0.08)",
};

const sidebarMark: React.CSSProperties = {
  display: "inline-grid",
  placeItems: "center",
  width: 42,
  height: 42,
  borderRadius: 14,
  background: "linear-gradient(180deg, #23cdff, #079bc8)",
  color: "#fff",
  fontWeight: 950,
};

const sidebarNav: React.CSSProperties = {
  display: "grid",
  gap: 18,
  alignContent: "start",
};

const sidebarGroup: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const sidebarGroupTitle: React.CSSProperties = {
  color: "#8a93a3",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

const sidebarButton: React.CSSProperties = {
  minHeight: 44,
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  border: "1px solid transparent",
  borderRadius: 14,
  background: "transparent",
  color: "#303642",
  padding: "0 10px",
  textAlign: "left",
  fontWeight: 850,
  cursor: "pointer",
};

const sidebarButtonActive: React.CSSProperties = {
  ...sidebarButton,
  borderColor: "rgba(7, 155, 200, 0.2)",
  background: "rgba(7, 155, 200, 0.1)",
  color: "#0680a6",
};

const hubMainHeader: React.CSSProperties = {
  borderRadius: 28,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "linear-gradient(180deg, #ffffff, #fbfbfc)",
  padding: 20,
  boxShadow: "0 18px 34px rgba(15, 17, 21, 0.06)",
};

const dashboardGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(280px, 1.4fr) repeat(3, minmax(170px, 0.65fr))",
  gap: 14,
  alignItems: "stretch",
};

const dashboardHeroCard: React.CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "start",
  borderRadius: 24,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  padding: 18,
  boxShadow: "0 18px 34px rgba(15, 17, 21, 0.06)",
};

const dashboardCard: React.CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "center",
  minHeight: 150,
  borderRadius: 22,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  padding: 18,
  boxShadow: "0 18px 34px rgba(15, 17, 21, 0.05)",
};

const placeholderPanel: React.CSSProperties = {
  ...dashboardHeroCard,
  minHeight: 260,
  alignContent: "center",
};

const sectionActionRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 8,
};

const loginHero: React.CSSProperties = {
  display: "grid",
  minHeight: "calc(100vh - 80px)",
  placeItems: "center",
};

const loginPanel: React.CSSProperties = {
  borderRadius: 28,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(249,244,237,0.96))",
  boxShadow: "0 28px 54px rgba(15, 17, 21, 0.1)",
  padding: 24,
  width: "min(100%, 520px)",
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  color: "#0680a6",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const eyebrowDark: React.CSSProperties = {
  ...eyebrow,
  color: "#9b4a12",
};

const heroTitle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "clamp(2.3rem, 4vw, 4.8rem)",
  lineHeight: 0.94,
  fontFamily: "Georgia, serif",
  letterSpacing: "-0.05em",
};

const hubTitle: React.CSSProperties = {
  ...heroTitle,
  fontSize: "clamp(2rem, 3vw, 3.2rem)",
  letterSpacing: 0,
};

const heroCopy: React.CSSProperties = {
  margin: "14px 0 0",
  color: "#596271",
  lineHeight: 1.7,
  maxWidth: 840,
};

const panelTitle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 34,
  lineHeight: 0.96,
  fontFamily: "Georgia, serif",
  letterSpacing: "-0.04em",
};

const panelCopy: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#596271",
  lineHeight: 1.6,
};

const panelCopyDark: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#596271",
  lineHeight: 1.6,
};

const field: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const darkFieldLabel: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: "#101216",
};

const fieldInput: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  background: "linear-gradient(180deg, #ffffff, #f6f0e9)",
  color: "#101216",
  padding: "0 14px",
  outline: "none",
  boxSizing: "border-box",
};

const lightInput: React.CSSProperties = {
  ...fieldInput,
  minHeight: 50,
};

const passwordFieldWrap: React.CSSProperties = {
  position: "relative",
  display: "block",
};

const passwordRevealButton: React.CSSProperties = {
  position: "absolute",
  top: 7,
  right: 8,
  minHeight: 36,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  color: "#101216",
  background: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const primaryButton: React.CSSProperties = {
  minHeight: 52,
  padding: "0 18px",
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.18)",
  color: "#fff",
  fontWeight: 900,
  background: "linear-gradient(180deg, #23cdff, #079bc8 62%, #0680a6)",
  boxShadow: "0 18px 28px rgba(18, 183, 232, 0.24), 0 10px 18px rgba(15, 17, 21, 0.18)",
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  minHeight: 52,
  padding: "0 18px",
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.16)",
  color: "#101216",
  fontWeight: 800,
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,241,234,0.96))",
  cursor: "pointer",
};

const secondaryButtonLink: React.CSSProperties = {
  ...secondaryButton,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
};

const secondaryButtonSmall: React.CSSProperties = {
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  color: "#101216",
  fontWeight: 800,
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,241,234,0.96))",
  cursor: "pointer",
};

const errorMessageStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "14px 16px",
  borderRadius: 16,
  color: "#8a2121",
  background: "rgba(255, 95, 95, 0.12)",
  border: "1px solid rgba(255, 95, 95, 0.24)",
};

const successMessageStyle: React.CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  borderRadius: 16,
  color: "#0f5e3d",
  background: "rgba(23, 156, 107, 0.12)",
  border: "1px solid rgba(23, 156, 107, 0.18)",
};

const unsavedHubBanner: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid rgba(181, 88, 0, 0.45)",
  background: "linear-gradient(180deg, rgba(255, 244, 233, 1), rgba(255, 235, 210, 0.98))",
  boxShadow: "0 12px 28px rgba(181, 88, 0, 0.14)",
};

const unsavedHubBannerCopy: React.CSSProperties = {
  display: "grid",
  gap: 6,
  minWidth: 0,
  flex: "1 1 220px",
};

const unsavedHubBannerCopyParagraph: React.CSSProperties = {
  margin: 0,
  color: "#5b3d12",
  lineHeight: 1.5,
  fontSize: "0.9rem",
};

const saveHubButtonDirtyStyle: React.CSSProperties = {
  boxShadow:
    "0 0 0 3px rgba(7, 155, 200, 0.35), 0 14px 24px rgba(7, 155, 200, 0.22)",
  animation: "hub-save-pulse 1.6s ease-in-out infinite",
};

const deliveryModeButton: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  background: "rgba(255, 255, 255, 0.96)",
  fontWeight: 800,
  cursor: "pointer",
  color: "#1a1d22",
};

const deliveryModeButtonActive: React.CSSProperties = {
  ...deliveryModeButton,
  borderColor: "rgba(7, 155, 200, 0.55)",
  background: "linear-gradient(180deg, rgba(230, 248, 255, 1), rgba(210, 240, 252, 0.98))",
  boxShadow: "0 10px 22px rgba(7, 155, 200, 0.18)",
};

const deliveryMapFrame: React.CSSProperties = {
  width: "100%",
  minHeight: 360,
  height: "min(52vh, 420px)",
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  overflow: "hidden",
  background: "#e8edf2",
};

const deliveryZoneList: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const deliveryZoneChip: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  background: "rgba(248, 250, 252, 0.98)",
  fontWeight: 800,
  cursor: "pointer",
  color: "#4a5560",
};

const deliveryZoneChipActive: React.CSSProperties = {
  ...deliveryZoneChip,
  borderColor: "rgba(7, 155, 200, 0.65)",
  background: "linear-gradient(180deg, rgba(35, 205, 255, 0.22), rgba(7, 155, 200, 0.12))",
  color: "#0a4d66",
};

const topHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-end",
  flexWrap: "wrap",
};

const activeUserChip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 48,
  padding: "0 14px",
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "rgba(255,255,255,0.9)",
  fontWeight: 800,
};

const workbenchShell: React.CSSProperties = {
  display: "grid",
  gap: 16,
  borderRadius: 28,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,1), rgba(248,242,235,0.97))",
  boxShadow: "0 24px 44px rgba(15, 17, 21, 0.08)",
  padding: 16,
};

const workbenchNav: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 10,
};

const workbenchTab: React.CSSProperties = {
  minHeight: 46,
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "rgba(255,255,255,0.82)",
  color: "#101216",
  fontWeight: 900,
  cursor: "pointer",
};

const workbenchTabActive: React.CSSProperties = {
  ...workbenchTab,
  color: "#fff",
  borderColor: "rgba(15, 17, 21, 0.18)",
  background: "linear-gradient(180deg, #1d2027, #101216)",
};

const menuManagementShell: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const menuManagementTopBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,243,236,0.92))",
  padding: 16,
  boxShadow: "0 16px 32px rgba(15, 17, 21, 0.06)",
};

const menuTopActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const menuTopTabRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  overflowX: "auto",
  borderRadius: 16,
  background: "#30343d",
  padding: 8,
};

const menuTopTab: React.CSSProperties = {
  border: 0,
  borderRadius: 12,
  background: "transparent",
  color: "rgba(255,255,255,0.76)",
  fontWeight: 900,
  padding: "11px 16px",
  whiteSpace: "nowrap",
  cursor: "pointer",
};

const menuTopTabActive: React.CSSProperties = {
  ...menuTopTab,
  color: "#101216",
  background: "#fff",
  boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
};

const mutedInlineNote: React.CSSProperties = {
  color: "rgba(255,255,255,0.72)",
  fontSize: 13,
  fontWeight: 800,
  padding: "0 8px",
};

const menuWorkbenchGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
};

const categoryAccordionPanel: React.CSSProperties = {
  display: "grid",
  gap: 14,
  minHeight: 520,
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "rgba(255,255,255,0.92)",
  padding: 14,
  position: "sticky",
  top: 16,
};

const categoryAccordionList: React.CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "start",
};

const categoryAccordionCard: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  overflow: "hidden",
};

const categoryAccordionSummary: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  cursor: "pointer",
  padding: 14,
  color: "#101216",
};

const categoryAccordionBody: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: "0 14px 14px",
};

const compactColumn: React.CSSProperties = {
  display: "grid",
  gap: 12,
  minHeight: 520,
  borderRadius: 22,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "rgba(255,255,255,0.78)",
  padding: 14,
};

const compactHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const compactTitle: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 22,
  lineHeight: 1,
  fontFamily: "Georgia, serif",
  color: "#0f1115",
};

const railTitle: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  fontSize: 16,
  lineHeight: 1.15,
  color: "#0f1115",
};

const compactList: React.CSSProperties = {
  display: "grid",
  gap: 8,
  alignContent: "start",
  maxHeight: 320,
  overflow: "auto",
  paddingRight: 4,
};

const compactListButton: React.CSSProperties = {
  display: "grid",
  gap: 5,
  width: "100%",
  minHeight: 64,
  padding: 12,
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  color: "#101216",
  background: "#fff",
  textAlign: "left",
  cursor: "pointer",
};

const compactListButtonActive: React.CSSProperties = {
  ...compactListButton,
  borderColor: "rgba(7, 155, 200, 0.34)",
  background: "linear-gradient(180deg, rgba(255, 244, 233, 1), rgba(255,255,255,0.98))",
  boxShadow: "0 14px 24px rgba(7, 155, 200, 0.1)",
};

const compactCreateBox: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: "auto",
};

const compactInput: React.CSSProperties = {
  ...lightInput,
  flex: "1 1 130px",
  minWidth: 0,
};

const newItemDraftPanel: React.CSSProperties = {
  display: "grid",
  gap: 16,
  marginTop: 4,
  borderRadius: 18,
  border: "1px solid rgba(7, 155, 200, 0.28)",
  background: "linear-gradient(180deg, rgba(35, 205, 255, 0.08), rgba(255, 255, 255, 0.98))",
  padding: 18,
  boxShadow: "0 16px 32px rgba(7, 155, 200, 0.1)",
};

const compactEditorCard: React.CSSProperties = {
  display: "grid",
  gap: 14,
  minHeight: 520,
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "rgba(255,255,255,0.92)",
  padding: 16,
};

const menuItemBoardStrip: React.CSSProperties = {
  display: "grid",
  gap: 14,
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.08)",
  background: "linear-gradient(180deg, rgba(255,255,255,1), rgba(248,243,236,0.82))",
  padding: 14,
};

const menuBoardHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const menuItemCardGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const menuAddItemCard: React.CSSProperties = {
  minHeight: 176,
  borderRadius: 16,
  border: "1px dashed rgba(15, 17, 21, 0.35)",
  background: "rgba(255,255,255,0.82)",
  color: "#101216",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 10,
  cursor: "pointer",
  fontWeight: 900,
};

const addCircle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 999,
  border: "1px solid rgba(15, 17, 21, 0.16)",
  display: "grid",
  placeItems: "center",
  fontSize: 22,
  lineHeight: 1,
};

const menuItemBoardCard: React.CSSProperties = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "104px minmax(0, 1fr)",
  gap: 12,
  minHeight: 176,
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  padding: 12,
  boxShadow: "0 12px 24px rgba(15, 17, 21, 0.05)",
};

const menuItemBoardCardActive: React.CSSProperties = {
  ...menuItemBoardCard,
  borderColor: "rgba(35, 205, 255, 0.48)",
  boxShadow: "0 16px 30px rgba(35, 205, 255, 0.16)",
};

const editDotButton: React.CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  borderRadius: 999,
  background: "#fff",
  color: "#101216",
  fontSize: 11,
  fontWeight: 900,
  padding: "6px 8px",
  cursor: "pointer",
};

const menuItemPhotoBox: React.CSSProperties = {
  minHeight: 118,
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.08)",
  background: "linear-gradient(180deg, #f6f3ed, #ebe7de)",
  color: "rgba(15, 17, 21, 0.55)",
  fontSize: 12,
  fontWeight: 900,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

const menuItemPhotoImage: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const menuItemCardBody: React.CSSProperties = {
  display: "grid",
  gap: 8,
  alignContent: "start",
  color: "#101216",
  paddingTop: 24,
};

const itemSelectButton: React.CSSProperties = {
  border: "1px solid rgba(15, 17, 21, 0.08)",
  borderRadius: 12,
  background: "rgba(248, 243, 236, 0.92)",
  color: "#101216",
  padding: "9px 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const itemSelectButtonActive: React.CSSProperties = {
  ...itemSelectButton,
  borderColor: "rgba(35, 205, 255, 0.42)",
  background: "rgba(35, 205, 255, 0.12)",
};

const advancedDrawer: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "rgba(248, 242, 235, 0.74)",
  padding: 14,
};

const advancedSummary: React.CSSProperties = {
  cursor: "pointer",
  color: "#101216",
  fontWeight: 900,
};

const legacyDetails: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "rgba(255,255,255,0.64)",
  padding: 14,
};

const legacySummary: React.CSSProperties = {
  cursor: "pointer",
  color: "#101216",
  fontWeight: 900,
  minHeight: 44,
  display: "flex",
  alignItems: "center",
};

const summaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const summaryCard: React.CSSProperties = {
  padding: 18,
  borderRadius: 22,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,243,236,0.96))",
  boxShadow: "0 16px 28px rgba(15, 17, 21, 0.08)",
};

const overviewCard: React.CSSProperties = {
  ...summaryCard,
  background: "linear-gradient(180deg, rgba(255,255,255,1), rgba(249,244,237,0.98))",
};

const summaryLabel: React.CSSProperties = {
  display: "block",
  color: "#7b8595",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const summaryValue: React.CSSProperties = {
  display: "block",
  marginTop: 8,
  fontSize: 28,
  color: "#0f1115",
};

const driverTrackingGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 0.9fr) minmax(360px, 1.1fr)",
  gap: 18,
  alignItems: "start",
};

const driverMapPanel: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(232,247,249,0.96))",
  padding: 16,
  boxShadow: "0 18px 32px rgba(15, 17, 21, 0.08)",
};

const driverMapHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  marginBottom: 12,
};

const driverMapTitle: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  fontSize: 22,
  color: "#101216",
};

const driverMapCanvas: React.CSSProperties = {
  position: "relative",
  minHeight: 360,
  overflow: "hidden",
  borderRadius: 22,
  border: "1px solid rgba(13, 138, 168, 0.2)",
  background:
    "linear-gradient(90deg, rgba(13,138,168,0.08) 1px, transparent 1px), linear-gradient(0deg, rgba(13,138,168,0.08) 1px, transparent 1px), radial-gradient(circle at 55% 44%, rgba(35,205,255,0.24), transparent 30%), linear-gradient(135deg, #f8fcfd, #dff4f6)",
  backgroundSize: "56px 56px, 56px 56px, auto, auto",
};

const driverMapAreaLabel: React.CSSProperties = {
  position: "absolute",
  transform: "translate(-50%, -50%)",
  color: "rgba(15, 17, 21, 0.42)",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const driverMapMarker: React.CSSProperties = {
  position: "absolute",
  width: 42,
  height: 54,
  display: "grid",
  placeItems: "center",
  transformOrigin: "50% 100%",
};

const driverMarkerLogo: React.CSSProperties = {
  width: 38,
  height: 38,
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  border: "3px solid #fff",
  background: "linear-gradient(135deg, #0f1115, #0d8aa8)",
  color: "#fff",
  fontSize: 16,
  fontWeight: 950,
  boxShadow: "0 16px 28px rgba(15, 17, 21, 0.22)",
};

const driverMapEmpty: React.CSSProperties = {
  position: "absolute",
  inset: "auto 18px 18px",
  padding: 14,
  borderRadius: 18,
  background: "rgba(255,255,255,0.9)",
  color: "#566070",
  fontWeight: 800,
};

const driverCardList: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const driverCard: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "rgba(255,255,255,0.96)",
  padding: 16,
  boxShadow: "0 18px 32px rgba(15, 17, 21, 0.07)",
};

const driverName: React.CSSProperties = {
  margin: 0,
  color: "#101216",
  fontSize: 22,
};

const driverOrderList: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 12,
};

const driverOrderRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 12,
  padding: 12,
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.08)",
  background: "rgba(248,242,235,0.62)",
};

const driverOrderMeta: React.CSSProperties = {
  margin: "4px 0 0",
  color: "#6c7482",
  fontSize: 13,
  fontWeight: 800,
};

const driverOrderAddress: React.CSSProperties = {
  margin: "4px 0 0",
  color: "#101216",
  fontSize: 13,
  lineHeight: 1.35,
};

const driverOrderTotals: React.CSSProperties = {
  display: "grid",
  gap: 4,
  justifyItems: "end",
  alignContent: "start",
  color: "#101216",
  fontWeight: 950,
};

const portalGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
};

const fastStartGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 1.35fr) minmax(280px, 0.9fr) minmax(280px, 0.75fr)",
  gap: 18,
  alignItems: "start",
};

const fastStartCard: React.CSSProperties = {
  borderRadius: 26,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,1), rgba(248,242,235,0.97))",
  boxShadow: "0 22px 40px rgba(15, 17, 21, 0.08)",
  padding: 20,
};

const fastActionGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 0.42fr)",
  gap: 14,
  alignItems: "start",
};

const panelCard: React.CSSProperties = {
  borderRadius: 26,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,1), rgba(248,242,235,0.97))",
  boxShadow: "0 22px 40px rgba(15, 17, 21, 0.08)",
  padding: 20,
};

const panelHeader: React.CSSProperties = {
  marginBottom: 16,
  paddingBottom: 14,
  borderBottom: "1px solid rgba(15, 17, 21, 0.08)",
};

const sectionTitle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 30,
  lineHeight: 0.98,
  fontFamily: "Georgia, serif",
  letterSpacing: "-0.04em",
};

const twoColumnGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const quickAddGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
};

const quickAddCard: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  borderRadius: 20,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
};

const quickAddTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontFamily: "Georgia, serif",
  color: "#0f1115",
};

const categoryCard: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 18,
  borderRadius: 22,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "linear-gradient(180deg, rgba(255,255,255,1), rgba(249,244,237,0.98))",
};

const categoryHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const categoryStat: React.CSSProperties = {
  minWidth: 150,
  padding: 16,
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
};

const itemEditorCard: React.CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 16,
  borderRadius: 20,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "#fff",
  boxShadow: "0 12px 24px rgba(15, 17, 21, 0.05)",
};

const itemTopRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const itemTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontFamily: "Georgia, serif",
  color: "#0f1115",
};

const itemBadgeRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 8,
};

const orderListGrid: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 18,
};

const orderListCard: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  padding: 16,
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  boxShadow: "0 12px 24px rgba(15, 17, 21, 0.05)",
  flexWrap: "wrap",
};

const orderNumberStyle: React.CSSProperties = {
  display: "block",
  color: "#0f1115",
  fontSize: 22,
};

const darkBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 999,
  background: "linear-gradient(180deg, #1c2027, #101216)",
  color: "#fff7ef",
  fontWeight: 800,
  fontSize: 13,
  textTransform: "capitalize",
};

const orangeBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 999,
  background: "linear-gradient(180deg, rgba(255, 142, 77, 0.18), rgba(7, 155, 200, 0.1))",
  color: "#9b4a12",
  border: "1px solid rgba(7, 155, 200, 0.22)",
  fontWeight: 800,
  fontSize: 13,
};

const builderGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
};

const templatePanel: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 14,
  borderRadius: 22,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "linear-gradient(180deg, rgba(255,255,255,1), rgba(241, 248, 251, 0.96))",
};

const templateHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const templateGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
};

const templateButton: React.CSSProperties = {
  display: "grid",
  gap: 6,
  minHeight: 112,
  padding: 14,
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  color: "#0f1115",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(15, 17, 21, 0.05)",
};

const toggleRow: React.CSSProperties = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
};

const toggleLabel: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 700,
  color: "#485260",
  flexWrap: "wrap",
};

const subBuilderCard: React.CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 16,
  borderRadius: 20,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "linear-gradient(180deg, #fff, #fbf7f1)",
};

const subBuilderHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const builderTitle: React.CSSProperties = {
  color: "#0f1115",
  fontSize: 18,
};

const builderCopy: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#6a7280",
  lineHeight: 1.5,
};

const builderRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  alignItems: "center",
};

const optionGroupCard: React.CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 14,
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
};

const optionRow: React.CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 12,
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.09)",
  background: "rgba(250, 246, 239, 0.9)",
};

const optionActionRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const referenceStrip: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const referenceChip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  color: "#596271",
  fontSize: 12,
  fontWeight: 700,
};

const userCard: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  padding: 16,
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
};

const emptyStateCard: React.CSSProperties = {
  padding: 16,
  borderRadius: 18,
  border: "1px dashed rgba(15, 17, 21, 0.16)",
  background: "rgba(255,255,255,0.76)",
  color: "#596271",
  lineHeight: 1.6,
};

const importBatchCard: React.CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 16,
  borderRadius: 20,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
};

const candidateRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "18px 1fr",
  gap: 10,
  alignItems: "start",
  padding: 12,
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(249,244,237,0.9), rgba(255,255,255,0.98))",
  border: "1px solid rgba(15, 17, 21, 0.08)",
};

const subtleInfo: React.CSSProperties = {
  color: "#596271",
  fontSize: 13,
  fontWeight: 700,
};

const hubDeliveryConfigStyles = {
  eyebrow: eyebrowDark,
  sectionTitle,
  panelCopy: panelCopyDark,
  field,
  darkFieldLabel,
  lightInput,
  subtleInfo,
  modeButton: deliveryModeButton,
  modeButtonActive: deliveryModeButtonActive,
  mapFrame: deliveryMapFrame,
  zoneChip: deliveryZoneChip,
  zoneChipActive: deliveryZoneChipActive,
  zoneList: deliveryZoneList,
};

const listRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "10px 1fr",
  gap: 12,
  alignItems: "start",
};

const orangeDot: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
  marginTop: 6,
  background: "linear-gradient(180deg, #23cdff, #079bc8)",
  boxShadow: "0 0 18px rgba(18, 183, 232, 0.24)",
};
