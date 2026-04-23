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

