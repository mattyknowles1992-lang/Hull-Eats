import { decodeHubMenuCategoryDescription, encodeHubMenuCategoryDescription } from "./hub-menu-presets";
import { stripHubPizzaCategoryChoicesMarker } from "./hub-menu-pizza-choices";
import { stripHubPizzaSizeColumnsMarker } from "./hub-menu-pizza-columns";

export type MenuSubGroupDefinition = {
  id: string;
  label: string;
};

const MENU_SUBGROUPS_MARKER = /^__HULL_MENU_SUBGROUPS:([\s\S]*?)__(?:\r?\n)?([\s\S]*)$/;
const HUB_INTERNAL_CATEGORY_MARKER =
  /__HULL_(?:PIZZA_SIZE_COLUMNS|PIZZA_CATEGORY_CHOICES|MENU_SUBGROUPS):[\s\S]*?__/g;

function parseMenuSubGroupsPayload(raw: string): MenuSubGroupDefinition[] {
  try {
    const parsed = JSON.parse(raw) as { subGroups?: unknown };
    if (!Array.isArray(parsed.subGroups)) {
      return [];
    }
    return parsed.subGroups
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const row = entry as { id?: string; label?: string };
        const label = row.label?.trim();
        if (!label) {
          return null;
        }
        return {
          id: row.id?.trim() || slugifyMenuSubGroupLabel(label),
          label,
        };
      })
      .filter(Boolean) as MenuSubGroupDefinition[];
  } catch {
    return [];
  }
}

/** Build a customer-facing section heading, e.g. Fizzy + Cans → "Fizzy — Cans". */
export function formatMenuSubGroupLabel(type: string, format: string): string {
  const typeTrimmed = type.trim();
  const formatTrimmed = format.trim();
  if (typeTrimmed && formatTrimmed) {
    return `${typeTrimmed} — ${formatTrimmed}`;
  }
  return typeTrimmed || formatTrimmed;
}

export function slugifyMenuSubGroupLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function stripMenuSubGroupsMarker(description: string): string {
  const match = description.trim().match(MENU_SUBGROUPS_MARKER);
  if (!match) {
    return description.trim();
  }
  return (match[2] ?? "").trim();
}

function stripAllHubInternalCategoryMarkers(description: string): string {
  return stripHubPizzaCategoryChoicesMarker(stripHubPizzaSizeColumnsMarker(stripMenuSubGroupsMarker(description))).trim();
}

function extractHubInternalCategoryMarkers(description: string): { markers: string[]; userNote: string } {
  const markers = [...description.matchAll(HUB_INTERNAL_CATEGORY_MARKER)].map((match) => match[0]);
  return {
    markers,
    userNote: stripAllHubInternalCategoryMarkers(description),
  };
}

function encodeMenuSubGroupsMarker(subGroups: MenuSubGroupDefinition[]): string {
  const payload = JSON.stringify({
    subGroups: subGroups.map((group) => ({ id: group.id, label: group.label })),
  });
  return `__HULL_MENU_SUBGROUPS:${payload}__`;
}

function assembleCategoryDescription(markers: string[], userNote = ""): string {
  const parts = markers.filter(Boolean);
  const note = userNote.trim();
  if (note) {
    parts.push(note);
  }
  return parts.join("\n");
}

function encodeMenuSubGroupsInDescription(subGroups: MenuSubGroupDefinition[], userNote = ""): string {
  const note = stripAllHubInternalCategoryMarkers(userNote.trim());
  if (subGroups.length === 0) {
    return note;
  }
  return assembleCategoryDescription([encodeMenuSubGroupsMarker(subGroups)], note);
}

/** Sub-group headings configured on a menu category (e.g. Cans, Milkshakes under Drinks). */
export function readMenuSubGroupsFromSection(section: {
  description?: string | null;
  presetKey?: string | null;
}): MenuSubGroupDefinition[] {
  const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
  const match = decoded.description.match(MENU_SUBGROUPS_MARKER);
  if (match?.[1]) {
    return parseMenuSubGroupsPayload(match[1]);
  }
  return [];
}

export function getCategoryCustomerDescription(section: {
  description?: string | null;
  presetKey?: string | null;
}): string {
  const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
  return stripAllHubInternalCategoryMarkers(decoded.description);
}

/** Update the customer-facing category note without touching hub-only description markers. */
export function writeCategoryCustomerDescriptionOnSection<T extends { description?: string | null; presetKey?: string | null }>(
  section: T,
  customerDescription: string,
): T {
  const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
  const { markers } = extractHubInternalCategoryMarkers(decoded.description);
  const description = assembleCategoryDescription(markers, customerDescription);
  return {
    ...section,
    description: encodeHubMenuCategoryDescription(section.presetKey ?? null, description),
  };
}

export function writeMenuSubGroupsOnSection<T extends { description?: string | null; presetKey?: string | null }>(
  section: T,
  subGroups: MenuSubGroupDefinition[],
  customerDescription?: string,
): T {
  const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
  const { markers, userNote } = extractHubInternalCategoryMarkers(decoded.description);
  const note = customerDescription ?? userNote;
  const nonSubgroupMarkers = markers.filter((marker) => !marker.startsWith("__HULL_MENU_SUBGROUPS:"));
  const nextMarkers =
    subGroups.length > 0 ? [...nonSubgroupMarkers, encodeMenuSubGroupsMarker(subGroups)] : nonSubgroupMarkers;
  const description = assembleCategoryDescription(nextMarkers, note);
  return {
    ...section,
    description: encodeHubMenuCategoryDescription(section.presetKey ?? null, description),
  };
}

export function addMenuSubGroupOnSection<T extends { description?: string | null; presetKey?: string | null }>(
  section: T,
  label: string,
): T {
  const subGroups = readMenuSubGroupsFromSection(section);
  const trimmed = label.trim();
  if (!trimmed) {
    return section;
  }
  if (subGroups.some((group) => group.label.toLowerCase() === trimmed.toLowerCase())) {
    return section;
  }
  return writeMenuSubGroupsOnSection(section, [
    ...subGroups,
    { id: slugifyMenuSubGroupLabel(trimmed), label: trimmed },
  ]);
}

export function renameMenuSubGroupOnSection<T extends { description?: string | null; presetKey?: string | null }>(
  section: T,
  groupId: string,
  label: string,
): T {
  const trimmed = label.trim();
  if (!trimmed) {
    return section;
  }
  const subGroups = readMenuSubGroupsFromSection(section).map((group) =>
    group.id === groupId ? { ...group, label: trimmed } : group,
  );
  return writeMenuSubGroupsOnSection(section, subGroups);
}

export function removeMenuSubGroupOnSection<T extends { description?: string | null; presetKey?: string | null }>(
  section: T,
  groupId: string,
): T {
  return writeMenuSubGroupsOnSection(
    section,
    readMenuSubGroupsFromSection(section).filter((group) => group.id !== groupId),
  );
}

export type MenuItemWithSubGroup = {
  menuSubGroup?: string | null;
};

export const MENU_SUBGROUP_LABEL_SEPARATOR = " — ";

/** Split a stored header label such as `Fizzy — Cans` into type + format. */
export function parseMenuSubGroupLabel(label: string): { type: string; format: string } {
  const trimmed = label.trim();
  if (!trimmed) {
    return { type: "", format: "" };
  }
  const separatorIndex = trimmed.indexOf(MENU_SUBGROUP_LABEL_SEPARATOR);
  if (separatorIndex === -1) {
    return { type: trimmed, format: "" };
  }
  return {
    type: trimmed.slice(0, separatorIndex).trim(),
    format: trimmed.slice(separatorIndex + MENU_SUBGROUP_LABEL_SEPARATOR.length).trim(),
  };
}

export type MenuSubGroupTreeBranch<T> = {
  type: string;
  formats: Array<{ label: string; items: T[] }>;
};

/** Nest flat subgroup labels into a family tree (Drinks → Fizzy → Cans). */
export function groupMenuItemsBySubGroupTree<T extends MenuItemWithSubGroup>(
  items: T[],
  subGroupDefinitions: MenuSubGroupDefinition[],
): { branches: MenuSubGroupTreeBranch<T>[]; ungrouped: T[] } {
  const flat = groupMenuItemsBySubGroup(items, subGroupDefinitions).filter((section) => section.label);
  const branchOrder: string[] = [];
  const branches = new Map<string, Map<string, T[]>>();

  for (const section of flat) {
    const label = section.label!;
    const { type, format } = parseMenuSubGroupLabel(label);
    if (!type) {
      continue;
    }
    if (!branches.has(type)) {
      branches.set(type, new Map());
      branchOrder.push(type);
    }
    const formats = branches.get(type)!;
    const formatKey = format || label;
    formats.set(formatKey, section.items);
  }

  return {
    branches: branchOrder.map((type) => ({
      type,
      formats: [...(branches.get(type)?.entries() ?? [])].map(([label, branchItems]) => ({
        label,
        items: branchItems,
      })),
    })),
    ungrouped: groupMenuItemsBySubGroup(items, subGroupDefinitions).find((section) => !section.label)?.items ?? [],
  };
}

/** Group items for customer menu display using category sub-group order. */
export function groupMenuItemsBySubGroup<T extends MenuItemWithSubGroup>(
  items: T[],
  subGroupDefinitions: MenuSubGroupDefinition[],
): Array<{ label: string | null; items: T[] }> {
  const order = subGroupDefinitions.map((group) => group.label);
  const buckets = new Map<string, T[]>();
  const ungrouped: T[] = [];

  for (const item of items) {
    const key = item.menuSubGroup?.trim();
    if (!key) {
      ungrouped.push(item);
      continue;
    }
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }

  const sections: Array<{ label: string | null; items: T[] }> = [];
  if (ungrouped.length > 0) {
    sections.push({ label: null, items: ungrouped });
  }

  for (const label of order) {
    const bucket = buckets.get(label);
    if (bucket?.length) {
      sections.push({ label, items: bucket });
      buckets.delete(label);
    }
  }

  for (const [label, bucket] of buckets) {
    if (bucket.length > 0) {
      sections.push({ label, items: bucket });
    }
  }

  return sections;
}
