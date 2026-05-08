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

    const accountStatus = input.status === "disabled" || input.status === "offline" ? "disabled" : input.status === "invited" ? "invited" : "active";
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
