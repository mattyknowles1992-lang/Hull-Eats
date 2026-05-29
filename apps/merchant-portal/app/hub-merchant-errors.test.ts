import { describe, expect, it } from "vitest";

import { friendlyCaughtError, friendlyMerchantMessage } from "./hub-merchant-errors";

describe("friendlyMerchantMessage", () => {
  it("hides HTTP status codes from users", () => {
    expect(friendlyMerchantMessage("Hub login failed with status 401", "login")).toMatch(/sign you in/i);
    expect(friendlyMerchantMessage("Hub login failed with status 401", "login")).not.toMatch(/401/);
  });

  it("maps network failures", () => {
    expect(friendlyMerchantMessage("Failed to fetch", "workspace_save")).toMatch(/could not reach/i);
  });

  it("humanizes validation paths on save", () => {
    expect(friendlyMerchantMessage("settings.deliveryFee: Expected number", "workspace_save")).toMatch(/menu or hub settings/i);
  });
});

describe("friendlyCaughtError", () => {
  it("uses context fallback for empty errors", () => {
    expect(friendlyCaughtError(new Error(""), "password_change")).toMatch(/could not change your password/i);
  });
});
