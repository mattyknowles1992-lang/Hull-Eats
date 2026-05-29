import { describe, expect, it } from "vitest";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";

import {
  applyPizzaCategoryChoicesToItem,
  readPizzaCategoryChoicesFromSection,
  writePizzaCategoryChoicesOnSection,
} from "./pizza-category-choices";

describe("pizza-category-choices", () => {
  it("stores and reads base/crust lists on the pizza category", () => {
    const section = {
      id: "pizza-cat",
      name: "Pizzas",
      description: "",
      presetKey: "pizza",
      items: [],
    } as unknown as HubMenuSection;

    const written = writePizzaCategoryChoicesOnSection(section, {
      bases: [{ id: "base-1", label: "Tomato", price: "0" }],
      crusts: [{ id: "crust-1", label: "Stuffed", price: "2" }],
    });

    const read = readPizzaCategoryChoicesFromSection(written);
    expect(read.bases).toHaveLength(1);
    expect(read.crusts[0]?.label).toBe("Stuffed");
  });

  it("applies base and crust groups onto a pizza item", () => {
    const item = {
      id: "pizza-1",
      categoryId: "pizza-cat",
      name: "Margherita Pizza",
      description: "__HULL_PIZZA_KIND:pizza__",
      price: 9,
      isActive: true,
      components: [],
      optionGroups: [],
    } as unknown as MenuItem;

    const next = applyPizzaCategoryChoicesToItem(item, {
      bases: [{ id: "b1", label: "Tomato", price: "0" }, { id: "b2", label: "BBQ", price: "1" }],
      crusts: [{ id: "c1", label: "Regular", price: "0" }],
    });

    expect(next.optionGroups.some((group) => group.name === "Base")).toBe(true);
    expect(next.optionGroups.some((group) => group.name === "Crust")).toBe(true);
    expect(next.optionGroups.find((group) => group.name === "Base")?.options).toHaveLength(2);
  });
});
