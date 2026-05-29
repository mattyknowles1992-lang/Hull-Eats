import { describe, expect, it } from "vitest";

import { normalizeHubPortalLocale } from "./hub-portal-locale.js";

describe("normalizeHubPortalLocale", () => {
  it("keeps supported locales", () => {
    expect(normalizeHubPortalLocale("pl")).toBe("pl");
    expect(normalizeHubPortalLocale("en-GB")).toBe("en-GB");
  });

  it("falls back for unknown values", () => {
    expect(normalizeHubPortalLocale("not-a-locale")).toBe("en-GB");
    expect(normalizeHubPortalLocale(null)).toBe("en-GB");
  });

  it("maps english variants to en-GB", () => {
    expect(normalizeHubPortalLocale("en")).toBe("en-GB");
    expect(normalizeHubPortalLocale("EN-us")).toBe("en-GB");
  });
});
