import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { CourierDelivery, CourierLocationInput, DeliveryStatus, OrderSummary } from "@hull-eats/types";

import { demoOrders, demoStores } from "./demo-data";

type DeliverySeed = {
  pickupAddress: string;
  dropoffAddress: string;
  customerName: string;
  customerPhone: string;
  confirmationCode: string;
};

const deliverySeeds: Record<string, DeliverySeed> = {
  "HE-0998": {
    pickupAddress: "Loaded Munch, 88 Beverley Road, Hull",
    dropoffAddress: "44 Princes Avenue, Hull HU5 3QA",
    customerName: "Amelia Turner",
    customerPhone: "07700 900998",
    confirmationCode: "4821",
  },
  "HE-1001": {
    pickupAddress: "Loaded Munch, 88 Beverley Road, Hull",
    dropoffAddress: "12 Humber Street, Hull HU1 1TG",
    customerName: "Noah Patel",
    customerPhone: "07700 901001",
    confirmationCode: "7354",
  },
  "HE-1002": {
    pickupAddress: "Loaded Munch, 88 Beverley Road, Hull",
    dropoffAddress: "99 Spring Bank, Hull HU3 1BH",
    customerName: "Kai Low",
    customerPhone: "07700 901002",
    confirmationCode: "6192",
  },
};

const deliveryStore = new Map<string, CourierDelivery>();

const findOrder = (orderReference: string): OrderSummary | undefined => {
  const normalised = orderReference.trim().toUpperCase();

  return demoOrders.find(
    (order) => order.id.toUpperCase() === normalised || order.orderNumber.toUpperCase() === normalised,
  );
};

const extractOrderReference = (rawValue: string): string => {
  const value = rawValue.trim();
  const orderNumberMatch = value.match(/HE-\d{4,}/i);
  const orderIdMatch = value.match(/order_HE_\d{4,}/i);

  return (orderNumberMatch?.[0] ?? orderIdMatch?.[0] ?? value).toUpperCase();
};

const getStoreName = (storeId: string) =>
  demoStores.find((store) => store.id === storeId || store.slug === storeId)?.name ?? "Hull Eats kitchen";

const buildNavigationUrl = (dropoffAddress: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dropoffAddress)}`;

const deliveryIdForOrder = (orderNumber: string) => `delivery_${orderNumber.replace("-", "_")}`;

const buildDelivery = (order: OrderSummary, status: DeliveryStatus = "assigned"): CourierDelivery => {
  const seed =
    deliverySeeds[order.orderNumber] ??
    ({
      pickupAddress: `${getStoreName(order.storeId)}, Hull`,
      dropoffAddress: "Customer address, Hull",
      customerName: "Hull Eats customer",
      customerPhone: "Hidden until dispatch",
      confirmationCode: "2468",
    } satisfies DeliverySeed);

  return {
    deliveryId: deliveryIdForOrder(order.orderNumber),
    orderId: order.id,
    orderNumber: order.orderNumber,
    status,
    storeName: getStoreName(order.storeId),
    pickupAddress: seed.pickupAddress,
    dropoffAddress: seed.dropoffAddress,
    customerName: seed.customerName,
    customerPhone: seed.customerPhone,
    confirmationCode: seed.confirmationCode,
    navigationUrl: buildNavigationUrl(seed.dropoffAddress),
  };
};

const upsertDeliveryForOrder = (order: OrderSummary, status: DeliveryStatus) => {
  const existing = deliveryStore.get(deliveryIdForOrder(order.orderNumber));
  const delivery: CourierDelivery = {
    ...(existing ?? buildDelivery(order, status)),
    status,
  };

  deliveryStore.set(delivery.deliveryId, delivery);
  return delivery;
};

export const listCourierJobs = () =>
  demoOrders
    .filter((order) => order.fulfillmentType === "delivery" && order.status !== "delivered" && order.status !== "cancelled")
    .map((order) => deliveryStore.get(deliveryIdForOrder(order.orderNumber)) ?? buildDelivery(order, "assigned"));

export const startDeliveryFromScan = (input: { scanCode?: string; orderNumber?: string }) => {
  const orderReference = extractOrderReference(input.scanCode ?? input.orderNumber ?? "");
  const order = findOrder(orderReference);

  if (!order) {
    throw new NotFoundException(`No delivery order was found for ${orderReference}.`);
  }

  if (order.fulfillmentType !== "delivery") {
    throw new BadRequestException(`${order.orderNumber} is not a delivery order.`);
  }

  if (order.status === "delivered") {
    throw new BadRequestException(`${order.orderNumber} has already been delivered.`);
  }

  order.status = "picked_up";

  const now = new Date().toISOString();
  const delivery = upsertDeliveryForOrder(order, "picked_up");
  const startedDelivery: CourierDelivery = {
    ...delivery,
    startedAt: delivery.startedAt ?? now,
    pickedUpAt: delivery.pickedUpAt ?? now,
  };

  deliveryStore.set(startedDelivery.deliveryId, startedDelivery);
  return startedDelivery;
};

export const updateCourierLocation = (deliveryId: string, input: CourierLocationInput) => {
  const delivery = deliveryStore.get(deliveryId);

  if (!delivery) {
    throw new NotFoundException(`Delivery ${deliveryId} has not been started.`);
  }

  const updated: CourierDelivery = {
    ...delivery,
    courierLocation: {
      ...input,
      updatedAt: new Date().toISOString(),
    },
  };

  deliveryStore.set(deliveryId, updated);
  return updated;
};

export const completeDeliveryWithCode = (deliveryId: string, confirmationCode: string) => {
  const delivery = deliveryStore.get(deliveryId);

  if (!delivery) {
    throw new NotFoundException(`Delivery ${deliveryId} has not been started.`);
  }

  if (delivery.confirmationCode !== confirmationCode.trim()) {
    throw new BadRequestException("The customer PIN does not match this order.");
  }

  const order = findOrder(delivery.orderNumber);

  if (order) {
    order.status = "delivered";
  }

  const completed: CourierDelivery = {
    ...delivery,
    status: "delivered",
    deliveredAt: new Date().toISOString(),
  };

  deliveryStore.set(deliveryId, completed);
  return completed;
};

export const getTrackedDeliveryForOrder = (order: OrderSummary) =>
  deliveryStore.get(deliveryIdForOrder(order.orderNumber)) ?? buildDelivery(order, order.status === "delivered" ? "delivered" : "assigned");

export const findTrackedOrder = (orderId: string) => {
  const order = findOrder(orderId) ?? demoOrders[0]!;

  return {
    ...order,
    delivery: getTrackedDeliveryForOrder(order),
  };
};
