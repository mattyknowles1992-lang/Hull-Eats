import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import type { AuthActor, PermissionKey, UserRole } from "@hull-eats/types";

const rolePermissions: Record<UserRole, PermissionKey[]> = {
  platform_admin: [
    "merchant:orders:read",
    "merchant:orders:update",
    "merchant:orders:print",
    "admin:merchants:write",
    "admin:stores:write",
    "admin:drivers:write",
    "admin:orders:assign",
    "courier:deliveries:read",
    "courier:deliveries:update",
    "customer:orders:create",
    "customer:orders:read",
  ],
  merchant_manager: [
    "merchant:orders:read",
    "merchant:orders:update",
    "merchant:orders:print",
  ],
  merchant_staff: [
    "merchant:orders:read",
    "merchant:orders:update",
    "merchant:orders:print",
  ],
  courier: ["courier:deliveries:read", "courier:deliveries:update"],
  customer: ["customer:orders:create", "customer:orders:read"],
};

export const buildActor = (input: Omit<AuthActor, "permissions"> & { permissions?: PermissionKey[] }): AuthActor => ({
  ...input,
  storeIds: input.storeIds ?? [],
  permissions: input.permissions ?? rolePermissions[input.role] ?? [],
});

export const hasPermission = (actor: AuthActor, permission: PermissionKey): boolean =>
  actor.permissions.includes(permission);

export const canAccessStore = (actor: AuthActor, storeId: string): boolean =>
  actor.role === "platform_admin" || actor.storeIds.includes(storeId);

export const assertPermission = (actor: AuthActor, permission: PermissionKey): void => {
  if (!hasPermission(actor, permission)) {
    throw new Error(`Actor ${actor.userId} is missing permission ${permission}`);
  }
};

const TOKEN_VERSION = "v1";

const toBase64Url = (value: string): string => Buffer.from(value, "utf8").toString("base64url");
const fromBase64Url = (value: string): string => Buffer.from(value, "base64url").toString("utf8");

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${TOKEN_VERSION}:${salt}:${derived}`;
};

export const verifyPassword = (password: string, passwordHash: string): boolean => {
  const [version, salt, expectedHash] = passwordHash.split(":");
  if (version !== TOKEN_VERSION || !salt || !expectedHash) {
    return false;
  }

  const derived = scryptSync(password, salt, 64).toString("hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = Buffer.from(derived, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
};

export const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const signSessionToken = <T extends Record<string, unknown>>(payload: T, secret: string): string => {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
};

export const verifySessionToken = <T extends Record<string, unknown>>(token: string, secret: string): T => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    throw new Error("Malformed session token.");
  }

  const expectedSignature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");

  if (!safeEqual(signature, expectedSignature)) {
    throw new Error("Invalid session token signature.");
  }

  return JSON.parse(fromBase64Url(encodedPayload)) as T;
};
