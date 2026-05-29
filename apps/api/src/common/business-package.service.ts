import { Injectable } from "@nestjs/common";

import { prisma } from "@hull-eats/db";
import {
  defaultBusinessPackageEntitlements,
  hullBusinessPackageKeySchema,
  type BusinessPackageEntitlement,
  type HullBusinessPackageKey,
} from "@hull-eats/types";

@Injectable()
export class BusinessPackageService {
  async listHubEntitlements(hubId: string): Promise<BusinessPackageEntitlement[]> {
    const rows = await prisma.businessPackageEntitlement.findMany({
      where: { merchantId: hubId },
      orderBy: { packageKey: "asc" },
    });

    if (rows.length === 0) {
      return defaultBusinessPackageEntitlements();
    }

    return rows
      .map((row: { packageKey: string; enabled: boolean; enabledAt: Date | null }) => {
        const parsed = hullBusinessPackageKeySchema.safeParse(row.packageKey);
        if (!parsed.success) {
          return null;
        }
        return {
          packageKey: parsed.data,
          enabled: row.enabled,
          enabledAt: row.enabledAt?.toISOString() ?? null,
        } satisfies BusinessPackageEntitlement;
      })
      .filter((row: BusinessPackageEntitlement | null): row is BusinessPackageEntitlement => row !== null);
  }

  async hubHasPackage(hubId: string, packageKey: HullBusinessPackageKey): Promise<boolean> {
    const entitlements = await this.listHubEntitlements(hubId);
    return entitlements.find((entry) => entry.packageKey === packageKey)?.enabled ?? true;
  }
}
