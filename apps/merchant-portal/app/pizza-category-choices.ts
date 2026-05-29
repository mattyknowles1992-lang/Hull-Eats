import type { HubMenuSection, MenuItem } from "@hull-eats/types";
import {
  decodeHubMenuCategoryDescription,
  encodeHubMenuCategoryDescription,
  HULL_PIZZA_CATEGORY_CHOICES_PREFIX,
  stripHubPizzaCategoryChoicesMarker,
  stripHubPizzaSizeColumnsMarker,
} from "@hull-eats/types";

import { createMenuDraftId, getPizzaMenuRowKind, type PizzaMenuRowKind } from "./menu-studio-core";
import {
  readPizzaSizeTableConfigFromSection,
  sortPizzaSizeColumnDefs,
} from "./pizza-size-draft";

type MenuOptionGroup = MenuItem["optionGroups"][number];

export type PizzaCategoryChoiceRow = {
  id: string;
  label: string;
  price: string;
};

export type PizzaCategoryChoicesConfig = {
  bases: PizzaCategoryChoiceRow[];
  crusts: PizzaCategoryChoiceRow[];
};

export const PIZZA_BASE_GROUP_MARKER = "__HULL_PIZZA_BASE__";
export const PIZZA_CRUST_GROUP_MARKER = "__HULL_PIZZA_CRUST__";

export const PIZZA_BASE_GROUP_NAME = "Base";
export const PIZZA_CRUST_GROUP_NAME = "Crust";

const DEFAULT_BASE_PRICE_BY_LABEL: Record<string, string> = {
  tomato: "0",
};

const DEFAULT_CRUST_PRICE_BY_LABEL: Record<string, string> = {
  regular: "0",
};

function newChoiceId() {
  return createMenuDraftId("pizza-choice");
}

function parseChoiceRows(raw: unknown): PizzaCategoryChoiceRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as { id?: string; label?: string; price?: string | number };
      const label = row.label?.trim() ?? "";
      if (!label) {
        return null;
      }
      const priceRaw = row.price;
      const price =
        typeof priceRaw === "number"
          ? String(priceRaw)
          : typeof priceRaw === "string"
            ? priceRaw.trim()
            : "0";
      return {
        id: row.id?.trim() || newChoiceId(),
        label,
        price,
      } satisfies PizzaCategoryChoiceRow;
    })
    .filter(Boolean) as PizzaCategoryChoiceRow[];
}

function parsePizzaCategoryChoicesPayload(raw: string): PizzaCategoryChoicesConfig | null {
  try {
    const parsed = JSON.parse(raw) as { bases?: unknown; crusts?: unknown };
    return {
      bases: parseChoiceRows(parsed.bases),
      crusts: parseChoiceRows(parsed.crusts),
    };
  } catch {
    return null;
  }
}

export function readPizzaCategoryChoicesFromSection(section: {
  description?: string | null;
  presetKey?: string | null;
}): PizzaCategoryChoicesConfig {
  const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
  const match = decoded.description.match(HULL_PIZZA_CATEGORY_CHOICES_PREFIX);
  if (match?.[1]) {
    const stored = parsePizzaCategoryChoicesPayload(match[1]);
    if (stored) {
      return stored;
    }
  }
  return { bases: [], crusts: [] };
}

function encodePizzaSizeMarker(config: ReturnType<typeof readPizzaSizeTableConfigFromSection>): string {
  return `__HULL_PIZZA_SIZE_COLUMNS:${JSON.stringify({
    columns: sortPizzaSizeColumnDefs(config.columns).map((column) => ({
      key: column.key,
      label: column.label,
      labelEditable: Boolean(column.labelEditable),
    })),
    sizeSteps: config.stepByColumnKey,
  })}__`;
}

function encodeCategoryDescriptionWithChoices(
  section: { description?: string | null; presetKey?: string | null },
  choices: PizzaCategoryChoicesConfig,
): string {
  const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
  const userNote = stripHubPizzaCategoryChoicesMarker(stripHubPizzaSizeColumnsMarker(decoded.description));
  const sizeConfig = readPizzaSizeTableConfigFromSection(section);
  const parts: string[] = [encodePizzaSizeMarker(sizeConfig)];

  if (choices.bases.length > 0 || choices.crusts.length > 0) {
    parts.push(
      `__HULL_PIZZA_CATEGORY_CHOICES:${JSON.stringify({
        bases: choices.bases.map((row) => ({ id: row.id, label: row.label, price: row.price })),
        crusts: choices.crusts.map((row) => ({ id: row.id, label: row.label, price: row.price })),
      })}__`,
    );
  }

  if (userNote) {
    parts.push(userNote);
  }

  return parts.join("\n");
}

export function writePizzaCategoryChoicesOnSection<T extends { description?: string | null; presetKey?: string | null }>(
  section: T,
  choices: PizzaCategoryChoicesConfig,
): T {
  const description = encodeCategoryDescriptionWithChoices(section, choices);
  return {
    ...section,
    description: encodeHubMenuCategoryDescription(section.presetKey ?? null, description),
  };
}

export function createPizzaCategoryChoiceRow(label: string, kind: "base" | "crust"): PizzaCategoryChoiceRow {
  const normalized = label.trim().toLowerCase();
  const defaults = kind === "base" ? DEFAULT_BASE_PRICE_BY_LABEL : DEFAULT_CRUST_PRICE_BY_LABEL;
  return {
    id: newChoiceId(),
    label: label.trim(),
    price: defaults[normalized] ?? "1",
  };
}

export function isPizzaBaseOptionGroup(group: MenuOptionGroup): boolean {
  return (group.description ?? "").trim().startsWith(PIZZA_BASE_GROUP_MARKER);
}

export function isPizzaCrustOptionGroup(group: MenuOptionGroup): boolean {
  return (group.description ?? "").trim().startsWith(PIZZA_CRUST_GROUP_MARKER) || /^Crust \(/i.test(group.name);
}

function buildChoiceOptionGroup(
  name: string,
  marker: string,
  rows: PizzaCategoryChoiceRow[],
): MenuOptionGroup | null {
  const active = rows.filter((row) => row.label.trim());
  if (active.length === 0) {
    return null;
  }

  return {
    id: createMenuDraftId("group"),
    name,
    description: marker,
    selectionMode: "single",
    isRequired: false,
    minSelections: 0,
    maxSelections: 1,
    showWhenValueIds: [],
    options: active.map((row, index) => ({
      id: row.id || newChoiceId(),
      label: row.label.trim(),
      description: "",
      priceDelta: Number(row.price) || 0,
      isDefault: index === 0,
      maxQuantity: 1,
    })),
  };
}

export function applyPizzaCategoryChoicesToItem(
  item: MenuItem,
  choices: PizzaCategoryChoicesConfig,
  options: { bases?: boolean; crusts?: boolean } = { bases: true, crusts: true },
): MenuItem {
  const applyBases = options.bases !== false;
  const applyCrusts = options.crusts !== false;

  let optionGroups = item.optionGroups.filter(
    (group) => !isPizzaBaseOptionGroup(group) && !isPizzaCrustOptionGroup(group),
  );

  if (applyBases) {
    const baseGroup = buildChoiceOptionGroup(PIZZA_BASE_GROUP_NAME, PIZZA_BASE_GROUP_MARKER, choices.bases);
    if (baseGroup) {
      optionGroups = [...optionGroups, baseGroup];
    }
  }

  if (applyCrusts) {
    const crustGroup = buildChoiceOptionGroup(PIZZA_CRUST_GROUP_NAME, PIZZA_CRUST_GROUP_MARKER, choices.crusts);
    if (crustGroup) {
      optionGroups = [...optionGroups, crustGroup];
    }
  }

  return { ...item, optionGroups };
}

export function applyPizzaCategoryChoicesToSectionItems(
  section: HubMenuSection,
  choices: PizzaCategoryChoicesConfig,
  options: { bases?: boolean; crusts?: boolean; kinds?: PizzaMenuRowKind[] } = {},
): HubMenuSection {
  const kinds = options.kinds ?? ["pizza"];
  const kindSet = new Set(kinds);
  return {
    ...section,
    items: section.items.map((item) => {
      if (!kindSet.has(getPizzaMenuRowKind(item))) {
        return item;
      }
      return applyPizzaCategoryChoicesToItem(item, choices, options);
    }),
  };
}

export function existingPizzaChoiceNameKeys(rows: PizzaCategoryChoiceRow[]): Set<string> {
  return new Set(rows.map((row) => row.label.trim().toLowerCase()).filter(Boolean));
}
