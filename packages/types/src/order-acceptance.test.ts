import { describe, expect, it } from "vitest";

import {
  computeQuotedPrepMinutes,
  computeSmartPrepExtraMinutes,
  defaultOrderAcceptanceSettings,
  roundPrepToStep,
} from "./order-acceptance";

describe("order acceptance smart prep", () => {
  it("does not add extra time for a single active order", () => {
    expect(computeSmartPrepExtraMinutes(1)).toBe(0);
  });

  it("adds more time as active orders increase", () => {
    expect(computeSmartPrepExtraMinutes(3)).toBe(20);
    expect(computeSmartPrepExtraMinutes(8)).toBe(70);
  });

  it("quotes baseline prep for the first smart order", () => {
    const settings = defaultOrderAcceptanceSettings();
    const prep = computeQuotedPrepMinutes({
      mode: "smart_auto",
      etaMinutes: 25,
      settings,
      activeOrdersInWindow: 1,
    });
    expect(prep).toBe(40);
  });

  it("extends smart prep when the kitchen is busy", () => {
    const settings = defaultOrderAcceptanceSettings();
    const prep = computeQuotedPrepMinutes({
      mode: "smart_auto",
      etaMinutes: 25,
      settings,
      activeOrdersInWindow: 3,
    });
    expect(prep).toBe(60);
  });

  it("rounds prep to ten-minute steps", () => {
    expect(roundPrepToStep(43)).toBe(40);
    expect(roundPrepToStep(46)).toBe(50);
  });
});
