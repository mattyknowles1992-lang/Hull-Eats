import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";

import { MockPrinterAdapter } from "@hull-eats/printer";
import { merchantAcceptOrderSchema, merchantRejectOrderSchema, printJobPayloadSchema } from "@hull-eats/types";

import { demoMenuByStore, demoOrders } from "../../common/demo-data";

const fallbackOrder = demoOrders[0]!;

@Controller("merchant")
export class MerchantController {
  private readonly printer = new MockPrinterAdapter();

  @Get("orders")
  listOrders() {
    return demoOrders;
  }

  @Get("orders/:orderId")
  getOrder(@Param("orderId") orderId: string) {
    return demoOrders.find((order) => order.id === orderId || order.orderNumber === orderId) ?? fallbackOrder;
  }

  @Get("catalog/items")
  listCatalogItems() {
    return Object.values(demoMenuByStore).flat();
  }

  @Patch("catalog/items/:itemId")
  updateCatalogItem(@Param("itemId") itemId: string, @Body() body: Record<string, unknown>) {
    return { status: "updated", entity: "menu-item", itemId, payload: body };
  }

  @Patch("catalog/items/:itemId/stock")
  updateCatalogItemStock(@Param("itemId") itemId: string, @Body() body: Record<string, unknown>) {
    return { status: "updated", entity: "menu-item-stock", itemId, payload: body };
  }

  @Post("orders/:orderId/accept")
  acceptOrder(@Param("orderId") orderId: string, @Body() body: unknown) {
    const input = merchantAcceptOrderSchema.parse(body);
    const order = demoOrders.find((entry) => entry.id === orderId || entry.orderNumber === orderId) ?? fallbackOrder;

    return {
      ...order,
      status: "accepted",
      prepTimeMinutes: input.prepTimeMinutes,
    };
  }

  @Post("orders/:orderId/reject")
  rejectOrder(@Param("orderId") orderId: string, @Body() body: unknown) {
    merchantRejectOrderSchema.parse(body);
    const order = demoOrders.find((entry) => entry.id === orderId || entry.orderNumber === orderId) ?? fallbackOrder;

    return {
      ...order,
      status: "rejected",
    };
  }

  @Post("orders/:orderId/prep-time")
  updatePrepTime(@Param("orderId") orderId: string, @Body() body: { prepTimeMinutes: number }) {
    const order = demoOrders.find((entry) => entry.id === orderId || entry.orderNumber === orderId) ?? fallbackOrder;

    return {
      ...order,
      status: "preparing",
      prepTimeMinutes: body.prepTimeMinutes,
    };
  }

  @Post("orders/:orderId/print")
  async printOrder(@Param("orderId") orderId: string) {
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
          name: "Margherita",
          quantity: 1,
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
