import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";

import { MvpDispatchEngine } from "@hull-eats/dispatch-engine";
import { manualDriverAssignmentSchema } from "@hull-eats/types";

import { demoOrders } from "../../common/demo-data";

@Controller("admin")
export class AdminController {
  private readonly dispatchEngine = new MvpDispatchEngine();

  @Post("merchants")
  createMerchant(@Body() body: Record<string, unknown>) {
    return { status: "created", entity: "merchant", payload: body };
  }

  @Post("stores")
  createStore(@Body() body: Record<string, unknown>) {
    return { status: "created", entity: "store", payload: body };
  }

  @Patch("stores/:storeId")
  updateStore(@Param("storeId") storeId: string, @Body() body: Record<string, unknown>) {
    return { status: "updated", entity: "store", storeId, payload: body };
  }

  @Post("stores/:storeId/menu-items")
  createMenuItem(@Param("storeId") storeId: string, @Body() body: Record<string, unknown>) {
    return { status: "created", entity: "menu-item", storeId, payload: body };
  }

  @Patch("menu-items/:itemId")
  updateMenuItem(@Param("itemId") itemId: string, @Body() body: Record<string, unknown>) {
    return { status: "updated", entity: "menu-item", itemId, payload: body };
  }

  @Post("media")
  createMediaAsset(@Body() body: Record<string, unknown>) {
    return { status: "created", entity: "media-asset", payload: body };
  }

  @Post("stores/:storeId/zones")
  createZone(@Param("storeId") storeId: string, @Body() body: Record<string, unknown>) {
    return { status: "created", entity: "delivery-zone", storeId, payload: body };
  }

  @Post("drivers")
  createDriver(@Body() body: Record<string, unknown>) {
    return { status: "created", entity: "driver", payload: body };
  }

  @Get("orders")
  listOrders() {
    return demoOrders;
  }

  @Post("orders/:orderId/assign-driver")
  assignDriver(@Param("orderId") orderId: string, @Body() body: unknown) {
    const input = manualDriverAssignmentSchema.parse(body);
    const decision = this.dispatchEngine.assignManually({
      orderId,
      deliveryZoneId: "zone-firebrick-local-mart-main",
      requestedCourierProfileId: input.courierProfileId,
      availableDrivers: [
        {
          courierProfileId: "courier-profile-1",
          isActive: true,
          currentDeliveryCount: 1,
          zoneIds: ["zone-firebrick-local-mart-main"],
        },
      ],
    });

    return {
      orderId,
      courierProfileId: input.courierProfileId,
      decision,
    };
  }
}
