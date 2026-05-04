import { Body, Controller, Get, Param, Post } from "@nestjs/common";

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

@Controller("courier")
export class CourierController {
  @Get("jobs")
  listJobs() {
    return listCourierJobs();
  }

  @Post("deliveries/start")
  startDelivery(@Body() body: unknown) {
    const input = courierStartDeliveryInputSchema.parse(body);
    return startDeliveryFromScan(input);
  }

  @Post("deliveries/:deliveryId/location")
  sendLocation(@Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    const input = courierLocationInputSchema.parse(body);
    return updateCourierLocation(deliveryId, input);
  }

  @Post("deliveries/:deliveryId/complete")
  completeDelivery(@Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    const input = courierCompleteDeliveryInputSchema.parse(body);
    return completeDeliveryWithCode(deliveryId, input.confirmationCode);
  }
}
