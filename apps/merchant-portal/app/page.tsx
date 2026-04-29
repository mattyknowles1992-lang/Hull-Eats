"use client";

import { useEffect, useMemo, useState } from "react";

import type { HubMenuSection, HubSettings, HubUser, MerchantWorkspace, MenuItem } from "@hull-eats/types";

type HubRole = "owner" | "manager" | "staff";
type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
type MenuComponent = MenuItem["components"][number];
type MenuOptionGroup = MenuItem["optionGroups"][number];
type MenuOption = MenuOptionGroup["options"][number];

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const merchantSessionStorageKey = "hull-eats-merchant-session";

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
const formatMoney = (value: number) => `£${value.toFixed(2)}`;

const createDraftId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const parseCsv = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const createEmptyComponent = (): MenuComponent => ({
  id: createDraftId("component"),
  label: "",
  quantity: 1,
  removable: false,
});

const createEmptyOption = (): MenuOption => ({
  id: createDraftId("option"),
  label: "",
  description: "",
  priceDelta: 0,
  isDefault: false,
  maxQuantity: 1,
});

const createEmptyOptionGroup = (): MenuOptionGroup => ({
  id: createDraftId("group"),
  name: "",
  description: "",
  selectionMode: "single",
  isRequired: false,
  minSelections: 0,
  maxSelections: 1,
  showWhenValueIds: [],
  options: [createEmptyOption()],
});

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

type CustomisationBuilderProps = {
  item: MenuItem;
  onChangeComponents: (components: MenuItem["components"]) => void;
  onChangeOptionGroups: (optionGroups: MenuItem["optionGroups"]) => void;
};

function CustomisationBuilder({ item, onChangeComponents, onChangeOptionGroups }: CustomisationBuilderProps) {
  const optionReferenceList = item.optionGroups.flatMap((group) =>
    group.options.map((option) => ({
      id: option.id,
      label: option.label || option.id,
      groupName: group.name || "Unnamed group",
    })),
  );

  const updateComponent = (componentId: string, patch: Partial<MenuComponent>) => {
    onChangeComponents(item.components.map((component) => (component.id === componentId ? { ...component, ...patch } : component)));
  };

  const updateGroup = (groupId: string, patch: Partial<MenuOptionGroup>) => {
    onChangeOptionGroups(item.optionGroups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)));
  };

  const updateOption = (groupId: string, optionId: string, patch: Partial<MenuOption>) => {
    onChangeOptionGroups(
      item.optionGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: group.options.map((option) => (option.id === optionId ? { ...option, ...patch } : option)),
            }
          : group,
      ),
    );
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section style={subBuilderCard}>
        <div style={subBuilderHeader}>
          <div>
            <strong style={builderTitle}>Included ingredients</strong>
            <p style={builderCopy}>Set what comes in the item by default and whether the customer can remove it.</p>
          </div>
          <button type="button" style={secondaryButtonSmall} onClick={() => onChangeComponents([...item.components, createEmptyComponent()])}>
            Add ingredient
          </button>
        </div>

        {item.components.length === 0 ? <div style={emptyStateCard}>No ingredients yet. Add bun, patties, cheese, salad, sauces, or sides here.</div> : null}

        <div style={{ display: "grid", gap: 10 }}>
          {item.components.map((component) => (
            <div key={component.id} style={builderRow}>
              <input
                style={lightInput}
                value={component.label}
                onChange={(event) => updateComponent(component.id, { label: event.target.value })}
                placeholder="Ingredient name"
              />
              <input
                type="number"
                min={1}
                style={lightInput}
                value={component.quantity}
                onChange={(event) => updateComponent(component.id, { quantity: Math.max(1, Number(event.target.value) || 1) })}
              />
              <label style={toggleLabel}>
                <input
                  type="checkbox"
                  checked={component.removable}
                  onChange={(event) => updateComponent(component.id, { removable: event.target.checked })}
                />
                <span>Customer can remove</span>
              </label>
              <button
                type="button"
                style={secondaryButtonSmall}
                onClick={() => onChangeComponents(item.components.filter((entry) => entry.id !== component.id))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section style={subBuilderCard}>
        <div style={subBuilderHeader}>
          <div>
            <strong style={builderTitle}>Option groups</strong>
            <p style={builderCopy}>Build meal choices, drink selectors, extra toppings, sauces, and dependent follow-up options.</p>
          </div>
          <button type="button" style={secondaryButtonSmall} onClick={() => onChangeOptionGroups([...item.optionGroups, createEmptyOptionGroup()])}>
            Add option group
          </button>
        </div>

        {item.optionGroups.length === 0 ? (
          <div style={emptyStateCard}>No option groups yet. Add groups like Meal Choice, Choose Your Can, Extras, Sauce, or Salad.</div>
        ) : null}

        <div style={{ display: "grid", gap: 14 }}>
          {item.optionGroups.map((group) => (
            <article key={group.id} style={optionGroupCard}>
              <div style={subBuilderHeader}>
                <div>
                  <strong style={builderTitle}>{group.name || "Untitled group"}</strong>
                  <p style={builderCopy}>Group id: {group.id}</p>
                </div>
                <button
                  type="button"
                  style={secondaryButtonSmall}
                  onClick={() => onChangeOptionGroups(item.optionGroups.filter((entry) => entry.id !== group.id))}
                >
                  Remove group
                </button>
              </div>

              <div style={builderGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Group name</span>
                  <input
                    style={lightInput}
                    value={group.name}
                    onChange={(event) => updateGroup(group.id, { name: event.target.value })}
                    placeholder="Meal choice"
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Selection type</span>
                  <select
                    style={lightInput}
                    value={group.selectionMode}
                    onChange={(event) =>
                      updateGroup(group.id, {
                        selectionMode: event.target.value as MenuOptionGroup["selectionMode"],
                        maxSelections: event.target.value === "single" ? 1 : group.maxSelections,
                      })
                    }
                  >
                    <option value="single">Single choice</option>
                    <option value="multiple">Multiple choice</option>
                  </select>
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Minimum selections</span>
                  <input
                    type="number"
                    min={0}
                    style={lightInput}
                    value={group.minSelections}
                    onChange={(event) => updateGroup(group.id, { minSelections: Math.max(0, Number(event.target.value) || 0) })}
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Maximum selections</span>
                  <input
                    type="number"
                    min={1}
                    style={lightInput}
                    value={group.maxSelections ?? ""}
                    onChange={(event) =>
                      updateGroup(group.id, {
                        maxSelections: event.target.value ? Math.max(1, Number(event.target.value) || 1) : null,
                      })
                    }
                    placeholder={group.selectionMode === "single" ? "1" : "Leave blank for no max"}
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Description</span>
                  <input
                    style={lightInput}
                    value={group.description}
                    onChange={(event) => updateGroup(group.id, { description: event.target.value })}
                    placeholder="Choose your can for the meal"
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Show only after these option ids</span>
                  <input
                    style={lightInput}
                    value={group.showWhenValueIds.join(", ")}
                    onChange={(event) => updateGroup(group.id, { showWhenValueIds: parseCsv(event.target.value) })}
                    placeholder="meal-choice-make-it-a-meal"
                  />
                </label>
              </div>

              <label style={toggleLabel}>
                <input
                  type="checkbox"
                  checked={group.isRequired}
                  onChange={(event) => updateGroup(group.id, { isRequired: event.target.checked })}
                />
                <span>Customer must choose from this group</span>
              </label>

              {optionReferenceList.length > 0 ? (
                <div style={referenceStrip}>
                  {optionReferenceList.map((reference) => (
                    <span key={reference.id} style={referenceChip}>
                      {reference.groupName}: {reference.label} / {reference.id}
                    </span>
                  ))}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 10 }}>
                {group.options.map((option) => (
                  <div key={option.id} style={optionRow}>
                    <div style={builderGrid}>
                      <label style={field}>
                        <span style={darkFieldLabel}>Option label</span>
                        <input
                          style={lightInput}
                          value={option.label}
                          onChange={(event) => updateOption(group.id, option.id, { label: event.target.value })}
                          placeholder="Coke"
                        />
                      </label>
                      <label style={field}>
                        <span style={darkFieldLabel}>Description</span>
                        <input
                          style={lightInput}
                          value={option.description}
                          onChange={(event) => updateOption(group.id, option.id, { description: event.target.value })}
                          placeholder="330ml can"
                        />
                      </label>
                      <label style={field}>
                        <span style={darkFieldLabel}>Price change</span>
                        <input
                          type="number"
                          step="0.01"
                          style={lightInput}
                          value={option.priceDelta}
                          onChange={(event) => updateOption(group.id, option.id, { priceDelta: Number(event.target.value) || 0 })}
                        />
                      </label>
                      <label style={field}>
                        <span style={darkFieldLabel}>Max quantity</span>
                        <input
                          type="number"
                          min={1}
                          style={lightInput}
                          value={option.maxQuantity}
                          onChange={(event) => updateOption(group.id, option.id, { maxQuantity: Math.max(1, Number(event.target.value) || 1) })}
                        />
                      </label>
                    </div>

                    <div style={optionActionRow}>
                      <label style={toggleLabel}>
                        <input
                          type="checkbox"
                          checked={option.isDefault}
                          onChange={(event) => updateOption(group.id, option.id, { isDefault: event.target.checked })}
                        />
                        <span>Preselected by default</span>
                      </label>
                      <span style={subtleInfo}>Option id: {option.id}</span>
                      <button
                        type="button"
                        style={secondaryButtonSmall}
                        onClick={() =>
                          onChangeOptionGroups(
                            item.optionGroups.map((entry) =>
                              entry.id === group.id
                                ? {
                                    ...entry,
                                    options: entry.options.filter((existingOption) => existingOption.id !== option.id),
                                  }
                                : entry,
                            ),
                          )
                        }
                      >
                        Remove option
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  style={secondaryButtonSmall}
                  onClick={() =>
                    onChangeOptionGroups(
                      item.optionGroups.map((entry) =>
                        entry.id === group.id ? { ...entry, options: [...entry.options, createEmptyOption()] } : entry,
                      ),
                    )
                  }
                >
                  Add option
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
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
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(initialPasswordFormState);
  const [newCategory, setNewCategory] = useState<CreateCategoryFormState>(initialCreateCategoryState);
  const [newItem, setNewItem] = useState<CreateItemFormState>(initialCreateItemState);
  const [selectedImportCandidateIds, setSelectedImportCandidateIds] = useState<string[]>([]);
  const [selectedImportImageName, setSelectedImportImageName] = useState("");
  const [pastedMenuText, setPastedMenuText] = useState("");
  const [loginError, setLoginError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [userNotice, setUserNotice] = useState("");
  const [menuNotice, setMenuNotice] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");

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

  const updateMenuSections = (updater: (current: HubMenuSection[]) => HubMenuSection[]) => {
    setMenuSections((current) => updater(current));
    setSaveNotice("");
  };

  const applyWorkspace = (workspace: MerchantWorkspace, user: HubUser | null) => {
    setActiveHubId(workspace.hub.id);
    setActiveUser(user);
    setHubUsers(workspace.users);
    setHubSettings(workspace.settings);
    setMenuSections(workspace.menuSections);
    setPendingImports(workspace.pendingImports ?? []);
    setNewItem((current) => ({
      ...current,
      sectionId: workspace.menuSections[0]?.id ?? "",
    }));
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
      } catch {
        window.localStorage.removeItem(merchantSessionStorageKey);
      }
    })();
  }, []);

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
    setHubUsers([]);
    setActiveUser(null);
    setHubSettings(emptyHubSettings);
    setMenuSections([]);
    setPendingImports([]);
    setPasswordForm(initialPasswordFormState);
    setSaveNotice("");
    setUserNotice("");
    setMenuNotice("");
    setPasswordNotice("");
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

  const updateSection = (sectionId: string, field: keyof HubMenuSection, value: string) => {
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

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!merchantToken || !activeHubId) {
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

  const handleCreateCategory = async () => {
    if (!merchantToken || !activeHubId) {
      return;
    }

    if (!newCategory.name.trim()) {
      setMenuNotice("Enter a category name before creating it.");
      return;
    }

    try {
      const createdCategory = await createMenuCategory(merchantToken, activeHubId, {
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
      });

      setMenuSections((current) => [...current, createdCategory]);
      setNewCategory(initialCreateCategoryState);
      setNewItem((current) => ({
        ...current,
        sectionId: current.sectionId || createdCategory.id,
      }));
      setMenuNotice(`Created ${createdCategory.name}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Menu category create failed.";
      setMenuNotice(message);
    }
  };

  const handleDeleteCategory = async (sectionId: string, sectionName: string) => {
    if (!merchantToken || !activeHubId) {
      return;
    }

    try {
      await deleteMenuCategory(merchantToken, activeHubId, sectionId);
      setMenuSections((current) => current.filter((section) => section.id !== sectionId));
      setMenuNotice(`${sectionName} removed.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Menu category delete failed.";
      setMenuNotice(message);
    }
  };

  const handleCreateItem = async () => {
    if (!merchantToken || !activeHubId) {
      return;
    }

    if (!newItem.sectionId || !newItem.name.trim() || !newItem.price.trim()) {
      setMenuNotice("Choose a category, item name, and price before creating the item.");
      return;
    }

    try {
      const createdItem = await createMenuItem(merchantToken, activeHubId, newItem.sectionId, {
        name: newItem.name.trim(),
        description: newItem.description.trim(),
        price: Number(newItem.price),
        components: [],
        optionGroups: [],
      });

      setMenuSections((current) =>
        current.map((section) =>
          section.id === newItem.sectionId ? { ...section, items: [...section.items, createdItem] } : section,
        ),
      );
      setNewItem((current) => ({
        ...initialCreateItemState,
        sectionId: current.sectionId,
      }));
      setMenuNotice(`Created ${createdItem.name}. Build its ingredients and options below.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Menu item create failed.";
      setMenuNotice(message);
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!merchantToken || !activeHubId) {
      return;
    }

    try {
      await deleteMenuItem(merchantToken, activeHubId, itemId);
      setMenuSections((current) =>
        current.map((section) => ({
          ...section,
          items: section.items.filter((item) => item.id !== itemId),
        })),
      );
      setMenuNotice(`${itemName} removed.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Menu item delete failed.";
      setMenuNotice(message);
    }
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
      setMenuNotice("Accepted import candidates were added into the live menu builder.");
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
                <input type="password" style={lightInput} value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} />
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

  return (
    <main style={pageShell}>
      <div style={{ display: "grid", gap: 18 }}>
        <header style={topHeader}>
          <div style={{ display: "grid", gap: 8 }}>
            <p style={eyebrow}>Hub workspace</p>
            <h1 style={heroTitle}>{hubSettings.name || "Merchant hub"}</h1>
            <p style={heroCopy}>
              Build categories, items, included ingredients, meal choices, dependent option groups, drink selectors,
              sauces, extras, and removal rules directly from this portal.
            </p>
          </div>

          <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
            {activeUser ? <span style={activeUserChip}>{activeUser.fullName} / {activeUser.role}</span> : null}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" style={primaryButton} onClick={handleSaveHub}>
                Save hub changes
              </button>
              <button type="button" style={secondaryButton} onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </div>
        </header>

        {saveNotice ? <p style={successMessageStyle}>{saveNotice}</p> : null}
        {menuNotice ? <p style={successMessageStyle}>{menuNotice}</p> : null}
        {userNotice ? <p style={successMessageStyle}>{userNotice}</p> : null}
        {passwordNotice ? <p style={successMessageStyle}>{passwordNotice}</p> : null}

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

        <section style={portalGrid}>
          <div style={{ display: "grid", gap: 18 }}>
            <section style={panelCard}>
              <div style={panelHeader}>
                <p style={eyebrowDark}>Hub settings</p>
                <h2 style={sectionTitle}>Business details</h2>
                <p style={panelCopyDark}>This is the core storefront information pushed into the marketplace.</p>
              </div>

              <div style={twoColumnGrid}>
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
                  <span style={darkFieldLabel}>Delivery fee</span>
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
              <div style={panelHeader}>
                <p style={eyebrowDark}>Menu structure</p>
                <h2 style={sectionTitle}>Create categories and items</h2>
                <p style={panelCopyDark}>Create the category first, then create the item shell and configure ingredients and options underneath.</p>
              </div>

              <div style={quickAddGrid}>
                <div style={quickAddCard}>
                  <h3 style={quickAddTitle}>New category</h3>
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
                  <label style={field}>
                    <span style={darkFieldLabel}>Description</span>
                    <textarea
                      style={{ ...lightInput, minHeight: 96, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                      value={newItem.description}
                      onChange={(event) => setNewItem((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Two 3oz smashed beef patties with melted cheese..."
                    />
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

                          <CustomisationBuilder
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

            <section style={panelCard}>
              <div style={panelHeader}>
                <div>
                  <p style={eyebrowDark}>Business users</p>
                  <h2 style={sectionTitle}>Create hub login</h2>
                  <p style={panelCopyDark}>Create a username and password for the business owner or team members inside the hub.</p>
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
                  <p style={eyebrowDark}>Account security</p>
                  <h2 style={sectionTitle}>Change password</h2>
                  <p style={panelCopyDark}>Update the password for the signed-in hub account.</p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={field}>
                  <span style={darkFieldLabel}>Current password</span>
                  <input
                    type="password"
                    style={lightInput}
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>New password</span>
                  <input
                    type="password"
                    style={lightInput}
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Confirm new password</span>
                  <input
                    type="password"
                    style={lightInput}
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  />
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
                      <span style={darkBadge}>{user.role}</span>
                      <span style={subtleInfo}>Username: {user.username}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        style={{ ...secondaryButtonSmall, minHeight: 34, padding: "0 12px", fontSize: 13 }}
                      >
                        Remove user
                      </button>
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
  fontSize: "clamp(2.3rem, 4vw, 4.8rem)",
  lineHeight: 0.94,
  fontFamily: "Georgia, serif",
  letterSpacing: "-0.05em",
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
};

const builderGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
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
