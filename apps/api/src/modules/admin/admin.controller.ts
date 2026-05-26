import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post } from "@nestjs/common";

import { MvpDispatchEngine } from "@hull-eats/dispatch-engine";
import { createHubInputSchema, createHubUserInputSchema, manualDriverAssignmentSchema, updateAdminHubLifecycleInputSchema } from "@hull-eats/types";

import { HubRegistryService } from "../../common/hub-registry.service";
import { InternalAuthService } from "../../common/internal-auth.service";
import { CourierRegistryService } from "../../common/courier-registry.service";
import { CustomerRegistryService } from "../../common/customer-registry.service";
import { ContactMessagesService } from "../../common/contact-messages.service";
import { listAdminOrders } from "../../common/order-repository";

@Controller("admin")
export class AdminController {
  private readonly dispatchEngine = new MvpDispatchEngine();
  constructor(
    @Inject(HubRegistryService)
    private readonly hubRegistry: HubRegistryService,
    @Inject(InternalAuthService)
    private readonly internalAuth: InternalAuthService,
    @Inject(CourierRegistryService)
    private readonly courierRegistry: CourierRegistryService,
    @Inject(CustomerRegistryService)
    private readonly customerRegistry: CustomerRegistryService,
    @Inject(ContactMessagesService)
    private readonly contactMessages: ContactMessagesService,
  ) {}

  @Post("auth/login")
  login(@Body() body: { email?: string; password?: string }) {
    return this.internalAuth.loginAdmin(body.email ?? "", body.password ?? "");
  }

  @Get("hubs")
  listHubs(@Headers("authorization") authorization?: string) {
    this.internalAuth.requireAdminToken(authorization);
    return this.hubRegistry.listHubs();
  }

  @Get("users")
  listHubUsers(@Headers("authorization") authorization?: string) {
    this.internalAuth.requireAdminToken(authorization);
    return this.hubRegistry.listHubUsers();
  }

  @Get("customers")
  listCustomers(@Headers("authorization") authorization?: string) {
    this.internalAuth.requireAdminToken(authorization);
    return this.customerRegistry.listCustomers();
  }

  @Patch("customers/:customerProfileId")
  updateCustomer(
    @Headers("authorization") authorization: string | undefined,
    @Param("customerProfileId") customerProfileId: string,
    @Body() body: any,
  ) {
    this.internalAuth.requireAdminToken(authorization);
    return this.customerRegistry.updateCustomer(customerProfileId, body);
  }

  @Post("hubs")
  createHub(@Headers("authorization") authorization: string | undefined, @Body() body: unknown) {
    this.internalAuth.requireAdminToken(authorization);
    const input = createHubInputSchema.parse(body);
    return this.hubRegistry.createHub(input);
  }

  @Delete("hubs/:hubId")
  deleteHub(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string) {
    this.internalAuth.requireAdminToken(authorization);
    return this.hubRegistry.deleteHub(hubId);
  }

  @Post("hubs/:hubId/publish")
  publishHub(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string) {
    this.internalAuth.requireAdminToken(authorization);
    return this.hubRegistry.publishHub(hubId);
  }

  @Patch("hubs/:hubId/lifecycle")
  updateHubLifecycle(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    this.internalAuth.requireAdminToken(authorization);
    const input = updateAdminHubLifecycleInputSchema.parse(body);
    return this.hubRegistry.updateAdminHubLifecycle(hubId, input);
  }

  @Post("hubs/:hubId/users")
  createHubUser(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    this.internalAuth.requireAdminToken(authorization);
    const input = createHubUserInputSchema.parse(body);
    return this.hubRegistry.createHubUser(hubId, input, "owner");
  }

  @Post("merchants")
  createMerchant(@Headers("authorization") authorization: string | undefined, @Body() body: Record<string, unknown>) {
    this.internalAuth.requireAdminToken(authorization);
    return { status: "created", entity: "merchant", payload: body };
  }

  @Post("stores")
  createStore(@Headers("authorization") authorization: string | undefined, @Body() body: Record<string, unknown>) {
    this.internalAuth.requireAdminToken(authorization);
    return { status: "created", entity: "store", payload: body };
  }

  @Patch("stores/:storeId")
  updateStore(
    @Headers("authorization") authorization: string | undefined,
    @Param("storeId") storeId: string,
    @Body() body: Record<string, unknown>,
  ) {
    this.internalAuth.requireAdminToken(authorization);
    return { status: "updated", entity: "store", storeId, payload: body };
  }

  @Post("stores/:storeId/menu-items")
  createMenuItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("storeId") storeId: string,
    @Body() body: Record<string, unknown>,
  ) {
    this.internalAuth.requireAdminToken(authorization);
    return { status: "created", entity: "menu-item", storeId, payload: body };
  }

  @Patch("menu-items/:itemId")
  updateMenuItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("itemId") itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    this.internalAuth.requireAdminToken(authorization);
    return { status: "updated", entity: "menu-item", itemId, payload: body };
  }

  @Post("media")
  createMediaAsset(@Headers("authorization") authorization: string | undefined, @Body() body: Record<string, unknown>) {
    this.internalAuth.requireAdminToken(authorization);
    return { status: "created", entity: "media-asset", payload: body };
  }

  @Post("stores/:storeId/zones")
  createZone(
    @Headers("authorization") authorization: string | undefined,
    @Param("storeId") storeId: string,
    @Body() body: Record<string, unknown>,
  ) {
    this.internalAuth.requireAdminToken(authorization);
    return { status: "created", entity: "delivery-zone", storeId, payload: body };
  }

  @Get("couriers")
  listCouriers(@Headers("authorization") authorization?: string) {
    this.internalAuth.requireAdminToken(authorization);
    return this.courierRegistry.listCouriers();
  }

  @Post("hubs/:hubId/couriers")
  createHubCourier(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    this.internalAuth.requireAdminToken(authorization);
    return this.hubRegistry.createHubCourier(hubId, body);
  }

  @Delete("hubs/:hubId/couriers/:courierProfileId/assignment")
  removeHubCourierAssignment(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("courierProfileId") courierProfileId: string,
  ) {
    this.internalAuth.requireAdminToken(authorization);
    return this.hubRegistry.removeHubCourierAssignment(hubId, courierProfileId);
  }

  @Post("couriers")
  createCourier(@Headers("authorization") authorization: string | undefined, @Body() body: any) {
    this.internalAuth.requireAdminToken(authorization);
    return this.courierRegistry.createCourier(body);
  }

  @Patch("couriers/:courierProfileId")
  updateCourier(
    @Headers("authorization") authorization: string | undefined,
    @Param("courierProfileId") courierProfileId: string,
    @Body() body: any,
  ) {
    this.internalAuth.requireAdminToken(authorization);
    return this.courierRegistry.updateCourier(courierProfileId, body);
  }

  @Delete("couriers/:courierProfileId")
  deleteCourier(@Headers("authorization") authorization: string | undefined, @Param("courierProfileId") courierProfileId: string) {
    this.internalAuth.requireAdminToken(authorization);
    return this.courierRegistry.deleteCourier(courierProfileId);
  }

  @Post("drivers")
  createDriver(@Headers("authorization") authorization: string | undefined, @Body() body: any) {
    this.internalAuth.requireAdminToken(authorization);
    return this.courierRegistry.createCourier(body);
  }

  @Get("orders")
  listOrders(@Headers("authorization") authorization?: string) {
    this.internalAuth.requireAdminToken(authorization);
    return listAdminOrders();
  }

  @Get("contact-messages")
  listContactMessages(@Headers("authorization") authorization?: string) {
    this.internalAuth.requireAdminToken(authorization);
    return this.contactMessages.listMessages();
  }

  @Patch("contact-messages/:messageId/status")
  updateContactMessageStatus(
    @Headers("authorization") authorization: string | undefined,
    @Param("messageId") messageId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireAdminToken(authorization);
    return this.contactMessages.updateStatus(messageId, body, session.email);
  }

  @Post("orders/:orderId/assign-driver")
  assignDriver(
    @Headers("authorization") authorization: string | undefined,
    @Param("orderId") orderId: string,
    @Body() body: unknown,
  ) {
    this.internalAuth.requireAdminToken(authorization);
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
