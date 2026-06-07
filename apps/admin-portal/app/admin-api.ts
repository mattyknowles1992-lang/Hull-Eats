import type { AdminHubSummary, ContactMessageRecord, HubMenuTemplate, OrderSummary } from "@hull-eats/types";

export type { AdminHubSummary } from "@hull-eats/types";

const defaultApiBaseUrl = process.env.NODE_ENV === "production" ? "https://hull-eats-api.onrender.com" : "http://localhost:4000";
export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl).replace(/\/$/, "");
const defaultMerchantPortalUrl =
  process.env.NODE_ENV === "production" ? "https://hull-eats-merchant-portal.onrender.com" : "http://localhost:3001";
export const merchantPortalBaseUrl = (process.env.NEXT_PUBLIC_MERCHANT_PORTAL_URL ?? defaultMerchantPortalUrl).replace(/\/$/, "");
export const adminSessionStorageKey = "hull-eats-admin-session";
export const adminSessionEmailStorageKey = "hull-eats-admin-email";

export type BusinessType = "restaurant" | "takeaway" | "shop";
export type CourierStatus = "active" | "offline" | "break" | "invited" | "disabled";
export type PlatformRole = "platform_admin" | "platform_staff" | "business_owner" | "business_manager";

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

export type AdminHubImpersonationResponse = {
  token: string;
  user: {
    id: string;
    hubId: string;
    fullName: string;
    email: string;
    username: string;
    role: "owner" | "manager" | "staff" | "viewer";
    status: "active" | "invited" | "disabled";
    mustChangePassword: boolean;
    preferredLocale: string;
  };
  hubId: string;
  hubSlug: string;
};

export type AdminCreateHubResponse = {
  hub: AdminHubSummary;
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

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export class AdminApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }

  get isAuthFailure() {
    return this.status === 401;
  }
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

async function assertAdminResponseOk(response: Response, fallback: string) {
  if (response.ok) {
    return;
  }

  throw new AdminApiError(await readErrorMessage(response, fallback), response.status);
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

  await assertAdminResponseOk(response, "Admin login failed");
  return parseJson<AdminLoginResponse>(response);
}

export async function fetchAdminHubs(token: string): Promise<AdminHubSummary[]> {
  const response = await authedFetch("/v1/admin/hubs", token);
  await assertAdminResponseOk(response, "Admin hub fetch failed");
  return parseJson<AdminHubSummary[]>(response);
}

export type AdminDeletedHubSummary = {
  id: string;
  businessName: string;
  slug: string;
  ownerName: string;
  hubUsername: string;
  deletedAt: string;
  recoverableUntil: string;
  daysRemaining: number;
  wasListedOnMarketplace: boolean;
  wasAcceptingOrders: boolean;
};

export async function fetchAdminDeletedHubs(token: string): Promise<AdminDeletedHubSummary[]> {
  const response = await authedFetch("/v1/admin/hubs/deleted", token);
  await assertAdminResponseOk(response, "Admin deleted hub fetch failed");
  return parseJson<AdminDeletedHubSummary[]>(response);
}

export async function fetchAdminUsers(token: string): Promise<AdminHubUserSummary[]> {
  const response = await authedFetch("/v1/admin/users", token);
  await assertAdminResponseOk(response, "Admin user fetch failed");
  return parseJson<AdminHubUserSummary[]>(response);
}

export async function fetchAdminCustomers(token: string): Promise<AdminCustomerSummary[]> {
  const response = await authedFetch("/v1/admin/customers", token);
  await assertAdminResponseOk(response, "Admin customer fetch failed");
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
  await assertAdminResponseOk(response, "Admin customer update failed");
  return parseJson<AdminCustomerSummary>(response);
}

export async function createAdminHub(
  token: string,
  input: {
    businessName: string;
    ownerEmail: string;
    hubPassword: string;
    businessPhone?: string;
    addressLine1?: string;
    city?: string;
    postcode?: string;
    cuisineLabel?: string;
    storeType?: BusinessType;
    menuTemplate?: HubMenuTemplate;
    marketplaceCategorySlug?: string;
  },
): Promise<AdminCreateHubResponse> {
  const response = await authedFetch("/v1/admin/hubs", token, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  await assertAdminResponseOk(response, "Admin hub create failed");
  return parseJson<AdminCreateHubResponse>(response);
}

export async function deleteAdminHub(token: string, hubId: string) {
  const response = await authedFetch(`/v1/admin/hubs/${encodeURIComponent(hubId)}`, token, {
    method: "DELETE",
  });
  await assertAdminResponseOk(response, "Admin hub delete failed");
  return parseJson<{ deletedHubId: string; deletedBusinessName: string; recoverableUntil: string }>(response);
}

export async function restoreAdminHub(token: string, hubId: string) {
  const response = await authedFetch(`/v1/admin/hubs/${encodeURIComponent(hubId)}/restore`, token, {
    method: "POST",
  });
  await assertAdminResponseOk(response, "Admin hub restore failed");
  return parseJson<{ hub: AdminHubSummary; restoredBusinessName: string }>(response);
}

export async function publishAdminHub(token: string, hubId: string) {
  const response = await authedFetch(`/v1/admin/hubs/${encodeURIComponent(hubId)}/publish`, token, {
    method: "POST",
  });
  await assertAdminResponseOk(response, "Admin hub publish failed");
  return parseJson<{ hub: AdminHubSummary }>(response);
}

export async function updateAdminHubLifecycle(
  token: string,
  hubId: string,
  input: {
    listedOnMarketplace?: boolean;
    acceptingOrders?: boolean;
    homepageFeatured?: boolean;
    homepageFeatureOrder?: number;
  },
): Promise<{ hub: AdminHubSummary }> {
  const response = await authedFetch(`/v1/admin/hubs/${encodeURIComponent(hubId)}/lifecycle`, token, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  await assertAdminResponseOk(response, "Admin hub lifecycle update failed");
  return parseJson<{ hub: AdminHubSummary }>(response);
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
  await assertAdminResponseOk(response, "Admin hub user create failed");
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

export async function createAdminHubImpersonation(
  token: string,
  hubId: string,
  input?: { loginHint?: string },
): Promise<AdminHubImpersonationResponse> {
  const response = await authedFetch(`/v1/admin/hubs/${encodeURIComponent(hubId)}/impersonate`, token, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input ?? {}),
  });
  await assertAdminResponseOk(response, "Admin hub impersonation failed");
  return parseJson<AdminHubImpersonationResponse>(response);
}

export async function fetchAdminCouriers(token: string): Promise<AdminCourierSummary[]> {
  const response = await authedFetch("/v1/admin/couriers", token);
  await assertAdminResponseOk(response, "Admin courier fetch failed");
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
  await assertAdminResponseOk(response, "Admin hub courier create failed");
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
  await assertAdminResponseOk(response, "Admin courier unassign failed");
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
  await assertAdminResponseOk(response, "Admin courier update failed");
  return parseJson<AdminCourierSummary>(response);
}

export async function deleteAdminCourier(token: string, courierProfileId: string) {
  const response = await authedFetch(`/v1/admin/couriers/${encodeURIComponent(courierProfileId)}`, token, {
    method: "DELETE",
  });
  await assertAdminResponseOk(response, "Admin courier delete failed");
  return parseJson<{ deletedCourierProfileId: string }>(response);
}

export async function fetchAdminOrders(token: string): Promise<AdminHubOrderSummary[]> {
  const response = await authedFetch("/v1/admin/orders", token);
  await assertAdminResponseOk(response, "Admin order fetch failed");
  return parseJson<AdminHubOrderSummary[]>(response);
}

export async function fetchAdminContactMessages(token: string): Promise<ContactMessageRecord[]> {
  const response = await authedFetch("/v1/admin/contact-messages", token);
  await assertAdminResponseOk(response, "Admin inbox fetch failed");
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
  await assertAdminResponseOk(response, "Admin inbox update failed");
  return parseJson<ContactMessageRecord>(response);
}
