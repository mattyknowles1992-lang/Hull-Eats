import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post } from "@nestjs/common";

import { MockPrinterAdapter } from "@hull-eats/printer";
import {
  applyMenuImportInputSchema,
  changeHubPasswordInputSchema,
  createHubMenuItemInputSchema,
  createHubMenuSectionInputSchema,
  createHubUserInputSchema,
  merchantAcceptOrderSchema,
  merchantLoginInputSchema,
  merchantRejectOrderSchema,
  merchantWorkspaceUpdateInputSchema,
  previewMenuImportInputSchema,
  previewMenuTextImportInputSchema,
  printJobPayloadSchema,
} from "@hull-eats/types";

import { demoMenuByStore, demoOrders } from "../../common/demo-data";
import { HubRegistryService } from "../../common/hub-registry.service";
import { InternalAuthService } from "../../common/internal-auth.service";

const fallbackOrder = demoOrders[0]!;

@Controller("merchant")
export class MerchantController {
  private readonly printer = new MockPrinterAdapter();
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
    this.internalAuth.requireMerchantToken(authorization, hubId);
    const input = merchantWorkspaceUpdateInputSchema.parse(body);
    return this.hubRegistry.updateWorkspace(hubId, input);
  }

  @Post("hubs/:hubId/users")
  createHubUser(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
    const input = createHubUserInputSchema.parse(body);
    return this.hubRegistry.createHubUser(hubId, input);
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
    this.internalAuth.requireMerchantToken(authorization, hubId);
    return this.hubRegistry.deleteHubUser(hubId, userId);
  }

  @Post("hubs/:hubId/menu-sections")
  createMenuSection(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
    const input = createHubMenuSectionInputSchema.parse(body);
    return this.hubRegistry.createMenuSection(hubId, input);
  }

  @Delete("hubs/:hubId/menu-sections/:sectionId")
  deleteMenuSection(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("sectionId") sectionId: string,
  ) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
    return this.hubRegistry.deleteMenuSection(hubId, sectionId);
  }

  @Post("hubs/:hubId/menu-sections/:sectionId/items")
  createMenuItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("sectionId") sectionId: string,
    @Body() body: unknown,
  ) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
    const input = createHubMenuItemInputSchema.parse(body);
    return this.hubRegistry.createMenuItem(hubId, sectionId, input);
  }

  @Delete("hubs/:hubId/menu-items/:itemId")
  deleteMenuItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Param("itemId") itemId: string,
  ) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
    return this.hubRegistry.deleteMenuItem(hubId, itemId);
  }

  @Post("hubs/:hubId/menu-imports/preview")
  previewMenuImport(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
    const input = previewMenuImportInputSchema.parse(body);
    return this.hubRegistry.previewMenuImport(hubId, input);
  }

  @Post("hubs/:hubId/menu-imports/text-preview")
  previewMenuTextImport(
    @Headers("authorization") authorization: string | undefined,
    @Param("hubId") hubId: string,
    @Body() body: unknown,
  ) {
    this.internalAuth.requireMerchantToken(authorization, hubId);
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
    this.internalAuth.requireMerchantToken(authorization, hubId);
    const input = applyMenuImportInputSchema.parse(body);
    return this.hubRegistry.applyMenuImport(hubId, importId, input);
  }

  @Get("orders")
  listOrders(@Headers("authorization") authorization?: string) {
    this.internalAuth.requireMerchantToken(authorization);
    return demoOrders;
  }

  @Get("orders/:orderId")
  getOrder(@Headers("authorization") authorization: string | undefined, @Param("orderId") orderId: string) {
    this.internalAuth.requireMerchantToken(authorization);
    return demoOrders.find((order) => order.id === orderId || order.orderNumber === orderId) ?? fallbackOrder;
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
    this.internalAuth.requireMerchantToken(authorization);
    return { status: "updated", entity: "menu-item", itemId, payload: body };
  }

  @Patch("catalog/items/:itemId/stock")
  updateCatalogItemStock(
    @Headers("authorization") authorization: string | undefined,
    @Param("itemId") itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    this.internalAuth.requireMerchantToken(authorization);
    return { status: "updated", entity: "menu-item-stock", itemId, payload: body };
  }

  @Post("orders/:orderId/accept")
  acceptOrder(
    @Headers("authorization") authorization: string | undefined,
    @Param("orderId") orderId: string,
    @Body() body: unknown,
  ) {
    this.internalAuth.requireMerchantToken(authorization);
    const input = merchantAcceptOrderSchema.parse(body);
    const order = demoOrders.find((entry) => entry.id === orderId || entry.orderNumber === orderId) ?? fallbackOrder;

    return {
      ...order,
      status: "accepted",
      prepTimeMinutes: input.prepTimeMinutes,
    };
  }

  @Post("orders/:orderId/reject")
  rejectOrder(
    @Headers("authorization") authorization: string | undefined,
    @Param("orderId") orderId: string,
    @Body() body: unknown,
  ) {
    this.internalAuth.requireMerchantToken(authorization);
    merchantRejectOrderSchema.parse(body);
    const order = demoOrders.find((entry) => entry.id === orderId || entry.orderNumber === orderId) ?? fallbackOrder;

    return {
      ...order,
      status: "rejected",
    };
  }

  @Post("orders/:orderId/prep-time")
  updatePrepTime(
    @Headers("authorization") authorization: string | undefined,
    @Param("orderId") orderId: string,
    @Body() body: { prepTimeMinutes: number },
  ) {
    this.internalAuth.requireMerchantToken(authorization);
    const order = demoOrders.find((entry) => entry.id === orderId || entry.orderNumber === orderId) ?? fallbackOrder;

    return {
      ...order,
      status: "preparing",
      prepTimeMinutes: body.prepTimeMinutes,
    };
  }

  @Post("orders/:orderId/print")
  async printOrder(@Headers("authorization") authorization: string | undefined, @Param("orderId") orderId: string) {
    this.internalAuth.requireMerchantToken(authorization);
    const order = demoOrders.find((entry) => entry.id === orderId || entry.orderNumber === orderId) ?? fallbackOrder;
    const payload = printJobPayloadSchema.parse({
      orderId,
      storeId: order.storeId,
      printerId: "printer-pizza-main",
      orderNumber: order.orderNumber,
      customerName: "Preview Customer",
      placedAtIso: new Date().toISOString(),
      prepTimeMinutes: order.prepTimeMinutes,
      lines: [
        {
          name: "The Piggy Cow",
          quantity: 1,
          components: [
            { label: "Bun", quantity: 1, removed: false },
            { label: "3oz beef burger", quantity: 1, removed: false },
            { label: "3oz beef burger", quantity: 1, removed: false },
            { label: "Cheese", quantity: 1, removed: false },
            { label: "Cheese", quantity: 1, removed: false },
            { label: "Onions", quantity: 1, removed: true },
            { label: "Gherkins", quantity: 1, removed: false },
            { label: "Lettuce", quantity: 1, removed: false },
          ],
          selectedOptions: [
            { groupName: "Make it a meal", valueName: "Make it a meal", quantity: 1, priceDelta: 4.5 },
            { groupName: "Fries", valueName: "Cheesy fries", quantity: 1, priceDelta: 1.5 },
            { groupName: "Can", valueName: "Diet Coke", quantity: 1, priceDelta: 0 },
          ],
        },
      ],
    });

    return this.printer.printOrderSlip(
      {
        id: "printer-pizza-main",
        storeId: order.storeId,
        name: "Kitchen Printer",
        adapterType: "mock",
        config: { channel: "stdout" },
      },
      payload,
    );
  }
}
