"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useHubPortalI18n } from "@hull-eats/i18n";
import type {
  HubMenuSection,
  HubSettings,
  HubUser,
  MembershipRole,
  MerchantPasswordResetCompleteResult,
  MerchantPasswordResetRequestResult,
  MerchantPasswordResetVerifyResult,
  MerchantWorkspace,
  MenuItem,
  OrderSummary,
} from "@hull-eats/types";
import { parseMerchantWorkspaceUpdateInput } from "@hull-eats/types";
import {
  HUB_MENU_CATEGORY_CUSTOM_ID,
  createDefaultOpeningHours,
  createDefaultHullPostcodeZones,
  describeStoreOpeningStatus,
  getHubAccess,
  hubMenuCategorySelectOptions,
  hubRoleLabel,
  hubRolesCreatableBy,
  formatHubPortalLocaleOptionLabel,
  HUB_PORTAL_LOCALE_OPTIONS,
  type HubPortalLocale,
  isHubMenuMealDealsCategory,
  isHubMenuSectionPizza,
  isHubMenuStaffLibrarySection,
} from "@hull-eats/types";

import { HubConfigBackups } from "./hub-config-backups";
import { HubDeliveryConfig } from "./hub-delivery-config";
import { HubOpeningHoursEditor } from "./hub-opening-hours-editor";
import { HubStorefrontImageField } from "./hub-storefront-image-field";
import { HubMenuCustomisationBuilder } from "./hub-menu-customisation";
import {
  browserDraftShouldAutoRestore,
  clearBrowserMenuDraft,
  loadBrowserMenuDraft,
  saveBrowserMenuDraft,
} from "./hub-menu-browser-draft";
import { HubMenuPartsSettingsWorkbench } from "./hub-menu-parts-settings-workbench";
import { HubMenuStudio } from "./hub-menu-studio";
import { HubTransientBanner } from "./hub-transient-banner";
import { HE_BRAND } from "./portal-brand";
import { friendlyCaughtError } from "./hub-merchant-errors";
import {
  acceptMerchantOrder,
  apiBaseUrl,
  applyMenuImport,
  changeHubPassword,
  completeHubPasswordReset,
  createBusinessUser,
  createMenuCategory,
  createMenuItem,
  customerWebBaseUrl,
  deleteBusinessUser,
  deleteMenuCategory,
  deleteMenuItem,
  fetchMerchantDriverTracking,
  fetchMerchantOrderHistory,
  fetchMerchantOrders,
  fetchWorkspace,
  loginToHub,
  previewMenuImport,
  previewMenuTextImport,
  printMerchantOrderReceipt,
  rejectMerchantOrder,
  requestHubPasswordReset,
  saveWorkspace,
  submitMerchantContactMessage,
  updateMerchantPreferredLocale,
  verifyHubPasswordReset,
  type CreateCategoryFormState,
  type MerchantDriverTracking,
} from "./merchant-api";
import {
  clearMerchantSessionFromBrowser,
  merchantLastLoginEmailKey,
  merchantSessionStorageKey,
  persistMerchantSessionToBrowser,
  resolveActiveHubUser,
  type StoredMerchantSession,
} from "./merchant-session";
import { readBrowserStorage, writeBrowserStorage } from "./browser-storage";
import {
  cloneHubSettings,
  cloneMenuSections,
  emptyHubSettings,
  hubWorkspaceSnapshotsEqual,
  mergeGeocodedSettingsFromServer,
  normalizeWorkspaceSettings,
  type HubWorkspaceSnapshot,
} from "./merchant-workspace-state";

import { HubDriversWorkbench } from "./hub-drivers-workbench";
import { HubOffersWorkbench } from "./hub-offers-workbench";
import {
  applyMenuAvailabilityMode,
  applyMenuBoardPublish,
  appendMenuBoard,
  buildLocalMenuCategory,
  buildLocalMenuItem,
  mergeItemDescriptionWithComponents,
  buildMenuPublishSummary,
  buildMenuTemplate,
  cloneMenuItemDraft,
  reconcileMenuSectionsAfterWorkspaceSave,
  computeMenuPublishIssues,
  customerFacingMenuSections,
  ensureStaffMenuSections,
  findBurgerPartsSection,
  findKebabPartsSection,
  findExtrasLibrarySection,
  findSaucesLibrarySection,
  findMealLibrarySection,
  getMealDealBundleSelection,
  getHubExtraToppingsFromSection,
  mergeMenuTemplateWithExistingSizes,
  menuTemplateCards,
  moveCustomerMenuSectionToIndex,
  readMenuBoardsConfig,
  switchToMainMenu,
  switchToMenuBoard,
  updateMenuBoardInConfig,
  type ComposeProductLine,
  type HubMenuBoardKind,
  type HubMenuBoardPublishMode,
  type MenuTemplateKind,
  type MenuAvailabilityMode,
} from "./menu-studio-core";
import {
  PizzaSizeDraftPanel,
  buildPizzaSizeOptionGroupFromRows,
  createInitialPizzaSizeRows,
  createPizzaSizeRowsForSection,
} from "./pizza-size-draft";
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
  | "availability"
  | "deliveryRanges"
  | "users"
  | "settings"
  | "help";

type MerchantBootStatus = "checking" | "login" | "hub";
type MerchantLoginView = "sign_in" | "forgot_password";

type CreateItemFormState = {
  sectionId: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  menuSubGroup: string;
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
  menuSubGroup: "",
  requiresIdVerification: false,
};

const moneyInput = (value: number) => value.toFixed(2);
const formatMoney = (value: number) => `£${value.toFixed(2)}`;
const formatOrderPlacedAt = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

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

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export default function MerchantPortalPage() {
  const { t, locale, setLocale } = useHubPortalI18n();
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
  const [merchantOrderHistory, setMerchantOrderHistory] = useState<OrderSummary[]>([]);
  const [ordersClockTick, setOrdersClockTick] = useState(0);
  const [newUser, setNewUser] = useState<CreateUserFormState>(initialCreateUserState);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(initialPasswordFormState);
  const [newCategory, setNewCategory] = useState<CreateCategoryFormState>(initialCreateCategoryState);
  const [newItem, setNewItem] = useState<CreateItemFormState>(initialCreateItemState);
  const [pizzaSizeRows, setPizzaSizeRows] = useState<PizzaSizeRow[]>(() => createInitialPizzaSizeRows());
  const [newItemComponents, setNewItemComponents] = useState<MenuItem["components"]>([]);
  const [newItemOptionGroups, setNewItemOptionGroups] = useState<MenuItem["optionGroups"]>([]);
  const [selectedImportCandidateIds, setSelectedImportCandidateIds] = useState<string[]>([]);
  const [selectedImportImageName, setSelectedImportImageName] = useState("");
  const [pastedMenuText, setPastedMenuText] = useState("");
  const [bootStatus, setBootStatus] = useState<MerchantBootStatus>("checking");
  const [loginView, setLoginView] = useState<MerchantLoginView>("sign_in");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [resetCodePreview, setResetCodePreview] = useState("");
  const [resetCodeVerified, setResetCodeVerified] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [savedHubSnapshot, setSavedHubSnapshot] = useState<HubWorkspaceSnapshot | null>(null);
  const [userNotice, setUserNotice] = useState("");
  const [menuNotice, setMenuNotice] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [orderNotice, setOrderNotice] = useState("");
  const [driverNotice, setDriverNotice] = useState("");
  const [offersNotice, setOffersNotice] = useState("");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [supportOrderNumber, setSupportOrderNumber] = useState("");
  const [supportNotice, setSupportNotice] = useState("");
  const [supportSending, setSupportSending] = useState(false);
  const [partsOptionSettingsLine, setPartsOptionSettingsLine] = useState<ComposeProductLine | null>(null);
  const [menuHubPersistState, setMenuHubPersistState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const menuSaveInFlightRef = useRef(false);
  const menuSectionsRef = useRef(menuSections);
  menuSectionsRef.current = menuSections;
  const hubSettingsRef = useRef(hubSettings);
  hubSettingsRef.current = hubSettings;
  const menuSaveQueuedRef = useRef(false);
  const menuSaveQueuedSilentRef = useRef(true);
  const menuWorkspaceReadyRef = useRef(false);
  const [driverTracking, setDriverTracking] = useState<MerchantDriverTracking | null>(null);
  const [activeHubSection, setActiveHubSection] = useState<HubSection>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeHubPanel, setActiveHubPanel] = useState<
    "menu" | "import" | "businessProfile" | "availability" | "deliveryRanges" | "settings" | "account"
  >("menu");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [isCreatingNewItem, setIsCreatingNewItem] = useState(false);
  const [showChoiceSetupForItemId, setShowChoiceSetupForItemId] = useState<string | null>(null);
  const [menuPublishDialogOpen, setMenuPublishDialogOpen] = useState(false);
  const [menuPreviewOpen, setMenuPreviewOpen] = useState(false);
  const [menuPublishing, setMenuPublishing] = useState(false);
  const [editingMenuBoardId, setEditingMenuBoardId] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showAccountPasswords, setShowAccountPasswords] = useState(false);
  const [showHubPasswordCurrent, setShowHubPasswordCurrent] = useState(false);
  const [showHubPasswordNew, setShowHubPasswordNew] = useState(false);
  const [showHubPasswordConfirm, setShowHubPasswordConfirm] = useState(false);
  const [showCreateUserPassword, setShowCreateUserPassword] = useState(false);
  const [localeSaving, setLocaleSaving] = useState(false);

  useEffect(() => {
    if (activeUser?.preferredLocale) {
      setLocale(activeUser.preferredLocale);
    }
  }, [activeUser?.preferredLocale, setLocale]);

  const extrasSection = useMemo(() => findExtrasLibrarySection(menuSections), [menuSections]);
  const saucesSection = useMemo(() => findSaucesLibrarySection(menuSections), [menuSections]);
  const burgerPartsSection = useMemo(() => findBurgerPartsSection(menuSections), [menuSections]);
  const kebabPartsSection = useMemo(() => findKebabPartsSection(menuSections), [menuSections]);
  const mealSection = useMemo(() => findMealLibrarySection(menuSections), [menuSections]);
  const menuBoards = useMemo(() => readMenuBoardsConfig(menuSections).boards, [menuSections]);
  const editingMenuBoard = useMemo(
    () => menuBoards.find((board) => board.id === editingMenuBoardId) ?? null,
    [menuBoards, editingMenuBoardId],
  );
  const menuPublishIssues = useMemo(() => computeMenuPublishIssues(menuSections), [menuSections]);

  const menuStats = useMemo(() => {
    const totalItems = menuSections.reduce((sum, section) => sum + (section.items?.length ?? 0), 0);
    const activeItems = menuSections.reduce(
      (sum, section) => sum + (section.items ?? []).filter((item) => item.isActive).length,
      0,
    );
    const customisableItems = menuSections.reduce(
      (sum, section) =>
        sum +
        (section.items ?? []).filter(
          (item) => (item.components?.length ?? 0) > 0 || (item.optionGroups?.length ?? 0) > 0,
        ).length,
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
    () => menuSections.find((section) => section.id === selectedCategoryId) ?? null,
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

  const openPartsOptionSettings = useCallback(
    (line?: ComposeProductLine) => {
      setMobileNavOpen(false);
      setActiveHubSection("settings");
      setActiveHubPanel("settings");
      setPartsOptionSettingsLine(line ?? (burgerPartsSection ? "burger" : kebabPartsSection ? "kebab" : null));
    },
    [burgerPartsSection, kebabPartsSection],
  );

  const openHubSection = (section: HubSection) => {
    setMobileNavOpen(false);
    setActiveHubSection(section);

    if (section === "orders") {
      void loadMerchantOrders(merchantToken, { silent: true });
      return;
    }

    if (section === "drivers") {
      void loadDriverTracking();
      return;
    }

    if (section === "orderHistory") {
      void loadMerchantOrderHistory(merchantToken, { silent: true });
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

    if (section === "availability") {
      setActiveHubPanel("availability");
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
    const customerSections = menuSections.filter((section) => !isHubMenuStaffLibrarySection(section));
    const selectedSection = menuSections.find((section) => section.id === selectedCategoryId) ?? null;

    if (selectedSection && isHubMenuStaffLibrarySection(selectedSection)) {
      if (isCreatingNewItem) {
        setIsCreatingNewItem(false);
      }
      if (selectedItemId) {
        setSelectedItemId("");
      }
      return;
    }

    if (customerSections.length === 0) {
      if (selectedItemId) {
        setSelectedItemId("");
      }
      if (isCreatingNewItem) {
        setIsCreatingNewItem(false);
      }
      if (selectedCategoryId && !selectedSection) {
        setSelectedCategoryId("");
      }
      return;
    }

    const nextCategory =
      customerSections.find((section) => section.id === selectedCategoryId) ?? customerSections[0]!;

    if (!selectedCategoryId || !customerSections.some((section) => section.id === selectedCategoryId)) {
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

    const activeCategory =
      customerSections.find((section) => section.id === selectedCategoryId) ?? nextCategory;
    if (selectedItemId && activeCategory.items.some((item) => item.id === selectedItemId)) {
      return;
    }

    const nextItem = activeCategory.items[0];
    if (nextItem && nextItem.id !== selectedItemId) {
      setSelectedItemId(nextItem.id);
    }
  }, [isCreatingNewItem, menuSections, selectedCategoryId, selectedItemId]);

  const beginCreateItem = useCallback(
    (sectionId: string, menuSubGroup?: string) => {
      const section = menuSections.find((entry) => entry.id === sectionId);
      setIsCreatingNewItem(true);
      setSelectedCategoryId(sectionId);
      setSelectedItemId("");
      setNewItem({
        ...initialCreateItemState,
        sectionId,
        menuSubGroup: menuSubGroup?.trim() ?? "",
        price: "",
      });
      setPizzaSizeRows(
        section && isHubMenuSectionPizza(section) ? createPizzaSizeRowsForSection(section) : createInitialPizzaSizeRows(),
      );
      setNewItemComponents([]);
      setNewItemOptionGroups([]);
      setMenuNotice("");
    },
    [menuSections],
  );

  const cancelCreateItem = useCallback(() => {
    setIsCreatingNewItem(false);
    const section = menuSections.find((entry) => entry.id === selectedCategoryId);
    setSelectedItemId(section?.items[0]?.id ?? "");
    setNewItem((current) => ({ ...initialCreateItemState, sectionId: current.sectionId }));
    setPizzaSizeRows(
      section && isHubMenuSectionPizza(section) ? createPizzaSizeRowsForSection(section) : createInitialPizzaSizeRows(),
    );
    setNewItemComponents([]);
    setNewItemOptionGroups([]);
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

  const applyWorkspaceSaveResult = useCallback(
    (
      workspace: MerchantWorkspace,
      options?: { sectionsSentWithRequest?: HubMenuSection[]; settingsSentWithRequest?: HubSettings },
    ) => {
      const serverSettings = normalizeWorkspaceSettings(workspace.settings);
      const serverSections = ensureStaffMenuSections(workspace.menuSections);
      const sectionsSent = options?.sectionsSentWithRequest;
      const settingsSent = options?.settingsSentWithRequest ?? hubSettingsRef.current;
      const menuWasPersisted = Boolean(sectionsSent);
      const localSettings = hubSettingsRef.current;
      const localSections = menuSectionsRef.current;
      const localStillMatchesRequest =
        JSON.stringify(localSettings) === JSON.stringify(settingsSent) &&
        (!menuWasPersisted || JSON.stringify(localSections) === JSON.stringify(sectionsSent));

      const menuSnapshot = menuWasPersisted
        ? reconcileMenuSectionsAfterWorkspaceSave(sectionsSent!, serverSections, sectionsSent!)
        : localSections;

      const settingsSnapshot = mergeGeocodedSettingsFromServer(settingsSent, settingsSent, serverSettings);

      commitSavedHubSnapshot(settingsSnapshot, menuSnapshot);
      setHubUsers(workspace.users);
      setPendingImports(workspace.pendingImports ?? []);

      if (localStillMatchesRequest) {
        const mergedLiveSettings = mergeGeocodedSettingsFromServer(localSettings, settingsSent, serverSettings);
        if (JSON.stringify(mergedLiveSettings) !== JSON.stringify(localSettings)) {
          setHubSettings(mergedLiveSettings);
        }
      }

      if (activeHubId && localStillMatchesRequest && hubWorkspaceSnapshotsEqual(
        { settings: hubSettingsRef.current, menuSections: menuSectionsRef.current },
        { settings: settingsSnapshot, menuSections: menuSnapshot },
      )) {
        clearBrowserMenuDraft(activeHubId);
      }
    },
    [activeHubId, commitSavedHubSnapshot],
  );

  const persistWorkspaceToHub = useCallback(
    async (options?: { manualCheckpoint?: boolean; silent?: boolean }) => {
      if (!merchantToken || !activeHubId || !hubAccess?.canEditWorkspace) {
        return false;
      }

      if (menuSaveInFlightRef.current) {
        menuSaveQueuedRef.current = true;
        if (!options?.silent) {
          menuSaveQueuedSilentRef.current = false;
        }
        return false;
      }

      const settingsSnapshot = hubSettingsRef.current;
      const sectionsSnapshot = menuSectionsRef.current;
      const savedSnapshot = savedHubSnapshot;
      const includeMenu =
        !savedSnapshot || JSON.stringify(sectionsSnapshot) !== JSON.stringify(savedSnapshot.menuSections);
      const includeSettings =
        !savedSnapshot || JSON.stringify(settingsSnapshot) !== JSON.stringify(savedSnapshot.settings);

      if (!includeMenu && !includeSettings) {
        return true;
      }

      menuSaveInFlightRef.current = true;
      const silent = options?.silent ?? false;
      if (!silent) {
        setMenuHubPersistState("saving");
      }
      if (options?.manualCheckpoint) {
        setMenuPublishing(true);
      }

      try {
        const workspace = await saveWorkspace(merchantToken, activeHubId, {
          settings: settingsSnapshot,
          ...(includeMenu ? { menuSections: sectionsSnapshot } : {}),
        });
        applyWorkspaceSaveResult(workspace, {
          sectionsSentWithRequest: includeMenu ? sectionsSnapshot : undefined,
          settingsSentWithRequest: settingsSnapshot,
        });
        if (!silent) {
          setMenuHubPersistState("saved");
        }
        if (options?.manualCheckpoint) {
          setSaveNotice("Draft saved on your hub — ready to publish when you choose.");
          setMenuNotice("All items and options are kept. Nothing was removed. Publish when customers should see changes.");
        }
        return true;
      } catch (error) {
        const message = friendlyCaughtError(error, "workspace_save");
        if (!silent) {
          setMenuHubPersistState("error");
        }
        setSaveNotice(message);
        if (options?.manualCheckpoint) {
          setMenuNotice(message);
        }
        return false;
      } finally {
        menuSaveInFlightRef.current = false;
        if (options?.manualCheckpoint) {
          setMenuPublishing(false);
        }
        if (menuSaveQueuedRef.current) {
          menuSaveQueuedRef.current = false;
          void persistWorkspaceToHub({ silent: menuSaveQueuedSilentRef.current });
        }
      }
    },
    [activeHubId, applyWorkspaceSaveResult, hubAccess?.canEditWorkspace, merchantToken, savedHubSnapshot],
  );

  useEffect(() => {
    if (!hasUnsavedHubChanges || !merchantToken || !activeHubId || !hubAccess?.canEditWorkspace) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistWorkspaceToHub({ silent: true });
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeHubId,
    hasUnsavedHubChanges,
    hubAccess?.canEditWorkspace,
    hubSettings,
    menuSections,
    merchantToken,
    persistWorkspaceToHub,
  ]);

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

  const handleReorderCategory = (sectionId: string, toIndex: number) => {
    updateMenuSections((current) => moveCustomerMenuSectionToIndex(current, sectionId, toIndex));
  };

  const applyWorkspace = (workspace: MerchantWorkspace, user: HubUser | null) => {
    menuWorkspaceReadyRef.current = false;
    const resolvedUser = resolveActiveHubUser(workspace, user);
    setActiveHubId(workspace.hub.id);
    setActiveHubSlug(workspace.hub.slug);
    setActiveUser(resolvedUser);
    setHubUsers(workspace.users);
    if (resolvedUser?.preferredLocale) {
      setLocale(resolvedUser.preferredLocale);
    }
    setPendingImports(workspace.pendingImports ?? []);

    const serverSettings = normalizeWorkspaceSettings(workspace.settings);
    const serverSections = ensureStaffMenuSections(workspace.menuSections ?? []);
    const serverSnapshot = { settings: serverSettings, menuSections: serverSections };

    const browserDraft = loadBrowserMenuDraft(workspace.hub.id);
    const useBrowserDraft =
      browserDraft &&
      browserDraftShouldAutoRestore(browserDraft, serverSnapshot, hubWorkspaceSnapshotsEqual);

    if (useBrowserDraft && browserDraft) {
      const draftSections = ensureStaffMenuSections(browserDraft.menuSections);
      setHubSettings(
        normalizeWorkspaceSettings({
          ...browserDraft.settings,
          openingHours:
            browserDraft.settings.openingHours?.length === 7
              ? browserDraft.settings.openingHours
              : serverSettings.openingHours,
        }),
      );
      setMenuSections(draftSections);
      commitSavedHubSnapshot(serverSettings, serverSections);
      setMenuNotice(
        "Restored unsaved menu work from this browser. It will save to your hub automatically — you do not need to start again after a refresh.",
      );
    } else {
      setHubSettings(serverSettings);
      setMenuSections(serverSections);
      commitSavedHubSnapshot(serverSettings, serverSections);
    }

    const activeSections = useBrowserDraft && browserDraft ? ensureStaffMenuSections(browserDraft.menuSections) : serverSections;
    const customerSections = activeSections.filter((section) => !isHubMenuStaffLibrarySection(section));
    const firstCustomer = customerSections[0];
    setSelectedCategoryId(firstCustomer?.id ?? "");
    setSelectedItemId(firstCustomer?.items[0]?.id ?? "");
    setNewItem((current) => ({
      ...current,
      sectionId: firstCustomer?.id ?? "",
    }));

    if (user?.mustChangePassword) {
      setActiveHubSection("users");
      setActiveHubPanel("account");
      setPasswordForm((current) => ({
        ...current,
        currentPassword: current.currentPassword || "letmein",
      }));
      setPasswordNotice("Your login was reset to a temporary password. Change it now to keep this hub secure.");
    }

    menuWorkspaceReadyRef.current = true;
  };

  const loadMerchantOrders = async (token = merchantToken, options: { silent?: boolean } = {}) => {
    if (!token) {
      return;
    }

    try {
      const orders = await fetchMerchantOrders(token);
      setMerchantOrders(orders);
    } catch {
      if (!options.silent) {
        setOrderNotice(t("errors.ordersRefreshFailed"));
      }
    }
  };

  const loadMerchantOrderHistory = async (token = merchantToken, options: { silent?: boolean } = {}) => {
    if (!token) {
      return;
    }

    try {
      const orders = await fetchMerchantOrderHistory(token);
      setMerchantOrderHistory(orders);
    } catch {
      if (!options.silent) {
        setOrderNotice(t("errors.orderHistoryRefreshFailed"));
      }
    }
  };

  const handleAcceptMerchantOrder = async (order: OrderSummary) => {
    if (!merchantToken) {
      return;
    }

    if (!hubAccess?.canOperateOrders) {
      setOrderNotice(t("errors.noOrderPermission"));
      return;
    }

    try {
      await acceptMerchantOrder(merchantToken, order.id, hubSettings.etaMinutes);
      await loadMerchantOrders(merchantToken, { silent: true });
      await loadMerchantOrderHistory(merchantToken, { silent: true });
      setOrderNotice(t("orders.orderAccepted"));
    } catch {
      setOrderNotice(t("errors.acceptFailed"));
    }
  };

  const handleRejectMerchantOrder = async (order: OrderSummary) => {
    if (!merchantToken) {
      return;
    }

    if (!hubAccess?.canOperateOrders) {
      setOrderNotice(t("errors.noOrderPermission"));
      return;
    }

    const reason = window.prompt(t("orders.rejectPrompt"), t("orders.rejectDefaultReason"));
    if (reason === null) {
      return;
    }

    const trimmed = reason.trim() || t("orders.rejectDefaultReason");

    try {
      await rejectMerchantOrder(merchantToken, order.id, trimmed);
      await loadMerchantOrders(merchantToken, { silent: true });
      await loadMerchantOrderHistory(merchantToken, { silent: true });
      setOrderNotice(t("orders.orderRejected"));
    } catch {
      setOrderNotice(t("errors.rejectFailed"));
    }
  };

  const loadDriverTracking = async (token = merchantToken, options: { silent?: boolean } = {}) => {
    if (!token) {
      return;
    }

    try {
      const tracking = await fetchMerchantDriverTracking(token);
      setDriverTracking(tracking);
    } catch {
      if (!options.silent) {
        setDriverNotice(t("errors.driverTrackingFailed"));
      }
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
      setOrderNotice(receipt.message?.trim() || t("orders.receiptSent"));

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
      setOrderNotice(t("errors.printReceiptFailed"));
      receiptWindow?.close();
    }
  };

  useEffect(() => {
    if (!activeHubId || !merchantToken || !menuWorkspaceReadyRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveBrowserMenuDraft(activeHubId, menuSections, hubSettings);
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [activeHubId, hubSettings, menuSections, merchantToken]);

  useEffect(() => {
    const lastEmail = readBrowserStorage(merchantLastLoginEmailKey);
    if (lastEmail) {
      setLoginUsername(lastEmail);
      setResetEmail(lastEmail);
    }

    const params = new URLSearchParams(window.location.search);
    const adminSessionParam = params.get("adminSession");
    if (adminSessionParam) {
      try {
        const parsedAdminSession = JSON.parse(decodeURIComponent(adminSessionParam)) as StoredMerchantSession;
        if (parsedAdminSession?.token && parsedAdminSession?.hubId && parsedAdminSession?.user) {
          writeBrowserStorage(
            merchantSessionStorageKey,
            JSON.stringify({
              token: parsedAdminSession.token,
              hubId: parsedAdminSession.hubId,
              user: parsedAdminSession.user,
            } satisfies StoredMerchantSession),
          );
          writeBrowserStorage(
            merchantLastLoginEmailKey,
            parsedAdminSession.user.email || parsedAdminSession.user.username || "",
          );
        }
      } catch {
        // Ignore malformed adminSession payloads and continue with normal login/session restore.
      } finally {
        params.delete("adminSession");
        const next = params.toString();
        const cleaned = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
        window.history.replaceState({}, "", cleaned);
      }
    }

    const storedSession = readBrowserStorage(merchantSessionStorageKey);
    if (!storedSession) {
      setBootStatus("login");
      return;
    }

    void (async () => {
      try {
        const parsed = JSON.parse(storedSession) as StoredMerchantSession;
        if (!parsed.token || !parsed.hubId || !parsed.user) {
          throw new Error("Stored merchant session is incomplete.");
        }

        setMerchantToken(parsed.token);
        setActiveUser(parsed.user);
        setActiveHubId(parsed.hubId);
        setLoginUsername(parsed.user.email || parsed.user.username || lastEmail || "");

        const workspace = await fetchWorkspace(parsed.token, parsed.hubId);
        const resolvedUser = resolveActiveHubUser(workspace, parsed.user) ?? parsed.user;
        persistMerchantSessionToBrowser({
          token: parsed.token,
          hubId: parsed.hubId,
          user: resolvedUser,
        });
        applyWorkspace(workspace, resolvedUser);
        setBootStatus("hub");
        void loadMerchantOrders(parsed.token, { silent: true });
      } catch {
        clearMerchantSessionFromBrowser();
        setMerchantToken("");
        setBootStatus("login");
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
    if (activeHubSection !== "orderHistory" || !merchantToken) {
      return;
    }

    void loadMerchantOrderHistory(merchantToken, { silent: true });
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
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const response = await loginToHub(loginUsername, loginPassword);
      const emailForRemember = response.user.email || loginUsername.trim();
      writeBrowserStorage(merchantLastLoginEmailKey, emailForRemember);
      persistMerchantSessionToBrowser({
        token: response.token,
        hubId: response.workspace.hub.id,
        user: response.user,
      });

      setMerchantToken(response.token);
      applyWorkspace(response.workspace, response.user);
      setBootStatus("hub");
      setLoginView("sign_in");
      setLoginPassword("");
      setResetNotice("");
      setResetCodePreview("");
      setResetCodeVerified(false);
      setSaveNotice("");
      setUserNotice("");
      setMenuNotice("");
      setPasswordNotice("");
      setOrderNotice("");
      void loadMerchantOrders(response.token);
    } catch (error) {
      setLoginError(friendlyCaughtError(error, "login"));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!resetEmail.trim()) {
      setResetNotice("Enter the hub login email first.");
      return;
    }

    setIsSubmittingReset(true);
    setResetNotice("");

    try {
      const response = await requestHubPasswordReset(resetEmail.trim().toLowerCase());
      setResetCode("");
      setResetCodeVerified(false);
      setResetCodePreview(response.debugCode ?? "");
      setResetNotice(
        response.deliveryMode === "preview"
          ? "Reset code generated. Use the preview code below while email delivery is still being wired."
          : "If that email belongs to a hub user, a reset code has been prepared.",
      );
    } catch (error) {
      setResetNotice(friendlyCaughtError(error, "password_reset_request"));
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleVerifyPasswordReset = async () => {
    if (!resetEmail.trim() || !resetCode.trim()) {
      setResetNotice("Enter both the hub email and the 6-digit code.");
      return;
    }

    setIsSubmittingReset(true);
    setResetNotice("");

    try {
      await verifyHubPasswordReset(resetEmail.trim().toLowerCase(), resetCode.trim());
      setResetCodeVerified(true);
      setResetNotice("Code verified. You can now reset this hub login to the temporary password.");
    } catch (error) {
      setResetCodeVerified(false);
      setResetNotice(friendlyCaughtError(error, "password_reset_verify"));
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleCompletePasswordReset = async () => {
    if (!resetCodeVerified) {
      setResetNotice("Verify the code before resetting this login.");
      return;
    }

    setIsSubmittingReset(true);
    setResetNotice("");

    try {
      const response = await completeHubPasswordReset(resetEmail.trim().toLowerCase(), resetCode.trim());
      setLoginView("sign_in");
      setLoginUsername(response.loginEmail);
      setResetEmail(response.loginEmail);
      setLoginPassword(response.temporaryPassword);
      setResetCode("");
      setResetCodeVerified(false);
      setResetCodePreview("");
      setLoginError("");
      setResetNotice(`Login reset complete. Sign in with ${response.loginEmail} and temporary password ${response.temporaryPassword}.`);
    } catch (error) {
      setResetNotice(friendlyCaughtError(error, "password_reset_complete"));
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handlePreferredLocaleChange = async (preferredLocale: HubPortalLocale) => {
    setLocale(preferredLocale);
    if (!merchantToken || !activeHubId) {
      return;
    }

    setLocaleSaving(true);
    try {
      const user = await updateMerchantPreferredLocale(merchantToken, activeHubId, preferredLocale);
      setActiveUser(user);
      setHubUsers((current) => current.map((entry) => (entry.id === user.id ? user : entry)));
      persistMerchantSessionToBrowser({
        token: merchantToken,
        hubId: activeHubId,
        user,
      });
      setUserNotice(t("common.portalLanguageSaved"));
    } catch {
      setUserNotice(t("common.portalLanguageSaveFailed"));
    } finally {
      setLocaleSaving(false);
    }
  };

  const handleSignOut = () => {
    clearMerchantSessionFromBrowser();
    setBootStatus("login");
    setLoginView("sign_in");
    setMerchantToken("");
    setLoginPassword("");
    setActiveHubId("");
    setActiveHubSlug("");
    setHubUsers([]);
    setActiveUser(null);
    setHubSettings(emptyHubSettings);
    setMenuSections([]);
    setPendingImports([]);
    setMerchantOrders([]);
    setMerchantOrderHistory([]);
    setSelectedCategoryId("");
    setSelectedItemId("");
    setPasswordForm(initialPasswordFormState);
    setSavedHubSnapshot(null);
    menuWorkspaceReadyRef.current = false;
    setSaveNotice("");
    setUserNotice("");
    setMenuNotice("");
    setPasswordNotice("");
    setOrderNotice("");
    setResetCode("");
    setResetCodePreview("");
    setResetCodeVerified(false);
    setResetNotice("");
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
      const response = await changeHubPassword(merchantToken, activeHubId, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setActiveUser(response.user);
      setHubUsers((current) => current.map((user) => (user.id === response.user.id ? response.user : user)));
      if (merchantToken && activeHubId) {
        persistMerchantSessionToBrowser({
          token: merchantToken,
          hubId: activeHubId,
          user: response.user,
        });
      }
      setPasswordForm(initialPasswordFormState);
      setPasswordNotice("Password changed. This browser will stay signed in until you sign out or the session expires.");
    } catch (error) {
      const message = friendlyCaughtError(error, "password_change");
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

  const handleSaveDraft = async () => {
    if (!merchantToken || !activeHubId) {
      return;
    }
    if (!hubAccess?.canEditWorkspace) {
      setSaveNotice("Your account is view-only and cannot save menu changes.");
      return;
    }
    await persistWorkspaceToHub({ manualCheckpoint: true, silent: false });
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
      if (editingMenuBoardId) {
        setMenuSections((current) => applyMenuBoardPublish(current, editingMenuBoardId, editingMenuBoardId));
        setEditingMenuBoardId(null);
      }
      let saved = await persistWorkspaceToHub({ manualCheckpoint: true, silent: false });
      if (!saved) {
        await new Promise((resolve) => window.setTimeout(resolve, 800));
        saved = await persistWorkspaceToHub({ manualCheckpoint: true, silent: false });
      }
      if (!saved) {
        throw new Error("Could not save the menu to your hub before publishing.");
      }
      setMenuPublishDialogOpen(false);
      setSaveNotice(`Live menu published for ${hubSettings.name}.`);
      setMenuNotice("Customers will see your updated menu on Hull Eats.");
    } catch (error) {
      const message = friendlyCaughtError(error, "workspace_save");
      setSaveNotice(message);
      setMenuNotice(message);
    } finally {
      setMenuPublishing(false);
    }
  };

  const handleRequestPublishMenu = () => {
    setMenuPublishDialogOpen(true);
  };

  const focusFirstCustomerCategory = (sections: HubMenuSection[]) => {
    const first = customerFacingMenuSections(sections)[0];
    setSelectedCategoryId(first?.id ?? "");
    setSelectedItemId(first?.items[0]?.id ?? "");
    setNewItem((current) => ({ ...current, sectionId: first?.id ?? current.sectionId }));
  };

  const handleSelectMainMenu = () => {
    if (!editingMenuBoardId) {
      return;
    }
    updateMenuSections((current) => {
      const next = switchToMainMenu(current, editingMenuBoardId);
      focusFirstCustomerCategory(next);
      return next;
    });
    setEditingMenuBoardId(null);
    setMenuNotice("Back on your main menu.");
  };

  const handleSelectMenuBoard = (boardId: string) => {
    if (editingMenuBoardId === boardId) {
      return;
    }
    const board = menuBoards.find((entry) => entry.id === boardId);
    updateMenuSections((current) => {
      const next = switchToMenuBoard(current, editingMenuBoardId, boardId);
      focusFirstCustomerCategory(next);
      return next;
    });
    setEditingMenuBoardId(boardId);
    setMenuNotice(board ? `Editing ${board.name}.` : "Editing draft menu.");
  };

  const handleCreateMenuBoard = (kind: HubMenuBoardKind) => {
    updateMenuSections((current) => {
      const created = appendMenuBoard(current, editingMenuBoardId, kind);
      setEditingMenuBoardId(created.boardId);
      focusFirstCustomerCategory(created.sections);
      return created.sections;
    });
    setMenuNotice(
      kind === "seasonal"
        ? "Seasonal menu created — edit it, then publish when ready."
        : kind === "alternative"
          ? "Alternative menu created — edit it, then publish when ready."
          : "New menu draft created — edit it, then publish when ready.",
    );
  };

  const handleUpdateMenuBoardPublishMode = (boardId: string, mode: HubMenuBoardPublishMode) => {
    updateMenuSections((current) => updateMenuBoardInConfig(current, boardId, { publishMode: mode }));
  };

  const handleRenameMenuBoard = (boardId: string, name: string) => {
    updateMenuSections((current) => updateMenuBoardInConfig(current, boardId, { name }));
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
      const message = friendlyCaughtError(error, "user_create");
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
      const message = friendlyCaughtError(error, "user_delete");
      setUserNotice(message);
    }
  };

  const handleSubmitSupportMessage = async () => {
    if (!merchantToken || !activeHubId) {
      return;
    }
    if (!supportSubject.trim() || !supportMessage.trim()) {
      setSupportNotice(t("help.supportMissingFields"));
      return;
    }

    setSupportSending(true);
    try {
      await submitMerchantContactMessage(merchantToken, activeHubId, {
        senderPhone: supportPhone.trim(),
        subject: supportSubject.trim(),
        message: supportMessage.trim(),
        orderNumber: supportOrderNumber.trim(),
        sourcePath: "/merchant/help",
      });
      setSupportSubject("");
      setSupportMessage("");
      setSupportOrderNumber("");
      setSupportNotice(t("help.supportSent"));
    } catch (error) {
      setSupportNotice(friendlyCaughtError(error, "support"));
    } finally {
      setSupportSending(false);
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
    setMenuNotice(`Added ${createdCategory.name}. Add items in Categories and set a price on each one.`);
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
      const remaining = menuSections
        .filter((section) => section.id !== sectionId)
        .filter((section) => !isHubMenuStaffLibrarySection(section));
      setSelectedCategoryId(remaining[0]?.id ?? "");
      setSelectedItemId(remaining[0]?.items[0]?.id ?? "");
    }
    setMenuNotice(`${sectionName} removed. Saving to your hub — publish when customers should see the change.`);
  };

  const handleCreateItem = (availabilityMode: MenuAvailabilityMode = "live") => {
    const targetSection = menuSections.find((section) => section.id === newItem.sectionId);
    const isPizza = isHubMenuSectionPizza(targetSection);

    if (!newItem.sectionId || !newItem.name.trim()) {
      setMenuNotice("Choose a category and product name before creating the item.");
      return;
    }

    if (isHubMenuMealDealsCategory(targetSection)) {
      const bundle = getMealDealBundleSelection({
        ...buildLocalMenuItem({
          categoryId: newItem.sectionId,
          name: newItem.name,
          description: newItem.description,
          price: Number(newItem.price) || 0,
          requiresIdVerification: newItem.requiresIdVerification,
          components: newItemComponents,
          optionGroups: newItemOptionGroups,
        }),
      });
      if (bundle.mainIds.length === 0 || bundle.sideIds.length === 0 || bundle.drinkIds.length === 0) {
        setMenuNotice("Pick at least one main, side, and drink from your menu for this meal deal.");
        return;
      }
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
      if (!newItem.price.trim()) {
        setMenuNotice("Enter a price on this item before saving.");
        return;
      }
      price = Number(newItem.price);
      if (Number.isNaN(price) || price < 0) {
        setMenuNotice("Enter a valid price for this item.");
        return;
      }
      optionGroups = [];
    }

    let createdItem = buildLocalMenuItem({
      categoryId: newItem.sectionId,
      name: newItem.name,
      description: newItem.description,
      price,
      imageUrl: newItem.imageUrl.trim() || undefined,
      menuSubGroup: newItem.menuSubGroup.trim() || undefined,
      requiresIdVerification: newItem.requiresIdVerification,
      components: newItemComponents.filter((component) => component.label.trim()),
      optionGroups: isPizza ? [...optionGroups, ...newItemOptionGroups] : newItemOptionGroups,
    });

    createdItem = applyMenuAvailabilityMode(createdItem, availabilityMode);
    createdItem = mergeItemDescriptionWithComponents(createdItem, true);

    updateMenuSections((current) =>
      current.map((section) =>
        section.id === newItem.sectionId ? { ...section, items: [...section.items, createdItem] } : section,
      ),
    );
    setIsCreatingNewItem(false);
    setSelectedCategoryId(newItem.sectionId);
    setSelectedItemId(createdItem.id);
    setShowChoiceSetupForItemId(isPizza ? null : createdItem.id);
    setNewItem((current) => ({
      ...initialCreateItemState,
      sectionId: current.sectionId,
    }));
    setPizzaSizeRows(createInitialPizzaSizeRows());
    setNewItemComponents([]);
    setNewItemOptionGroups([]);
    setMenuNotice(
      availabilityMode === "hidden"
        ? `Added ${createdItem.name} as Hidden — saving to your hub. Switch to Live when ready, then publish.`
        : `Added ${createdItem.name} as Live — saving to your hub. Publish when customers should see it.`,
    );
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

    updateItem(selectedCategory.id, selectedItem.id, (current) => {
      if (kind === "pizza" && isHubMenuSectionPizza(selectedCategory)) {
        return mergeMenuTemplateWithExistingSizes(current, kind);
      }
      const template = buildMenuTemplate(kind);
      return {
        ...current,
        components: template.components,
        optionGroups: template.optionGroups,
      };
    });
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
    setIsCreatingNewItem(false);
    setShowChoiceSetupForItemId(null);
    setMenuNotice(
      `Duplicated "${item.name}". Change the name and price — saved as Live unless you set Hidden on the row.`,
    );
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
      const message = friendlyCaughtError(error, "menu_import");
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
      const message = friendlyCaughtError(error, "menu_import");
      setMenuNotice(message);
    }
  };

  const handleApplyImport = async (importId: string) => {
    if (!merchantToken || !activeHubId) {
      return;
    }

    try {
      const workspace = await applyMenuImport(merchantToken, activeHubId, importId, selectedImportCandidateIds);
      setMenuSections(ensureStaffMenuSections(workspace.menuSections));
      setEditingMenuBoardId(null);
      setPendingImports(workspace.pendingImports ?? []);
      setSelectedImportCandidateIds([]);
      setMenuNotice(
        "Import applied as Live items — saving to your hub. Set any row to Hidden if needed, then publish when ready.",
      );
    } catch (error) {
      const message = friendlyCaughtError(error, "menu_import");
      setMenuNotice(message);
    }
  };

  if (bootStatus !== "hub") {
    return (
      <main style={pageShell}>
        <section style={loginHero}>
          <section style={loginPanel}>
            <h1 style={panelTitle}>{t("auth.loginTitle")}</h1>
            {bootStatus === "checking" ? (
              <p style={{ marginTop: 18, color: "#5c6573", fontWeight: 750, lineHeight: 1.5 }}>{t("auth.restoringSession")}</p>
            ) : (
              <>
                {loginView === "sign_in" ? (
                  <>
                    <p style={{ marginTop: 12, color: "#5c6573", fontWeight: 700, lineHeight: 1.45 }}>{t("auth.signInPersistCopy")}</p>
                    <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
                      <label style={field}>
                        <span style={darkFieldLabel}>{t("auth.emailOrUsername")}</span>
                        <input
                          style={lightInput}
                          value={loginUsername}
                          onChange={(event) => setLoginUsername(event.target.value)}
                          autoComplete="username email"
                          disabled={isLoggingIn}
                        />
                      </label>
                      <label style={field}>
                        <span style={darkFieldLabel}>{t("auth.password")}</span>
                        <span style={passwordFieldWrap}>
                          <input
                            type={showLoginPassword ? "text" : "password"}
                            style={{ ...lightInput, paddingRight: 88 }}
                            value={loginPassword}
                            onChange={(event) => setLoginPassword(event.target.value)}
                            autoComplete="current-password"
                            disabled={isLoggingIn}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void handleLogin();
                              }
                            }}
                          />
                          <button type="button" style={passwordRevealButton} onClick={() => setShowLoginPassword((current) => !current)}>
                            {showLoginPassword ? t("auth.hide") : t("auth.show")}
                          </button>
                        </span>
                      </label>
                      <button type="button" style={primaryButton} onClick={() => void handleLogin()} disabled={isLoggingIn}>
                        {isLoggingIn ? t("auth.openingHub") : t("auth.openHub")}
                      </button>
                      <button
                        type="button"
                        style={{ ...secondaryButton, justifyContent: "center" }}
                        onClick={() => {
                          setLoginView("forgot_password");
                          setResetEmail((current) => current || loginUsername.trim());
                          setResetNotice("");
                          setResetCode("");
                          setResetCodePreview("");
                          setResetCodeVerified(false);
                        }}
                      >
                        {t("auth.forgotPassword")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ marginTop: 12, color: "#5c6573", fontWeight: 700, lineHeight: 1.45 }}>{t("auth.resetFlowCopy")}</p>
                    <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
                      <label style={field}>
                        <span style={darkFieldLabel}>{t("auth.hubLoginEmail")}</span>
                        <input
                          style={lightInput}
                          type="email"
                          value={resetEmail}
                          onChange={(event) => setResetEmail(event.target.value)}
                          autoComplete="email"
                          disabled={isSubmittingReset}
                        />
                      </label>
                      <button type="button" style={primaryButton} onClick={() => void handleRequestPasswordReset()} disabled={isSubmittingReset}>
                        {isSubmittingReset ? t("auth.requestingCode") : t("auth.sendResetCode")}
                      </button>
                      <label style={field}>
                        <span style={darkFieldLabel}>{t("auth.sixDigitCode")}</span>
                        <input
                          style={lightInput}
                          inputMode="numeric"
                          maxLength={6}
                          value={resetCode}
                          onChange={(event) => setResetCode(event.target.value.replace(/\D+/g, "").slice(0, 6))}
                          disabled={isSubmittingReset}
                        />
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                        <button type="button" style={secondaryButton} onClick={() => void handleVerifyPasswordReset()} disabled={isSubmittingReset}>
                          {t("auth.verifyCode")}
                        </button>
                        <button
                          type="button"
                          style={primaryButton}
                          onClick={() => void handleCompletePasswordReset()}
                          disabled={isSubmittingReset || !resetCodeVerified}
                        >
                          {t("auth.resetLogin")}
                        </button>
                      </div>
                      <button
                        type="button"
                        style={{ ...secondaryButton, justifyContent: "center" }}
                        onClick={() => {
                          setLoginView("sign_in");
                          setResetNotice("");
                        }}
                      >
                        {t("auth.backToSignIn")}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {loginError ? <p className="he-hub-banner he-hub-banner--error">{loginError}</p> : null}
            {resetNotice ? <p className="he-hub-banner">{resetNotice}</p> : null}
            {resetCodePreview && loginView === "forgot_password" ? (
              <p className="he-hub-banner">Preview code: {resetCodePreview}</p>
            ) : null}
          </section>
        </section>
      </main>
    );
  }

  const saveHubButtonStyle = hasUnsavedHubChanges
    ? { ...primaryButton, ...saveHubButtonDirtyStyle }
    : primaryButton;
  const showWorkspaceHero = activeHubSection === "home";
  const showHeaderSaveButton = activeHubSection === "home";
  const showUnsavedBanner = activeHubSection === "home" && hasUnsavedHubChanges;
  const showSectionFooterSave =
    hubAccess?.canEditWorkspace &&
    (activeHubSection === "businessProfile" ||
      activeHubSection === "availability" ||
      activeHubSection === "deliveryRanges" ||
      activeHubSection === "settings");

  const handleRestoreConfigBackup = (workspace: { settings: HubSettings; menuSections: HubMenuSection[] }) => {
    const settings = normalizeWorkspaceSettings(workspace.settings);
    setHubSettings(settings);
    setMenuSections(ensureStaffMenuSections(workspace.menuSections));
    setEditingMenuBoardId(null);
    commitSavedHubSnapshot(settings, workspace.menuSections);
    setSaveNotice(t("settings.backupRestored"));
  };

  return (
    <main className="hub-app-shell" style={hubAppShell}>
      {mobileNavOpen ? (
        <button
          type="button"
          className="hub-sidebar-backdrop"
          aria-label={t("nav.closeNavigation")}
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <div className="hub-mobile-bar">
        <button
          type="button"
          className="hub-mobile-home-btn"
          onClick={() => {
            setMobileNavOpen(false);
            openHubSection("home");
          }}
        >
          {hubSettings.name || t("common.merchantHubFallback")}
        </button>
        <div className="hub-mobile-bar-actions">
          <button type="button" className="hub-mobile-sign-out" style={secondaryButtonCompact} onClick={handleSignOut}>
            {t("common.signOut")}
          </button>
          <button type="button" className="hub-nav-toggle" onClick={() => setMobileNavOpen(true)}>
            {t("common.menu")}
          </button>
        </div>
      </div>
      <aside className={`hub-sidebar${mobileNavOpen ? " is-open" : ""}`}>
        <div style={sidebarBrand}>
          <span style={sidebarMark}>HE</span>
          <span>
            <strong>{hubSettings.name || t("common.merchantHubFallback")}</strong>
            <small>{describeStoreOpeningStatus(hubSettings.openingHours, hubSettings.isOpen, hubSettings.acceptingOrders)}</small>
          </span>
        </div>

        <nav style={sidebarNav} aria-label={t("nav.hubNavigation")}>
          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>{t("nav.groupHome")}</span>
            <button type="button" style={activeHubSection === "home" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("home")}>
              {t("nav.dashboard")}
            </button>
          </div>

          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>{t("nav.groupOrders")}</span>
            <button type="button" style={activeHubSection === "orders" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("orders")}>
              {t("nav.liveOrders")}
            </button>
            <button type="button" style={activeHubSection === "drivers" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("drivers")}>
              {t("nav.driversCashUp")}
            </button>
            <button type="button" style={activeHubSection === "orderHistory" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("orderHistory")}>
              {t("nav.orderHistory")}
            </button>
          </div>

          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>{t("nav.groupPerformance")}</span>
            <button type="button" style={activeHubSection === "earnings" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("earnings")}>
              {t("nav.earnings")}
            </button>
            <button type="button" style={activeHubSection === "reports" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("reports")}>
              {t("nav.reports")}
            </button>
          </div>

          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>{t("nav.groupMenuManagement")}</span>
            <button type="button" style={activeHubSection === "menu" && activeHubPanel === "menu" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("menu")}>
              {t("nav.menuBuilder")}
            </button>
            <button
              type="button"
              style={activeHubSection === "menu" && activeHubPanel === "import" ? sidebarButtonActive : sidebarButton}
              onClick={() => {
                setMobileNavOpen(false);
                setActiveHubSection("menu");
                setActiveHubPanel("import");
              }}
            >
              {t("nav.pasteMenu")}
            </button>
            <button type="button" style={activeHubSection === "offers" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("offers")}>
              {t("nav.offersDeals")}
            </button>
          </div>

          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>{t("nav.groupBusiness")}</span>
            <button type="button" style={activeHubSection === "businessProfile" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("businessProfile")}>
              {t("nav.businessProfile")}
            </button>
            <button type="button" style={activeHubSection === "availability" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("availability")}>
              {t("nav.openingTimes")}
            </button>
            <button type="button" style={activeHubSection === "deliveryRanges" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("deliveryRanges")}>
              {t("nav.deliveryRanges")}
            </button>
            <button type="button" style={activeHubSection === "settings" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("settings")}>
              {t("nav.settings")}
            </button>
            <button type="button" style={activeHubSection === "users" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("users")}>
              {t("nav.users")}
            </button>
          </div>

          {activeHubSlug ? (
            <div style={sidebarGroup}>
              <span style={sidebarGroupTitle}>{t("nav.groupKiosk")}</span>
              <a
                href={`${customerWebBaseUrl}/stores/${activeHubSlug}/kiosk`}
                target="_blank"
                rel="noreferrer"
                style={sidebarLink}
                onClick={() => setMobileNavOpen(false)}
              >
                {t("nav.selfServiceKiosk")}
              </a>
              <a
                href={`${customerWebBaseUrl}/stores/${activeHubSlug}/kiosk?launch=1`}
                target="_blank"
                rel="noreferrer"
                style={sidebarLink}
                onClick={() => setMobileNavOpen(false)}
              >
                {t("nav.launchKiosk")}
              </a>
            </div>
          ) : null}

          <button type="button" style={activeHubSection === "help" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("help")}>
            {t("nav.helpSupport")}
          </button>
        </nav>
      </aside>

      <section className="hub-main-area">
        <header className={`hub-main-header${showWorkspaceHero ? " is-home" : ""}`} style={hubMainHeader}>
          {!showWorkspaceHero ? (
            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ color: "#101216", fontSize: "1rem" }}>{hubSettings.name || t("common.merchantHubFallback")}</strong>
              <span style={subtleInfo}>
                {describeStoreOpeningStatus(hubSettings.openingHours, hubSettings.isOpen, hubSettings.acceptingOrders)}
              </span>
            </div>
          ) : (
            <div aria-hidden="true" />
          )}

          <div className="hub-main-header-actions" style={{ display: "grid", gap: 12, justifyItems: "start" }}>
            {activeUser ? (
              <span style={activeUserChip}>
                {activeUser.fullName} / {hubRoleLabel(activeUser.role)}
              </span>
            ) : null}
            <button type="button" className="hub-desktop-sign-out" style={secondaryButton} onClick={handleSignOut}>
              {t("common.signOut")}
            </button>
          </div>
        </header>

        {showWorkspaceHero ? (
          <section style={workspaceHeroCard}>
            <div style={{ display: "grid", gap: 8 }}>
              <p style={eyebrow}>{t("common.hubWorkspace")}</p>
              <h1 style={hubTitle}>{hubSettings.name || t("common.merchantHubFallback")}</h1>
              <p style={heroCopy}>{t("common.heroCopy")}</p>
            </div>
            {showHeaderSaveButton ? (
              <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
                <button
                  type="button"
                  className={hasUnsavedHubChanges ? "he-portal-primary is-dirty" : "he-portal-primary"}
                  style={saveHubButtonStyle}
                  onClick={handleSaveHub}
                  disabled={!hubAccess?.canEditWorkspace}
                >
                  {hasUnsavedHubChanges ? t("common.saveHubChangesDirty") : t("common.saveHubChanges")}
                </button>
                <span style={subtleInfo}>{t("dashboard.dashboardSaveHint")}</span>
              </div>
            ) : null}
          </section>
        ) : null}

        {showUnsavedBanner ? (
          <div className="he-hub-banner he-hub-banner--row he-unsaved-banner" role="status" aria-live="polite">
            <div>
              <strong>{t("common.unsavedChanges")}</strong>
              <p>{t("common.unsavedBannerCopy")}</p>
            </div>
            <button type="button" style={saveHubButtonStyle} onClick={handleSaveHub} disabled={!hubAccess?.canEditWorkspace}>
              {t("common.saveNow")}
            </button>
          </div>
        ) : null}

        {hubAccess && !hubAccess.canEditWorkspace ? (
          <p className="he-hub-banner" role="status">
            {t("common.viewOnlyHub")}
          </p>
        ) : null}

        {saveNotice ? (
          <HubTransientBanner
            message={saveNotice}
            onDismiss={() => setSaveNotice("")}
            variant={/fail|error|could not/i.test(saveNotice) ? "error" : "success"}
          />
        ) : null}
        {(activeHubSection === "menu" ||
          activeHubSection === "businessProfile" ||
          activeHubSection === "availability" ||
          activeHubSection === "deliveryRanges" ||
          activeHubSection === "settings") &&
        menuNotice ? (
          <HubTransientBanner message={menuNotice} onDismiss={() => setMenuNotice("")} />
        ) : null}
        {activeHubSection === "users" && userNotice ? (
          <HubTransientBanner message={userNotice} onDismiss={() => setUserNotice("")} />
        ) : null}
        {activeHubSection === "users" && passwordNotice ? (
          <HubTransientBanner message={passwordNotice} onDismiss={() => setPasswordNotice("")} />
        ) : null}
        {(activeHubSection === "orders" || activeHubSection === "orderHistory") && orderNotice ? (
          <HubTransientBanner message={orderNotice} onDismiss={() => setOrderNotice("")} />
        ) : null}
        {activeHubSection === "drivers" && driverNotice ? (
          <HubTransientBanner message={driverNotice} onDismiss={() => setDriverNotice("")} />
        ) : null}
        {activeHubSection === "offers" && offersNotice ? (
          <HubTransientBanner message={offersNotice} onDismiss={() => setOffersNotice("")} />
        ) : null}

        {activeHubSection === "home" ? (
          <section className="he-dashboard-grid" style={dashboardGrid}>
            <article style={dashboardHeroCard}>
              <p style={eyebrowDark}>{t("dashboard.today")}</p>
              <h2 style={sectionTitle}>{t("dashboard.readyForService")}</h2>
              <p style={panelCopyDark}>
                {t("dashboard.readyCopy", { activeItems: menuStats.activeItems, categories: menuStats.categories })}
              </p>
              <div className="he-section-actions" style={sectionActionRow}>
                <button type="button" style={primaryButton} onClick={() => openHubSection("menu")}>
                  {t("dashboard.editMenu")}
                </button>
                <button type="button" style={secondaryButton} onClick={() => openHubSection("orders")}>
                  {t("dashboard.viewOrders")}
                </button>
              </div>
            </article>
            <article style={dashboardCard}>
              <span style={summaryLabel}>{t("dashboard.liveMenuItems")}</span>
              <strong style={summaryValue}>{menuStats.activeItems}</strong>
            </article>
            <article style={dashboardCard}>
              <span style={summaryLabel}>{t("dashboard.totalMenuItems")}</span>
              <strong style={summaryValue}>{menuStats.totalItems}</strong>
            </article>
            <article style={dashboardCard}>
              <span style={summaryLabel}>{t("dashboard.customisableItems")}</span>
              <strong style={summaryValue}>{menuStats.customisableItems}</strong>
            </article>
          </section>
        ) : null}

        {activeHubSection === "orders" ? (
          <section style={placeholderPanel}>
            <p style={eyebrowDark}>{t("orders.liveOrdersEyebrow")}</p>
            <div style={itemTopRow}>
              <div>
                <h2 style={sectionTitle}>{t("orders.incomingOrders")}</h2>
                <p style={panelCopyDark}>{t("orders.incomingCopy")}</p>
              </div>
              <button
                type="button"
                style={secondaryButton}
                onClick={() => {
                  void loadMerchantOrders(merchantToken, { silent: true }).then(() => {
                    setOrderNotice(t("orders.ordersUpdated"));
                  });
                }}
              >
                {t("orders.refreshOrders")}
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
                        {t("orders.awaitingResponseTimer", { seconds: hubSecondsLeft })}
                      </p>
                    ) : null}
                    {isPending && hubSecondsLeft === null ? (
                      <p style={{ ...panelCopyDark, marginTop: 8, fontWeight: 800 }}>
                        {t("orders.awaitingResponse")}
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
                          {t("orders.acceptOrder", { eta: hubSettings.etaMinutes })}
                        </button>
                        <button type="button" style={secondaryButtonSmall} onClick={() => void handleRejectMerchantOrder(order)}>
                          {t("orders.reject")}
                        </button>
                      </>
                    ) : null}
                    {hubAccess?.canOperateOrders ? (
                    <button type="button" style={secondaryButtonSmall} onClick={() => void handlePrintOrderReceipt(order)}>
                      {t("orders.printReceipt")}
                    </button>
                    ) : null}
                    <span style={orangeBadge}>£{order.totalAmount.toFixed(2)}</span>
                  </div>
                </article>
              );
              })}
              {merchantOrders.length === 0 ? <div style={emptyStateCard}>{t("orders.noOrders")}</div> : null}
            </div>
          </section>
        ) : null}

        {activeHubSection === "drivers" && merchantToken && activeHubId ? (
          <HubDriversWorkbench
            apiBaseUrl={apiBaseUrl}
            token={merchantToken}
            hubId={activeHubId}
            storeName={hubSettings.name || t("common.yourStore")}
            driverTracking={driverTracking}
            readOnly={!hubAccess?.canOperateOrders}
            onRefreshTracking={() => void loadDriverTracking()}
            onNotice={(message) => {
              setDriverNotice(message);
              window.setTimeout(() => setDriverNotice(""), 4500);
            }}
          />
        ) : null}

        {activeHubSection === "orderHistory" ? (
          <section style={placeholderPanel}>
            <p style={eyebrowDark}>{t("orders.orderHistoryEyebrow")}</p>
            <div style={itemTopRow}>
              <div>
                <h2 style={sectionTitle}>{t("orders.orderHistoryTitle")}</h2>
                <p style={panelCopyDark}>{t("orders.orderHistoryCopy")}</p>
              </div>
              <button
                type="button"
                style={secondaryButton}
                onClick={() => {
                  void loadMerchantOrderHistory(merchantToken, { silent: true }).then(() => {
                    setOrderNotice(t("orders.orderHistoryUpdated"));
                  });
                }}
              >
                {t("orders.refreshHistory")}
              </button>
            </div>
            <div style={orderListGrid}>
              {merchantOrderHistory.map((order) => (
                <article key={order.id} style={orderListCard}>
                  <div>
                    <strong style={orderNumberStyle}>{order.orderNumber}</strong>
                    <p style={panelCopyDark}>
                      {order.source.replaceAll("_", " ")} / {order.fulfillmentType} / {order.paymentStatus} / {order.paymentMethod.replaceAll("_", " ")}
                    </p>
                    <p style={{ ...panelCopyDark, marginTop: 8, fontWeight: 700 }}>{t("orders.placedAt", { date: formatOrderPlacedAt(order.placedAt) })}</p>
                  </div>
                  <div style={itemBadgeRow}>
                    <span style={darkBadge}>{order.status}</span>
                    {hubAccess?.canOperateOrders ? (
                      <button type="button" style={secondaryButtonSmall} onClick={() => void handlePrintOrderReceipt(order)}>
                        {t("orders.printReceipt")}
                      </button>
                    ) : null}
                    <span style={orangeBadge}>£{order.totalAmount.toFixed(2)}</span>
                  </div>
                </article>
              ))}
              {merchantOrderHistory.length === 0 ? <div style={emptyStateCard}>{t("orders.noHistory")}</div> : null}
            </div>
          </section>
        ) : null}

        {activeHubSection === "earnings" ? (
          <section style={placeholderPanel}>
            <p style={eyebrowDark}>{t("nav.earnings")}</p>
            <h2 style={sectionTitle}>{t("dashboard.earningsTitle")}</h2>
            <p style={panelCopyDark}>{t("dashboard.earningsCopy")}</p>
          </section>
        ) : null}

        {activeHubSection === "reports" ? (
          <section style={placeholderPanel}>
            <p style={eyebrowDark}>{t("nav.reports")}</p>
            <h2 style={sectionTitle}>{t("dashboard.reportsTitle")}</h2>
            <p style={panelCopyDark}>{t("dashboard.reportsCopy")}</p>
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
              <p style={eyebrowDark}>{t("help.helpSupportEyebrow")}</p>
              <h2 style={sectionTitle}>{t("help.helpSupportTitle")}</h2>
              <p style={panelCopyDark}>{t("help.helpSupportIntro")}</p>
            </article>
            <article style={dashboardCard}>
              <span style={summaryLabel}>{t("menu.menuCategories")}</span>
              <strong style={summaryValue}>{menuStats.categories}</strong>
            </article>
            <article style={dashboardCard}>
              <span style={summaryLabel}>{t("help.usersLabel")}</span>
              <strong style={summaryValue}>{hubUsers.length}</strong>
            </article>
            <article style={{ ...dashboardCard, gridColumn: "1 / -1", display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={summaryLabel}>{t("help.replyContact")}</span>
                <div style={{ color: "#dce9ff", fontWeight: 700 }}>{activeUser?.email || activeUser?.username || t("help.signedInUserFallback")}</div>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={summaryLabel}>{t("help.phone")}</span>
                  <input style={lightInput} value={supportPhone} onChange={(event) => setSupportPhone(event.target.value)} placeholder={t("common.optional")} />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={summaryLabel}>{t("help.orderNumber")}</span>
                  <input
                    style={lightInput}
                    value={supportOrderNumber}
                    onChange={(event) => setSupportOrderNumber(event.target.value)}
                    placeholder={t("common.optional")}
                  />
                </label>
              </div>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={summaryLabel}>{t("help.subject")}</span>
                <input
                  style={lightInput}
                  value={supportSubject}
                  onChange={(event) => setSupportSubject(event.target.value)}
                  placeholder={t("help.subjectPlaceholder")}
                />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={summaryLabel}>{t("help.message")}</span>
                <textarea
                  style={{ ...lightInput, minHeight: 160, padding: 14, resize: "vertical" }}
                  value={supportMessage}
                  onChange={(event) => setSupportMessage(event.target.value)}
                  placeholder={t("help.messagePlaceholder")}
                />
              </label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" style={primaryButton} disabled={supportSending} onClick={() => void handleSubmitSupportMessage()}>
                  {supportSending ? t("help.sending") : t("help.sendSupport")}
                </button>
                <span style={{ color: "#9fb2c9", lineHeight: 1.6 }}>
                  {t("help.supportInboxCopy", { hubName: hubSettings.name || t("common.yourHubFallback") })}
                </span>
              </div>
              {supportNotice ? <p style={{ margin: 0, color: "#dce9ff", lineHeight: 1.6 }}>{supportNotice}</p> : null}
            </article>
          </section>
        ) : null}

        {activeHubSection === "menu" ||
        activeHubSection === "businessProfile" ||
        activeHubSection === "availability" ||
        activeHubSection === "deliveryRanges" ||
        activeHubSection === "settings" ||
        activeHubSection === "users" ? (
        <section style={workbenchShell}>
          {activeHubSection === "menu" ? (
            <div style={workbenchNav}>
              <button type="button" style={activeHubPanel === "menu" ? workbenchTabActive : workbenchTab} onClick={() => setActiveHubPanel("menu")}>
                {t("nav.menuBuilder")}
              </button>
              <button type="button" style={activeHubPanel === "import" ? workbenchTabActive : workbenchTab} onClick={() => setActiveHubPanel("import")}>
                {t("nav.pasteOrUploadMenu")}
              </button>
            </div>
          ) : null}

          {activeHubPanel === "menu" ? (
            <HubMenuStudio
              menuSections={menuSections}
              selectedCategory={selectedCategory}
              selectedItem={selectedItem}
              selectedItemId={selectedItemId}
              isCreatingNewItem={isCreatingNewItem}
              newCategory={newCategory}
              newItem={newItem}
              pizzaSizeRows={pizzaSizeRows}
              newItemComponents={newItemComponents}
              onNewItemComponentsChange={setNewItemComponents}
              newItemOptionGroups={newItemOptionGroups}
              onNewItemOptionGroupsChange={setNewItemOptionGroups}
              hasUnsavedHubChanges={hasUnsavedHubChanges}
              menuHubPersistState={menuHubPersistState}
              hubSettings={hubSettings}
              menuPreviewOpen={menuPreviewOpen}
              onOpenMenuPreview={() => setMenuPreviewOpen(true)}
              onCloseMenuPreview={() => setMenuPreviewOpen(false)}
              storeSlug={activeHubSlug}
              customerWebBaseUrl={customerWebBaseUrl}
              categoryPresetOptions={HUB_CATEGORY_PRESET_OPTIONS}
              onReorderCategory={handleReorderCategory}
              onNewCategoryPresetChange={handleNewCategoryPresetChange}
              onNewCategoryChange={(patch) => setNewCategory((current) => ({ ...current, ...patch }))}
              onNewItemChange={(patch) => setNewItem((current) => ({ ...current, ...patch }))}
              onPizzaSizeRowsChange={setPizzaSizeRows}
              onSelectCategory={(sectionId) => {
                setIsCreatingNewItem(false);
                setSelectedCategoryId(sectionId);
                const section = menuSections.find((s) => s.id === sectionId);
                const isStaff = section ? isHubMenuStaffLibrarySection(section) : false;
                setSelectedItemId(isStaff ? "" : (section?.items[0]?.id ?? ""));
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
              onSaveDraft={() => void handleSaveDraft()}
              onRequestPublish={handleRequestPublishMenu}
              extrasSection={extrasSection}
              onAddExtraTopping={(item) => {
                if (!extrasSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) =>
                    section.id === extrasSection.id ? { ...section, items: [...section.items, item] } : section,
                  ),
                );
              }}
              onRemoveExtraTopping={(itemId) => {
                if (!extrasSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) =>
                    section.id === extrasSection.id
                      ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
                      : section,
                  ),
                );
              }}
              saucesSection={saucesSection}
              onAddSauce={(item) => {
                if (!saucesSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) =>
                    section.id === saucesSection.id ? { ...section, items: [...section.items, item] } : section,
                  ),
                );
              }}
              onRemoveSauce={(itemId) => {
                if (!saucesSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) =>
                    section.id === saucesSection.id
                      ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
                      : section,
                  ),
                );
              }}
              burgerPartsSection={burgerPartsSection}
              kebabPartsSection={kebabPartsSection}
              onAddBurgerPart={(item) => {
                if (!burgerPartsSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) =>
                    section.id === burgerPartsSection.id ? { ...section, items: [...section.items, item] } : section,
                  ),
                );
              }}
              onRemoveBurgerPart={(itemId) => {
                if (!burgerPartsSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) =>
                    section.id === burgerPartsSection.id
                      ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
                      : section,
                  ),
                );
              }}
              onAddKebabPart={(item) => {
                if (!kebabPartsSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) =>
                    section.id === kebabPartsSection.id ? { ...section, items: [...section.items, item] } : section,
                  ),
                );
              }}
              onRemoveKebabPart={(itemId) => {
                if (!kebabPartsSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) =>
                    section.id === kebabPartsSection.id
                      ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
                      : section,
                  ),
                );
              }}
              onUpdateBurgerPartsSection={(updater) => {
                if (!burgerPartsSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) => (section.id === burgerPartsSection.id ? updater(section) : section)),
                );
              }}
              onUpdateKebabPartsSection={(updater) => {
                if (!kebabPartsSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) => (section.id === kebabPartsSection.id ? updater(section) : section)),
                );
              }}
              mealSection={mealSection}
              onAddMealTemplate={(item) => {
                if (!mealSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) =>
                    section.id === mealSection.id ? { ...section, items: [...section.items, item] } : section,
                  ),
                );
              }}
              onUpdateMealTemplate={(itemId, updater) => {
                if (!mealSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) =>
                    section.id === mealSection.id
                      ? {
                          ...section,
                          items: section.items.map((item) => (item.id === itemId ? updater(item) : item)),
                        }
                      : section,
                  ),
                );
              }}
              onRemoveMealTemplate={(itemId) => {
                if (!mealSection) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) =>
                    section.id === mealSection.id
                      ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
                      : section,
                  ),
                );
              }}
              publishDialogOpen={menuPublishDialogOpen}
              publishSummary={menuPublishSummary}
              menuPublishing={menuPublishing}
              onCancelPublish={() => setMenuPublishDialogOpen(false)}
              onConfirmPublish={() => void handleSaveHub()}
              menuBoards={menuBoards}
              editingMenuBoardId={editingMenuBoardId}
              onSelectMainMenu={handleSelectMainMenu}
              onSelectMenuBoard={handleSelectMenuBoard}
              onCreateMenuBoard={handleCreateMenuBoard}
              onUpdateMenuBoardPublishMode={handleUpdateMenuBoardPublishMode}
              onRenameMenuBoard={handleRenameMenuBoard}
              onOpenImport={() => setActiveHubPanel("import")}
              onUpdateSectionField={(field, value) => {
                if (selectedCategory) {
                  updateSection(selectedCategory.id, field, String(value ?? ""));
                }
              }}
              onPatchSelectedCategory={(updater) => {
                if (!selectedCategory) {
                  return;
                }
                updateMenuSections((current) =>
                  current.map((section) => (section.id === selectedCategory.id ? updater(section) : section)),
                );
              }}
              onUpdateItem={(updater) => {
                if (selectedCategory && selectedItemId) {
                  updateItem(selectedCategory.id, selectedItemId, updater);
                }
              }}
              onOpenPartsOptionSettings={() => openPartsOptionSettings()}
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
              <div style={panelHeader}>
                <p style={eyebrowDark}>{t("nav.businessProfile")}</p>
                <h2 style={sectionTitle}>{t("settings.storefrontBusinessDetails")}</h2>
                <p style={panelCopyDark}>{t("settings.businessProfileCopy")}</p>
              </div>
              <div className="he-two-col" style={twoColumnGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>{t("settings.businessName")}</span>
                  <input style={lightInput} value={hubSettings.name} onChange={(event) => handleHubFieldChange("name", event.target.value)} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>{t("settings.cuisineLabel")}</span>
                  <input style={lightInput} value={hubSettings.cuisineLabel} onChange={(event) => handleHubFieldChange("cuisineLabel", event.target.value)} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>{t("settings.city")}</span>
                  <input style={lightInput} value={hubSettings.city} onChange={(event) => handleHubFieldChange("city", event.target.value)} />
                </label>
                <label style={{ ...field, gridColumn: "1 / -1" }}>
                  <span style={darkFieldLabel}>{t("settings.marketplaceDescription")}</span>
                  <textarea
                    style={{ ...lightInput, minHeight: 110, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                    value={hubSettings.onboardingMessage}
                    onChange={(event) => handleHubFieldChange("onboardingMessage", event.target.value)}
                  />
                </label>
                <HubStorefrontImageField value={hubSettings.heroImageUrl} onChange={(next) => handleHubFieldChange("heroImageUrl", next)} />
              </div>
            </section>
          ) : null}

          {activeHubPanel === "deliveryRanges" ? (
            <section style={compactEditorCard}>
              <div style={panelHeader}>
                <p style={eyebrowDark}>{t("nav.deliveryRanges")}</p>
                <h2 style={sectionTitle}>{t("delivery.deliveryCoverageShortTitle")}</h2>
                <p style={panelCopyDark}>{t("delivery.deliveryCoverageShortCopy")}</p>
              </div>
              <div className="he-two-col" style={twoColumnGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>{t("delivery.shopPostcode")}</span>
                  <input
                    style={lightInput}
                    value={hubSettings.postcode}
                    onChange={(event) => handleHubFieldChange("postcode", event.target.value)}
                    placeholder={t("delivery.shopPostcodePlaceholder")}
                  />
                  <p style={subtleInfo}>{t("delivery.shopPostcodeHint")}</p>
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
                  readOnly={!hubAccess?.canEditWorkspace}
                />
              </div>
            </section>
          ) : null}

          {activeHubPanel === "availability" ? (
            <section style={compactEditorCard}>
              <div style={panelHeader}>
                <p style={eyebrowDark}>{t("delivery.openingTimesTitle")}</p>
                <h2 style={sectionTitle}>{t("settings.storefrontAvailability")}</h2>
                <p style={panelCopyDark}>{t("delivery.openingTimesHint")}</p>
              </div>

              <HubOpeningHoursEditor
                openingHours={hubSettings.openingHours}
                readOnly={!hubAccess?.canEditWorkspace}
                onChange={(openingHours) => handleHubFieldChange("openingHours", openingHours)}
              />

              <div className="he-two-col" style={{ ...twoColumnGrid, marginTop: 18 }}>
                <label style={field}>
                  <span style={darkFieldLabel}>{t("settings.acceptingOrders")}</span>
                  <select
                    style={lightInput}
                    value={hubSettings.acceptingOrders ? "accepting" : "paused"}
                    onChange={(event) => handleHubFieldChange("acceptingOrders", event.target.value === "accepting")}
                  >
                    <option value="accepting">{t("settings.acceptingNow")}</option>
                    <option value="paused">{t("settings.pausedStopOrders")}</option>
                  </select>
                  <p style={subtleInfo}>{t("settings.acceptingOrdersHint")}</p>
                </label>
                <div style={field}>
                  <span style={darkFieldLabel}>{t("settings.listedOnHullEats")}</span>
                  <p style={{ ...lightInput, margin: 0, padding: "12px 14px" }}>
                    {hubSettings.isOpen ? t("settings.listedLive") : t("settings.listedHidden")}
                  </p>
                  <p style={subtleInfo}>{t("settings.listedOnHullEatsHint")}</p>
                </div>
              </div>
            </section>
          ) : null}

          {activeHubPanel === "settings" ? (
            <section style={compactEditorCard}>
              <div style={panelHeader}>
                <p style={eyebrowDark}>{t("settings.storeSettings")}</p>
                <h2 style={sectionTitle}>{t("settings.operationsBackups")}</h2>
                <p style={panelCopyDark}>{t("settings.operationsBackupsCopy")}</p>
              </div>
              {burgerPartsSection || kebabPartsSection ? (
                <HubMenuPartsSettingsWorkbench
                  burgerPartsSection={burgerPartsSection}
                  kebabPartsSection={kebabPartsSection}
                  initialLine={partsOptionSettingsLine}
                  readOnly={!hubAccess?.canEditWorkspace}
                  onUpdateBurgerPartsSection={(updater) => {
                    if (!burgerPartsSection) {
                      return;
                    }
                    updateMenuSections((current) =>
                      current.map((section) => (section.id === burgerPartsSection.id ? updater(section) : section)),
                    );
                  }}
                  onUpdateKebabPartsSection={(updater) => {
                    if (!kebabPartsSection) {
                      return;
                    }
                    updateMenuSections((current) =>
                      current.map((section) => (section.id === kebabPartsSection.id ? updater(section) : section)),
                    );
                  }}
                  onRemoveBurgerPart={(itemId) => {
                    if (!burgerPartsSection) {
                      return;
                    }
                    updateMenuSections((current) =>
                      current.map((section) =>
                        section.id === burgerPartsSection.id
                          ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
                          : section,
                      ),
                    );
                  }}
                  onRemoveKebabPart={(itemId) => {
                    if (!kebabPartsSection) {
                      return;
                    }
                    updateMenuSections((current) =>
                      current.map((section) =>
                        section.id === kebabPartsSection.id
                          ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
                          : section,
                      ),
                    );
                  }}
                />
              ) : null}

              <div className="he-two-col" style={{ ...twoColumnGrid, marginTop: burgerPartsSection || kebabPartsSection ? 28 : 0 }}>
                <label style={field}>
                  <span style={darkFieldLabel}>{t("settings.deliveryEta")}</span>
                  <input type="number" min={1} style={lightInput} value={hubSettings.etaMinutes} onChange={(event) => handleHubFieldChange("etaMinutes", Math.max(1, Number(event.target.value) || 1))} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>{t("settings.minimumOrder")}</span>
                  <input type="number" step="0.01" style={lightInput} value={hubSettings.minimumOrderAmount} onChange={(event) => handleHubFieldChange("minimumOrderAmount", Number(event.target.value) || 0)} />
                </label>
                <label style={{ display: "flex", gridColumn: "1 / -1", gap: 12, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={hubSettings.autoAcceptOrders}
                    onChange={(event) => handleHubFieldChange("autoAcceptOrders", event.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={darkFieldLabel}>{t("settings.autoAcceptOrders")}</span>
                </label>
                {hubSettings.autoAcceptOrders ? (
                  <label style={field}>
                    <span style={darkFieldLabel}>{t("settings.autoAcceptMaxPrep")}</span>
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
              <div style={panelHeader}>
                <p style={eyebrowDark}>{t("nav.users")}</p>
                <h2 style={sectionTitle}>{t("users.usersPasswordTitle")}</h2>
                <p style={panelCopyDark}>{t("users.usersPasswordCopy")}</p>
              </div>
              <div style={quickAddGrid}>
                <div style={quickAddCard}>
                  <h3 style={quickAddTitle}>{t("users.accountSettings")}</h3>
                  <label style={field}>
                    <span style={darkFieldLabel}>{t("common.portalLanguage")}</span>
                    <select
                      style={lightInput}
                      value={locale}
                      disabled={localeSaving}
                      onChange={(event) => void handlePreferredLocaleChange(event.target.value as HubPortalLocale)}
                    >
                      {HUB_PORTAL_LOCALE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {formatHubPortalLocaleOptionLabel(option)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p style={subtleInfo}>{t("common.portalLanguageHint")}</p>
                </div>
                <div style={quickAddCard}>
                  <h3 style={quickAddTitle}>{t("users.changePassword")}</h3>
                  <button type="button" style={secondaryButtonSmall} onClick={() => setShowAccountPasswords((current) => !current)}>
                    {showAccountPasswords ? t("common.hidePasswords") : t("common.showPasswords")}
                  </button>
                  <input type={showAccountPasswords ? "text" : "password"} style={lightInput} value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} placeholder={t("users.currentPassword")} />
                  <input type={showAccountPasswords ? "text" : "password"} style={lightInput} value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} placeholder={t("users.newPassword")} />
                  <input type={showAccountPasswords ? "text" : "password"} style={lightInput} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder={t("users.confirmPassword")} />
                  <button type="button" onClick={handleChangePassword} style={primaryButton}>
                    {t("users.changePassword")}
                  </button>
                </div>
                <div style={quickAddCard}>
                  <h3 style={quickAddTitle}>{t("users.hubUsers")}</h3>
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
          {showSectionFooterSave ? (
            <div style={sectionFooterSave}>
              <div style={{ display: "grid", gap: 4 }}>
                <strong style={{ color: "#101216" }}>{t("common.saveTheseHubChanges")}</strong>
                <span style={subtleInfo}>{t("common.saveTheseHubChangesHint")}</span>
              </div>
              <button type="button" style={saveHubButtonStyle} onClick={handleSaveHub} disabled={!hubAccess?.canEditWorkspace}>
                {hasUnsavedHubChanges ? t("common.saveHubChangesDirty") : t("common.saveHubChanges")}
              </button>
            </div>
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
                  <button type="button" style={primaryButton} onClick={() => handleCreateItem()}>
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
                  <span style={darkFieldLabel}>Accepting orders</span>
                  <select
                    style={lightInput}
                    value={hubSettings.acceptingOrders ? "accepting" : "paused"}
                    onChange={(event) => handleHubFieldChange("acceptingOrders", event.target.value === "accepting")}
                  >
                    <option value="accepting">Accepting orders now</option>
                    <option value="paused">Paused — hide store and stop new orders</option>
                  </select>
                </label>
                <div style={field}>
                  <span style={darkFieldLabel}>Listed on Hull Eats</span>
                  <p style={{ ...lightInput, margin: 0, padding: "12px 14px" }}>
                    {hubSettings.isOpen ? "Live — visible on marketplace" : "Hidden — not listed on marketplace yet"}
                  </p>
                  <p style={subtleInfo}>Marketplace listing is managed by Hull Eats admin.</p>
                </div>
                <label style={{ ...field, gridColumn: "1 / -1" }}>
                  <span style={darkFieldLabel}>Marketplace description</span>
                  <textarea
                    style={{ ...lightInput, minHeight: 110, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                    value={hubSettings.onboardingMessage}
                    onChange={(event) => handleHubFieldChange("onboardingMessage", event.target.value)}
                  />
                </label>
                <HubStorefrontImageField value={hubSettings.heroImageUrl} onChange={(next) => handleHubFieldChange("heroImageUrl", next)} />
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
                  <button type="button" style={primaryButton} onClick={() => handleCreateItem()}>
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
  border: "1px solid rgba(7, 155, 200, 0.2)",
  background: "rgba(7, 155, 200, 0.1)",
  color: "#0680a6",
};

const sidebarLink: React.CSSProperties = {
  ...sidebarButton,
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
};

const hubMainHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 18,
  borderRadius: 28,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "linear-gradient(180deg, #ffffff, #fbfbfc)",
  padding: "16px 20px",
  boxShadow: "0 18px 34px rgba(15, 17, 21, 0.06)",
};

const workspaceHeroCard: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  flexWrap: "wrap",
  gap: 18,
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

const secondaryButtonCompact: React.CSSProperties = {
  ...secondaryButtonSmall,
  minHeight: 44,
  padding: "0 12px",
  fontSize: "0.92rem",
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

const sectionFooterSave: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  padding: "16px 18px",
  borderRadius: 20,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "rgba(255, 255, 255, 0.9)",
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
