import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { CheckoutSession, CreateCheckoutSessionInput, OrderSummary } from "@hull-eats/types";
import { checkoutSessionSchema, orderSummarySchema } from "@hull-eats/types";

import { demoMenuByStore, demoOrders, demoStores } from "./demo-data";

type SessionRecord = {
  checkoutSession: CheckoutSession;
  input: CreateCheckoutSessionInput;
};

const sessionStore = new Map<string, SessionRecord>();

const resolveStore = (storeId: string) =>
  demoStores.find((entry) => entry.id === storeId || entry.slug === storeId) ??
  (() => {
    throw new NotFoundException(`Store ${storeId} was not found.`);
  })();

const buildCheckoutSession = (
  sessionId: string,
  input: CreateCheckoutSessionInput,
): SessionRecord => {
  const store = resolveStore(input.storeId);
  const menuItems = demoMenuByStore[store.slug] ?? [];
  const menuItemLookup = new Map(menuItems.map((item) => [item.id, item]));

  const lineItems = input.items.map((line) => {
    const menuItem = menuItemLookup.get(line.menuItemId);

    if (!menuItem) {
      throw new BadRequestException(`Menu item ${line.menuItemId} is not available for ${store.name}.`);
    }

    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity: line.quantity,
      unitPrice: menuItem.price,
      lineTotal: Number((menuItem.price * line.quantity).toFixed(2)),
      notes: line.notes,
    };
  });

  const subtotalAmount = Number(lineItems.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));
  const minimumOrderAmount = Number(store.minimumOrderAmount ?? 0);
  const deliveryFee = input.fulfillmentType === "delivery" ? Number(store.deliveryFee ?? 0) : 0;
  const totalAmount = Number((subtotalAmount + deliveryFee).toFixed(2));
  const addressPresent =
    input.fulfillmentType === "pickup" || Boolean(input.customerAddressId || (input.addressLine1 && input.city && input.postcode));
  const isMinimumOrderMet = subtotalAmount >= minimumOrderAmount;
  const canPlaceOrder = addressPresent && isMinimumOrderMet && store.menuSetupComplete;

  const checkoutSession = checkoutSessionSchema.parse({
    id: sessionId,
    storeId: store.id,
    storeName: store.name,
    source: input.source,
    fulfillmentType: input.fulfillmentType,
    status: !addressPresent && input.fulfillmentType === "delivery" ? "address_pending" : canPlaceOrder ? "ready_to_place" : "pricing_pending",
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    customerAddressId: input.customerAddressId,
    addressLine1: input.addressLine1,
    city: input.city,
    postcode: input.postcode,
    promoCode: input.promoCode,
    notes: input.notes,
    lineItems,
    itemCount: lineItems.reduce((count, line) => count + line.quantity, 0),
    subtotalAmount,
    deliveryFee,
    totalAmount,
    currency: "GBP",
    canPlaceOrder,
    menuSetupComplete: store.menuSetupComplete,
    minimumOrderAmount,
    isMinimumOrderMet,
  });

  return {
    checkoutSession,
    input,
  };
};

export const createStoredCheckoutSession = (input: CreateCheckoutSessionInput): CheckoutSession => {
  const sessionId = `checkout_${Date.now()}`;
  const record = buildCheckoutSession(sessionId, input);

  sessionStore.set(sessionId, record);

  return record.checkoutSession;
};

export const refreshStoredCheckoutSession = (checkoutSessionId: string): CheckoutSession => {
  const current = sessionStore.get(checkoutSessionId);

  if (!current) {
    throw new NotFoundException(`Checkout session ${checkoutSessionId} was not found.`);
  }

  const refreshed = buildCheckoutSession(checkoutSessionId, current.input);
  sessionStore.set(checkoutSessionId, refreshed);

  return refreshed.checkoutSession;
};

export const getStoredCheckoutSession = (checkoutSessionId: string): CheckoutSession => {
  const current = sessionStore.get(checkoutSessionId);

  if (!current) {
    throw new NotFoundException(`Checkout session ${checkoutSessionId} was not found.`);
  }

  return current.checkoutSession;
};

export const placeStoredCheckoutOrder = (checkoutSessionId: string): OrderSummary => {
  const record = sessionStore.get(checkoutSessionId);

  if (!record) {
    throw new NotFoundException(`Checkout session ${checkoutSessionId} was not found.`);
  }

  const session = record.checkoutSession;

  if (!session.canPlaceOrder) {
    throw new BadRequestException("Checkout session is not ready to place an order yet.");
  }

  const order = orderSummarySchema.parse({
    id: `order_${Date.now()}`,
    orderNumber: `HE-${Math.floor(Math.random() * 9000) + 1000}`,
    storeId: session.storeId,
    status: "pending",
    paymentStatus: "pending",
    fulfillmentType: session.fulfillmentType,
    source: session.source,
    totalAmount: session.totalAmount,
    currency: session.currency,
    placedAt: new Date().toISOString(),
    prepTimeMinutes: null,
  });

  demoOrders.unshift(order);

  sessionStore.set(checkoutSessionId, {
    ...record,
    checkoutSession: {
      ...session,
      status: "completed",
    },
  });

  return order;
};
