import { describe, expect, it } from "vitest";

import { assertMerchantHubAccess, MerchantHubAccessError } from "./hub-tenancy.js";

describe("assertMerchantHubAccess", () => {
  const hubA = "11111111-1111-1111-1111-111111111111";
  const hubB = "22222222-2222-2222-2222-222222222222";

  it("allows access when hub ids match", () => {
    expect(() => assertMerchantHubAccess(hubA, hubA)).not.toThrow();
  });

  it("allows routes without a hub id in the path", () => {
    expect(() => assertMerchantHubAccess(hubA, undefined)).not.toThrow();
  });

  it("blocks cross-hub access", () => {
    expect(() => assertMerchantHubAccess(hubA, hubB)).toThrow(MerchantHubAccessError);
  });
});
