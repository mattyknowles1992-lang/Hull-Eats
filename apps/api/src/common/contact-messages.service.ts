import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";

import { prisma } from "@hull-eats/db";
import {
  adminUpdateContactMessageStatusInputSchema,
  contactMessageRecordSchema,
  publicContactMessageInputSchema,
  merchantContactMessageInputSchema,
  type ContactMessageRecord,
} from "@hull-eats/types";

@Injectable()
export class ContactMessagesService {
  async listMessages(): Promise<ContactMessageRecord[]> {
    const rows = await prisma.contactMessage.findMany({
      include: {
        hub: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 250,
    });

    return rows.map((row) => this.toRecord(row));
  }

  async createPublicMessage(body: unknown): Promise<ContactMessageRecord> {
    const input = publicContactMessageInputSchema.parse(body);
    const created = await prisma.contactMessage.create({
      data: {
        origin: this.toDbOrigin(input.origin),
        status: "NEW",
        senderName: input.senderName.trim(),
        senderEmail: input.senderEmail.trim().toLowerCase(),
        senderPhone: input.senderPhone?.trim() || null,
        subject: input.subject.trim(),
        message: input.message.trim(),
        orderNumber: input.orderNumber?.trim() || null,
        sourcePath: input.sourcePath?.trim() || null,
      },
      include: {
        hub: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.toRecord(created);
  }

  async createMerchantMessage(hubId: string, hubUserId: string, body: unknown): Promise<ContactMessageRecord> {
    const input = merchantContactMessageInputSchema.parse(body);
    const hubUser = await prisma.hubUser.findFirst({
      where: {
        id: hubUserId,
        merchantId: hubId,
        isActive: true,
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!hubUser) {
      throw new UnauthorizedException("Hub user was not found for this merchant session.");
    }

    const created = await prisma.contactMessage.create({
      data: {
        origin: "MERCHANT_HUB",
        status: "NEW",
        senderName: hubUser.fullName,
        senderEmail: hubUser.email,
        senderPhone: input.senderPhone?.trim() || null,
        subject: input.subject.trim(),
        message: input.message.trim(),
        orderNumber: input.orderNumber?.trim() || null,
        sourcePath: input.sourcePath?.trim() || null,
        hubId: hubId,
      },
      include: {
        hub: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.toRecord(created);
  }

  async updateStatus(messageId: string, body: unknown, adminEmail?: string): Promise<ContactMessageRecord> {
    const input = adminUpdateContactMessageStatusInputSchema.parse(body);
    const existing = await prisma.contactMessage.findUnique({
      where: { id: messageId },
    });

    if (!existing) {
      throw new NotFoundException("Contact message was not found.");
    }

    const nextStatus = this.toDbStatus(input.status);
    const updated = await prisma.contactMessage.update({
      where: { id: messageId },
      data: {
        status: nextStatus,
        resolvedAt: input.status === "resolved" ? new Date() : null,
        resolvedByEmail: input.status === "resolved" ? adminEmail ?? existing.resolvedByEmail : null,
      },
      include: {
        hub: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.toRecord(updated);
  }

  private toDbOrigin(origin: "customer_web" | "customer_app_via_web") {
    return origin === "customer_app_via_web" ? ("CUSTOMER_APP_VIA_WEB" as const) : ("CUSTOMER_WEB" as const);
  }

  private toDbStatus(status: "new" | "in_progress" | "resolved") {
    if (status === "in_progress") {
      return "IN_PROGRESS" as const;
    }
    if (status === "resolved") {
      return "RESOLVED" as const;
    }
    return "NEW" as const;
  }

  private toRecord(row: {
    id: string;
    origin: string;
    status: string;
    senderName: string;
    senderEmail: string;
    senderPhone: string | null;
    subject: string;
    message: string;
    orderNumber: string | null;
    sourcePath: string | null;
    hubId: string | null;
    customerProfileId: string | null;
    resolvedAt: Date | null;
    resolvedByEmail: string | null;
    createdAt: Date;
    updatedAt: Date;
    hub?: { id: string; name: string } | null;
  }): ContactMessageRecord {
    return contactMessageRecordSchema.parse({
      id: row.id,
      origin: String(row.origin).toLowerCase(),
      status: String(row.status).toLowerCase(),
      senderName: row.senderName,
      senderEmail: row.senderEmail,
      senderPhone: row.senderPhone ?? "",
      subject: row.subject,
      message: row.message,
      orderNumber: row.orderNumber,
      sourcePath: row.sourcePath,
      hubId: row.hubId ?? row.hub?.id ?? null,
      hubName: row.hub?.name ?? null,
      customerProfileId: row.customerProfileId,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      resolvedByEmail: row.resolvedByEmail,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }
}
