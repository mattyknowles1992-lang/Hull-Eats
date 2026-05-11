import { NotFoundException } from "@nestjs/common";

import type { CheckoutSession, OrderPaymentMethod, OrderSummary, PaymentStatus, PrintJobPayload } from "@hull-eats/types";
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
  paymentMethod: string;
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
    paymentMethod: toApiEnum(order.paymentMethod),
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
    paymentMethod?: string;
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
    `Payment method: ${String(order?.paymentMethod ?? "dojo_card").replaceAll("_", " ").toUpperCase()}`,
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

const receiptDivider = "--------------------------------";

type ReceiptOrderSnapshot = {
  paymentStatus?: string;
  paymentMethod?: string;
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
};

type DriverTrackingState = {
  confirmationCode?: string;
  courierLocation?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    heading?: number;
    updatedAt: string;
  };
};

const parseDriverTrackingState = (value: string | null | undefined): DriverTrackingState => {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as DriverTrackingState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const formatReceiptMoney = (value: unknown) => `${String.fromCharCode(163)}${Number(value).toFixed(2)}`;

const formatReceiptTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatAddressLines = (order?: ReceiptOrderSnapshot) => {
  const addressLines = [
    order?.addressLine1,
    order?.addressLine2,
    [order?.city, order?.postcode].filter(Boolean).join(" "),
  ].filter(Boolean);

  return addressLines.length > 0 ? addressLines : ["Collection / no delivery address"];
};

const splitReceiptNote = (note?: string) => {
  if (!note) {
    return { plainNotes: [] as string[], removed: [] as string[], options: [] as string[] };
  }

  return note.split("|").reduce(
    (parts, chunk) => {
      const trimmed = chunk.trim();

      if (!trimmed) {
        return parts;
      }

      if (trimmed.toLowerCase().startsWith("removed:")) {
        parts.removed.push(
          ...trimmed
            .slice("removed:".length)
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
        );
        return parts;
      }

      if (trimmed.toLowerCase().startsWith("options:")) {
        parts.options.push(
          ...trimmed
            .slice("options:".length)
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
        );
        return parts;
      }

      parts.plainNotes.push(trimmed);
      return parts;
    },
    { plainNotes: [] as string[], removed: [] as string[], options: [] as string[] },
  );
};

const formatLineChecklist = (line: PrintJobPayload["lines"][number]) => {
  const noteParts = splitReceiptNote(line.notes);

  return [
    `${line.quantity} x ${line.name}`,
    line.totalPrice !== undefined ? `    Item total: ${formatReceiptMoney(line.totalPrice)}` : "",
    ...noteParts.plainNotes.map((note) => `    NOTE: ${note}`),
    ...noteParts.removed.map((item) => `    [ ] REMOVE ${item}`),
    ...(line.components ?? []).map((component) => `    [${component.removed ? " " : "x"}] ${component.label} x${component.quantity}`),
    ...noteParts.options.map((option) => `    [x] ${option}`),
    ...(line.selectedOptions ?? []).map(
      (option) =>
        `    [x] ${option.groupName}: ${option.valueName} x${option.quantity}${option.priceDelta > 0 ? ` +${formatReceiptMoney(option.priceDelta)}` : ""}`,
    ),
  ].filter((entry) => entry !== "");
};

const formatDeliveryReceiptPreview = (payload: PrintJobPayload, order?: ReceiptOrderSnapshot) =>
  [
    "          HULL EATS",
    " Anything you want. Delivered.",
    payload.storeName ? `          ${payload.storeName}` : "",
    receiptDivider,
    "             DELIVERY",
    `Placed: ${formatReceiptTime(payload.placedAtIso)}`,
    `# ${payload.orderNumber}`,
    payload.prepTimeMinutes ? `PREP TIME: ${payload.prepTimeMinutes} minutes` : "",
    receiptDivider,
    ...payload.lines.flatMap((line, index) => {
      const formattedLine = formatLineChecklist(line);
      return [`${index + 1}. ${formattedLine[0]}`, ...formattedLine.slice(1), ""];
    }),
    payload.notes ? `ORDER NOTES: ${payload.notes}` : "",
    receiptDivider,
    order?.subtotalAmount !== undefined ? `Subtotal: ${formatReceiptMoney(order.subtotalAmount)}` : "",
    order?.deliveryFee !== undefined ? `Delivery charge: ${formatReceiptMoney(order.deliveryFee)}` : "",
    order?.totalAmount !== undefined ? `Total due: ${formatReceiptMoney(order.totalAmount)} ${order.currency ?? "GBP"}` : "",
    receiptDivider,
    String(order?.paymentStatus ?? "pending").toLowerCase() === "paid" ? "       ORDER HAS BEEN PAID" : "          PAYMENT PENDING",
    `Payment method: ${String(order?.paymentMethod ?? "dojo_card").replaceAll("_", " ").toUpperCase()}`,
    receiptDivider,
    "Customer details:",
    payload.customerName,
    order?.customerPhone ? `Phone: ${order.customerPhone}` : "",
    order?.customerEmail ? `Email: ${order.customerEmail}` : "",
    "",
    "Delivery address:",
    ...formatAddressLines(order),
    receiptDivider,
    "Scan the QR code below to start",
    "courier tracking for this order.",
    `Backup order number: ${payload.orderNumber}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

const buildCheckoutPrintPayload = (
  session: CheckoutSession,
  input: { orderId: string; orderNumber: string; storeId: string; printerId: string; placedAt: Date; storeName?: string },
): PrintJobPayload =>
  printJobPayloadSchema.parse({
    orderId: input.orderId,
    storeId: input.storeId,
    printerId: input.printerId,
    orderNumber: input.orderNumber,
    storeName: input.storeName,
    trackingUrl: `${process.env.CUSTOMER_WEB_URL ?? "https://hull-eats.onrender.com"}/track/${encodeURIComponent(input.orderNumber)}`,
    qrCodeData: `${process.env.CUSTOMER_WEB_URL ?? "https://hull-eats.onrender.com"}/track/${encodeURIComponent(input.orderNumber)}`,
    customerName: session.customerName,
    placedAtIso: input.placedAt.toISOString(),
    prepTimeMinutes: null,
    notes: session.notes,
    lines: session.lineItems.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      totalPrice: line.lineTotal,
      notes: line.notes,
      components: line.components,
      selectedOptions: line.selectedOptions,
    })),
  });

const createPrintJobIfConfigured = async (
  session: CheckoutSession,
  order: { id: string; orderNumber: string; storeId: string; placedAt: Date },
  storeName?: string,
) => {
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
    storeName,
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
  options: { paymentStatus: PaymentStatus; paymentMethod: OrderPaymentMethod },
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
      paymentMethod: toDbEnum(options.paymentMethod),
      customerProfileId: session.customerProfileId,
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
          note:
            options.paymentMethod === "cash_on_delivery"
              ? "Order placed as cash on delivery."
              : options.paymentStatus === "paid"
                ? "Order placed after payment confirmation."
                : "Order placed pending Dojo embedded payment confirmation.",
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

  await createPrintJobIfConfigured(session, order, store.name);

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

export const listMerchantDriverTracking = async (hubId: string) => {
  const orders = await prisma.order.findMany({
    where: {
      fulfillmentType: "DELIVERY" as any,
      status: { notIn: ["DELIVERED", "CANCELLED", "REJECTED"] as any },
      store: {
        merchantId: hubId,
      },
      delivery: {
        isNot: null,
      },
    },
    include: {
      delivery: {
        include: {
          courierProfile: {
            include: {
              user: true,
              account: true,
            },
          },
        },
      },
    },
    orderBy: { placedAt: "desc" },
    take: 150,
  });

  const drivers = new Map<
    string,
    {
      courierProfileId: string;
      courierName: string;
      currentStatus: string;
      rating: number | null;
      latestLocation?: DriverTrackingState["courierLocation"];
      orders: Array<{
        orderId: string;
        orderNumber: string;
        status: string;
        customerName: string;
        dropoffAddress: string;
        paymentStatus: string;
        paymentMethod: string;
        cashDue: number;
        totalAmount: number;
        scannedAt: string | null;
        pickedUpAt: string | null;
        locationUpdatedAt: string | null;
      }>;
      totalCashDue: number;
      orderCount: number;
    }
  >();

  for (const order of orders) {
    const delivery = order.delivery;

    if (!delivery?.courierProfile) {
      continue;
    }

    const courierProfile = delivery.courierProfile;
    const trackingState = parseDriverTrackingState(delivery.externalReference);
    const courierId = courierProfile.id;
    const dropoffAddress = [order.addressLine1, order.addressLine2, order.city, order.postcode].filter(Boolean).join(", ");
    const cashDue = String((order as { paymentMethod?: string }).paymentMethod ?? "").toUpperCase() === "CASH_ON_DELIVERY" ? Number(order.totalAmount) : 0;

    const driver =
      drivers.get(courierId) ??
      {
        courierProfileId: courierId,
        courierName: courierProfile.user?.fullName ?? "Courier",
        currentStatus: String(courierProfile.currentStatus).toLowerCase(),
        rating: courierProfile.account ? Number(courierProfile.account.rating) : null,
        latestLocation: trackingState.courierLocation,
        orders: [],
        totalCashDue: 0,
        orderCount: 0,
      };

    if (trackingState.courierLocation) {
      const currentTime = driver.latestLocation?.updatedAt ? Date.parse(driver.latestLocation.updatedAt) : 0;
      const nextTime = Date.parse(trackingState.courierLocation.updatedAt);

      if (!driver.latestLocation || nextTime >= currentTime) {
        driver.latestLocation = trackingState.courierLocation;
      }
    }

    driver.orders.push({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: String(order.status).toLowerCase(),
      customerName: order.customerName,
      dropoffAddress,
      paymentStatus: String(order.paymentStatus).toLowerCase(),
      paymentMethod: String((order as { paymentMethod?: string }).paymentMethod ?? "dojo_card").toLowerCase(),
      cashDue,
      totalAmount: Number(order.totalAmount),
      scannedAt: delivery.acceptedAt?.toISOString() ?? null,
      pickedUpAt: delivery.pickedUpAt?.toISOString() ?? order.pickedUpAt?.toISOString() ?? null,
      locationUpdatedAt: trackingState.courierLocation?.updatedAt ?? null,
    });
    driver.totalCashDue += cashDue;
    driver.orderCount = driver.orders.length;
    drivers.set(courierId, driver);
  }

  const driverList = Array.from(drivers.values()).sort((first, second) => second.orderCount - first.orderCount);

  return {
    drivers: driverList,
    totals: {
      driverCount: driverList.length,
      orderCount: driverList.reduce((sum, driver) => sum + driver.orderCount, 0),
      cashDue: driverList.reduce((sum, driver) => sum + driver.totalCashDue, 0),
      cashOrderCount: driverList.reduce((sum, driver) => sum + driver.orders.filter((order) => order.cashDue > 0).length, 0),
    },
  };
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
    storeName: order.store.name,
    trackingUrl: `${process.env.CUSTOMER_WEB_URL ?? "https://hull-eats.onrender.com"}/track/${encodeURIComponent(order.orderNumber)}`,
    qrCodeData: `${process.env.CUSTOMER_WEB_URL ?? "https://hull-eats.onrender.com"}/track/${encodeURIComponent(order.orderNumber)}`,
    customerName: order.customerName,
    placedAtIso: order.placedAt.toISOString(),
    prepTimeMinutes: order.prepTimeMinutes,
    notes: order.notes ?? undefined,
    lines: order.items.map((item) => ({
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      notes: item.notes ?? undefined,
    })),
  });

  return {
    payload,
    preview: formatDeliveryReceiptPreview(payload, order),
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
