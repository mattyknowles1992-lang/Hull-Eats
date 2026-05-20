import { ForbiddenException } from "@nestjs/common";

import { hubHasPermission, type HubPermissionKey, type MembershipRole } from "@hull-eats/types";

export function requireHubPermission(role: string | undefined, permission: HubPermissionKey) {
  if (!role || !hubHasPermission(role as MembershipRole, permission)) {
    throw new ForbiddenException("You do not have permission to perform this action.");
  }
}
