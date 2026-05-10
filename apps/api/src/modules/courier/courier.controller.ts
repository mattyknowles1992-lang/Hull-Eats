import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import {
  courierCompleteDeliveryInputSchema,
  courierLocationInputSchema,
  courierStartDeliveryInputSchema,
} from "@hull-eats/types";

import {
  completeDeliveryWithCode,
  listCourierJobs,
  startDeliveryFromScan,
  updateCourierLocation,
} from "../../common/courier-delivery-store";
import { CourierRegistryService } from "../../common/courier-registry.service";
import { InternalAuthService } from "../../common/internal-auth.service";

@Controller("courier")
export class CourierController {
  constructor(
    @Inject(CourierRegistryService)
    private readonly courierRegistry: CourierRegistryService,
    @Inject(InternalAuthService)
    private readonly internalAuth: InternalAuthService,
  ) {}

  @Post("auth/login")
  async login(@Body() body: { username?: string; email?: string; password?: string }) {
    const account = await this.courierRegistry.authenticate(body.username ?? body.email ?? "", body.password ?? "");
    const courier = await this.courierRegistry.getCourierAccount(account.courierProfileId);
    const courierSessionId = randomUUID();
    await this.courierRegistry.setActiveSession(account.courierProfileId, courierSessionId);

    return {
      token: this.internalAuth.issueCourierToken({
        userId: account.userId,
        courierProfileId: account.courierProfileId,
        courierSessionId,
        username: account.username,
        email: account.user.email,
      }),
      courier,
    };
  }

  @Get("me")
  async me(@Headers("authorization") authorization?: string) {
    const session = this.internalAuth.requireCourierToken(authorization);
    await this.courierRegistry.requireActiveSession(session.courierProfileId!, session.courierSessionId);
    return this.courierRegistry.getCourierAccount(session.courierProfileId!);
  }

  @Post("me/password")
  async changePassword(@Headers("authorization") authorization: string | undefined, @Body() body: { currentPassword?: string; newPassword?: string }) {
    const session = this.internalAuth.requireCourierToken(authorization);
    await this.courierRegistry.requireActiveSession(session.courierProfileId!, session.courierSessionId);
    return this.courierRegistry.changeOwnPassword(session.courierProfileId!, body);
  }

  @Get("jobs")
  async listJobs(@Headers("authorization") authorization?: string) {
    const session = this.internalAuth.requireCourierToken(authorization);
    await this.courierRegistry.requireActiveSession(session.courierProfileId!, session.courierSessionId);
    return listCourierJobs();
  }

  @Post("deliveries/start")
  async startDelivery(@Headers("authorization") authorization: string | undefined, @Body() body: unknown) {
    const session = this.internalAuth.requireCourierToken(authorization);
    await this.courierRegistry.requireActiveSession(session.courierProfileId!, session.courierSessionId);
    const input = courierStartDeliveryInputSchema.parse(body);
    return startDeliveryFromScan({ ...input, driverId: session.courierProfileId });
  }

  @Post("deliveries/:deliveryId/location")
  async sendLocation(@Headers("authorization") authorization: string | undefined, @Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    const session = this.internalAuth.requireCourierToken(authorization);
    await this.courierRegistry.requireActiveSession(session.courierProfileId!, session.courierSessionId);
    const input = courierLocationInputSchema.parse(body);
    return updateCourierLocation(deliveryId, input, session.courierProfileId);
  }

  @Post("deliveries/:deliveryId/complete")
  async completeDelivery(@Headers("authorization") authorization: string | undefined, @Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    const session = this.internalAuth.requireCourierToken(authorization);
    await this.courierRegistry.requireActiveSession(session.courierProfileId!, session.courierSessionId);
    const input = courierCompleteDeliveryInputSchema.parse(body);
    return completeDeliveryWithCode(deliveryId, input.confirmationCode);
  }
}
