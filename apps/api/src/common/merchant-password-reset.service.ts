import { BadRequestException, Injectable } from "@nestjs/common";
import { randomInt } from "node:crypto";

import { hashPassword, verifyPassword } from "@hull-eats/auth";
import { prisma } from "@hull-eats/db";
import type {
  MerchantPasswordResetCompleteInput,
  MerchantPasswordResetCompleteResult,
  MerchantPasswordResetRequestInput,
  MerchantPasswordResetRequestResult,
  MerchantPasswordResetVerifyInput,
  MerchantPasswordResetVerifyResult,
} from "@hull-eats/types";

import { MerchantPasswordResetDeliveryService } from "./merchant-password-reset-delivery.service";

const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_CODE_MAX_ATTEMPTS = 5;
const DEFAULT_RESET_PASSWORD = "letmein";

@Injectable()
export class MerchantPasswordResetService {
  constructor(private readonly delivery: MerchantPasswordResetDeliveryService) {}

  async requestPasswordReset(
    input: MerchantPasswordResetRequestInput,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<MerchantPasswordResetRequestResult> {
    const email = this.normalizeHubEmail(input.email);
    const code = this.generateResetCode();
    const hubUser = await prisma.hubUser.findFirst({
      where: {
        email,
        isActive: true,
        NOT: { status: "DISABLED" },
      },
      include: {
        merchant: true,
      },
    });

    if (hubUser) {
      await prisma.hubPasswordResetChallenge.updateMany({
        where: {
          hubUserId: hubUser.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await prisma.hubPasswordResetChallenge.create({
        data: {
          hubUserId: hubUser.id,
          email,
          codeHash: hashPassword(code),
          expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
          requestedIp: meta.ipAddress?.trim() || null,
          requestedUserAgent: meta.userAgent?.trim() || null,
        },
      });
    }

    const delivery = await this.delivery.sendResetCode({
      email,
      businessName: hubUser?.merchant.name ?? "Hull Eats Hub",
      code,
    });

    return {
      accepted: true,
      ...delivery,
    };
  }

  async verifyPasswordReset(input: MerchantPasswordResetVerifyInput): Promise<MerchantPasswordResetVerifyResult> {
    const email = this.normalizeHubEmail(input.email);
    const challenge = await this.requireChallenge(email, input.code);

    if (!challenge.verifiedAt) {
      await prisma.hubPasswordResetChallenge.update({
        where: { id: challenge.id },
        data: {
          verifiedAt: new Date(),
        },
      });
    }

    return {
      verified: true,
    };
  }

  async completePasswordReset(input: MerchantPasswordResetCompleteInput): Promise<MerchantPasswordResetCompleteResult> {
    const email = this.normalizeHubEmail(input.email);
    const challenge = await this.requireChallenge(email, input.code);
    const completedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.hubUser.update({
        where: { id: challenge.hubUserId },
        data: {
          passwordHash: hashPassword(DEFAULT_RESET_PASSWORD),
          mustChangePassword: true,
          sessionVersion: { increment: 1 },
        },
      });

      await tx.hubPasswordResetChallenge.update({
        where: { id: challenge.id },
        data: {
          verifiedAt: challenge.verifiedAt ?? completedAt,
          consumedAt: completedAt,
        },
      });

      await tx.hubPasswordResetChallenge.updateMany({
        where: {
          hubUserId: challenge.hubUserId,
          consumedAt: null,
          id: { not: challenge.id },
        },
        data: {
          consumedAt: completedAt,
        },
      });
    });

    return {
      reset: true,
      loginEmail: email,
      temporaryPassword: DEFAULT_RESET_PASSWORD,
    };
  }

  private normalizeHubEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private generateResetCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, "0");
  }

  private async requireChallenge(email: string, code: string) {
    const challenge = await prisma.hubPasswordResetChallenge.findFirst({
      where: {
        email,
        consumedAt: null,
      },
      include: {
        hubUser: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("That reset code is invalid or has expired.");
    }

    if (!challenge.hubUser.isActive || challenge.hubUser.status === "DISABLED") {
      throw new BadRequestException("That reset code is invalid or has expired.");
    }

    if (challenge.attemptCount >= RESET_CODE_MAX_ATTEMPTS) {
      throw new BadRequestException("That reset code is invalid or has expired.");
    }

    if (!verifyPassword(code, challenge.codeHash)) {
      await prisma.hubPasswordResetChallenge.update({
        where: { id: challenge.id },
        data: {
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          consumedAt: challenge.attemptCount + 1 >= RESET_CODE_MAX_ATTEMPTS ? new Date() : null,
        },
      });
      throw new BadRequestException("That reset code is invalid or has expired.");
    }

    return challenge;
  }
}
