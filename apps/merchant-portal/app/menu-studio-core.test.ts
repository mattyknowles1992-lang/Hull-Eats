import { describe, expect, it } from "vitest";

import type { HubMenuSection } from "@hull-eats/types";

import { normalizeMenuSectionsForPortal } from "./menu-studio-core";

describe("normalizeMenuSectionsForPortal", () => {
  it("ensures components and optionGroups are arrays", () => {
    const sections = [
      {
        id: "cat-1",
        name: "Mains",
        description: "",
        items: [
          {
            id: "item-1",
            categoryId: "cat-1",
            name: "Burger",
            description: "",
            price: 5,
            isActive: true,
            components: undefined,
            optionGroups: undefined,
          },
        ],
      },
    ] as unknown as HubMenuSection[];

    const normalized = normalizeMenuSectionsForPortal(sections);
    expect(normalized[0]?.items[0]?.components).toEqual([]);
    expect(normalized[0]?.items[0]?.optionGroups).toEqual([]);
  });
});
