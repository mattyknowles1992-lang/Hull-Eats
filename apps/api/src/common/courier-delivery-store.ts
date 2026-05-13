import { BadRequestException, NotFoundException } from "@nestjs/common";

import type {
  CourierDelivery,
  CourierLocation,
  CourierLocationInput,
  DeliveryStatus,
  OrderSummary,
  TrackedOrderLineItem,
} from "@hull-eats/types";
import { courierDeliverySchema, orderSummarySchema, trackedOrderSchema } from "@hull-eats/types";
import { prisma } from "@hull-eats/db";

import { customerNotifications } from "./customer-notifications.service";
import { demoOrders, demoStores } from "./demo-data";
import { buildOrderSummaryForClient } from "./order-repository";

type DeliverySeed = {
  pickupAddress: string;
  dropoffAddress: string;
  customerName: string;
  customerPhone: string;
  confirmationCode: string;
};

type PersistedTrackingState = {
  confirmationCode?: string;
  courierLocation?: CourierLocation;
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

const demoDeliveryStore = new Map<string, CourierDelivery>();

const toApiEnum = <T extends string>(value: string) => value.toLowerCase() as T;
const toDbEnum = (value: string) => value.toUpperCase() as any;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hullServiceBounds = {
  minLatitude: 53.70,
  maxLatitude: 53.83,
  minLongitude: -0.48,
  maxLongitude: -0.18,
};

const isInsideHullServiceBounds = (input: CourierLocationInput) =>
  input.latitude >= hullServiceBounds.minLatitude &&
  input.latitude <= hullServiceBounds.maxLatitude &&
  input.longitude >= hullServiceBounds.minLongitude &&
  input.longitude <= hullServiceBounds.maxLongitude;

const extractOrderReference = (rawValue: string): string => {
  const value = rawValue.trim();
  const orderNumberMatch = value.match(/HE-[0-9-]{4,}/i);
  const orderIdMatch = value.match(/order_HE_[0-9-]{4,}/i);

  return (orderNumberMatch?.[0] ?? orderIdMatch?.[0] ?? value).toUpperCase();
};

const buildNavigationUrl = (dropoffAddress: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dropoffAddress)}`;

const deliveryIdForOrder = (orderNumber: string) => `delivery_${orderNumber.replaceAll("-", "_")}`;

const parseTrackingState = (value: string | null | undefined): PersistedTrackingState => {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as PersistedTrackingState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const encodeTrackingState = (state: PersistedTrackingState) => JSON.stringify(state);

const buildConfirmationCode = (orderNumber: string) => {
  const digits = orderNumber.replace(/\D/g, "").slice(-4);
  return digits.length >= 4 ? digits : `${Math.floor(1000 + Math.random() * 9000)}`;
};

const formatAddress = (...parts: Array<string | null | undefined>) => parts.map((part) => part?.trim()).filter(Boolean).join(", ");

const buildPersistedDelivery = (order: any): CourierDelivery => {
  const delivery = order.delivery;
  const trackingState = parseTrackingState(delivery?.externalReference);
  const pickupAddress = formatAddress(order.store?.name, order.store?.addressLine1, order.store?.city, order.store?.postcode) || "Hull Eats kitchen";
  const dropoffAddress = formatAddress(order.addressLine1, order.city, order.postcode) || "Customer address, Hull";
  const status = toApiEnum<DeliveryStatus>(delivery?.status ?? (order.status === "DELIVERED" ? "DELIVERED" : "ASSIGNED"));

  return courierDeliverySchema.parse({
    deliveryId: delivery?.id ?? deliveryIdForOrder(order.orderNumber),
    orderId: order.id,
    orderNumber: order.orderNumber,
    status,
    storeName: order.store?.name ?? "Hull Eats kitchen",
    pickupAddress,
    dropoffAddress,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    confirmationCode: trackingState.confirmationCode ?? buildConfirmationCode(order.orderNumber),
    navigationUrl: buildNavigationUrl(dropoffAddress),
    requiresIdVerification: Array.isArray(order.items) && order.items.some((row: { requiresIdVerification?: boolean }) => row.requiresIdVerification),
    courierName: delivery?.courierProfile?.user?.fullName,
    courierRating: delivery?.courierProfile?.account ? Number(delivery.courierProfile.account.rating) : undefined,
    startedAt: delivery?.acceptedAt?.toISOString(),
    pickedUpAt: delivery?.pickedUpAt?.toISOString() ?? order.pickedUpAt?.toISOString(),
    deliveredAt: delivery?.deliveredAt?.toISOString() ?? order.deliveredAt?.toISOString(),
    courierLocation: trackingState.courierLocation,
  });
};

const findPersistedOrder = async (orderReference: string) =>
  prisma.order.findFirst({
    where: {
      OR: [
        ...(uuidPattern.test(orderReference) ? [{ id: orderReference }] : []),
        { orderNumber: orderReference },
      ],
    },
    include: {
      store: true,
      items: true,
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
  });

const mapPersistedOrderLineItems = (
  rows: Array<{
    id: string;
    menuItemId: string | null;
    nameSnapshot: string;
    quantity: number;
    unitPrice: unknown;
    totalPrice: unknown;
    notes: string | null;
    requiresIdVerification?: boolean;
  }>,
): TrackedOrderLineItem[] =>
  rows.map((row) => ({
    id: row.id,
    menuItemId: row.menuItemId,
    name: row.nameSnapshot,
    quantity: row.quantity,
    unitPrice: Number(row.unitPrice),
    totalPrice: Number(row.totalPrice),
    requiresIdVerification: Boolean(row.requiresIdVerification),
    notes: row.notes,
  }));

const demoTrackedLineItems = (orderNumber: string): TrackedOrderLineItem[] => {
  const seeded: Record<string, TrackedOrderLineItem[]> = {
    "HE-0998": [
      { name: "Double smash stack", quantity: 1, unitPrice: 11.99, totalPrice: 11.99, requiresIdVerification: false },
      { name: "Loaded fries tray", quantity: 1, unitPrice: 7.99, totalPrice: 7.99, requiresIdVerification: false },
      { name: "House lemonade", quantity: 2, unitPrice: 3.99, totalPrice: 7.98, requiresIdVerification: false },
    ],
    "HE-1001": [
      { name: "Classic cheeseburger", quantity: 2, unitPrice: 6.49, totalPrice: 12.98, requiresIdVerification: false },
      { name: "Vanilla thick shake", quantity: 1, unitPrice: 4.49, totalPrice: 4.49, requiresIdVerification: false },
    ],
    "HE-1002": [
      { name: "Wings bucket (8)", quantity: 1, unitPrice: 9.99, totalPrice: 9.99, requiresIdVerification: false },
      { name: "Garlic mayo dip", quantity: 2, unitPrice: 0.99, totalPrice: 1.98, requiresIdVerification: false },
      { name: "Choc fudge brownie", quantity: 1, unitPrice: 4.49, totalPrice: 4.49, requiresIdVerification: false },
    ],
  };

  return seeded[orderNumber] ?? [{ name: "Sample menu items", quantity: 1, unitPrice: 12.5, totalPrice: 12.5, requiresIdVerification: false }];
};

const ensurePersistedDelivery = async (order: any, status: DeliveryStatus, courierProfileId?: string) => {
  const existingState = parseTrackingState(order.delivery?.externalReference);
  const state: PersistedTrackingState = {
    ...existingState,
    confirmationCode: existingState.confirmationCode ?? buildConfirmationCode(order.orderNumber),
  };

  const data = {
    status: toDbEnum(status),
    courierProfileId: courierProfileId ?? order.delivery?.courierProfileId,
    externalProvider: "hull_eats",
    externalReference: encodeTrackingState(state),
    pickedUpAt: status === "picked_up" ? new Date() : order.delivery?.pickedUpAt,
    deliveredAt: status === "delivered" ? new Date() : order.delivery?.deliveredAt,
  };

  const delivery = order.delivery
    ? await prisma.delivery.update({
        where: { id: order.delivery.id },
        data,
      })
    : await prisma.delivery.create({
        data: {
          orderId: order.id,
          ...data,
          assignedAt: new Date(),
        },
      });

  return {
    ...order,
    delivery,
  };
};

const findDemoOrder = (orderReference: string): OrderSummary | undefined => {
  const normalised = orderReference.trim().toUpperCase();

  return demoOrders.find(
    (order) => order.id.toUpperCase() === normalised || order.orderNumber.toUpperCase() === normalised,
  );
};

const getDemoStoreName = (storeId: string) =>
  demoStores.find((store) => store.id === storeId || store.slug === storeId)?.name ?? "Hull Eats kitchen";

const buildDemoDelivery = (order: OrderSummary, status: DeliveryStatus = "assigned"): CourierDelivery => {
  const seed =
    deliverySeeds[order.orderNumber] ??
    ({
      pickupAddress: `${getDemoStoreName(order.storeId)}, Hull`,
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
    storeName: getDemoStoreName(order.storeId),
    pickupAddress: seed.pickupAddress,
    dropoffAddress: seed.dropoffAddress,
    customerName: seed.customerName,
    customerPhone: seed.customerPhone,
    confirmationCode: seed.confirmationCode,
    navigationUrl: buildNavigationUrl(seed.dropoffAddress),
    requiresIdVerification: false,
  };
};

const startDemoDelivery = (orderReference: string) => {
  const order = findDemoOrder(orderReference);

  if (!order) {
    throw new NotFoundException(`No delivery order was found for ${orderReference}.`);
  }

  if (order.fulfillmentType !== "delivery") {
    throw new BadRequestException(`${order.orderNumber} is not a delivery order.`);
  }

  order.status = "picked_up";

  const now = new Date().toISOString();
  const delivery = demoDeliveryStore.get(deliveryIdForOrder(order.orderNumber)) ?? buildDemoDelivery(order, "picked_up");
  const startedDelivery: CourierDelivery = {
    ...delivery,
    status: "picked_up",
    startedAt: delivery.startedAt ?? now,
    pickedUpAt: delivery.pickedUpAt ?? now,
  };

  demoDeliveryStore.set(startedDelivery.deliveryId, startedDelivery);
  return startedDelivery;
};

export const listCourierJobs = async (courierProfileId: string) => {
  const assignments = await prisma.storeCourierAssignment.findMany({
    where: { courierProfileId },
    select: { storeId: true },
  });
  const storeIds = assignments.map((row) => row.storeId);

  if (storeIds.length === 0) {
    return [];
  }

  const persistedOrders = await prisma.order.findMany({
    where: {
      fulfillmentType: "DELIVERY" as any,
      paymentStatus: { in: ["AUTHORIZED", "PAID"] as any },
      status: { notIn: ["DELIVERED", "CANCELLED", "REJECTED"] as any },
      storeId: { in: storeIds },
    },
    include: {
      store: true,
      items: true,
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
    take: 50,
  });

  return persistedOrders.map(buildPersistedDelivery);
};

export const startDeliveryFromScan = async (input: { scanCode?: string; orderNumber?: string; driverId?: string }) => {
  const orderReference = extractOrderReference(input.scanCode ?? input.orderNumber ?? "");
  const order = await findPersistedOrder(orderReference);

  if (!order) {
    return startDemoDelivery(orderReference);
  }

  if (toApiEnum(order.fulfillmentType) !== "delivery") {
    throw new BadRequestException(`${order.orderNumber} is not a delivery order.`);
  }

  if (order.status === "DELIVERED") {
    throw new BadRequestException(`${order.orderNumber} has already been delivered.`);
  }

  const nextOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PICKED_UP" as any,
      pickedUpAt: new Date(),
      statusHistory: {
        create: {
          status: "PICKED_UP" as any,
          note: "Courier scanned the order receipt and started delivery.",
        },
      },
    },
    include: {
      store: true,
      items: true,
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
  });

  const withDelivery = await ensurePersistedDelivery(nextOrder, "picked_up", input.driverId);
  void customerNotifications.notifyOrderPickedUp(nextOrder).catch((error) => {
    console.error(`Failed to send picked-up notification for ${nextOrder.orderNumber}`, error);
  });
  return buildPersistedDelivery(withDelivery);
};

export const updateCourierLocation = async (deliveryId: string, input: CourierLocationInput, courierProfileId?: string) => {
  if (!isInsideHullServiceBounds(input)) {
    throw new BadRequestException("Courier location is outside the Hull delivery area.");
  }

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      order: {
        include: {
          store: true,
          items: true,
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
      },
    },
  });

  if (!delivery) {
    const demoDelivery = demoDeliveryStore.get(deliveryId);

    if (!demoDelivery) {
      throw new NotFoundException(`Delivery ${deliveryId} has not been started.`);
    }

    const updated: CourierDelivery = {
      ...demoDelivery,
      courierLocation: {
        ...input,
        updatedAt: new Date().toISOString(),
      },
    };

    demoDeliveryStore.set(deliveryId, updated);
    return updated;
  }

  if (courierProfileId && delivery.courierProfileId && delivery.courierProfileId !== courierProfileId) {
    throw new BadRequestException("This delivery is assigned to a different courier.");
  }

  const state = parseTrackingState(delivery.externalReference);
  const updatedState: PersistedTrackingState = {
    ...state,
    confirmationCode: state.confirmationCode ?? buildConfirmationCode(delivery.order.orderNumber),
    courierLocation: {
      ...input,
      updatedAt: new Date().toISOString(),
    },
  };

  const updatedDelivery = await prisma.delivery.update({
    where: { id: delivery.id },
    data: {
      externalReference: encodeTrackingState(updatedState),
    },
  });

  return buildPersistedDelivery({
    ...delivery.order,
    delivery: updatedDelivery,
  });
};

export const completeDeliveryWithCode = async (deliveryId: string, confirmationCode: string) => {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      order: {
        include: {
          store: true,
          items: true,
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
      },
    },
  });

  if (!delivery) {
    const demoDelivery = demoDeliveryStore.get(deliveryId);

    if (!demoDelivery) {
      throw new NotFoundException(`Delivery ${deliveryId} has not been started.`);
    }

    if (demoDelivery.confirmationCode !== confirmationCode.trim()) {
      throw new BadRequestException("The customer PIN does not match this order.");
    }

    const completed: CourierDelivery = {
      ...demoDelivery,
      status: "delivered",
      deliveredAt: new Date().toISOString(),
    };

    demoDeliveryStore.set(deliveryId, completed);
    return completed;
  }

  const state = parseTrackingState(delivery.externalReference);
  const expectedCode = state.confirmationCode ?? buildConfirmationCode(delivery.order.orderNumber);

  if (expectedCode !== confirmationCode.trim()) {
    throw new BadRequestException("The customer PIN does not match this order.");
  }

  const updatedOrder = await prisma.order.update({
    where: { id: delivery.orderId },
    data: {
      status: "DELIVERED" as any,
      deliveredAt: new Date(),
      statusHistory: {
        create: {
          status: "DELIVERED" as any,
          note: "Courier confirmed the customer PIN at the door.",
        },
      },
      delivery: {
        update: {
          status: "DELIVERED" as any,
          deliveredAt: new Date(),
          statusHistory: {
            create: {
              status: "DELIVERED" as any,
              note: "Customer PIN confirmed.",
            },
          },
        },
      },
    },
    include: {
      store: true,
      items: true,
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
  });

  void customerNotifications.notifyOrderDelivered(updatedOrder).catch((error) => {
    console.error(`Failed to send delivered notification for ${updatedOrder.orderNumber}`, error);
  });

  return buildPersistedDelivery(updatedOrder);
};

export const findTrackedOrder = async (orderId: string) => {
  const orderReference = extractOrderReference(orderId);
  const persistedOrder = await findPersistedOrder(orderReference);

  if (persistedOrder) {
    return trackedOrderSchema.parse({
      ...buildOrderSummaryForClient(persistedOrder),
      delivery: buildPersistedDelivery(persistedOrder),
      items: mapPersistedOrderLineItems(persistedOrder.items ?? []),
    });
  }

  const demoOrder = findDemoOrder(orderReference) ?? demoOrders[0]!;
  const placedMs = Date.parse(demoOrder.placedAt);
  const demoSummary = orderSummarySchema.parse({
    ...demoOrder,
    customerCancelUntil: new Date(placedMs + 60_000).toISOString(),
    merchantResponseDeadlineAt:
      demoOrder.status === "pending" ? new Date(placedMs + 120_000).toISOString() : undefined,
  });

  return trackedOrderSchema.parse({
    ...demoSummary,
    delivery: demoDeliveryStore.get(deliveryIdForOrder(demoOrder.orderNumber)) ?? buildDemoDelivery(demoOrder, demoOrder.status === "delivered" ? "delivered" : "assigned"),
    items: demoTrackedLineItems(demoOrder.orderNumber),
  });
};
