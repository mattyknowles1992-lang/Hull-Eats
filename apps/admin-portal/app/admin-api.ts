import type { ContactMessageRecord, OrderSummary } from "@hull-eats/types";

const defaultApiBaseUrl = process.env.NODE_ENV === "production" ? "https://hull-eats-api.onrender.com" : "http://localhost:4000";
export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl).replace(/\/$/, "");
export const adminSessionStorageKey = "hull-eats-admin-session";

export type BusinessType = "restaurant" | "takeaway" | "shop";
export type CourierStatus = "active" | "offline" | "break" | "invited" | "disabled";
export type PlatformRole = "platform_admin" | "platform_staff" | "business_owner" | "business_manager";

type ApiAdminHubSummary = {
  id: string;
  businessName: string;
  slug: string;
  type: BusinessType;
  hubUsername: string;
  deliveryLeadTime: string;
  status: "live" | "onboarding" | "paused";
  ownerName: string;
  orderVolumeToday: number;
  orderVolumeWeek: number;
  grossSalesWeek: string;
  averageOrderValue: string;
  activeOrders: Array<{
    id: string;
    customerName: string;
    status: string;
    total: string;
    placedAgo: string;
  }>;
  notes: string[];
};

export type AdminHubSummary = Omit<ApiAdminHubSummary, "status"> & {
  status: "live" | "setup" | "paused";
};

export type AdminHubUserSummary = {
  id: string;
  hubId: string;
  hubBusinessName: string;
  fullName: string;
  email: string;
  username: string;
  role: "owner" | "manager" | "staff" | "viewer";
  status: "active" | "invited" | "disabled";
};

export type AdminCustomerSummary = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  accountStatus: "active" | "suspended" | "banned" | "disabled" | "deleted";
  emailVerified: boolean;
  marketingOptIn: boolean;
  preferredDeliveryPlan: "pay_as_you_go" | "hull_eats_plus";
  createdAt: string;
  defaultAddress: string;
  subscriptionId: string | null;
  subscriptionStatus: string;
  hullEatsPlusActive: boolean;
  adminOverride: boolean;
  manualReviewRequired: boolean;
  moderationNoteCount: number;
};

export type AdminLoginResponse = {
  token: string;
  admin: {
    email: string;
  };
};

export type AdminCreateHubResponse = {
  hub: ApiAdminHubSummary;
  ownerUser: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    role: "owner" | "manager" | "staff";
  };
  temporaryPassword: string;
};

export type AdminCourierSummary = {
  id: string;
  userId: string;
  courierProfileId: string;
  fullName: string;
  email: string;
  phone: string;
  username: string;
  vehicleType: string;
  vehicleRegistration: string;
  zone: string;
  status: CourierStatus;
  driverStatus: string;
  rating: number;
  completedDeliveries: number;
  weeklyEarnings: number;
  rewardPoints: number;
  nextPayoutDate: string | null;
  assignedStores: Array<{
    storeId: string;
    name: string;
    slug: string;
    hubId: string;
    hubName: string;
  }>;
};

export type AdminHubOrderSummary = OrderSummary & {
  hubId: string;
  hubName: string;
  hubSlug: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  courierProfileId: string | null;
  courierName: string | null;
};

export type AdminCreateHubCourierResponse = {
  courierProfileId: string;
  fullName: string;
  email: string;
  username: string;
  temporaryPassword?: string;
  alreadyExisted?: boolean;
  message?: string;
  assignments: Array<{
    id: string;
    courierProfileId: string;
    courierEmail: string;
    courierName: string;
    storeId: string;
    storeName: string;
    createdAt: string;
  }>;
};

function mapApiHubToRecord(hub: ApiAdminHubSummary): AdminHubSummary {
  return {
    ...hub,
    status: hub.status === "onboarding" ? "setup" : hub.status,
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  } catch {
    // Ignore JSON parsing problems and use fallback.
  }

  return `${fallback} (${response.status})`;
}

async function authedFetch(path: string, token: string, init?: RequestInit) {
  return fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  });
}

export async function loginToAdmin(email: string, password: string): Promise<AdminLoginResponse> {
  const response = await fetch(`${apiBaseUrl}/v1/admin/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin login failed"));
  }

  return parseJson<AdminLoginResponse>(response);
}

export async function fetchAdminHubs(token: string): Promise<AdminHubSummary[]> {
  const response = await authedFetch("/v1/admin/hubs", token);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin hub fetch failed"));
  }
  const hubs = await parseJson<ApiAdminHubSummary[]>(response);
  return hubs.map(mapApiHubToRecord);
}

export async function fetchAdminUsers(token: string): Promise<AdminHubUserSummary[]> {
  const response = await authedFetch("/v1/admin/users", token);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin user fetch failed"));
  }
  return parseJson<AdminHubUserSummary[]>(response);
}

export async function fetchAdminCustomers(token: string): Promise<AdminCustomerSummary[]> {
  const response = await authedFetch("/v1/admin/customers", token);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin customer fetch failed"));
  }
  return parseJson<AdminCustomerSummary[]>(response);
}

export async function updateAdminCustomer(token: string, customerId: string, input: Record<string, unknown>): Promise<AdminCustomerSummary> {
  const response = await authedFetch(`/v1/admin/customers/${encodeURIComponent(customerId)}`, token, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin customer update failed"));
  }
  return parseJson<AdminCustomerSummary>(response);
}

export async function createAdminHub(
  token: string,
  input: {
    businessName: string;
    ownerEmail: string;
    hubPassword: string;
  },
): Promise<AdminCreateHubResponse> {
  const response = await authedFetch("/v1/admin/hubs", token, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin hub create failed"));
  }
  return parseJson<AdminCreateHubResponse>(response);
}

export async function deleteAdminHub(token: string, hubId: string) {
  const response = await authedFetch(`/v1/admin/hubs/${encodeURIComponent(hubId)}`, token, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin hub delete failed"));
  }
  return parseJson<{ deletedHubId: string; deletedBusinessName: string }>(response);
}

export async function publishAdminHub(token: string, hubId: string) {
  const response = await authedFetch(`/v1/admin/hubs/${encodeURIComponent(hubId)}/publish`, token, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin hub publish failed"));
  }
  return parseJson<{ hub: ApiAdminHubSummary }>(response);
}

export async function createAdminHubUser(
  token: string,
  hubId: string,
  input: {
    fullName: string;
    email: string;
    username: string;
    password: string;
    role: "owner" | "manager" | "staff" | "viewer";
  },
) {
  const response = await authedFetch(`/v1/admin/hubs/${encodeURIComponent(hubId)}/users`, token, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin hub user create failed"));
  }
  return parseJson<{
    id: string;
    hubId: string;
    fullName: string;
    email: string;
    username: string;
    role: "owner" | "manager" | "staff" | "viewer";
    status: "active" | "invited" | "disabled";
  }>(response);
}

export async function fetchAdminCouriers(token: string): Promise<AdminCourierSummary[]> {
  const response = await authedFetch("/v1/admin/couriers", token);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin courier fetch failed"));
  }
  return parseJson<AdminCourierSummary[]>(response);
}

export async function createAdminHubCourier(
  token: string,
  hubId: string,
  input: {
    fullName: string;
    email: string;
    phone: string;
    username: string;
    password: string;
    vehicleType: string;
    vehicleRegistration?: string;
  },
): Promise<AdminCreateHubCourierResponse> {
  const response = await authedFetch(`/v1/admin/hubs/${encodeURIComponent(hubId)}/couriers`, token, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin hub courier create failed"));
  }
  return parseJson<AdminCreateHubCourierResponse>(response);
}

export async function removeAdminHubCourierAssignment(token: string, hubId: string, courierProfileId: string) {
  const response = await authedFetch(
    `/v1/admin/hubs/${encodeURIComponent(hubId)}/couriers/${encodeURIComponent(courierProfileId)}/assignment`,
    token,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin courier unassign failed"));
  }
  return parseJson<{ removed: true; courierProfileId: string }>(response);
}

export async function updateAdminCourier(
  token: string,
  courierProfileId: string,
  input: Partial<{
    fullName: string;
    email: string;
    phone: string;
    username: string;
    password: string;
    vehicleType: string;
    vehicleRegistration: string | null;
    status: CourierStatus;
  }>,
): Promise<AdminCourierSummary> {
  const response = await authedFetch(`/v1/admin/couriers/${encodeURIComponent(courierProfileId)}`, token, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin courier update failed"));
  }
  return parseJson<AdminCourierSummary>(response);
}

export async function deleteAdminCourier(token: string, courierProfileId: string) {
  const response = await authedFetch(`/v1/admin/couriers/${encodeURIComponent(courierProfileId)}`, token, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin courier delete failed"));
  }
  return parseJson<{ deletedCourierProfileId: string }>(response);
}

export async function fetchAdminOrders(token: string): Promise<AdminHubOrderSummary[]> {
  const response = await authedFetch("/v1/admin/orders", token);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin order fetch failed"));
  }
  return parseJson<AdminHubOrderSummary[]>(response);
}

export async function fetchAdminContactMessages(token: string): Promise<ContactMessageRecord[]> {
  const response = await authedFetch("/v1/admin/contact-messages", token);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin inbox fetch failed"));
  }
  return parseJson<ContactMessageRecord[]>(response);
}

export async function updateAdminContactMessageStatus(
  token: string,
  messageId: string,
  status: "new" | "in_progress" | "resolved",
): Promise<ContactMessageRecord> {
  const response = await authedFetch(`/v1/admin/contact-messages/${encodeURIComponent(messageId)}/status`, token, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Admin inbox update failed"));
  }
  return parseJson<ContactMessageRecord>(response);
}
