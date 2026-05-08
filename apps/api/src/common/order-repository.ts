import { NotFoundException } from "@nestjs/common";

import type { CheckoutSession, OrderSummary, PaymentStatus, PrintJobPayload } from "@hull-eats/types";
import { orderSummarySchema, printJobPayloadSchema } from "@hull-eats/types";
import { prisma } from "@hull-eats/db";

import { demoStores } from "./demo-data";

const toDbEnum = (value: string) => value.toUpperCase() as any;

const toApiEnum = <T extends string>(value: string) => value.toLowerCase() as T;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const orderLookupWhere = (orderIdOrNumber: string) => ({
  OR: [
    ...(uuidPattern.test(orderIdOrNumber) ? [{ id: orderIdOrNumber }] : []),
    { orderNumber: orderIdOrNumber },
  ],
});

const toOrderSummary = (order: {
  id: string;
  orderNumber: string;
  storeId: string;
  status: string;
  paymentStatus: string;
  fulfillmentType: string;
  source: string;
  totalAmount: unknown;
  currency: string;
  placedAt: Date;
  prepTimeMinutes: number | null;
}): OrderSummary =>
  orderSummarySchema.parse({
    id: order.id,
    orderNumber: order.orderNumber,
    storeId: order.storeId,
    status: toApiEnum(order.status),
    paymentStatus: toApiEnum(order.paymentStatus),
    fulfillmentType: toApiEnum(order.fulfillmentType),
    source: toApiEnum(order.source),
    totalAmount: Number(order.totalAmount),
    currency: order.currency,
    placedAt: order.placedAt.toISOString(),
    prepTimeMinutes: order.prepTimeMinutes,
  });

const buildOrderNumber = () => `HE-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90) + 10}`;

const resolveCheckoutStore = async (session: CheckoutSession) => {
  const demoStore = demoStores.find((store) => store.id === session.storeId || store.slug === session.storeId);
  const store = await prisma.store.findFirst({
    where: demoStore ? { slug: demoStore.slug } : { id: session.storeId },
  });

  if (!store) {
    throw new Error(`Persistent store was not found for checkout store ${session.storeId}.`);
  }

  return store;
};

const formatMoney = (value: unknown) => `£${Number(value).toFixed(2)}`;

const formatReceiptPreview = (
  payload: PrintJobPayload,
  order?: {
    paymentStatus?: string;
    customerPhone?: string;
    customerEmail?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postcode?: string | null;
    subtotalAmount?: unknown;
    deliveryFee?: unknown;
    totalAmount?: unknown;
    currency?: string;
  },
) =>
  [
    "HULL EATS ORDER",
    "================",
    `Order: ${payload.orderNumber}`,
    `Paid status: ${String(order?.paymentStatus ?? "pending").replaceAll("_", " ").toUpperCase()}`,
    `Customer: ${payload.customerName}`,
    order?.customerPhone ? `Phone: ${order.customerPhone}` : "",
    order?.customerEmail ? `Email: ${order.customerEmail}` : "",
    "Address:",
    `  ${[order?.addressLine1, order?.addressLine2, order?.city, order?.postcode].filter(Boolean).join(", ") || "Collection / no delivery address"}`,
    `Placed: ${new Date(payload.placedAtIso).toLocaleString("en-GB")}`,
    payload.prepTimeMinutes ? `Prep: ${payload.prepTimeMinutes} minutes` : "",
    "",
    "ITEMS",
    "-----",
    ...payload.lines.flatMap((line) => [
      `${line.quantity} x ${line.name}`,
      line.notes ? `  Note: ${line.notes}` : "",
      ...(line.components ?? []).map(
        (component) => `  - ${component.quantity} x ${component.label}${component.removed ? " / removed" : ""}`,
      ),
      ...(line.selectedOptions ?? []).map(
        (option) =>
          `  - ${option.quantity} x ${option.groupName}: ${option.valueName}${option.priceDelta > 0 ? ` (+${option.priceDelta.toFixed(2)})` : ""}`,
      ),
    ]),
    "",
    "TOTALS",
    "------",
    order?.subtotalAmount !== undefined ? `Subtotal: ${formatMoney(order.subtotalAmount)}` : "",
    order?.deliveryFee !== undefined ? `Delivery: ${formatMoney(order.deliveryFee)}` : "",
    order?.totalAmount !== undefined ? `Total: ${formatMoney(order.totalAmount)} ${order.currency ?? "GBP"}` : "",
    "",
    payload.notes ? `Order notes: ${payload.notes}` : "",
    "",
    "COURIER",
    "-------",
    payload.qrCodeData ? `QR: ${payload.qrCodeData}` : "",
    `Backup code: ${payload.orderNumber}`,
    "If the QR will not scan, enter the order number in the courier app.",
  ]
    .filter((line) => line !== "")
    .join("\n");

const buildCheckoutPrintPayload = (
  session: CheckoutSession,
  input: { orderId: string; orderNumber: string; storeId: string; printerId: string; placedAt: Date },
): PrintJobPayload =>
  printJobPayloadSchema.parse({
    orderId: input.orderId,
    storeId: input.storeId,
    printerId: input.printerId,
    orderNumber: input.orderNumber,
    trackingUrl: `${process.env.CUSTOMER_WEB_URL ?? "https://hull-eats.onrender.com"}/track/${encodeURIComponent(input.orderNumber)}`,
    qrCodeData: `${process.env.CUSTOMER_WEB_URL ?? "https://hull-eats.onrender.com"}/track/${encodeURIComponent(input.orderNumber)}`,
    customerName: session.customerName,
    placedAtIso: input.placedAt.toISOString(),
    prepTimeMinutes: null,
    notes: session.notes,
    lines: session.lineItems.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      notes: line.notes,
      components: line.components,
      selectedOptions: line.selectedOptions,
    })),
  });

const createPrintJobIfConfigured = async (session: CheckoutSession, order: { id: string; orderNumber: string; storeId: string; placedAt: Date }) => {
  const printer = await prisma.printer.findFirst({
    where: {
      storeId: order.storeId,
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (!printer) {
    return null;
  }

  const payload = buildCheckoutPrintPayload(session, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    storeId: order.storeId,
    printerId: printer.id,
    placedAt: order.placedAt,
  });

  return prisma.printJob.create({
    data: {
      printerId: printer.id,
      orderId: order.id,
      status: "QUEUED" as any,
      payload: payload as any,
    },
  });
};

export const persistCheckoutOrder = async (
  session: CheckoutSession,
  options: { paymentStatus: PaymentStatus },
): Promise<OrderSummary> => {
  const store = await resolveCheckoutStore(session);
  const orderNumber = buildOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      storeId: store.id,
      fulfillmentType: toDbEnum(session.fulfillmentType),
      source: toDbEnum(session.source),
      status: "PENDING" as any,
      paymentStatus: toDbEnum(options.paymentStatus),
      customerName: session.customerName,
      customerPhone: session.customerPhone,
      customerEmail: session.customerEmail,
      customerAddressId: session.customerAddressId,
      addressLine1: session.addressLine1,
      city: session.city,
      postcode: session.postcode,
      notes: session.notes,
      subtotalAmount: session.subtotalAmount,
      deliveryFee: session.deliveryFee,
      totalAmount: session.totalAmount,
      currency: session.currency,
      statusHistory: {
        create: {
          status: "PENDING" as any,
          note: options.paymentStatus === "paid" ? "Order placed after payment confirmation." : "Order placed pending payment confirmation.",
        },
      },
      items: {
        create: session.lineItems.map((line) => ({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          totalPrice: line.lineTotal,
          nameSnapshot: line.name,
          notes: [
            line.notes,
            line.removedComponents.length
              ? `Removed: ${line.removedComponents.map((component) => component.label).join(", ")}`
              : "",
            line.selectedOptions.length
              ? `Options: ${line.selectedOptions.map((option) => `${option.valueName} x${option.quantity}`).join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join(" | "),
        })),
      },
    },
  });

  await createPrintJobIfConfigured(session, order);

  return toOrderSummary(order);
};

export const listMerchantOrders = async (hubId: string): Promise<OrderSummary[]> => {
  const orders = await prisma.order.findMany({
    where: {
      store: {
        merchantId: hubId,
      },
    },
    orderBy: { placedAt: "desc" },
    take: 100,
  });

  return orders.map(toOrderSummary);
};

export const findMerchantOrder = async (hubId: string, orderId: string): Promise<OrderSummary | null> => {
  const order = await prisma.order.findFirst({
    where: {
      ...orderLookupWhere(orderId),
      store: {
        merchantId: hubId,
      },
    },
  });

  return order ? toOrderSummary(order) : null;
};

export const updateMerchantOrder = async (
  hubId: string,
  orderId: string,
  input: { status: string; note: string; prepTimeMinutes?: number },
): Promise<OrderSummary> => {
  const existingOrder = await prisma.order.findFirst({
    where: {
      ...orderLookupWhere(orderId),
      store: {
        merchantId: hubId,
      },
    },
  });

  if (!existingOrder) {
    throw new NotFoundException(`Order ${orderId} was not found for this hub.`);
  }

  const order = await prisma.order.update({
    where: { id: existingOrder.id },
    data: {
      status: input.status as any,
      prepTimeMinutes: input.prepTimeMinutes ?? existingOrder.prepTimeMinutes,
      acceptedAt: input.status === "ACCEPTED" ? new Date() : existingOrder.acceptedAt,
      rejectedAt: input.status === "REJECTED" ? new Date() : existingOrder.rejectedAt,
      statusHistory: {
        create: {
          status: input.status as any,
          note: input.note,
        },
      },
    },
  });

  return toOrderSummary(order);
};

export const buildMerchantOrderReceipt = async (hubId: string, orderId: string) => {
  const order = await prisma.order.findFirst({
    where: {
      ...orderLookupWhere(orderId),
      store: {
        merchantId: hubId,
      },
    },
    include: {
      items: true,
      store: {
        include: {
          printers: {
            where: { isActive: true },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            take: 1,
          },
        },
      },
    },
  });

  if (!order) {
    throw new NotFoundException(`Order ${orderId} was not found for this hub.`);
  }

  const printerId = order.store.printers[0]?.id ?? "preview-printer";
  const payload = printJobPayloadSchema.parse({
    orderId: order.id,
    storeId: order.storeId,
    printerId,
    orderNumber: order.orderNumber,
    trackingUrl: `${process.env.CUSTOMER_WEB_URL ?? "https://hull-eats.onrender.com"}/track/${encodeURIComponent(order.orderNumber)}`,
    qrCodeData: `${process.env.CUSTOMER_WEB_URL ?? "https://hull-eats.onrender.com"}/track/${encodeURIComponent(order.orderNumber)}`,
    customerName: order.customerName,
    placedAtIso: order.placedAt.toISOString(),
    prepTimeMinutes: order.prepTimeMinutes,
    notes: order.notes ?? undefined,
    lines: order.items.map((item) => ({
      name: item.nameSnapshot,
      quantity: item.quantity,
      notes: item.notes ?? undefined,
    })),
  });

  return {
    payload,
    preview: formatReceiptPreview(payload, order),
    hasConfiguredPrinter: order.store.printers.length > 0,
  };
};

export const queueMerchantOrderReceiptPrint = async (hubId: string, orderId: string) => {
  const receipt = await buildMerchantOrderReceipt(hubId, orderId);

  if (!receipt.hasConfiguredPrinter) {
    return {
      ...receipt,
      queued: false,
      message: "No active printer is configured for this store yet. Use the preview receipt for testing.",
    };
  }

  const printJob = await prisma.printJob.create({
    data: {
      printerId: receipt.payload.printerId,
      orderId: receipt.payload.orderId,
      status: "QUEUED" as any,
      payload: receipt.payload as any,
    },
  });

  return {
    ...receipt,
    queued: true,
    printJobId: printJob.id,
    message: "Receipt queued for the store printer.",
  };
};
