import { describe, expect, it } from "vitest";

import { createDefaultOpeningHours } from "@hull-eats/types";

import { emptyHubSettings, normalizeWorkspaceSettings } from "./merchant-workspace-state";

describe("normalizeWorkspaceSettings", () => {
  it("fills missing delivery zones and opening hours", () => {
    const normalized = normalizeWorkspaceSettings({
      ...emptyHubSettings,
      deliveryPostcodeZones: undefined as unknown as typeof emptyHubSettings.deliveryPostcodeZones,
      openingHours: undefined as unknown as typeof emptyHubSettings.openingHours,
    });

    expect(normalized.deliveryPostcodeZones.length).toBeGreaterThan(0);
    expect(normalized.openingHours).toHaveLength(7);
  });

  it("preserves a full opening-hours week", () => {
    const hours = createDefaultOpeningHours();
    const normalized = normalizeWorkspaceSettings({ ...emptyHubSettings, openingHours: hours });
    expect(normalized.openingHours).toEqual(hours);
  });
});
