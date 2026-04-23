import { Controller, Get, Param, Post } from "@nestjs/common";

@Controller("courier")
export class CourierController {
  @Get("jobs")
  listJobs() {
    return [
      {
        deliveryId: "delivery_HE_1002",
        orderNumber: "HE-1002",
        status: "assigned",
        pickupAddress: "88 Beverley Road, Hull",
        dropoffAddress: "99 Spring Bank, Hull",
      },
    ];
  }

  @Post("deliveries/:deliveryId/accept")
  acceptDelivery(@Param("deliveryId") deliveryId: string) {
    return { deliveryId, status: "accepted", acceptedAt: new Date().toISOString() };
  }

  @Post("deliveries/:deliveryId/picked-up")
  markPickedUp(@Param("deliveryId") deliveryId: string) {
    return { deliveryId, status: "picked_up", pickedUpAt: new Date().toISOString() };
  }

  @Post("deliveries/:deliveryId/delivered")
  markDelivered(@Param("deliveryId") deliveryId: string) {
    return { deliveryId, status: "delivered", deliveredAt: new Date().toISOString() };
  }
}
