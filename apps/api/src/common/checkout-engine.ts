import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { CheckoutSession, CreateCheckoutSessionInput, OrderPaymentMethod, OrderSummary } from "@hull-eats/types";
import { checkoutSessionSchema } from "@hull-eats/types";

import { demoMenuByStore, demoStores } from "./demo-data";
import { persistCheckoutOrder } from "./order-repository";

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

    const selectedOptionQuantities = Object.fromEntries(
      Object.entries(line.selectedOptionQuantities ?? {}).filter(([, quantity]) => quantity > 0),
    );

    const selectedOptionGroups = menuItem.optionGroups.filter(
      (group) =>
        group.showWhenValueIds.length === 0 ||
        group.showWhenValueIds.some((valueId) => (selectedOptionQuantities[valueId] ?? 0) > 0),
    );

    const selectedOptions = selectedOptionGroups.flatMap((group) =>
      group.options
        .filter((option) => (selectedOptionQuantities[option.id] ?? 0) > 0)
        .map((option) => ({
          groupId: group.id,
          groupName: group.name,
          valueId: option.id,
          valueName: option.label,
          quantity: selectedOptionQuantities[option.id] ?? 0,
          priceDelta: option.priceDelta,
        })),
    );

    selectedOptionGroups.forEach((group) => {
      const selectedCount = group.options.reduce((sum, option) => sum + (selectedOptionQuantities[option.id] ?? 0), 0);
      const minimumSelections = group.isRequired ? Math.max(group.minSelections, 1) : group.minSelections;
      const maximumSelections = group.selectionMode === "single" ? 1 : group.maxSelections;

      if (selectedCount < minimumSelections) {
        throw new BadRequestException(`${menuItem.name}: ${group.name} requires at least ${minimumSelections} selection(s).`);
      }

      if (maximumSelections !== null && selectedCount > maximumSelections) {
        throw new BadRequestException(`${menuItem.name}: ${group.name} allows no more than ${maximumSelections} selection(s).`);
      }
    });

    const removedComponents = menuItem.components
      .filter((component) => (line.removedComponentIds ?? []).includes(component.id))
      .map((component) => ({
        componentId: component.id,
        label: component.label,
        quantity: component.quantity,
      }));

    const components = menuItem.components.map((component) => ({
      componentId: component.id,
      label: component.label,
      quantity: component.quantity,
      removed: (line.removedComponentIds ?? []).includes(component.id),
    }));

    const customisationTotal = Number(
      selectedOptions.reduce((sum, option) => sum + option.priceDelta * option.quantity, 0).toFixed(2),
    );
    const unitPrice = Number((menuItem.price + customisationTotal).toFixed(2));

    return {
      lineId: JSON.stringify({
        menuItemId: menuItem.id,
        removedComponentIds: [...(line.removedComponentIds ?? [])].sort(),
        selectedOptionQuantities: Object.fromEntries(
          Object.entries(selectedOptionQuantities).sort(([left], [right]) => left.localeCompare(right)),
        ),
      }),
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity: line.quantity,
      unitPrice,
      customisationTotal,
      lineTotal: Number((unitPrice * line.quantity).toFixed(2)),
      requiresIdVerification: Boolean(menuItem.requiresIdVerification),
      notes: line.notes,
      components,
      removedComponents,
      selectedOptions,
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
    customerProfileId: input.customerProfileId,
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
    availablePaymentMethods: ["dojo_card", "cash_on_delivery"],
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

export const placeStoredCheckoutOrder = async (
  checkoutSessionId: string,
  options: { paymentStatus?: OrderSummary["paymentStatus"]; paymentMethod?: OrderPaymentMethod } = {},
): Promise<OrderSummary> => {
  const record = sessionStore.get(checkoutSessionId);

  if (!record) {
    throw new NotFoundException(`Checkout session ${checkoutSessionId} was not found.`);
  }

  const session = record.checkoutSession;

  if (!session.canPlaceOrder) {
    throw new BadRequestException("Checkout session is not ready to place an order yet.");
  }

  const order = await persistCheckoutOrder(session, {
    paymentStatus: options.paymentStatus ?? "pending",
    paymentMethod: options.paymentMethod ?? "dojo_card",
  });

  sessionStore.set(checkoutSessionId, {
    ...record,
    checkoutSession: {
      ...session,
      status: "completed",
    },
  });

  return order;
};
