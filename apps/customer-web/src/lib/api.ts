import type { CheckoutSession, CreateCheckoutSessionInput, TrackedOrder } from "@hull-eats/types";

const defaultApiBaseUrl = process.env.NODE_ENV === "production" ? "https://hull-eats-api.onrender.com" : "http://localhost:4000";
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl).replace(/\/$/, "");

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

export async function placeCheckoutOrder(checkoutSessionId: string, paymentMode: "dojo_card" | "cash_on_delivery" | "mock_paid" = "dojo_card"): Promise<{
  checkoutSessionId: string;
  paymentRequired: boolean;
  nextStep: string;
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    currency: string;
    status: string;
    paymentStatus?: string;
    paymentMethod?: string;
  };
}> {
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

  return (await response.json()) as {
    checkoutSessionId: string;
    paymentRequired: boolean;
    nextStep: string;
    order: {
      id: string;
      orderNumber: string;
      totalAmount: number;
      currency: string;
      status: string;
      paymentStatus?: string;
      paymentMethod?: string;
    };
  };
}

export async function trackOrder(orderId: string): Promise<TrackedOrder> {
  const response = await fetch(`${apiBaseUrl}/v1/public/orders/${encodeURIComponent(orderId)}/track`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Order tracking request failed with status ${response.status}`);
  }

  return (await response.json()) as TrackedOrder;
}
