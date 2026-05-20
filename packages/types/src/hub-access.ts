import type { MembershipRole } from "./rbac";

export type HubAccess = {
  role: MembershipRole;
  /** Browse hub data (menu, settings, orders list). */
  canView: boolean;
  /** Save menu, delivery, offers, config backups, and publish workspace. */
  canEditWorkspace: boolean;
  /** Accept/reject orders, print tickets, driver assignment changes. */
  canOperateOrders: boolean;
  /** Create or remove hub logins. Owners only. */
  canManageUsers: boolean;
  /** Change the signed-in account password. */
  canChangeOwnPassword: boolean;
};

const fullWorkspace: Pick<HubAccess, "canView" | "canEditWorkspace" | "canOperateOrders" | "canManageUsers" | "canChangeOwnPassword"> = {
  canView: true,
  canEditWorkspace: true,
  canOperateOrders: true,
  canManageUsers: true,
  canChangeOwnPassword: true,
};

const managerAccess: Pick<HubAccess, "canView" | "canEditWorkspace" | "canOperateOrders" | "canManageUsers" | "canChangeOwnPassword"> = {
  canView: true,
  canEditWorkspace: true,
  canOperateOrders: true,
  canManageUsers: false,
  canChangeOwnPassword: true,
};

const staffAccess: Pick<HubAccess, "canView" | "canEditWorkspace" | "canOperateOrders" | "canManageUsers" | "canChangeOwnPassword"> = {
  canView: true,
  canEditWorkspace: false,
  canOperateOrders: true,
  canManageUsers: false,
  canChangeOwnPassword: true,
};

const viewerAccess: Pick<HubAccess, "canView" | "canEditWorkspace" | "canOperateOrders" | "canManageUsers" | "canChangeOwnPassword"> = {
  canView: true,
  canEditWorkspace: false,
  canOperateOrders: false,
  canManageUsers: false,
  canChangeOwnPassword: true,
};

const accessByRole: Record<MembershipRole, Omit<HubAccess, "role">> = {
  owner: fullWorkspace,
  manager: managerAccess,
  staff: staffAccess,
  viewer: viewerAccess,
};

export function getHubAccess(role: MembershipRole): HubAccess {
  return { role, ...accessByRole[role] };
}

export type HubPermissionKey = keyof Omit<HubAccess, "role">;

export function hubHasPermission(role: MembershipRole, permission: HubPermissionKey): boolean {
  return getHubAccess(role)[permission];
}

export function hubRoleLabel(role: MembershipRole): string {
  if (role === "owner") {
    return "Owner";
  }
  if (role === "manager") {
    return "Manager";
  }
  if (role === "staff") {
    return "Staff";
  }
  return "View only";
}

export function hubRolesCreatableBy(actor: MembershipRole): MembershipRole[] {
  if (actor !== "owner") {
    return [];
  }
  return ["owner", "manager", "staff", "viewer"];
}
