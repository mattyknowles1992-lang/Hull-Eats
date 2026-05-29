import { Injectable, Logger } from "@nestjs/common";

import { Prisma } from "@prisma/client";
import { prisma } from "@hull-eats/db";

export type AuditLogInput = {
  scope: "admin" | "merchant" | "system";
  action: string;
  hubId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  async record(input: AuditLogInput): Promise<void> {
    try {
      await prisma.platformAuditLog.create({
        data: {
          scope: input.scope,
          action: input.action,
          merchantId: input.hubId ?? null,
          actorUserId: input.actorUserId ?? null,
          actorEmail: input.actorEmail ?? null,
          metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
          ipAddress: input.ipAddress ?? null,
        },
      });
    } catch (error) {
      // Do not block core flows if audit table is not migrated yet in an environment.
      this.logger.warn(`Audit log skipped for ${input.action}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
}
