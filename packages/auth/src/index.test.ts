import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./index.js";

describe("hashPassword / verifyPassword", () => {
  it("accepts the correct password", () => {
    const hashed = hashPassword("correct-horse-battery");
    expect(verifyPassword("correct-horse-battery", hashed)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hashed = hashPassword("correct-horse-battery");
    expect(verifyPassword("wrong-password", hashed)).toBe(false);
  });

  it("stores versioned scrypt hashes", () => {
    const hashed = hashPassword("test");
    expect(hashed.startsWith("v1:")).toBe(true);
  });
});
