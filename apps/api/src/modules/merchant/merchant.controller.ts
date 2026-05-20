import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import {
  applyMenuImportInputSchema,
  changeHubPasswordInputSchema,
  createHubMenuItemInputSchema,
  createHubMenuSectionInputSchema,
  createHubUserInputSchema,
  merchantAcceptOrderSchema,
  merchantDriverCashUpPeriodSchema,
  merchantLoginInputSchema,
  merchantRejectOrderSchema,
  createHubConfigSnapshotInputSchema,
  parseMerchantWorkspaceUpdateInput,
  previewMenuImportInputSchema,
  previewMenuTextImportInputSchema,
  renameHubConfigSnapshotInputSchema,
} from "@hull-eats/types";

import { demoMenuByStore } from "../../common/demo-data";
import { HubRegistryService } from "../../common/hub-registry.service";
import { requireHubPermission } from "../../common/hub-permissions";
import { InternalAuthService } from "../../common/internal-auth.service";
import type { MembershipRole } from "@hull-eats/types";
import { geocodeUkPostcode } from "../../common/uk-postcode-geocode";
import {
  buildMerchantOrderReceipt,
  findMerchantOrder,
  listMerchantDriverCashUp,
  listMerchantDriverTracking,
  listMerchantOrders,
  queueMerchantOrderReceiptPrint,
  updateMerchantOrder,
} from "../../common/order-repository";

@Controller("merchant")
export class MerchantController {
  constructor(
    @Inject(HubRegistryService)
    private readonly hubRegistry: HubRegistryService,
    @Inject(InternalAuthService)
    private readonly internalAuth: InternalAuthService,
  ) {}

  @Post("auth/login")
  async login(@Body() body: unknown) {
    const input = merchantLoginInputSchema.parse(body);
    const authenticated = await this.hubRegistry.authenticate(input.username, input.password);
    return {
      token: this.internalAuth.issueMerchantToken(authenticated.user),
      ...authenticated,
    };
  }

  @Get("hubs/:hubId/workspace")
  getWorkspace(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
    return this.hubRegistry.getWorkspaceById(hubId);
  }

  @Patch("hubs/:hubId/workspace")
  updateWorkspace(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = parseMerchantWorkspaceUpdateInput(body);
    return this.hubRegistry.updateWorkspace(hubId, input);
  }

  @Get("hubs/:hubId/config-snapshots")
  listHubConfigSnapshots(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
    return this.hubRegistry.listHubConfigSnapshots(hubId);
  }

  @Post("hubs/:hubId/config-snapshots")
  createHubConfigSnapshot(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = createHubConfigSnapshotInputSchema.parse(body);
    return this.hubRegistry.createHubConfigSnapshot(hubId, input);
  }

  @Patch("hubs/:hubId/config-snapshots/:snapshotId")
  renameHubConfigSnapshot(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("snapshotId") snapshotId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = renameHubConfigSnapshotInputSchema.parse(body);
    return this.hubRegistry.renameHubConfigSnapshot(hubId, snapshotId, input);
  }

  @Post("hubs/:hubId/config-snapshots/:snapshotId/restore")
  restoreHubConfigSnapshot(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("snapshotId") snapshotId: string,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    return this.hubRegistry.restoreHubConfigSnapshot(hubId, snapshotId);
  }

  /** Live UK postcode → coordinates for hub map pin (postcodes.io; optional Google fallback on API). */
  @Get("hubs/:hubId/geocode")
  async geocodeHubPostcode(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Query("postcode") postcode: string | undefined,
  ) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
    const trimmed = postcode?.trim() ?? "";
    if (!trimmed) {
      throw new BadRequestException("postcode query is required");
    }
    const point = await geocodeUkPostcode(trimmed);
    if (!point) {
      throw new BadRequestException("Could not find coordinates for that postcode. Check it is a valid UK postcode.");
    }
    return {
      latitude: point.latitude,
      longitude: point.longitude,
      source: point.source,
      label: point.label,
    };
  }

  @Post("hubs/:hubId/users")
  createHubUser(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canManageUsers");
    const input = createHubUserInputSchema.parse(body);
    return this.hubRegistry.createHubUser(hubId, input, session.role as MembershipRole);
  }

  @Post("hubs/:hubId/password")
  changePassword(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    const input = changeHubPasswordInputSchema.parse(body);
    return this.hubRegistry.changeHubUserPassword(hubId, session.sub, input);
  }

  @Delete("hubs/:hubId/users/:userId")
  deleteHubUser(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("userId") userId: string,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canManageUsers");
    return this.hubRegistry.deleteHubUser(hubId, userId);
  }

  @Post("hubs/:hubId/menu-sections")
  createMenuSection(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = createHubMenuSectionInputSchema.parse(body);
    return this.hubRegistry.createMenuSection(hubId, input);
  }

  @Delete("hubs/:hubId/menu-sections/:sectionId")
  deleteMenuSection(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("sectionId") sectionId: string,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    return this.hubRegistry.deleteMenuSection(hubId, sectionId);
  }

  @Post("hubs/:hubId/menu-sections/:sectionId/items")
  createMenuItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("sectionId") sectionId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = createHubMenuItemInputSchema.parse(body);
    return this.hubRegistry.createMenuItem(hubId, sectionId, input);
  }

  @Delete("hubs/:hubId/menu-items/:itemId")
  deleteMenuItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("itemId") itemId: string,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    return this.hubRegistry.deleteMenuItem(hubId, itemId);
  }

  @Post("hubs/:hubId/menu-imports/preview")
  previewMenuImport(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = previewMenuImportInputSchema.parse(body);
    return this.hubRegistry.previewMenuImport(hubId, input);
  }

  @Post("hubs/:hubId/menu-imports/text-preview")
  previewMenuTextImport(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = previewMenuTextImportInputSchema.parse(body);
    return this.hubRegistry.previewMenuTextImport(hubId, input);
  }

  @Post("hubs/:hubId/menu-imports/:importId/apply")
  applyMenuImport(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("importId") importId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = applyMenuImportInputSchema.parse(body);
    return this.hubRegistry.applyMenuImport(hubId, importId, input);
  }

  @Get("hubs/:hubId/promotions")
  listPromotions(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
    return this.hubRegistry.listStorePromotions(hubId);
  }

  @Post("hubs/:hubId/promotions")
  createPromotion(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    return this.hubRegistry.createStorePromotion(hubId, body);
  }

  @Patch("hubs/:hubId/promotions/:promotionId")
  updatePromotion(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("promotionId") promotionId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    return this.hubRegistry.updateStorePromotion(hubId, promotionId, body);
  }

  @Delete("hubs/:hubId/promotions/:promotionId")
  deletePromotion(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("promotionId") promotionId: string,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    return this.hubRegistry.deleteStorePromotion(hubId, promotionId);
  }

  @Get("orders")
  async listOrders(@Headers("authorization") authorization?: string) {
    const session = this.internalAuth.requireMerchantToken(authorization);
    return listMerchantOrders(session.hubId!);
  }

  @Get("drivers/tracking")
  async listDriverTracking(@Headers("authorization") authorization?: string) {
    const session = this.internalAuth.requireMerchantToken(authorization);
    return listMerchantDriverTracking(session.hubId!);
  }

  @Get("hubs/:hubId/drivers/cash-up")
  async driverCashUp(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Query("period") period?: string,
  ) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
    const parsed = merchantDriverCashUpPeriodSchema.safeParse(period ?? "today");
    if (!parsed.success) {
      throw new BadRequestException("period must be today, yesterday, or last_7_days.");
    }
    return listMerchantDriverCashUp(hubId, parsed.data);
  }

  @Get("hubs/:hubId/drivers/assignments")
  listHubCourierAssignments(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
    return this.hubRegistry.listHubCourierAssignments(hubId);
  }

  @Post("hubs/:hubId/drivers/assignments")
  addHubCourierAssignment(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string, @Body() body: unknown) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canOperateOrders");
    return this.hubRegistry.addHubCourierAssignment(hubId, body);
  }

  @Delete("hubs/:hubId/drivers/assignments/:courierProfileId")
  removeHubCourierAssignment(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("courierProfileId") courierProfileId: string,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canOperateOrders");
    return this.hubRegistry.removeHubCourierAssignment(hubId, courierProfileId);
  }

  @Get("orders/:orderId")
  async getOrder(@Headers("authorization") authorization: string | undefined, @Param("orderId") orderId: string) {
    const session = this.internalAuth.requireMerchantToken(authorization);
    const order = await findMerchantOrder(session.hubId!, orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} was not found for this hub.`);
    }

    return order;
  }

  @Get("catalog/items")
  listCatalogItems(@Headers("authorization") authorization?: string) {
    this.internalAuth.requireMerchantToken(authorization);
    return Object.values(demoMenuByStore).flat();
  }

  @Patch("catalog/items/:itemId")
  updateCatalogItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("itemId") itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization);
    requireHubPermission(session.role, "canEditWorkspace");
    return { status: "updated", entity: "menu-item", itemId, payload: body };
  }

  @Patch("catalog/items/:itemId/stock")
  updateCatalogItemStock(
    @Headers("authorization") authorization: string | undefined,
    @Param("itemId") itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization);
    requireHubPermission(session.role, "canEditWorkspace");
    return { status: "updated", entity: "menu-item-stock", itemId, payload: body };
  }

  @Post("orders/:orderId/accept")
  async acceptOrder(
    @Headers("authorization") authorization: string | undefined,
    @Param("orderId") orderId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization);
    requireHubPermission(session.role, "canOperateOrders");
    const input = merchantAcceptOrderSchema.parse(body);
    return updateMerchantOrder(session.hubId!, orderId, {
      status: "ACCEPTED",
      note: `Merchant accepted order with ${input.prepTimeMinutes} minute prep time.`,
      prepTimeMinutes: input.prepTimeMinutes,
    });
  }

  @Post("orders/:orderId/reject")
  async rejectOrder(
    @Headers("authorization") authorization: string | undefined,
    @Param("orderId") orderId: string,
    @Body() body: unknown,
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization);
    requireHubPermission(session.role, "canOperateOrders");
    const input = merchantRejectOrderSchema.parse(body);
    return updateMerchantOrder(session.hubId!, orderId, {
      status: "REJECTED",
      note: `Merchant rejected order: ${input.reason}`,
    });
  }

  @Post("orders/:orderId/prep-time")
  async updatePrepTime(
    @Headers("authorization") authorization: string | undefined,
    @Param("orderId") orderId: string,
    @Body() body: { prepTimeMinutes: number },
  ) {
    const session = this.internalAuth.requireMerchantToken(authorization);
    requireHubPermission(session.role, "canOperateOrders");
    return updateMerchantOrder(session.hubId!, orderId, {
      status: "PREPARING",
      note: `Merchant updated prep time to ${body.prepTimeMinutes} minutes.`,
      prepTimeMinutes: body.prepTimeMinutes,
    });
  }

  @Post("orders/:orderId/print")
  async printOrder(@Headers("authorization") authorization: string | undefined, @Param("orderId") orderId: string) {
    const session = this.internalAuth.requireMerchantToken(authorization);
    requireHubPermission(session.role, "canOperateOrders");
    return queueMerchantOrderReceiptPrint(session.hubId!, orderId);
  }

  @Get("orders/:orderId/receipt")
  async getOrderReceipt(@Headers("authorization") authorization: string | undefined, @Param("orderId") orderId: string) {
    const session = this.internalAuth.requireMerchantToken(authorization);
    return buildMerchantOrderReceipt(session.hubId!, orderId);
  }
}
