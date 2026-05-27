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
  merchantPasswordResetCompleteInputSchema,
  merchantPasswordResetRequestInputSchema,
  merchantPasswordResetVerifyInputSchema,
  merchantRejectOrderSchema,
  createHubConfigSnapshotInputSchema,
  parseMerchantWorkspaceUpdateInput,
  previewMenuImportInputSchema,
  previewMenuTextImportInputSchema,
  renameHubConfigSnapshotInputSchema,
  updateHubUserLocaleInputSchema,
} from "@hull-eats/types";

import { HubRegistryService } from "../../common/hub-registry.service";
import { requireHubPermission } from "../../common/hub-permissions";
import { InternalAuthService } from "../../common/internal-auth.service";
import type { MembershipRole } from "@hull-eats/types";
import { ContactMessagesService } from "../../common/contact-messages.service";
import { MerchantPasswordResetService } from "../../common/merchant-password-reset.service";
import { geocodeUkPostcode } from "../../common/uk-postcode-geocode";
import {
  buildMerchantOrderReceipt,
  findMerchantOrder,
  listMerchantDriverCashUp,
  listMerchantOrderHistory,
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
    @Inject(ContactMessagesService)
    private readonly contactMessages: ContactMessagesService,
    @Inject(MerchantPasswordResetService)
    private readonly passwordResets: MerchantPasswordResetService,
  ) {}

  @Post("auth/login")
  async login(@Body() body: unknown) {
    const input = merchantLoginInputSchema.parse(body);
    const authenticated = await this.hubRegistry.authenticate(input.username, input.password);
    return {
      token: this.internalAuth.issueMerchantToken(authenticated.session),
      user: authenticated.user,
      workspace: authenticated.workspace,
    };
  }

  @Post("auth/password-reset/request")
  async requestPasswordReset(
    @Body() body: unknown,
    @Headers("x-forwarded-for") forwardedFor: string | undefined,
    @Headers("user-agent") userAgent: string | undefined,
  ) {
    const input = merchantPasswordResetRequestInputSchema.parse(body);
    return this.passwordResets.requestPasswordReset(input, {
      ipAddress: forwardedFor?.split(",")[0]?.trim(),
      userAgent,
    });
  }

  @Post("auth/password-reset/verify")
  async verifyPasswordReset(@Body() body: unknown) {
    const input = merchantPasswordResetVerifyInputSchema.parse(body);
    return this.passwordResets.verifyPasswordReset(input);
  }

  @Post("auth/password-reset/complete")
  async completePasswordReset(@Body() body: unknown) {
    const input = merchantPasswordResetCompleteInputSchema.parse(body);
    return this.passwordResets.completePasswordReset(input);
  }

  @Get("hubs/:hubId/workspace")
  async getWorkspace(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string) {
    await this.internalAuth.requireMerchantToken(authorization, hubId);
    return this.hubRegistry.getWorkspaceById(hubId);
  }

  @Patch("hubs/:hubId/workspace")
  async updateWorkspace(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = parseMerchantWorkspaceUpdateInput(body);
    return this.hubRegistry.updateWorkspace(hubId, input);
  }

  @Get("hubs/:hubId/config-snapshots")
  async listHubConfigSnapshots(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string) {
    await this.internalAuth.requireMerchantToken(authorization, hubId);
    return this.hubRegistry.listHubConfigSnapshots(hubId);
  }

  @Post("hubs/:hubId/config-snapshots")
  async createHubConfigSnapshot(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = createHubConfigSnapshotInputSchema.parse(body);
    return this.hubRegistry.createHubConfigSnapshot(hubId, input);
  }

  @Patch("hubs/:hubId/config-snapshots/:snapshotId")
  async renameHubConfigSnapshot(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("snapshotId") snapshotId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = renameHubConfigSnapshotInputSchema.parse(body);
    return this.hubRegistry.renameHubConfigSnapshot(hubId, snapshotId, input);
  }

  @Post("hubs/:hubId/config-snapshots/:snapshotId/restore")
  async restoreHubConfigSnapshot(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("snapshotId") snapshotId: string,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
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
    await this.internalAuth.requireMerchantToken(authorization, hubId);
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
  async createHubUser(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canManageUsers");
    const input = createHubUserInputSchema.parse(body);
    return this.hubRegistry.createHubUser(hubId, input, session.role as MembershipRole);
  }

  @Post("hubs/:hubId/password")
  async changePassword(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    const input = changeHubPasswordInputSchema.parse(body);
    return this.hubRegistry.changeHubUserPassword(hubId, session.sub, input);
  }

  @Patch("hubs/:hubId/me/locale")
  async updateMyLocale(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    const input = updateHubUserLocaleInputSchema.parse(body);
    return this.hubRegistry.updateHubUserPreferredLocale(hubId, session.sub, input.preferredLocale);
  }

  @Delete("hubs/:hubId/users/:userId")
  async deleteHubUser(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("userId") userId: string,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canManageUsers");
    return this.hubRegistry.deleteHubUser(hubId, userId);
  }

  @Post("hubs/:hubId/menu-sections")
  async createMenuSection(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = createHubMenuSectionInputSchema.parse(body);
    return this.hubRegistry.createMenuSection(hubId, input);
  }

  @Delete("hubs/:hubId/menu-sections/:sectionId")
  async deleteMenuSection(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("sectionId") sectionId: string,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    return this.hubRegistry.deleteMenuSection(hubId, sectionId);
  }

  @Post("hubs/:hubId/menu-sections/:sectionId/items")
  async createMenuItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("sectionId") sectionId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = createHubMenuItemInputSchema.parse(body);
    return this.hubRegistry.createMenuItem(hubId, sectionId, input);
  }

  @Delete("hubs/:hubId/menu-items/:itemId")
  async deleteMenuItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("itemId") itemId: string,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    return this.hubRegistry.deleteMenuItem(hubId, itemId);
  }

  @Post("hubs/:hubId/menu-imports/preview")
  async previewMenuImport(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = previewMenuImportInputSchema.parse(body);
    return this.hubRegistry.previewMenuImport(hubId, input);
  }

  @Post("hubs/:hubId/menu-imports/text-preview")
  async previewMenuTextImport(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = previewMenuTextImportInputSchema.parse(body);
    return this.hubRegistry.previewMenuTextImport(hubId, input);
  }

  @Post("hubs/:hubId/menu-imports/:importId/apply")
  async applyMenuImport(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("importId") importId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    const input = applyMenuImportInputSchema.parse(body);
    return this.hubRegistry.applyMenuImport(hubId, importId, input);
  }

  @Get("hubs/:hubId/promotions")
  async listPromotions(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string) {
    await this.internalAuth.requireMerchantToken(authorization, hubId);
    return this.hubRegistry.listStorePromotions(hubId);
  }

  @Post("hubs/:hubId/promotions")
  async createPromotion(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    return this.hubRegistry.createStorePromotion(hubId, body);
  }

  @Patch("hubs/:hubId/promotions/:promotionId")
  async updatePromotion(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("promotionId") promotionId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    return this.hubRegistry.updateStorePromotion(hubId, promotionId, body);
  }

  @Delete("hubs/:hubId/promotions/:promotionId")
  async deletePromotion(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("promotionId") promotionId: string,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canEditWorkspace");
    return this.hubRegistry.deleteStorePromotion(hubId, promotionId);
  }

  @Get("orders")
  async listOrders(@Headers("authorization") authorization?: string) {
    const session = await this.internalAuth.requireMerchantToken(authorization);
    return listMerchantOrders(session.hubId!);
  }

  @Get("orders/history")
  async listOrderHistory(@Headers("authorization") authorization?: string) {
    const session = await this.internalAuth.requireMerchantToken(authorization);
    return listMerchantOrderHistory(session.hubId!);
  }

  @Get("drivers/tracking")
  async listDriverTracking(@Headers("authorization") authorization?: string) {
    const session = await this.internalAuth.requireMerchantToken(authorization);
    return listMerchantDriverTracking(session.hubId!);
  }

  @Get("hubs/:hubId/drivers/cash-up")
  async driverCashUp(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Query("period") period?: string,
  ) {
    await this.internalAuth.requireMerchantToken(authorization, hubId);
    const parsed = merchantDriverCashUpPeriodSchema.safeParse(period ?? "today");
    if (!parsed.success) {
      throw new BadRequestException("period must be today, yesterday, or last_7_days.");
    }
    return listMerchantDriverCashUp(hubId, parsed.data);
  }

  @Get("hubs/:hubId/drivers/assignments")
  async listHubCourierAssignments(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string) {
    await this.internalAuth.requireMerchantToken(authorization, hubId);
    return this.hubRegistry.listHubCourierAssignments(hubId);
  }

  @Post("hubs/:hubId/drivers")
  async createHubCourier(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string, @Body() body: unknown) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canOperateOrders");
    return this.hubRegistry.createHubCourier(hubId, body);
  }

  @Post("hubs/:hubId/drivers/assignments")
  async addHubCourierAssignment(@Headers("authorization") authorization: string | undefined, @Param("hubId") hubId: string, @Body() body: unknown) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canOperateOrders");
    return this.hubRegistry.addHubCourierAssignment(hubId, body);
  }

  @Delete("hubs/:hubId/drivers/assignments/:courierProfileId")
  async removeHubCourierAssignment(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("courierProfileId") courierProfileId: string,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    requireHubPermission(session.role, "canOperateOrders");
    return this.hubRegistry.removeHubCourierAssignment(hubId, courierProfileId);
  }

  @Post("hubs/:hubId/contact-messages")
  async createHubContactMessage(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization, hubId);
    return this.contactMessages.createMerchantMessage(hubId, session.sub, body);
  }

  @Get("orders/:orderId")
  async getOrder(@Headers("authorization") authorization: string | undefined, @Param("orderId") orderId: string) {
    const session = await this.internalAuth.requireMerchantToken(authorization);
    const order = await findMerchantOrder(session.hubId!, orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} was not found for this hub.`);
    }

    return order;
  }

  @Get("catalog/items")
  async listCatalogItems(@Headers("authorization") authorization?: string) {
    const session = await this.internalAuth.requireMerchantToken(authorization);
    const workspace = await this.hubRegistry.getWorkspaceById(session.hubId!);
    return workspace.menuSections.flatMap((section) => section.items);
  }

  @Patch("catalog/items/:itemId")
  async updateCatalogItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("itemId") itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization);
    requireHubPermission(session.role, "canEditWorkspace");
    return { status: "updated", entity: "menu-item", itemId, payload: body };
  }

  @Patch("catalog/items/:itemId/stock")
  async updateCatalogItemStock(
    @Headers("authorization") authorization: string | undefined,
    @Param("itemId") itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization);
    requireHubPermission(session.role, "canEditWorkspace");
    return { status: "updated", entity: "menu-item-stock", itemId, payload: body };
  }

  @Post("orders/:orderId/accept")
  async acceptOrder(
    @Headers("authorization") authorization: string | undefined,
    @Param("orderId") orderId: string,
    @Body() body: unknown,
  ) {
    const session = await this.internalAuth.requireMerchantToken(authorization);
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
    const session = await this.internalAuth.requireMerchantToken(authorization);
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
    const session = await this.internalAuth.requireMerchantToken(authorization);
    requireHubPermission(session.role, "canOperateOrders");
    return updateMerchantOrder(session.hubId!, orderId, {
      status: "PREPARING",
      note: `Merchant updated prep time to ${body.prepTimeMinutes} minutes.`,
      prepTimeMinutes: body.prepTimeMinutes,
    });
  }

  @Post("orders/:orderId/print")
  async printOrder(@Headers("authorization") authorization: string | undefined, @Param("orderId") orderId: string) {
    const session = await this.internalAuth.requireMerchantToken(authorization);
    requireHubPermission(session.role, "canOperateOrders");
    return queueMerchantOrderReceiptPrint(session.hubId!, orderId);
  }

  @Get("orders/:orderId/receipt")
  async getOrderReceipt(@Headers("authorization") authorization: string | undefined, @Param("orderId") orderId: string) {
    const session = await this.internalAuth.requireMerchantToken(authorization);
    return buildMerchantOrderReceipt(session.hubId!, orderId);
  }
}
