import { BadRequestException, NotFoundException } from "@nestjs/common";

import type {
  CheckoutSession,
  MerchantDriverCashUpPeriod,
  OrderPaymentMethod,
  OrderSummary,
  PaymentStatus,
  PrintJobPayload,
} from "@hull-eats/types";
import {
  merchantDriverCashUpResponseSchema,
  orderSummarySchema,
  printJobPayloadSchema,
} from "@hull-eats/types";
import { Prisma } from "@prisma/client";

import { prisma } from "@hull-eats/db";

import { customerNotifications } from "./customer-notifications.service";
import { demoStores } from "./demo-data";

const toDbEnum = (value: string) => value.toUpperCase() as any;

const toApiEnum = <T extends string>(value: string) => value.toLowerCase() as T;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MERCHANT_PENDING_TIMEOUT_MS = 120_000;
const CUSTOMER_CANCEL_GRACE_MS = 60_000;

const normalisePhone = (value: string) => value.replace(/\s+/g, "").trim();

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

export const buildOrderSummaryForClient = (order: {
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
  store?: { autoAcceptOrders?: boolean | null } | null;
}): OrderSummary => {
  const base = toOrderSummary(order);
  const autoAccept = Boolean(order.store?.autoAcceptOrders);
  const placedMs = Date.parse(base.placedAt);
  const customerCancelUntil = new Date(placedMs + CUSTOMER_CANCEL_GRACE_MS).toISOString();
  const merchantResponseDeadlineAt =
    !autoAccept && base.status === "pending" ? new Date(placedMs + MERCHANT_PENDING_TIMEOUT_MS).toISOString() : undefined;

  return orderSummarySchema.parse({
    ...base,
    customerCancelUntil,
    merchantResponseDeadlineAt,
  });
};

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
    ...payload.lines.flatMap((line) => {
      const baseParts = (line.components ?? []).filter((component) => !component.removed);
      const removedParts = (line.components ?? []).filter((component) => component.removed);
      return [
        `${line.quantity} x ${line.name}`,
        line.notes ? `  Note: ${line.notes}` : "",
        ...(baseParts.length > 0
          ? ["  BUILD:", ...baseParts.map((component) => `    • ${component.quantity} x ${component.label}`)]
          : []),
        ...(removedParts.length > 0
          ? [
              "  NO:",
              ...removedParts.map((component) => `    • ${component.quantity} x ${component.label}`),
            ]
          : []),
        ...(line.selectedOptions ?? []).map(
          (option) =>
            `  + ${option.quantity} x ${option.groupName}: ${option.valueName}${option.priceDelta > 0 ? ` (+${option.priceDelta.toFixed(2)})` : ""}`,
        ),
      ];
    }),
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
  const buildParts = (line.components ?? []).filter((component) => !component.removed);
  const noParts = (line.components ?? []).filter((component) => component.removed);

  return [
    `${line.quantity} x ${line.name}`,
    line.totalPrice !== undefined ? `    Item total: ${formatReceiptMoney(line.totalPrice)}` : "",
    ...noteParts.plainNotes.map((note) => `    NOTE: ${note}`),
    ...noteParts.removed.map((item) => `    [ ] REMOVE ${item}`),
    ...(buildParts.length > 0 ? ["    BUILD:"] : []),
    ...buildParts.map((component) => `    [x] ${component.label} x${component.quantity}`),
    ...(noParts.length > 0 ? ["    NO:"] : []),
    ...noParts.map((component) => `    [ ] ${component.label} x${component.quantity}`),
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

const voidQueuedPrintJobsForOrder = async (orderId: string) => {
  await prisma.printJob.updateMany({
    where: { orderId, status: "QUEUED" as any },
    data: { status: "FAILED" as any },
  });
};

const markOrderPaymentRefundedIfCaptured = async (orderId: string) => {
  const row = await prisma.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true } });
  const ps = String(row?.paymentStatus ?? "").toUpperCase();
  if (ps !== "PAID" && ps !== "AUTHORIZED") {
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "REFUNDED" as any },
  });

  await prisma.payment.updateMany({
    where: { orderId },
    data: { status: "REFUNDED" as any },
  });
};

const cancelOrderInSystem = async (input: {
  orderId: string;
  historyNote: string;
  actorLabel: string;
  hubId: string;
  orderNumber: string;
}) => {
  const existing = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!existing || existing.status === ("CANCELLED" as any) || existing.status === ("DELIVERED" as any)) {
    return;
  }

  await prisma.order.update({
    where: { id: input.orderId },
    data: {
      status: "CANCELLED" as any,
      statusHistory: {
        create: {
          status: "CANCELLED" as any,
          note: `${input.historyNote} (${input.actorLabel})`,
        },
      },
    },
  });

  await voidQueuedPrintJobsForOrder(input.orderId);
  await markOrderPaymentRefundedIfCaptured(input.orderId);

  void customerNotifications.notifyHubOrderLifecycle(input.hubId, input.orderNumber, "order.cancelled", input.historyNote).catch((error) => {
    console.error(`Hub lifecycle notify failed for ${input.orderNumber}`, error);
  });
};

export const expireStalePendingMerchantOrders = async (): Promise<number> => {
  const deadline = new Date(Date.now() - MERCHANT_PENDING_TIMEOUT_MS);
  const stale = await prisma.order.findMany({
    where: {
      status: "PENDING" as any,
      placedAt: { lt: deadline },
    },
    include: {
      store: { select: { merchantId: true } },
    },
  });

  for (const row of stale) {
    await cancelOrderInSystem({
      orderId: row.id,
      historyNote: "Auto-cancelled: hub did not accept within 120 seconds.",
      actorLabel: "system_timeout",
      hubId: row.store.merchantId,
      orderNumber: row.orderNumber,
    });
  }

  return stale.length;
};

export const customerCancelOrderWithinGrace = async (input: {
  orderId?: string;
  orderNumber?: string;
  customerProfileId?: string;
  customerPhone?: string;
}): Promise<OrderSummary> => {
  const ref = input.orderId ?? input.orderNumber;
  if (!ref) {
    throw new BadRequestException("orderId or orderNumber is required.");
  }
  if (!input.customerProfileId?.trim() && !input.customerPhone?.trim()) {
    throw new BadRequestException("customerProfileId or customerPhone is required.");
  }

  const existing = await prisma.order.findFirst({
    where: orderLookupWhere(ref),
    include: { store: { select: { merchantId: true, autoAcceptOrders: true } } },
  });

  if (!existing) {
    throw new NotFoundException("Order was not found.");
  }

  const profileOk =
    Boolean(input.customerProfileId?.trim()) &&
    Boolean(existing.customerProfileId) &&
    input.customerProfileId!.trim() === existing.customerProfileId;

  const phoneOk =
    Boolean(input.customerPhone?.trim()) && normalisePhone(input.customerPhone!) === normalisePhone(existing.customerPhone);

  if (!profileOk && !phoneOk) {
    throw new BadRequestException("Details did not match this order.");
  }

  if (Date.now() - existing.placedAt.getTime() > CUSTOMER_CANCEL_GRACE_MS) {
    throw new BadRequestException("The customer cancellation window has ended.");
  }

  const status = String(existing.status).toLowerCase();
  if (["cancelled", "rejected", "delivered", "picked_up"].includes(status)) {
    throw new BadRequestException("This order can no longer be cancelled from here.");
  }

  await cancelOrderInSystem({
    orderId: existing.id,
    historyNote: "Cancelled by customer within the grace period.",
    actorLabel: "customer",
    hubId: existing.store.merchantId,
    orderNumber: existing.orderNumber,
  });

  const next = await prisma.order.findUnique({
    where: { id: existing.id },
    include: { store: { select: { autoAcceptOrders: true } } },
  });

  return buildOrderSummaryForClient(next!);
};

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

  const menuRows = await prisma.menuItem.findMany({
    where: { category: { storeId: store.id } },
    select: { id: true, name: true },
  });
  const menuItemUuidByName = new Map(menuRows.map((row) => [row.name, row.id]));

  const resolvePersistedMenuItemId = (line: CheckoutSession["lineItems"][number]): string | null => {
    if (uuidPattern.test(line.menuItemId)) {
      return line.menuItemId;
    }
    const matchByName = menuItemUuidByName.get(line.name);
    return matchByName && uuidPattern.test(matchByName) ? matchByName : null;
  };

  const safeCustomerProfileId =
    session.customerProfileId && uuidPattern.test(session.customerProfileId) ? session.customerProfileId : undefined;
  const safeCustomerAddressId =
    session.customerAddressId && uuidPattern.test(session.customerAddressId) ? session.customerAddressId : undefined;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      storeId: store.id,
      fulfillmentType: toDbEnum(session.fulfillmentType),
      source: toDbEnum(session.source),
      status: "PENDING" as any,
      paymentStatus: toDbEnum(options.paymentStatus),
      paymentMethod: toDbEnum(options.paymentMethod),
      customerProfileId: safeCustomerProfileId,
      customerName: session.customerName,
      customerPhone: session.customerPhone,
      customerEmail: session.customerEmail,
      customerAddressId: safeCustomerAddressId,
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
          menuItemId: resolvePersistedMenuItemId(line),
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          totalPrice: line.lineTotal,
          nameSnapshot: line.name,
          requiresIdVerification: line.requiresIdVerification,
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

  const needsIdVerification = session.lineItems.some((line) => line.requiresIdVerification);
  if (needsIdVerification) {
    void customerNotifications
      .notifyOrderRequiresIdVerification({
        id: order.id,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
      })
      .catch((error) => {
        console.error(`Failed to send ID verification reminder for ${order.orderNumber}`, error);
      });
  }

  void customerNotifications
    .notifyHubOrderLifecycle(store.merchantId, order.orderNumber, "order.placed_pending", "New order is waiting for hub acceptance or auto-accept.")
    .catch((error) => {
      console.error(`Failed to notify hub for new order ${order.orderNumber}`, error);
    });

  if (store.autoAcceptOrders) {
    const prep = Math.min(store.etaMinutes ?? 25, store.autoAcceptMaxPrepMinutes ?? 60);
    await updateMerchantOrder(store.merchantId, order.id, {
      status: "ACCEPTED",
      note: `Auto-accepted (hub setting). Quoted ${prep} minutes prep.`,
      prepTimeMinutes: prep,
    });
  }

  const latest = await prisma.order.findUnique({
    where: { id: order.id },
    include: { store: { select: { autoAcceptOrders: true } } },
  });

  return buildOrderSummaryForClient(latest!);
};

export const listMerchantOrders = async (hubId: string): Promise<OrderSummary[]> => {
  const orders = await prisma.order.findMany({
    where: {
      store: {
        merchantId: hubId,
      },
    },
    include: {
      store: {
        select: {
          autoAcceptOrders: true,
        },
      },
    },
    orderBy: { placedAt: "desc" },
    take: 100,
  });

  return orders.map((row) => buildOrderSummaryForClient(row));
};

async function merchantCashUpPeriodBounds(
  period: MerchantDriverCashUpPeriod,
): Promise<{ start: Date; end: Date; label: string }> {
  const rows =
    period === "today"
      ? await prisma.$queryRaw<Array<{ start: Date; end: Date }>>`
          SELECT
            ((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London')::date)::timestamp AT TIME ZONE 'Europe/London' AS start,
            (((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London')::date + 1))::timestamp AT TIME ZONE 'Europe/London' AS end
        `
      : period === "yesterday"
        ? await prisma.$queryRaw<Array<{ start: Date; end: Date }>>`
            SELECT
              (((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London')::date - 1))::timestamp AT TIME ZONE 'Europe/London' AS start,
              ((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London')::date)::timestamp AT TIME ZONE 'Europe/London' AS end
          `
        : await prisma.$queryRaw<Array<{ start: Date; end: Date }>>`
            SELECT
              (((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London')::date - 6))::timestamp AT TIME ZONE 'Europe/London' AS start,
              (((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London')::date + 1))::timestamp AT TIME ZONE 'Europe/London' AS end
          `;

  const row = rows[0];
  if (!row) {
    throw new Error("Could not resolve reporting period bounds.");
  }

  const label =
    period === "today"
      ? "Today (Europe/London)"
      : period === "yesterday"
        ? "Yesterday (Europe/London)"
        : "Last 7 calendar days (Europe/London)";

  return { start: row.start, end: row.end, label };
}

async function computeLiveMapAllowedForStore(storeId: string): Promise<{ allowed: boolean; message?: string }> {
  let hours: Awaited<ReturnType<typeof prisma.storeHour.findMany>>;
  try {
    hours = await prisma.storeHour.findMany({
      where: { storeId },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return {
        allowed: true,
        message:
          "Opening hours are not set up in the database yet (store_hours) — live map stays visible. Run the latest DB migration or docs/supabase-add-missing-features-only.sql.",
      };
    }
    throw error;
  }

  if (hours.length === 0) {
    return {
      allowed: true,
      message:
        "Opening hours are not configured for this store yet — live map stays visible. Add weekly hours in the database (store_hours) to hide the map outside service times.",
    };
  }

  const dowRows = await prisma.$queryRaw<Array<{ dow: number }>>`
    SELECT EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London'))::int AS dow
  `;
  const dow = dowRows[0]?.dow ?? 0;
  const row = hours.find((h) => h.dayOfWeek === dow);

  if (!row || row.isClosed) {
    return {
      allowed: false,
      message: "Outside today’s configured opening hours — live driver map is hidden. Customers can still track orders from their link.",
    };
  }

  const parseHm = (value: string) => {
    const parts = value.split(":");
    const hh = Number(parts[0]);
    const mm = Number(parts[1] ?? "0");
    return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
  };

  const londonParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(londonParts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(londonParts.find((p) => p.type === "minute")?.value ?? "0");
  const nowM = hour * 60 + minute;
  const openM = parseHm(row.openTime);
  const closeM = parseHm(row.closeTime);

  if (closeM > openM) {
    if (nowM >= openM && nowM < closeM) {
      return { allowed: true };
    }
  } else {
    if (nowM >= openM || nowM < closeM) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    message: "Outside today’s opening window — live driver map is hidden until the next scheduled service time.",
  };
}

export const listMerchantDriverCashUp = async (hubId: string, period: MerchantDriverCashUpPeriod) => {
  const { start, end, label } = await merchantCashUpPeriodBounds(period);

  const orders = await prisma.order.findMany({
    where: {
      placedAt: {
        gte: start,
        lt: end,
      },
      fulfillmentType: "DELIVERY" as any,
      status: { notIn: ["CANCELLED", "REJECTED"] as any },
      store: {
        merchantId: hubId,
      },
      delivery: {
        courierProfileId: { not: null },
      },
    },
    include: {
      delivery: {
        include: {
          courierProfile: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  const byCourier = new Map<
    string,
    {
      courierProfileId: string;
      courierName: string;
      paidOrderCount: number;
      paidOrderTotal: number;
      cashOrderCount: number;
      cashOrderTotal: number;
    }
  >();

  for (const order of orders) {
    const cp = order.delivery?.courierProfile;
    if (!cp) continue;

    const paymentMethod = String((order as { paymentMethod?: string }).paymentMethod ?? "").toUpperCase();
    const isCash = paymentMethod === "CASH_ON_DELIVERY";
    const total = Number(order.totalAmount);

    const existing =
      byCourier.get(cp.id) ??
      {
        courierProfileId: cp.id,
        courierName: cp.user?.fullName ?? "Courier",
        paidOrderCount: 0,
        paidOrderTotal: 0,
        cashOrderCount: 0,
        cashOrderTotal: 0,
      };

    if (isCash) {
      existing.cashOrderCount += 1;
      existing.cashOrderTotal += total;
    } else {
      existing.paidOrderCount += 1;
      existing.paidOrderTotal += total;
    }

    byCourier.set(cp.id, existing);
  }

  const drivers = Array.from(byCourier.values()).sort((a, b) => a.courierName.localeCompare(b.courierName));

  const totals = drivers.reduce(
    (acc, row) => {
      acc.paidOrderCount += row.paidOrderCount;
      acc.paidOrderTotal += row.paidOrderTotal;
      acc.cashOrderCount += row.cashOrderCount;
      acc.cashOrderTotal += row.cashOrderTotal;
      return acc;
    },
    { paidOrderCount: 0, paidOrderTotal: 0, cashOrderCount: 0, cashOrderTotal: 0 },
  );

  return merchantDriverCashUpResponseSchema.parse({
    period,
    rangeLabel: label,
    rangeStartIso: start.toISOString(),
    rangeEndIso: end.toISOString(),
    drivers,
    totals,
  });
};

export const findMerchantOrder = async (hubId: string, orderId: string): Promise<OrderSummary | null> => {
  const order = await prisma.order.findFirst({
    where: {
      ...orderLookupWhere(orderId),
      store: {
        merchantId: hubId,
      },
    },
    include: {
      store: {
        select: {
          autoAcceptOrders: true,
        },
      },
    },
  });

  return order ? buildOrderSummaryForClient(order) : null;
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

  const store = await prisma.store.findFirst({
    where: { merchantId: hubId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const liveMap = store ? await computeLiveMapAllowedForStore(store.id) : { allowed: true as boolean, message: undefined as string | undefined };

  return {
    drivers: driverList,
    totals: {
      driverCount: driverList.length,
      orderCount: driverList.reduce((sum, driver) => sum + driver.orderCount, 0),
      cashDue: driverList.reduce((sum, driver) => sum + driver.totalCashDue, 0),
      cashOrderCount: driverList.reduce((sum, driver) => sum + driver.orders.filter((order) => order.cashDue > 0).length, 0),
    },
    liveMapAllowed: liveMap.allowed,
    liveMapMessage: liveMap.message,
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

  if (input.status === "ACCEPTED" && String(existingOrder.status).toUpperCase() !== "PENDING") {
    throw new BadRequestException("Only pending orders can be accepted.");
  }

  if (input.status === "REJECTED" && String(existingOrder.status).toUpperCase() !== "PENDING") {
    throw new BadRequestException("Only pending orders can be rejected.");
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

  if (input.status === "ACCEPTED") {
    void queueMerchantOrderReceiptPrint(hubId, order.id).catch((error) => {
      console.error(`Kitchen print queue failed for ${order.orderNumber}`, error);
    });
  }

  if (input.status === "REJECTED") {
    await voidQueuedPrintJobsForOrder(order.id);
    await markOrderPaymentRefundedIfCaptured(order.id);
    void customerNotifications.notifyHubOrderLifecycle(hubId, order.orderNumber, "order.rejected", input.note).catch((error) => {
      console.error(`Hub reject notify failed for ${order.orderNumber}`, error);
    });
  }

  const latest = await prisma.order.findUnique({
    where: { id: order.id },
    include: { store: { select: { autoAcceptOrders: true } } },
  });

  return buildOrderSummaryForClient(latest!);
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
