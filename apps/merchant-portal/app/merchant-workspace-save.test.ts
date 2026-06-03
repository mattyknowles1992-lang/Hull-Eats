import { describe, expect, it } from "vitest";

import {
  isRetryableWorkspaceSaveError,
  workspaceSaveAttemptNotice,
  workspaceSaveRetryDelayMs,
} from "./merchant-workspace-save";

describe("merchant-workspace-save", () => {
  it("retries timeouts and network failures", () => {
    expect(isRetryableWorkspaceSaveError(new Error("The save took too long"))).toBe(true);
    expect(isRetryableWorkspaceSaveError(new Error("Failed to fetch"))).toBe(true);
    expect(isRetryableWorkspaceSaveError(new Error("503 Service Unavailable"))).toBe(true);
  });

  it("does not retry validation errors", () => {
    expect(isRetryableWorkspaceSaveError(new Error("menuSections.0.name: invalid"))).toBe(false);
    expect(isRetryableWorkspaceSaveError(new Error("Your account is view-only"))).toBe(false);
  });

  it("builds retry notices and delays", () => {
    expect(workspaceSaveAttemptNotice(1, 4)).toContain("Saving");
    expect(workspaceSaveAttemptNotice(2, 4)).toContain("retrying");
    expect(workspaceSaveRetryDelayMs(0)).toBe(0);
    expect(workspaceSaveRetryDelayMs(2)).toBeGreaterThan(0);
  });
});
