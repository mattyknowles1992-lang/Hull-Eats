"use client";

import { useMemo, useState } from "react";

import type { HubMenuSection, HubSettings, HubUser, MerchantWorkspace } from "@hull-eats/types";

type HubRole = "owner" | "manager" | "staff";
type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type MerchantLoginResponse = {
  token: string;
  user: HubUser;
  workspace: MerchantWorkspace;
};

type CreateCategoryFormState = {
  name: string;
  description: string;
};

type CreateItemFormState = {
  sectionId: string;
  name: string;
  description: string;
  price: string;
};

type CreateUserFormState = {
  fullName: string;
  email: string;
  username: string;
  password: string;
  role: HubRole;
};

const initialCreateUserState: CreateUserFormState = {
  fullName: "",
  email: "",
  username: "",
  password: "",
  role: "owner",
};

const initialCreateCategoryState: CreateCategoryFormState = {
  name: "",
  description: "",
};

const initialCreateItemState: CreateItemFormState = {
  sectionId: "",
  name: "",
  description: "",
  price: "",
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
};

const moneyInput = (value: number) => value.toFixed(2);

async function loginToHub(username: string, password: string): Promise<MerchantLoginResponse> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`Hub login failed with status ${response.status}`);
  }

  return (await response.json()) as MerchantLoginResponse;
}

async function saveWorkspace(token: string, hubId: string, input: { settings: HubSettings; menuSections: HubMenuSection[] }) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/workspace`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Hub workspace save failed with status ${response.status}`);
  }

  return (await response.json()) as MerchantWorkspace;
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

async function createMenuCategory(token: string, hubId: string, input: CreateCategoryFormState): Promise<HubMenuSection> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/menu-sections`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Menu category create failed with status ${response.status}`);
  }

  return (await response.json()) as HubMenuSection;
}

async function createMenuItem(
  token: string,
  hubId: string,
  sectionId: string,
  input: { name: string; description: string; price: number },
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

export default function MerchantPortalPage() {
  const [merchantToken, setMerchantToken] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [activeHubId, setActiveHubId] = useState("");
  const [hubUsers, setHubUsers] = useState<HubUser[]>([]);
  const [activeUser, setActiveUser] = useState<HubUser | null>(null);
  const [hubSettings, setHubSettings] = useState<HubSettings>(emptyHubSettings);
  const [menuSections, setMenuSections] = useState<HubMenuSection[]>([]);
  const [pendingImports, setPendingImports] = useState<MerchantWorkspace["pendingImports"]>([]);
  const [newUser, setNewUser] = useState<CreateUserFormState>(initialCreateUserState);
  const [newCategory, setNewCategory] = useState<CreateCategoryFormState>(initialCreateCategoryState);
  const [newItem, setNewItem] = useState<CreateItemFormState>(initialCreateItemState);
  const [selectedImportCandidateIds, setSelectedImportCandidateIds] = useState<string[]>([]);
  const [selectedImportImageName, setSelectedImportImageName] = useState("");
  const [pastedMenuText, setPastedMenuText] = useState("");
  const [loginError, setLoginError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [userNotice, setUserNotice] = useState("");
  const [menuNotice, setMenuNotice] = useState("");

  const menuStats = useMemo(() => {
    const totalItems = menuSections.reduce((sum, section) => sum + section.items.length, 0);
    const activeItems = menuSections.reduce(
      (sum, section) => sum + section.items.filter((item) => item.isActive).length,
      0,
    );
    return {
      totalItems,
      activeItems,
      categories: menuSections.length,
    };
  }, [menuSections]);

  const handleLogin = async () => {
    try {
      const response = await loginToHub(loginUsername, loginPassword);
      setMerchantToken(response.token);
      setActiveHubId(response.workspace.hub.id);
      setActiveUser(response.user);
      setHubUsers(response.workspace.users);
      setHubSettings(response.workspace.settings);
      setMenuSections(response.workspace.menuSections);
      setPendingImports(response.workspace.pendingImports ?? []);
      setNewItem((current) => ({
        ...current,
        sectionId: response.workspace.menuSections[0]?.id ?? "",
      }));
      setLoginError("");
      setSaveNotice("");
      setUserNotice("");
      setMenuNotice("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Hub login failed.";
      setLoginError(message);
    }
  };

  const handleHubFieldChange = <K extends keyof HubSettings>(field: K, value: HubSettings[K]) => {
    setHubSettings((current) => ({
      ...current,
      [field]: value,
    }));
    setSaveNotice("");
  };

  const updateSection = (sectionId: string, field: keyof HubMenuSection, value: string) => {
    setMenuSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              [field]: value,
            }
          : section,
      ),
    );
    setSaveNotice("");
  };

  const updateItem = (
    sectionId: string,
    itemId: string,
    field: "name" | "description" | "price" | "isActive" | "stockStatus" | "stockQuantity",
    value: string | number | boolean | null,
  ) => {
    setMenuSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      [field]: value,
                    }
                  : item,
              ),
            }
          : section,
      ),
    );
    setSaveNotice("");
  };

  const handleSaveHub = async () => {
    if (!merchantToken || !activeHubId) {
      return;
    }

    try {
      const workspace = await saveWorkspace(merchantToken, activeHubId, {
        settings: hubSettings,
        menuSections,
      });
      setHubSettings(workspace.settings);
      setMenuSections(workspace.menuSections);
      setHubUsers(workspace.users);
      setPendingImports(workspace.pendingImports ?? []);
      setSaveNotice(`Saved ${workspace.hub.businessName} hub changes.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Hub save failed.";
      setSaveNotice(message);
    }
  };

  const handleCreateUser = async () => {
    if (!merchantToken || !activeHubId) {
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

  const handleCreateCategory = async () => {
    if (!merchantToken || !activeHubId || !newCategory.name.trim()) {
      setMenuNotice("Enter a category name first.");
      return;
    }

    try {
      const section = await createMenuCategory(merchantToken, activeHubId, {
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
      });
      setMenuSections((current) => [...current, section]);
      setNewCategory(initialCreateCategoryState);
      setNewItem((current) => ({
        ...current,
        sectionId: current.sectionId || section.id,
      }));
      setMenuNotice(`Category created: ${section.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Category creation failed.";
      setMenuNotice(message);
    }
  };

  const handleCreateItem = async () => {
    if (!merchantToken || !activeHubId || !newItem.sectionId || !newItem.name.trim() || !newItem.price.trim()) {
      setMenuNotice("Choose a category, then add item name and price.");
      return;
    }

    try {
      const createdItem = await createMenuItem(merchantToken, activeHubId, newItem.sectionId, {
        name: newItem.name.trim(),
        description: newItem.description.trim(),
        price: Number(newItem.price),
      });

      setMenuSections((current) =>
        current.map((section) =>
          section.id === newItem.sectionId
            ? {
                ...section,
                items: [...section.items, createdItem],
              }
            : section,
        ),
      );
      setNewItem((current) => ({
        ...initialCreateItemState,
        sectionId: current.sectionId,
      }));
      setMenuNotice(`Item created: ${createdItem.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Item creation failed.";
      setMenuNotice(message);
    }
  };

  const handlePreviewImport = async () => {
    if (!merchantToken || !activeHubId || !selectedImportImageName.trim()) {
      setMenuNotice("Choose a menu image first.");
      return;
    }

    try {
      const batch = await previewMenuImport(merchantToken, activeHubId, selectedImportImageName.trim());
      setPendingImports((current) => [batch, ...current]);
      setSelectedImportCandidateIds(batch.candidates.map((candidate) => candidate.id));
      setMenuNotice(`Menu image queued for review: ${batch.imageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Menu image import failed.";
      setMenuNotice(message);
    }
  };

  const handlePreviewPastedMenu = async () => {
    if (!merchantToken || !activeHubId || !pastedMenuText.trim()) {
      setMenuNotice("Paste menu text first.");
      return;
    }

    try {
      const batch = await previewMenuTextImport(merchantToken, activeHubId, pastedMenuText.trim());
      setPendingImports((current) => [batch, ...current]);
      setSelectedImportCandidateIds(batch.candidates.map((candidate) => candidate.id));
      setMenuNotice(`Pasted menu text split into ${batch.candidates.length} review candidates.`);
      setPastedMenuText("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Menu text import failed.";
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
      setMenuNotice("Selected import candidates accepted into the live menu.");
      setSelectedImportCandidateIds([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Menu import apply failed.";
      setMenuNotice(message);
    }
  };

  if (!activeUser) {
    return (
      <main style={pageShell}>
        <div style={{ width: "min(100%, 1120px)", margin: "0 auto" }}>
          <section style={loginHero}>
            <div style={{ display: "grid", gap: 18 }}>
              <div>
                <p style={eyebrow}>Merchant hub portal</p>
                <h1 style={heroTitle}>Business portal login</h1>
                <p style={heroCopy}>
                  This is the separate in-house system for business owners and staff. Admin provisions the hub, then
                  business users sign in here to manage the storefront data that feeds the customer marketplace.
                </p>
              </div>

              <div style={heroSummaryGrid}>
                <div style={summaryCard}>
                  <span style={summaryLabel}>Provisioning</span>
                  <strong style={summaryValue}>Admin created</strong>
                </div>
                <div style={summaryCard}>
                  <span style={summaryLabel}>Product</span>
                  <strong style={summaryValue}>Separate hub</strong>
                </div>
                <div style={summaryCard}>
                  <span style={summaryLabel}>Marketplace sync</span>
                  <strong style={summaryValue}>Live source</strong>
                </div>
              </div>
            </div>

            <section style={loginPanel}>
              <div style={{ marginBottom: 18 }}>
                <p style={eyebrow}>Sign in</p>
                <h2 style={panelTitle}>Open the hub</h2>
                <p style={panelCopy}>Use the business username and password created for this hub.</p>
              </div>

              <label style={field}>
                <span style={fieldLabel}>Username</span>
                <input
                  style={fieldInput}
                  value={loginUsername}
                  onChange={(event) => setLoginUsername(event.target.value)}
                  placeholder="loaded-munch-admin"
                />
              </label>

              <label style={field}>
                <span style={fieldLabel}>Password</span>
                <input
                  type="password"
                  style={fieldInput}
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Hub password"
                />
              </label>

              <button type="button" onClick={handleLogin} style={primaryButton}>
                Sign in to hub
              </button>

              {loginError ? <p style={errorMessageStyle}>{loginError}</p> : null}
            </section>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={pageShell}>
      <div style={{ width: "min(100%, 1300px)", margin: "0 auto", display: "grid", gap: 18 }}>
        <header style={topHeader}>
          <div style={{ display: "grid", gap: 10 }}>
            <p style={eyebrow}>Merchant hub workspace</p>
            <h1 style={heroTitle}>Manage storefront, menu, prices, and users</h1>
            <p style={heroCopy}>
              Everything customers see for Loaded Munch should be controlled here. This page maps the business details,
              categories, items, pricing, and user access into clearly separated editable sections.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={activeUserChip}>
              Signed in as {activeUser.fullName} / {activeUser.role}
            </div>
            <button type="button" onClick={handleSaveHub} style={primaryButton}>
              Save hub changes
            </button>
            <button
              type="button"
              onClick={() => {
                setMerchantToken("");
                setActiveUser(null);
                setActiveHubId("");
                setHubUsers([]);
                setMenuSections([]);
                setPendingImports([]);
                setHubSettings(emptyHubSettings);
                setSelectedImportCandidateIds([]);
                setSelectedImportImageName("");
                setPastedMenuText("");
                setLoginPassword("");
              }}
              style={secondaryButton}
            >
              Sign out
            </button>
          </div>
        </header>

        {saveNotice ? <p style={successMessageStyle}>{saveNotice}</p> : null}
        {userNotice ? <p style={successMessageStyle}>{userNotice}</p> : null}
        {menuNotice ? <p style={successMessageStyle}>{menuNotice}</p> : null}

        <section style={summaryGrid}>
          <article style={overviewCard}>
            <span style={summaryLabel}>Store name</span>
            <strong style={summaryValue}>{hubSettings.name}</strong>
          </article>
          <article style={overviewCard}>
            <span style={summaryLabel}>Categories</span>
            <strong style={summaryValue}>{menuStats.categories}</strong>
          </article>
          <article style={overviewCard}>
            <span style={summaryLabel}>Live items</span>
            <strong style={summaryValue}>
              {menuStats.activeItems} / {menuStats.totalItems}
            </strong>
          </article>
          <article style={overviewCard}>
            <span style={summaryLabel}>Hub users</span>
            <strong style={summaryValue}>{hubUsers.length}</strong>
          </article>
        </section>

        <section style={portalGrid}>
          <div style={{ display: "grid", gap: 18 }}>
            <section style={panelCard}>
              <div style={panelHeader}>
                <div>
                  <p style={eyebrowDark}>Business details</p>
                  <h2 style={sectionTitle}>Storefront information</h2>
                </div>
              </div>

              <div style={twoColumnGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Business name</span>
                  <input
                    style={lightInput}
                    value={hubSettings.name}
                    onChange={(event) => handleHubFieldChange("name", event.target.value)}
                  />
                </label>

                <label style={field}>
                  <span style={darkFieldLabel}>Cuisine / summary</span>
                  <input
                    style={lightInput}
                    value={hubSettings.cuisineLabel}
                    onChange={(event) => handleHubFieldChange("cuisineLabel", event.target.value)}
                  />
                </label>

                <label style={{ ...field, gridColumn: "1 / -1" }}>
                  <span style={darkFieldLabel}>Marketplace description</span>
                  <textarea
                    style={{ ...lightInput, minHeight: 108, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                    value={hubSettings.onboardingMessage}
                    onChange={(event) => handleHubFieldChange("onboardingMessage", event.target.value)}
                  />
                </label>

                <label style={field}>
                  <span style={darkFieldLabel}>City</span>
                  <input
                    style={lightInput}
                    value={hubSettings.city}
                    onChange={(event) => handleHubFieldChange("city", event.target.value)}
                  />
                </label>

                <label style={field}>
                  <span style={darkFieldLabel}>Postcode</span>
                  <input
                    style={lightInput}
                    value={hubSettings.postcode}
                    onChange={(event) => handleHubFieldChange("postcode", event.target.value)}
                  />
                </label>

                <label style={field}>
                  <span style={darkFieldLabel}>Delivery ETA (mins)</span>
                  <input
                    type="number"
                    style={lightInput}
                    value={hubSettings.etaMinutes}
                    onChange={(event) => handleHubFieldChange("etaMinutes", Number(event.target.value))}
                  />
                </label>

                <label style={field}>
                  <span style={darkFieldLabel}>Delivery fee</span>
                  <input
                    type="number"
                    step="0.01"
                    style={lightInput}
                    value={moneyInput(hubSettings.deliveryFee)}
                    onChange={(event) => handleHubFieldChange("deliveryFee", Number(event.target.value))}
                  />
                </label>

                <label style={field}>
                  <span style={darkFieldLabel}>Minimum order</span>
                  <input
                    type="number"
                    step="0.01"
                    style={lightInput}
                    value={moneyInput(hubSettings.minimumOrderAmount)}
                    onChange={(event) => handleHubFieldChange("minimumOrderAmount", Number(event.target.value))}
                  />
                </label>

                <label style={field}>
                  <span style={darkFieldLabel}>Store status</span>
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
                  <span style={darkFieldLabel}>Logo image URL</span>
                  <input
                    style={lightInput}
                    value={hubSettings.logoImageUrl}
                    onChange={(event) => handleHubFieldChange("logoImageUrl", event.target.value)}
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
              <div style={panelHeader}>
                <div>
                  <p style={eyebrowDark}>Quick add</p>
                  <h2 style={sectionTitle}>Create categories and items fast</h2>
                  <p style={panelCopyDark}>
                    Keep onboarding simple: add a category, then add the first items into it. Use a “Meal Deals”
                    category when needed instead of a more complex builder for now.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 18 }}>
                <div style={quickAddGrid}>
                  <div style={quickAddCard}>
                    <h3 style={quickAddTitle}>Add category</h3>
                    <label style={field}>
                      <span style={darkFieldLabel}>Category name</span>
                      <input
                        style={lightInput}
                        value={newCategory.name}
                        onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Burgers"
                      />
                    </label>
                    <label style={field}>
                      <span style={darkFieldLabel}>Description</span>
                      <textarea
                        style={{ ...lightInput, minHeight: 90, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                        value={newCategory.description}
                        onChange={(event) =>
                          setNewCategory((current) => ({ ...current, description: event.target.value }))
                        }
                        placeholder="Short category description"
                      />
                    </label>
                    <button type="button" onClick={handleCreateCategory} style={primaryButton}>
                      Create category
                    </button>
                  </div>

                  <div style={quickAddCard}>
                    <h3 style={quickAddTitle}>Add item</h3>
                    <label style={field}>
                      <span style={darkFieldLabel}>Category</span>
                      <select
                        style={lightInput}
                        value={newItem.sectionId}
                        onChange={(event) => setNewItem((current) => ({ ...current, sectionId: event.target.value }))}
                      >
                        <option value="">Select category</option>
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
                    <label style={field}>
                      <span style={darkFieldLabel}>Price</span>
                      <input
                        style={lightInput}
                        value={newItem.price}
                        onChange={(event) => setNewItem((current) => ({ ...current, price: event.target.value }))}
                        placeholder="8.99"
                      />
                    </label>
                    <label style={field}>
                      <span style={darkFieldLabel}>Description</span>
                      <textarea
                        style={{ ...lightInput, minHeight: 90, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                        value={newItem.description}
                        onChange={(event) =>
                          setNewItem((current) => ({ ...current, description: event.target.value }))
                        }
                        placeholder="Short item description"
                      />
                    </label>
                    <button type="button" onClick={handleCreateItem} style={primaryButton}>
                      Create item
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section style={panelCard}>
              <div style={panelHeader}>
                <div>
                  <p style={eyebrowDark}>Menu editor</p>
                  <h2 style={sectionTitle}>Categories and items</h2>
                  <p style={panelCopyDark}>
                    Every category and item is separated below so name, price, description, status, and stock are easy
                    to edit.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 18 }}>
                {menuSections.length === 0 ? (
                  <article style={categoryCard}>
                    <h3 style={itemTitle}>No categories added yet</h3>
                    <p style={panelCopyDark}>
                      This new hub is ready for onboarding. Add the first category and items here next, then wire image
                      upload and stock rules after that.
                    </p>
                  </article>
                ) : null}
                {menuSections.map((section) => (
                  <article key={section.id} style={categoryCard}>
                    <div style={categoryHeader}>
                      <div style={{ display: "grid", gap: 12, flex: 1 }}>
                        <label style={field}>
                          <span style={darkFieldLabel}>Category name</span>
                          <input
                            style={lightInput}
                            value={section.name}
                            onChange={(event) => updateSection(section.id, "name", event.target.value)}
                          />
                        </label>
                        <label style={field}>
                          <span style={darkFieldLabel}>Category description</span>
                          <textarea
                            style={{ ...lightInput, minHeight: 92, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                            value={section.description ?? ""}
                            onChange={(event) => updateSection(section.id, "description", event.target.value)}
                          />
                        </label>
                      </div>
                      <div style={categoryStat}>
                        <span style={summaryLabel}>Items</span>
                        <strong style={{ ...summaryValue, color: "#0f1115" }}>{section.items.length}</strong>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 14 }}>
                      {section.items.map((item) => (
                        <div key={item.id} style={itemEditorCard}>
                          <div style={itemTopRow}>
                            <h3 style={itemTitle}>{item.name}</h3>
                            <div style={itemBadgeRow}>
                              <span style={darkBadge}>{item.isActive ? "Active" : "Hidden"}</span>
                              <span style={orangeBadge}>{String(item.stockStatus).replaceAll("_", " ")}</span>
                            </div>
                          </div>

                          <div style={twoColumnGrid}>
                            <label style={field}>
                              <span style={darkFieldLabel}>Item name</span>
                              <input
                                style={lightInput}
                                value={item.name}
                                onChange={(event) => updateItem(section.id, item.id, "name", event.target.value)}
                              />
                            </label>

                            <label style={field}>
                              <span style={darkFieldLabel}>Price</span>
                              <input
                                type="number"
                                step="0.01"
                                style={lightInput}
                                value={moneyInput(item.price)}
                                onChange={(event) => updateItem(section.id, item.id, "price", Number(event.target.value))}
                              />
                            </label>

                            <label style={{ ...field, gridColumn: "1 / -1" }}>
                              <span style={darkFieldLabel}>Description</span>
                              <textarea
                                style={{ ...lightInput, minHeight: 96, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                                value={item.description}
                                onChange={(event) => updateItem(section.id, item.id, "description", event.target.value)}
                              />
                            </label>

                            <label style={field}>
                              <span style={darkFieldLabel}>Visibility</span>
                              <select
                                style={lightInput}
                                value={item.isActive ? "active" : "hidden"}
                                onChange={(event) =>
                                  updateItem(section.id, item.id, "isActive", event.target.value === "active")
                                }
                              >
                                <option value="active">Active</option>
                                <option value="hidden">Hidden</option>
                              </select>
                            </label>

                            <label style={field}>
                              <span style={darkFieldLabel}>Stock status</span>
                              <select
                                style={lightInput}
                                value={item.stockStatus}
                                onChange={(event) =>
                                  updateItem(section.id, item.id, "stockStatus", event.target.value as StockStatus)
                                }
                              >
                                <option value="in_stock">In stock</option>
                                <option value="low_stock">Low stock</option>
                                <option value="out_of_stock">Out of stock</option>
                              </select>
                            </label>

                            <label style={field}>
                              <span style={darkFieldLabel}>Track stock</span>
                              <select
                                style={lightInput}
                                value={item.trackStock ? "yes" : "no"}
                                onChange={(event) =>
                                  updateItem(section.id, item.id, "stockQuantity", event.target.value === "yes" ? item.stockQuantity ?? 0 : null)
                                }
                              >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                              </select>
                            </label>

                            <label style={field}>
                              <span style={darkFieldLabel}>Stock quantity</span>
                              <input
                                type="number"
                                style={lightInput}
                                value={item.stockQuantity ?? 0}
                                onChange={(event) =>
                                  updateItem(section.id, item.id, "stockQuantity", Number(event.target.value))
                                }
                              />
                            </label>
                          </div>
                        </div>
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
                    Upload a menu page image or paste menu text from another storefront, then tick only the correct
                    categories and items before applying them.
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
                    No pending menu imports. Upload an image or paste menu text to stage categories and items for
                    review.
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
                                  event.target.checked
                                    ? [...current, candidate.id]
                                    : current.filter((id) => id !== candidate.id),
                                )
                              }
                            />
                            <div style={{ display: "grid", gap: 4 }}>
                              <strong style={{ color: "#0f1115" }}>
                                {candidate.suggestedCategoryName} / {candidate.itemName}
                              </strong>
                              <span style={subtleInfo}>
                                £{candidate.price.toFixed(2)} / {candidate.sourceLine}
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

            <section style={panelCard}>
              <div style={panelHeader}>
                <div>
                  <p style={eyebrowDark}>Business users</p>
                  <h2 style={sectionTitle}>Create hub login</h2>
                  <p style={panelCopyDark}>
                    Create a username and password for the business owner or other team members inside the hub.
                  </p>
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
                  <input
                    type="password"
                    style={lightInput}
                    value={newUser.password}
                    onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Create password"
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Role</span>
                  <select
                    style={lightInput}
                    value={newUser.role}
                    onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value as HubRole }))}
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                </label>

                <button type="button" onClick={handleCreateUser} style={primaryButton}>
                  Create business user
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
                      <span style={darkBadge}>{user.role}</span>
                      <span style={subtleInfo}>Username: {user.username}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section style={panelCard}>
              <div style={panelHeader}>
                <div>
                  <p style={eyebrowDark}>Next integration</p>
                  <h2 style={sectionTitle}>What gets wired next</h2>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {[
                  "Persist hub settings and users to Supabase",
                  "Save menu edits to database tables",
                  "Add image upload for items and categories",
                  "Connect this hub directly to the live marketplace menu",
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
      </div>
    </main>
  );
}

const pageShell: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(255, 107, 0, 0.12), transparent 24%), linear-gradient(180deg, #f6efe5 0%, #f2ebe0 100%)",
  color: "#101216",
  fontFamily: "Manrope, system-ui, sans-serif",
  padding: "24px 18px 56px",
};

const loginHero: React.CSSProperties = {
  display: "grid",
  gap: 18,
  alignItems: "start",
};

const loginPanel: React.CSSProperties = {
  borderRadius: 28,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(249,244,237,0.96))",
  boxShadow: "0 28px 54px rgba(15, 17, 21, 0.1)",
  padding: 24,
  width: "min(100%, 480px)",
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  color: "#c95d12",
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
  fontSize: "clamp(2.4rem, 5vw, 4.8rem)",
  lineHeight: 0.92,
  fontFamily: "Georgia, serif",
  letterSpacing: "-0.05em",
};

const heroCopy: React.CSSProperties = {
  margin: "14px 0 0",
  color: "#596271",
  lineHeight: 1.7,
  maxWidth: 780,
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

const heroSummaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
  maxWidth: 760,
};

const summaryCard: React.CSSProperties = {
  padding: 18,
  borderRadius: 22,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,243,236,0.96))",
  boxShadow: "0 16px 28px rgba(15, 17, 21, 0.08)",
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

const field: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const fieldLabel: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: "#101216",
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

const primaryButton: React.CSSProperties = {
  minHeight: 52,
  padding: "0 18px",
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.18)",
  color: "#fff",
  fontWeight: 900,
  background: "linear-gradient(180deg, #ff8b3c, #ff6a00 62%, #db5700)",
  boxShadow: "0 18px 28px rgba(255, 107, 0, 0.24), 0 10px 18px rgba(15, 17, 21, 0.18)",
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

const summaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const overviewCard: React.CSSProperties = {
  ...summaryCard,
  background: "linear-gradient(180deg, rgba(255,255,255,1), rgba(249,244,237,0.98))",
};

const portalGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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
  minWidth: 120,
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
  background: "linear-gradient(180deg, rgba(255, 142, 77, 0.18), rgba(255, 106, 0, 0.1))",
  color: "#9b4a12",
  border: "1px solid rgba(255, 106, 0, 0.22)",
  fontWeight: 800,
  fontSize: 13,
  textTransform: "capitalize",
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
  background: "linear-gradient(180deg, #ff8b3c, #ff6a00)",
  boxShadow: "0 0 18px rgba(255, 107, 0, 0.24)",
};
