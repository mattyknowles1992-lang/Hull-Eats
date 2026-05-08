import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";

import { hashPassword, verifyPassword } from "@hull-eats/auth";
import { prisma } from "@hull-eats/db";

@Injectable()
export class CourierRegistryService {
  async listCouriers() {
    const accounts = await prisma.courierAccount.findMany({
      include: {
        user: true,
        courierProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return accounts.map((account) => this.toSummary(account));
  }

  async createCourier(input: {
    fullName: string;
    email: string;
    phone: string;
    username: string;
    password: string;
    vehicleType: string;
    status?: string;
    rating?: number;
    weeklyEarnings?: number;
    rewardPoints?: number;
    nextPayoutDate?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    const existingAccount = await prisma.courierAccount.findUnique({ where: { username } });

    if (existingUser || existingAccount) {
      throw new BadRequestException("That courier email or username is already in use.");
    }

    const accountStatus = this.normaliseAccountStatus(input.status ?? "active");
    const user = await prisma.user.create({
      data: {
        fullName: input.fullName.trim(),
        email,
        phone: input.phone.trim(),
        role: "COURIER" as any,
        courierProfile: {
          create: {
            vehicleType: input.vehicleType.trim() || "car",
            isActive: accountStatus !== "disabled",
            currentStatus: accountStatus === "active" ? ("AVAILABLE" as any) : ("OFFLINE" as any),
          },
        },
      },
      include: {
        courierProfile: true,
      },
    });

    const profile = user.courierProfile!;
    const account = await prisma.courierAccount.create({
      data: {
        userId: user.id,
        courierProfileId: profile.id,
        username,
        passwordHash: hashPassword(input.password),
        status: accountStatus.toUpperCase() as any,
        rating: input.rating ?? 5,
        weeklyEarnings: input.weeklyEarnings ?? 0,
        rewardPoints: input.rewardPoints ?? 0,
        nextPayoutDate: input.nextPayoutDate ? new Date(input.nextPayoutDate) : this.nextFriday(),
      },
      include: {
        user: true,
        courierProfile: true,
      },
    });

    return this.toSummary(account);
  }

  async updateCourier(
    courierProfileId: string,
    input: {
      fullName?: string;
      email?: string;
      phone?: string;
      username?: string;
      password?: string;
      vehicleType?: string;
      status?: string;
      rating?: number;
      weeklyEarnings?: number;
      rewardPoints?: number;
      nextPayoutDate?: string | null;
    },
  ) {
    const account = await prisma.courierAccount.findUnique({
      where: { courierProfileId },
      include: {
        user: true,
        courierProfile: true,
      },
    });

    if (!account) {
      throw new BadRequestException("Courier account was not found.");
    }

    const email = input.email?.trim().toLowerCase();
    const username = input.username?.trim().toLowerCase();

    if (email && email !== account.user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new BadRequestException("That courier email is already in use.");
      }
    }

    if (username && username !== account.username) {
      const existingAccount = await prisma.courierAccount.findUnique({ where: { username } });
      if (existingAccount) {
        throw new BadRequestException("That courier username is already in use.");
      }
    }

    const accountStatus = this.normaliseAccountStatus(input.status ?? String(account.status).toLowerCase());
    const driverStatus = accountStatus === "active" ? ("AVAILABLE" as any) : ("OFFLINE" as any);

    const updated = await prisma.courierAccount.update({
      where: { id: account.id },
      data: {
        username: username ?? account.username,
        passwordHash: input.password ? hashPassword(input.password) : account.passwordHash,
        status: accountStatus.toUpperCase() as any,
        rating: input.rating ?? account.rating,
        weeklyEarnings: input.weeklyEarnings ?? account.weeklyEarnings,
        rewardPoints: input.rewardPoints ?? account.rewardPoints,
        nextPayoutDate:
          input.nextPayoutDate === null
            ? null
            : input.nextPayoutDate
              ? new Date(input.nextPayoutDate)
              : account.nextPayoutDate,
        user: {
          update: {
            fullName: input.fullName?.trim() || account.user.fullName,
            email: email ?? account.user.email,
            phone: input.phone?.trim() ?? account.user.phone,
          },
        },
        courierProfile: {
          update: {
            vehicleType: input.vehicleType?.trim() || account.courierProfile.vehicleType,
            isActive: accountStatus !== "disabled",
            currentStatus: driverStatus,
          },
        },
      },
      include: {
        user: true,
        courierProfile: true,
      },
    });

    return this.toSummary(updated);
  }

  async deleteCourier(courierProfileId: string) {
    const account = await prisma.courierAccount.findUnique({
      where: { courierProfileId },
    });

    if (!account) {
      throw new BadRequestException("Courier account was not found.");
    }

    await prisma.user.delete({ where: { id: account.userId } });

    return {
      deletedCourierProfileId: courierProfileId,
    };
  }

  async authenticate(usernameOrEmail: string, password: string) {
    const login = usernameOrEmail.trim().toLowerCase();
    const account = await prisma.courierAccount.findFirst({
      where: {
        OR: [{ username: login }, { user: { email: login } }],
      },
      include: {
        user: true,
        courierProfile: true,
      },
    });

    if (!account || account.status === "DISABLED" || !account.courierProfile.isActive || !verifyPassword(password, account.passwordHash)) {
      throw new UnauthorizedException("Courier username or password was incorrect.");
    }

    return account;
  }

  async changeOwnPassword(courierProfileId: string, input: { currentPassword?: string; newPassword?: string }) {
    const account = await prisma.courierAccount.findUnique({
      where: { courierProfileId },
      include: {
        user: true,
        courierProfile: true,
      },
    });

    if (!account || !verifyPassword(input.currentPassword ?? "", account.passwordHash)) {
      throw new UnauthorizedException("Current password was incorrect.");
    }

    if (!input.newPassword || input.newPassword.length < 8) {
      throw new BadRequestException("New password must be at least 8 characters.");
    }

    const updated = await prisma.courierAccount.update({
      where: { id: account.id },
      data: {
        passwordHash: hashPassword(input.newPassword),
      },
      include: {
        user: true,
        courierProfile: true,
      },
    });

    return this.toSummary(updated);
  }

  async getCourierAccount(courierProfileId: string) {
    const account = await prisma.courierAccount.findUnique({
      where: { courierProfileId },
      include: {
        user: true,
        courierProfile: true,
      },
    });

    if (!account) {
      throw new UnauthorizedException("Courier account was not found.");
    }

    return this.toSummary(account);
  }

  private nextFriday() {
    const date = new Date();
    const day = date.getDay();
    const daysUntilFriday = (5 - day + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilFriday);
    date.setHours(9, 0, 0, 0);
    return date;
  }

  private normaliseAccountStatus(status: string) {
    return status === "disabled" || status === "offline" || status === "suspended"
      ? "disabled"
      : status === "invited" || status === "break"
        ? "invited"
        : "active";
  }

  private toSummary(account: any) {
    return {
      id: account.id,
      userId: account.userId,
      courierProfileId: account.courierProfileId,
      fullName: account.user.fullName,
      email: account.user.email,
      phone: account.user.phone ?? "",
      username: account.username,
      vehicleType: account.courierProfile.vehicleType,
      zone: account.courierProfile.vehicleType,
      status: String(account.status).toLowerCase(),
      driverStatus: String(account.courierProfile.currentStatus).toLowerCase(),
      rating: Number(account.rating),
      completedDeliveries: account.completedDeliveries,
      weeklyEarnings: Number(account.weeklyEarnings),
      rewardPoints: account.rewardPoints,
      nextPayoutDate: account.nextPayoutDate?.toISOString() ?? null,
    };
  }
}
