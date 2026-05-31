import { describe, expect, it } from "vitest";

import {
  getCategoryCustomerDescription,
  groupMenuItemsBySubGroupTree,
  parseMenuSubGroupLabel,
  writeCategoryCustomerDescriptionOnSection,
} from "./hub-menu-subgroups";

describe("hub-menu-subgroups customer description", () => {
  it("strips hub-only pizza markers from category notes", () => {
    const section = {
      presetKey: "pizza",
      description: [
        '__HULL_PIZZA_SIZE_COLUMNS:{"columns":[],"sizeSteps":{}}__',
        '__HULL_PIZZA_CATEGORY_CHOICES:{"bases":[{"id":"b1","label":"Tomato","price":"0"}],"crusts":[]}__',
        "Fresh stone-baked pizzas.",
      ].join("\n"),
    };

    expect(getCategoryCustomerDescription(section)).toBe("Fresh stone-baked pizzas.");
  });

  it("updates customer note without removing internal markers", () => {
    const section = {
      presetKey: "pizza",
      description:
        '__HULL_PIZZA_SIZE_COLUMNS:{"columns":[{"key":"a","label":"10\\""}],"sizeSteps":{}}__\n__HULL_PIZZA_CATEGORY_CHOICES:{"bases":[],"crusts":[]}__\nOld note',
    };

    const next = writeCategoryCustomerDescriptionOnSection(section, "Choose your size and base.");

    expect(getCategoryCustomerDescription(next)).toBe("Choose your size and base.");
    expect(next.description).toContain("__HULL_PIZZA_SIZE_COLUMNS:");
    expect(next.description).toContain("__HULL_PIZZA_CATEGORY_CHOICES:");
    expect(next.description).toContain("Choose your size and base.");
  });
});

describe("hub-menu-subgroups family tree", () => {
  it("parses type and format from stored labels", () => {
    expect(parseMenuSubGroupLabel("Fizzy — Cans")).toEqual({ type: "Fizzy", format: "Cans" });
    expect(parseMenuSubGroupLabel("Milkshakes")).toEqual({ type: "Milkshakes", format: "" });
  });

  it("groups items into nested branches for customer display", () => {
    const items = [
      { menuSubGroup: "Fizzy — Cans", id: "1" },
      { menuSubGroup: "Fizzy — Bottles", id: "2" },
      { menuSubGroup: "Milkshakes", id: "3" },
    ];
    const defs = [
      { id: "a", label: "Fizzy — Cans" },
      { id: "b", label: "Fizzy — Bottles" },
      { id: "c", label: "Milkshakes" },
    ];

    const tree = groupMenuItemsBySubGroupTree(items, defs);

    expect(tree.branches).toHaveLength(2);
    expect(tree.branches[0]?.type).toBe("Fizzy");
    expect(tree.branches[0]?.formats).toHaveLength(2);
    expect(tree.branches[1]?.type).toBe("Milkshakes");
    expect(tree.branches[1]?.formats[0]?.items).toHaveLength(1);
  });
});
