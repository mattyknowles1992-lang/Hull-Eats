import { z } from "zod";

export const userRoles = [
  "platform_admin",
  "merchant_manager",
  "merchant_staff",
  "courier",
  "customer",
] as const;

export const permissionKeys = [
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
] as const;

export const membershipRoles = ["owner", "manager", "staff"] as const;

export const userRoleSchema = z.enum(userRoles);
export const permissionKeySchema = z.enum(permissionKeys);
export const membershipRoleSchema = z.enum(membershipRoles);

export type UserRole = (typeof userRoles)[number];
export type PermissionKey = (typeof permissionKeys)[number];
export type MembershipRole = (typeof membershipRoles)[number];

export const authActorSchema = z.object({
  userId: z.string().min(1),
  role: userRoleSchema,
  merchantId: z.string().min(1).optional(),
  storeIds: z.array(z.string().min(1)).default([]),
  permissions: z.array(permissionKeySchema).default([]),
});

export type AuthActor = z.infer<typeof authActorSchema>;

