"use client";

import { useEffect, useMemo, useState } from "react";

import type { HubMenuSection, HubSettings, HubUser, MerchantWorkspace, MenuItem, OrderSummary } from "@hull-eats/types";

type HubRole = "owner" | "manager" | "staff";
type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
type HubSection =
  | "home"
  | "orders"
  | "orderHistory"
  | "earnings"
  | "reports"
  | "menu"
  | "businessProfile"
  | "users"
  | "settings"
  | "help";
type MenuComponent = MenuItem["components"][number];
type MenuOptionGroup = MenuItem["optionGroups"][number];
type MenuOption = MenuOptionGroup["options"][number];

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const customerWebBaseUrl = (process.env.NEXT_PUBLIC_CUSTOMER_WEB_URL ?? "https://hull-eats.onrender.com").replace(/\/$/, "");
const merchantSessionStorageKey = "hull-eats-merchant-session";

type MerchantLoginResponse = {
  token: string;
  user: HubUser;
  workspace: MerchantWorkspace;
};

type CreateCategoryFormState = {
  name: string;
  description: string;
  defaultPrice: string;
};

type CreateItemFormState = {
  sectionId: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
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

type MenuTemplateKind = "simple" | "pizza" | "burger" | "meal" | "drink" | "dessert" | "custom";

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
  defaultPrice: "",
};

const initialCreateItemState: CreateItemFormState = {
  sectionId: "",
  name: "",
  description: "",
  price: "",
  imageUrl: "",
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

const createTemplateOption = (label: string, priceDelta = 0, isDefault = false): MenuOption => ({
  id: createDraftId("option"),
  label,
  description: "",
  priceDelta,
  isDefault,
  maxQuantity: 1,
});

const createTemplateGroup = (
  name: string,
  options: MenuOption[],
  config: Partial<Omit<MenuOptionGroup, "id" | "name" | "options">> = {},
): MenuOptionGroup => ({
  id: createDraftId("group"),
  name,
  description: config.description ?? "",
  selectionMode: config.selectionMode ?? "single",
  isRequired: config.isRequired ?? false,
  minSelections: config.minSelections ?? 0,
  maxSelections: config.maxSelections ?? (config.selectionMode === "multiple" ? null : 1),
  showWhenValueIds: config.showWhenValueIds ?? [],
  options,
});

const menuTemplateCards: Array<{ kind: MenuTemplateKind; title: string; copy: string }> = [
  { kind: "simple", title: "Simple item", copy: "Fixed price item with image, description, stock, and live toggle." },
  { kind: "pizza", title: "Pizza", copy: "Sizes, crust per size, toppings, extras, and removable ingredients." },
  { kind: "burger", title: "Burger", copy: "Patty size, salad/sauce removals, cheese, bacon, and extra patties." },
  { kind: "meal", title: "Meal deal", copy: "Required main, side, drink, sauce, and optional upgrades." },
  { kind: "drink", title: "Drink", copy: "Bottle/can sizes, flavours, multipacks, and chilled availability." },
  { kind: "dessert", title: "Dessert", copy: "Sauces, toppings, ice cream, custard, and add-ons." },
  { kind: "custom", title: "Custom", copy: "Start blank and build any option groups by hand." },
];

function buildMenuTemplate(kind: MenuTemplateKind) {
  if (kind === "pizza") {
    const sizeOptions = [
      createTemplateOption('8"', 0, true),
      createTemplateOption('10"', 2.6),
      createTemplateOption('12"', 3.6),
      createTemplateOption('16"', 9.29),
    ];

    const crustGroups = sizeOptions.map((sizeOption, index) =>
      createTemplateGroup(
        `Choose Your Crust (${sizeOption.label})`,
        [
          createTemplateOption("Regular Crust", 0, true),
          createTemplateOption("Stuffed Crust", [1.25, 1.5, 2, 2.75][index] ?? 2),
        ],
        { isRequired: true, minSelections: 1, maxSelections: 1, showWhenValueIds: [sizeOption.id] },
      ),
    );

    return {
      components: [
        { id: createDraftId("component"), label: "Cheese", quantity: 1, removable: true },
        { id: createDraftId("component"), label: "Tomato base", quantity: 1, removable: true },
      ],
      optionGroups: [
        createTemplateGroup("Choose Size", sizeOptions, { isRequired: true, minSelections: 1, maxSelections: 1 }),
        ...crustGroups,
        createTemplateGroup(
          "Extras",
          [
            createTemplateOption("Extra cheese", 1),
            createTemplateOption("Pepperoni", 1.2),
            createTemplateOption("Chicken", 1.5),
            createTemplateOption("Mushrooms", 0.8),
            createTemplateOption("Jalapenos", 0.8),
          ],
          { selectionMode: "multiple", isRequired: false, minSelections: 0, maxSelections: null },
        ),
      ],
    };
  }

  if (kind === "burger") {
    return {
      components: [
        { id: createDraftId("component"), label: "Bun", quantity: 1, removable: false },
        { id: createDraftId("component"), label: "Patty", quantity: 1, removable: false },
        { id: createDraftId("component"), label: "Cheese", quantity: 1, removable: true },
        { id: createDraftId("component"), label: "Lettuce", quantity: 1, removable: true },
        { id: createDraftId("component"), label: "Sauce", quantity: 1, removable: true },
      ],
      optionGroups: [
        createTemplateGroup(
          "Choose Size",
          [createTemplateOption("1/4 pound", 0, true), createTemplateOption("1/2 pound", 2.5)],
          { isRequired: true, minSelections: 1, maxSelections: 1 },
        ),
        createTemplateGroup(
          "Extras",
          [
            createTemplateOption("Extra patty", 2.5),
            createTemplateOption("Bacon", 1.5),
            createTemplateOption("Extra cheese", 0.8),
            createTemplateOption("Hash brown", 1),
            createTemplateOption("Loaded fries upgrade", 3),
          ],
          { selectionMode: "multiple", maxSelections: null },
        ),
      ],
    };
  }

  if (kind === "meal") {
    return {
      components: [],
      optionGroups: [
        createTemplateGroup("Choose Main", [createTemplateOption("Burger", 0, true), createTemplateOption("Wrap", 0), createTemplateOption("Chicken strips", 1)], {
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        }),
        createTemplateGroup("Choose Side", [createTemplateOption("Fries", 0, true), createTemplateOption("Loaded fries", 2.5), createTemplateOption("Rice", 0)], {
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        }),
        createTemplateGroup("Choose Drink", [createTemplateOption("Can", 0, true), createTemplateOption("Bottle", 1), createTemplateOption("Milkshake", 3)], {
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        }),
        createTemplateGroup("Sauces", [createTemplateOption("Garlic mayo", 0), createTemplateOption("BBQ", 0), createTemplateOption("Chilli", 0)], {
          selectionMode: "multiple",
          maxSelections: 3,
        }),
      ],
    };
  }

  if (kind === "drink") {
    return {
      components: [],
      optionGroups: [
        createTemplateGroup("Choose Size", [createTemplateOption("Can", 0, true), createTemplateOption("500ml bottle", 1), createTemplateOption("1.5L bottle", 2.5)], {
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        }),
        createTemplateGroup("Choose Flavour", [createTemplateOption("Cola", 0, true), createTemplateOption("Orange", 0), createTemplateOption("Lemonade", 0)], {
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        }),
      ],
    };
  }

  if (kind === "dessert") {
    return {
      components: [],
      optionGroups: [
        createTemplateGroup("Choose Sauce", [createTemplateOption("Chocolate", 0, true), createTemplateOption("White chocolate", 0), createTemplateOption("Caramel", 0)], {
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        }),
        createTemplateGroup(
          "Extras",
          [createTemplateOption("Ice cream", 1.5), createTemplateOption("Cookie dough", 2), createTemplateOption("Strawberries", 1), createTemplateOption("Kinder topping", 1.2)],
          { selectionMode: "multiple", maxSelections: null },
        ),
      ],
    };
  }

  return {
    components: [],
    optionGroups: kind === "custom" ? [createEmptyOptionGroup()] : [],
  };
}

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
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      defaultPrice: input.defaultPrice.trim() ? Number(input.defaultPrice) : null,
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
  const [activeHubSlug, setActiveHubSlug] = useState("");
  const [hubUsers, setHubUsers] = useState<HubUser[]>([]);
  const [activeUser, setActiveUser] = useState<HubUser | null>(null);
  const [hubSettings, setHubSettings] = useState<HubSettings>(emptyHubSettings);
  const [menuSections, setMenuSections] = useState<HubMenuSection[]>([]);
  const [pendingImports, setPendingImports] = useState<MerchantWorkspace["pendingImports"]>([]);
  const [merchantOrders, setMerchantOrders] = useState<OrderSummary[]>([]);
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
  const [orderNotice, setOrderNotice] = useState("");
  const [activeHubSection, setActiveHubSection] = useState<HubSection>("home");
  const [activeHubPanel, setActiveHubPanel] = useState<"menu" | "import" | "settings" | "account">("menu");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showAccountPasswords, setShowAccountPasswords] = useState(false);

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

  const selectedCategory = useMemo(
    () => menuSections.find((section) => section.id === selectedCategoryId) ?? menuSections[0] ?? null,
    [menuSections, selectedCategoryId],
  );

  const selectedItem = useMemo(
    () => selectedCategory?.items.find((item) => item.id === selectedItemId) ?? selectedCategory?.items[0] ?? null,
    [selectedCategory, selectedItemId],
  );

  const openHubSection = (section: HubSection) => {
    setActiveHubSection(section);

    if (section === "menu") {
      setActiveHubPanel("menu");
      return;
    }

    if (section === "businessProfile" || section === "settings") {
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
      return;
    }

    const nextCategory = menuSections.find((section) => section.id === selectedCategoryId) ?? menuSections[0]!;
    if (nextCategory.id !== selectedCategoryId) {
      setSelectedCategoryId(nextCategory.id);
    }

    if (!nextCategory.items.length) {
      setSelectedItemId("");
      return;
    }

    const nextItem = nextCategory.items.find((item) => item.id === selectedItemId) ?? nextCategory.items[0]!;
    if (nextItem.id !== selectedItemId) {
      setSelectedItemId(nextItem.id);
    }
  }, [menuSections, selectedCategoryId, selectedItemId]);

  const updateMenuSections = (updater: (current: HubMenuSection[]) => HubMenuSection[]) => {
    setMenuSections((current) => updater(current));
    setSaveNotice("");
  };

  const applyWorkspace = (workspace: MerchantWorkspace, user: HubUser | null) => {
    setActiveHubId(workspace.hub.id);
    setActiveHubSlug(workspace.hub.slug);
    setActiveUser(user);
    setHubUsers(workspace.users);
    setHubSettings(workspace.settings);
    setMenuSections(workspace.menuSections);
    setPendingImports(workspace.pendingImports ?? []);
    setSelectedCategoryId(workspace.menuSections[0]?.id ?? "");
    setSelectedItemId(workspace.menuSections[0]?.items[0]?.id ?? "");
    setNewItem((current) => ({
      ...current,
      sectionId: workspace.menuSections[0]?.id ?? "",
    }));
  };

  const loadMerchantOrders = async (token = merchantToken) => {
    if (!token) {
      return;
    }

    try {
      const orders = await fetchMerchantOrders(token);
      setMerchantOrders(orders);
      setOrderNotice(`Loaded ${orders.length} orders.`);
    } catch (error) {
      setOrderNotice(error instanceof Error ? error.message : "Order fetch failed.");
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
        defaultPrice: newCategory.defaultPrice.trim(),
      });

      setMenuSections((current) => [...current, createdCategory]);
      setSelectedCategoryId(createdCategory.id);
      setSelectedItemId("");
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

    const targetSection = menuSections.find((section) => section.id === newItem.sectionId);
    const effectivePrice = newItem.price.trim() ? Number(newItem.price) : targetSection?.defaultPrice;

    if (!newItem.sectionId || !newItem.name.trim() || effectivePrice === null || effectivePrice === undefined || Number.isNaN(effectivePrice)) {
      setMenuNotice("Choose a category, item name, and item price or category default price before creating the item.");
      return;
    }

    try {
      const createdItem = await createMenuItem(merchantToken, activeHubId, newItem.sectionId, {
        name: newItem.name.trim(),
        description: newItem.description.trim(),
        price: effectivePrice,
        imageUrl: newItem.imageUrl.trim() || undefined,
        components: [],
        optionGroups: [],
      });

      setMenuSections((current) =>
        current.map((section) =>
          section.id === newItem.sectionId ? { ...section, items: [...section.items, createdItem] } : section,
        ),
      );
      setSelectedCategoryId(newItem.sectionId);
      setSelectedItemId(createdItem.id);
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
    setMenuNotice(`${section.name} items now use ${formatMoney(section.defaultPrice)}. Save hub changes to publish it.`);
  };

  const handleApplyMenuTemplate = (kind: MenuTemplateKind) => {
    if (!selectedCategory || !selectedItem) {
      setMenuNotice("Choose an item before applying a setup recipe.");
      return;
    }

    const template = buildMenuTemplate(kind);
    updateItem(selectedCategory.id, selectedItem.id, (current) => ({
      ...current,
      components: template.components,
      optionGroups: template.optionGroups,
    }));
    setMenuNotice(
      kind === "simple"
        ? `${selectedItem.name} is now a simple fixed-price item.`
        : `${selectedItem.name} now has the ${menuTemplateCards.find((card) => card.kind === kind)?.title ?? "custom"} setup recipe.`,
    );
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

  return (
    <main style={hubAppShell}>
      <aside style={hubSidebar}>
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
              <span>01</span> Dashboard
            </button>
          </div>

          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>Orders</span>
            <button type="button" style={activeHubSection === "orders" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("orders")}>
              <span>02</span> Live orders
            </button>
            <button type="button" style={activeHubSection === "orderHistory" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("orderHistory")}>
              <span>03</span> Order history
            </button>
          </div>

          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>Performance</span>
            <button type="button" style={activeHubSection === "earnings" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("earnings")}>
              <span>04</span> Earnings
            </button>
            <button type="button" style={activeHubSection === "reports" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("reports")}>
              <span>05</span> Reports
            </button>
          </div>

          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>Menu management</span>
            <button type="button" style={activeHubSection === "menu" && activeHubPanel === "menu" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("menu")}>
              <span>06</span> Menu builder
            </button>
            <button
              type="button"
              style={activeHubSection === "menu" && activeHubPanel === "import" ? sidebarButtonActive : sidebarButton}
              onClick={() => {
                setActiveHubSection("menu");
                setActiveHubPanel("import");
              }}
            >
              <span>07</span> Paste menu
            </button>
          </div>

          <div style={sidebarGroup}>
            <span style={sidebarGroupTitle}>Business</span>
            <button type="button" style={activeHubSection === "businessProfile" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("businessProfile")}>
              <span>08</span> Business profile
            </button>
            <button type="button" style={activeHubSection === "users" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("users")}>
              <span>09</span> Users
            </button>
            <button type="button" style={activeHubSection === "settings" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("settings")}>
              <span>10</span> Settings
            </button>
          </div>

          <button type="button" style={activeHubSection === "help" ? sidebarButtonActive : sidebarButton} onClick={() => openHubSection("help")}>
            <span>?</span> Help and support
          </button>
        </nav>
      </aside>

      <section style={hubMainArea}>
        <header style={hubMainHeader}>
          <div style={{ display: "grid", gap: 8 }}>
            <p style={eyebrow}>Hub workspace</p>
            <h1 style={hubTitle}>{hubSettings.name || "Merchant hub"}</h1>
            <p style={heroCopy}>Run orders, menu changes, earnings, users, and store setup from one clear workspace.</p>
          </div>

          <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
            {activeUser ? <span style={activeUserChip}>{activeUser.fullName} / {activeUser.role}</span> : null}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" style={primaryButton} onClick={handleSaveHub}>
                Save hub changes
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

        {saveNotice ? <p style={successMessageStyle}>{saveNotice}</p> : null}
        {menuNotice ? <p style={successMessageStyle}>{menuNotice}</p> : null}
        {userNotice ? <p style={successMessageStyle}>{userNotice}</p> : null}
        {passwordNotice ? <p style={successMessageStyle}>{passwordNotice}</p> : null}
        {orderNotice ? <p style={successMessageStyle}>{orderNotice}</p> : null}

        {activeHubSection === "home" ? (
          <section style={dashboardGrid}>
            <article style={dashboardHeroCard}>
              <p style={eyebrowDark}>Today</p>
              <h2 style={sectionTitle}>Ready for service</h2>
              <p style={panelCopyDark}>
                Your menu has {menuStats.activeItems} live items across {menuStats.categories} categories.
              </p>
              <div style={sectionActionRow}>
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
              {merchantOrders.map((order) => (
                <article key={order.id} style={orderListCard}>
                  <div>
                    <strong style={orderNumberStyle}>{order.orderNumber}</strong>
                    <p style={panelCopyDark}>
                      {order.source.replaceAll("_", " ")} / {order.fulfillmentType} / {order.paymentStatus}
                    </p>
                  </div>
                  <div style={itemBadgeRow}>
                    <span style={darkBadge}>{order.status}</span>
                    <span style={orangeBadge}>£{order.totalAmount.toFixed(2)}</span>
                  </div>
                </article>
              ))}
              {merchantOrders.length === 0 ? <div style={emptyStateCard}>No orders loaded yet. Refresh after placing a kiosk test order.</div> : null}
            </div>
          </section>
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

        {activeHubSection === "help" ? (
          <section style={dashboardGrid}>
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

        {activeHubSection === "menu" || activeHubSection === "businessProfile" || activeHubSection === "settings" || activeHubSection === "users" ? (
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

            {activeHubSection === "businessProfile" || activeHubSection === "settings" ? (
              <button type="button" style={workbenchTabActive} onClick={() => setActiveHubPanel("settings")}>
                Business settings
              </button>
            ) : null}

            {activeHubSection === "users" ? (
              <button type="button" style={workbenchTabActive} onClick={() => setActiveHubPanel("account")}>
                Users and password
              </button>
            ) : null}
          </div>

          {activeHubPanel === "menu" ? (
            <section style={menuWorkbenchGrid}>
              <section style={categoryAccordionPanel}>
                <div style={compactHeader}>
                  <div>
                    <p style={eyebrowDark}>Categories</p>
                    <h2 style={compactTitle}>Open one section, edit fast</h2>
                  </div>
                </div>

                <div style={compactCreateBox}>
                  <input
                    style={compactInput}
                    value={newCategory.name}
                    onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Create category or path, e.g. Drinks / Fizzy"
                  />
                  <input
                    type="number"
                    step="0.01"
                    style={{ ...compactInput, maxWidth: 140 }}
                    value={newCategory.defaultPrice}
                    onChange={(event) => setNewCategory((current) => ({ ...current, defaultPrice: event.target.value }))}
                    placeholder="Default £"
                  />
                  <button type="button" style={primaryButton} onClick={handleCreateCategory}>
                    Add category
                  </button>
                </div>

                <div style={categoryAccordionList}>
                  {menuSections.map((section) => (
                    <details
                      key={section.id}
                      open={section.id === selectedCategory?.id}
                      style={categoryAccordionCard}
                      onToggle={(event) => {
                        if (event.currentTarget.open) {
                          setSelectedCategoryId(section.id);
                          setSelectedItemId(section.items[0]?.id ?? "");
                          setNewItem((current) => ({ ...current, sectionId: section.id }));
                        }
                      }}
                    >
                      <summary style={categoryAccordionSummary}>
                        <span>
                          <strong>{section.name}</strong>
                          <small>{section.items.length} items</small>
                        </span>
                        <span style={orangeBadge}>{section.id === selectedCategory?.id ? "Open" : "Edit"}</span>
                      </summary>

                      <div style={categoryAccordionBody}>
                        <div style={builderGrid}>
                          <label style={field}>
                            <span style={darkFieldLabel}>Category name</span>
                            <input style={lightInput} value={section.name} onChange={(event) => updateSection(section.id, "name", event.target.value)} />
                          </label>
                          <label style={field}>
                            <span style={darkFieldLabel}>Category note</span>
                            <input
                              style={lightInput}
                              value={section.description ?? ""}
                              onChange={(event) => updateSection(section.id, "description", event.target.value)}
                              placeholder="Optional short description"
                            />
                          </label>
                          <label style={field}>
                            <span style={darkFieldLabel}>Category default price</span>
                            <input
                              type="number"
                              step="0.01"
                              style={lightInput}
                              value={section.defaultPrice ?? ""}
                              onChange={(event) =>
                                updateSection(section.id, "defaultPrice", event.target.value ? Number(event.target.value) : null)
                              }
                              placeholder="Use when most items in this category cost the same"
                            />
                          </label>
                        </div>

                        <div style={compactCreateBox}>
                          <div style={emptyStateCard}>
                            {section.defaultPrice === null || section.defaultPrice === undefined
                              ? "No category price set. Items need their own price."
                              : `Category price: ${formatMoney(section.defaultPrice)}. New items can use this automatically.`}
                          </div>
                          <button type="button" style={secondaryButton} onClick={() => handleApplyCategoryPrice(section.id)}>
                            Apply price to all items
                          </button>
                        </div>

                        <div style={compactCreateBox}>
                          <input
                            style={compactInput}
                            value={newItem.sectionId === section.id ? newItem.name : ""}
                            onChange={(event) => setNewItem((current) => ({ ...current, name: event.target.value, sectionId: section.id }))}
                            placeholder="New item name"
                          />
                          <input
                            type="number"
                            step="0.01"
                            style={{ ...compactInput, maxWidth: 120 }}
                            value={newItem.sectionId === section.id ? newItem.price : ""}
                            onChange={(event) => setNewItem((current) => ({ ...current, price: event.target.value, sectionId: section.id }))}
                            placeholder={section.defaultPrice ? `Uses £${section.defaultPrice.toFixed(2)}` : "Price"}
                          />
                          <button type="button" style={primaryButton} onClick={handleCreateItem}>
                            Add item
                          </button>
                        </div>

                        <div style={compactList}>
                          {section.items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              style={item.id === selectedItem?.id ? compactListButtonActive : compactListButton}
                              onClick={() => {
                                setSelectedCategoryId(section.id);
                                setSelectedItemId(item.id);
                              }}
                            >
                              <strong>{item.name}</strong>
                              <span>
                                {formatMoney(item.price)} / {item.isActive ? "live" : "hidden"}
                              </span>
                            </button>
                          ))}
                          {section.items.length === 0 ? <div style={emptyStateCard}>No items in this category yet.</div> : null}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              <section style={compactEditorCard}>
                {selectedCategory && selectedItem ? (
                  <>
                    <div style={itemTopRow}>
                      <div>
                        <p style={eyebrowDark}>Editing item</p>
                        <h2 style={sectionTitle}>{selectedItem.name}</h2>
                        <p style={panelCopyDark}>
                          Pick a setup recipe, then adjust prices, images, ingredients, extras, and required choices.
                        </p>
                      </div>
                      <button type="button" style={secondaryButtonSmall} onClick={() => handleDeleteItem(selectedItem.id, selectedItem.name)}>
                        Remove
                      </button>
                    </div>

                    <section style={templatePanel}>
                      <div style={templateHeader}>
                        <div>
                          <strong style={builderTitle}>Item setup recipe</strong>
                          <p style={builderCopy}>Use these to cover pizzas, burgers, meals, drinks, desserts, simple items, or a fully custom build.</p>
                        </div>
                        <span style={orangeBadge}>
                          {selectedItem.optionGroups.length} option groups
                        </span>
                      </div>
                      <div style={templateGrid}>
                        {menuTemplateCards.map((template) => (
                          <button
                            key={template.kind}
                            type="button"
                            style={templateButton}
                            onClick={() => handleApplyMenuTemplate(template.kind)}
                          >
                            <strong>{template.title}</strong>
                            <span>{template.copy}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    <div style={builderGrid}>
                      <label style={field}>
                        <span style={darkFieldLabel}>Name</span>
                        <input
                          style={lightInput}
                          value={selectedItem.name}
                          onChange={(event) => updateItem(selectedCategory.id, selectedItem.id, (current) => ({ ...current, name: event.target.value }))}
                        />
                      </label>
                      <label style={field}>
                        <span style={darkFieldLabel}>Price</span>
                        <input
                          type="number"
                          step="0.01"
                          style={lightInput}
                          value={moneyInput(selectedItem.price)}
                          onChange={(event) => updateItem(selectedCategory.id, selectedItem.id, (current) => ({ ...current, price: Number(event.target.value) || 0 }))}
                        />
                      </label>
                      <label style={field}>
                        <span style={darkFieldLabel}>Stock</span>
                        <select
                          style={lightInput}
                          value={selectedItem.stockStatus}
                          onChange={(event) =>
                            updateItem(selectedCategory.id, selectedItem.id, (current) => ({ ...current, stockStatus: event.target.value as StockStatus }))
                          }
                        >
                          <option value="in_stock">In stock</option>
                          <option value="low_stock">Low stock</option>
                          <option value="out_of_stock">Out of stock</option>
                        </select>
                      </label>
                    </div>

                    <label style={field}>
                      <span style={darkFieldLabel}>Description</span>
                      <textarea
                        style={{ ...lightInput, minHeight: 92, paddingTop: 14, paddingBottom: 14, resize: "vertical" }}
                        value={selectedItem.description}
                        onChange={(event) => updateItem(selectedCategory.id, selectedItem.id, (current) => ({ ...current, description: event.target.value }))}
                      />
                    </label>

                    <label style={field}>
                      <span style={darkFieldLabel}>Product image URL</span>
                      <input
                        style={lightInput}
                        value={selectedItem.imageUrl ?? ""}
                        onChange={(event) => updateItem(selectedCategory.id, selectedItem.id, (current) => ({ ...current, imageUrl: event.target.value || undefined }))}
                        placeholder="https://..."
                      />
                    </label>

                    <div style={toggleRow}>
                      <label style={toggleLabel}>
                        <input
                          type="checkbox"
                          checked={selectedItem.isActive}
                          onChange={(event) => updateItem(selectedCategory.id, selectedItem.id, (current) => ({ ...current, isActive: event.target.checked }))}
                        />
                        <span>Live on marketplace</span>
                      </label>
                      <label style={toggleLabel}>
                        <input
                          type="checkbox"
                          checked={selectedItem.trackStock}
                          onChange={(event) => updateItem(selectedCategory.id, selectedItem.id, (current) => ({ ...current, trackStock: event.target.checked }))}
                        />
                        <span>Track stock</span>
                      </label>
                    </div>

                    <details style={advancedDrawer}>
                      <summary style={advancedSummary}>Meals, extras, removals and custom choices</summary>
                      <CustomisationBuilder
                        item={selectedItem}
                        onChangeComponents={(components) => updateItem(selectedCategory.id, selectedItem.id, (current) => ({ ...current, components }))}
                        onChangeOptionGroups={(optionGroups) => updateItem(selectedCategory.id, selectedItem.id, (current) => ({ ...current, optionGroups }))}
                      />
                    </details>
                  </>
                ) : (
                  <div style={emptyStateCard}>Choose an item, or add one with the quick field on the left.</div>
                )}
              </section>
            </section>
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

          {activeHubPanel === "settings" ? (
            <section style={compactEditorCard}>
              <div style={twoColumnGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Business name</span>
                  <input style={lightInput} value={hubSettings.name} onChange={(event) => handleHubFieldChange("name", event.target.value)} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Cuisine label</span>
                  <input style={lightInput} value={hubSettings.cuisineLabel} onChange={(event) => handleHubFieldChange("cuisineLabel", event.target.value)} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>ETA minutes</span>
                  <input type="number" min={1} style={lightInput} value={hubSettings.etaMinutes} onChange={(event) => handleHubFieldChange("etaMinutes", Math.max(1, Number(event.target.value) || 1))} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Delivery fee</span>
                  <input type="number" step="0.01" style={lightInput} value={hubSettings.deliveryFee} onChange={(event) => handleHubFieldChange("deliveryFee", Number(event.target.value) || 0)} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Minimum order</span>
                  <input type="number" step="0.01" style={lightInput} value={hubSettings.minimumOrderAmount} onChange={(event) => handleHubFieldChange("minimumOrderAmount", Number(event.target.value) || 0)} />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Open now</span>
                  <select style={lightInput} value={hubSettings.isOpen ? "open" : "closed"} onChange={(event) => handleHubFieldChange("isOpen", event.target.value === "open")}>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>
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
                <button type="button" style={secondaryButton} onClick={handleSaveHub}>
                  Save menu changes
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
                  <span style={darkFieldLabel}>Name</span>
                  <input
                    style={lightInput}
                    value={newCategory.name}
                    onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Loaded Fries"
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
                <label style={field}>
                  <span style={darkFieldLabel}>Product image URL</span>
                  <input
                    style={lightInput}
                    value={newItem.imageUrl}
                    onChange={(event) => setNewItem((current) => ({ ...current, imageUrl: event.target.value }))}
                    placeholder="https://..."
                  />
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
                  <label style={field}>
                    <span style={darkFieldLabel}>Product image URL</span>
                    <input
                      style={lightInput}
                      value={newItem.imageUrl}
                      onChange={(event) => setNewItem((current) => ({ ...current, imageUrl: event.target.value }))}
                      placeholder="https://..."
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
        </details>
      </section>
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

const hubAppShell: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr)",
  background: "#f7f8fa",
  color: "#101216",
  fontFamily: "Manrope, system-ui, sans-serif",
};

const hubSidebar: React.CSSProperties = {
  position: "sticky",
  top: 0,
  height: "100vh",
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 18,
  borderRight: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#ffffff",
  padding: 18,
  overflowY: "auto",
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
  background: "linear-gradient(180deg, #ff8b3c, #ff6a00)",
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
  borderColor: "rgba(255, 106, 0, 0.2)",
  background: "rgba(255, 106, 0, 0.1)",
  color: "#c95d12",
};

const hubMainArea: React.CSSProperties = {
  display: "grid",
  gap: 18,
  alignContent: "start",
  padding: "24px clamp(18px, 3vw, 42px) 64px",
};

const hubMainHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "flex-end",
  flexWrap: "wrap",
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

const menuWorkbenchGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(280px, 0.85fr) minmax(320px, 1.15fr)",
  gap: 14,
  alignItems: "start",
};

const categoryAccordionPanel: React.CSSProperties = {
  display: "grid",
  gap: 14,
  minHeight: 520,
  borderRadius: 22,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "rgba(255,255,255,0.78)",
  padding: 14,
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
  borderColor: "rgba(255, 106, 0, 0.34)",
  background: "linear-gradient(180deg, rgba(255, 244, 233, 1), rgba(255,255,255,0.98))",
  boxShadow: "0 14px 24px rgba(255, 106, 0, 0.1)",
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

const compactEditorCard: React.CSSProperties = {
  display: "grid",
  gap: 14,
  minHeight: 520,
  borderRadius: 22,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  padding: 16,
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
