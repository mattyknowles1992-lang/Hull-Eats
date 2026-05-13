import type { CheckoutSession, CreateCheckoutSessionInput, OrderSummary, TrackedOrder } from "@hull-eats/types";
import { orderSummarySchema, trackedOrderSchema } from "@hull-eats/types";

const defaultApiBaseUrl = process.env.NODE_ENV === "production" ? "https://hull-eats-api.onrender.com" : "http://localhost:4000";
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl).replace(/\/$/, "");

export type PlacedCheckoutResponse = {
  checkoutSessionId: string;
  paymentRequired: boolean;
  nextStep: string;
  order: OrderSummary;
};

export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
  const response = await fetch(`${apiBaseUrl}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Checkout session request failed with status ${response.status}`);
  }

  return (await response.json()) as CheckoutSession;
}

export async function placeCheckoutOrder(
  checkoutSessionId: string,
  paymentMode: "dojo_card" | "cash_on_delivery" | "mock_paid" = "dojo_card",
): Promise<PlacedCheckoutResponse> {
  const response = await fetch(`${apiBaseUrl}/v1/checkout/sessions/${checkoutSessionId}/place-order`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ paymentMode }),
  });

  if (!response.ok) {
    throw new Error(`Place order request failed with status ${response.status}`);
  }

  const raw: unknown = await response.json();
  const parsed = raw as { checkoutSessionId?: string; paymentRequired?: boolean; nextStep?: string; order?: unknown };
  if (!parsed.order || typeof parsed.checkoutSessionId !== "string") {
    throw new Error("Place order response was missing expected fields.");
  }

  return {
    checkoutSessionId: parsed.checkoutSessionId,
    paymentRequired: Boolean(parsed.paymentRequired),
    nextStep: String(parsed.nextStep ?? ""),
    order: orderSummarySchema.parse(parsed.order),
  };
}

export async function cancelCustomerOrderWithinGrace(input: {
  orderId?: string;
  orderNumber?: string;
  customerProfileId?: string;
  customerPhone?: string;
}): Promise<OrderSummary> {
  const response = await fetch(`${apiBaseUrl}/v1/public/orders/cancel`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Cancel order request failed with status ${response.status}`);
  }

  return orderSummarySchema.parse(await response.json());
}

export async function trackOrder(orderId: string): Promise<TrackedOrder> {
  const response = await fetch(`${apiBaseUrl}/v1/public/orders/${encodeURIComponent(orderId)}/track`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Order tracking request failed with status ${response.status}`);
  }

  const raw: unknown = await response.json();
  return trackedOrderSchema.parse(raw);
}
