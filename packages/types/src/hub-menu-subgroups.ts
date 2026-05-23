import { decodeHubMenuCategoryDescription, encodeHubMenuCategoryDescription } from "./hub-menu-presets";

export type MenuSubGroupDefinition = {
  id: string;
  label: string;
};

const MENU_SUBGROUPS_MARKER = /^__HULL_MENU_SUBGROUPS:([\s\S]*?)__(?:\r?\n)?([\s\S]*)$/;

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

function encodeMenuSubGroupsInDescription(subGroups: MenuSubGroupDefinition[], userNote = ""): string {
  const payload = JSON.stringify({
    subGroups: subGroups.map((group) => ({ id: group.id, label: group.label })),
  });
  const note = stripMenuSubGroupsMarker(userNote.trim());
  const marker = `__HULL_MENU_SUBGROUPS:${payload}__`;
  return note ? `${marker}\n${note}` : marker;
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
  return stripMenuSubGroupsMarker(decoded.description);
}

export function writeMenuSubGroupsOnSection<T extends { description?: string | null; presetKey?: string | null }>(
  section: T,
  subGroups: MenuSubGroupDefinition[],
  customerDescription?: string,
): T {
  const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
  const note = customerDescription ?? stripMenuSubGroupsMarker(decoded.description);
  const description = encodeMenuSubGroupsInDescription(subGroups, note);
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
