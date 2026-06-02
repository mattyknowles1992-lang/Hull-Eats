import { describe, expect, it } from "vitest";

import {
  encodeLineCustomisationMarker,
  formatKitchenTicketPreview,
  mergeLineFromOrderNotes,
  normalizeKitchenTicketSettings,
  parseLineCustomisationFromNotes,
} from "./kitchen-ticket";

describe("kitchen ticket", () => {
  it("hides build parts in normal mode", () => {
    const settings = normalizeKitchenTicketSettings({ detailMode: "normal" });
    const line = mergeLineFromOrderNotes(
      {
        name: "Smash burger",
        quantity: 1,
        notes: encodeLineCustomisationMarker({
          components: [{ label: "Brioche bun", quantity: 1 }],
          selectedOptions: [{ groupName: "Extras", valueName: "Cheese", quantity: 1, priceDelta: 1 }],
        }),
      },
      settings,
    );
    expect(line.components).toBeUndefined();
    expect(line.selectedOptions?.length).toBe(1);

    const preview = formatKitchenTicketPreview(
      "kitchen",
      settings,
      { orderNumber: "HE-1", customerName: "Test", placedAtIso: new Date().toISOString(), lines: [line] },
    );
    expect(preview).not.toContain("BUILD:");
    expect(preview).toContain("Cheese");
  });

  it("shows build parts in in-depth mode and can split quantities", () => {
    const settings = normalizeKitchenTicketSettings({ detailMode: "in_depth", splitQuantityLines: true });
    const line = mergeLineFromOrderNotes(
      {
        name: "Smash burger",
        quantity: 1,
        notes: encodeLineCustomisationMarker({
          components: [{ label: "3oz smash patty", quantity: 2 }],
        }),
      },
      settings,
    );

    const preview = formatKitchenTicketPreview(
      "kitchen",
      settings,
      { orderNumber: "HE-2", customerName: "Test", placedAtIso: new Date().toISOString(), lines: [line] },
    );
    expect(preview).toContain("BUILD:");
    expect(preview).toContain("[x] 3oz smash patty x1");
    expect((preview.match(/3oz smash patty/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("round-trips customisation marker in order notes", () => {
    const marker = encodeLineCustomisationMarker({
      components: [{ label: "Lettuce", quantity: 1 }],
      selectedOptions: [{ groupName: "Sauce", valueName: "Burger sauce", quantity: 1, priceDelta: 0 }],
    });
    const parsed = parseLineCustomisationFromNotes(`Extra hot | ${marker}`);
    expect(parsed.customerNotes).toEqual(["Extra hot"]);
    expect(parsed.snapshot?.components?.[0]?.label).toBe("Lettuce");
  });
});
