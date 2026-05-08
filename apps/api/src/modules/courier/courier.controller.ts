import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";

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
    return {
      token: this.internalAuth.issueCourierToken({
        userId: account.userId,
        courierProfileId: account.courierProfileId,
        username: account.username,
        email: account.user.email,
      }),
      courier,
    };
  }

  @Get("me")
  me(@Headers("authorization") authorization?: string) {
    const session = this.internalAuth.requireCourierToken(authorization);
    return this.courierRegistry.getCourierAccount(session.courierProfileId!);
  }

  @Get("jobs")
  listJobs(@Headers("authorization") authorization?: string) {
    this.internalAuth.requireCourierToken(authorization);
    return listCourierJobs();
  }

  @Post("deliveries/start")
  startDelivery(@Headers("authorization") authorization: string | undefined, @Body() body: unknown) {
    const session = this.internalAuth.requireCourierToken(authorization);
    const input = courierStartDeliveryInputSchema.parse(body);
    return startDeliveryFromScan({ ...input, driverId: session.courierProfileId });
  }

  @Post("deliveries/:deliveryId/location")
  sendLocation(@Headers("authorization") authorization: string | undefined, @Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    this.internalAuth.requireCourierToken(authorization);
    const input = courierLocationInputSchema.parse(body);
    return updateCourierLocation(deliveryId, input);
  }

  @Post("deliveries/:deliveryId/complete")
  completeDelivery(@Headers("authorization") authorization: string | undefined, @Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    this.internalAuth.requireCourierToken(authorization);
    const input = courierCompleteDeliveryInputSchema.parse(body);
    return completeDeliveryWithCode(deliveryId, input.confirmationCode);
  }
}
