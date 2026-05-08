import { NotFoundException } from "@nestjs/common";

import type { CheckoutSession, OrderSummary, PaymentStatus } from "@hull-eats/types";
import { orderSummarySchema } from "@hull-eats/types";
import { prisma } from "@hull-eats/db";

import { demoStores } from "./demo-data";

const toDbEnum = (value: string) => value.toUpperCase() as any;

const toApiEnum = <T extends string>(value: string) => value.toLowerCase() as T;

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
      OR: [{ id: orderId }, { orderNumber: orderId }],
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
      OR: [{ id: orderId }, { orderNumber: orderId }],
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
