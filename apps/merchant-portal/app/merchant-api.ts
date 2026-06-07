import type {
  HubMenuSection,
  HubSettings,
  HubUser,
  MembershipRole,
  MerchantPasswordResetCompleteResult,
  MerchantPasswordResetRequestResult,
  MerchantPasswordResetVerifyResult,
  MerchantWorkspace,
  MenuItem,
  OrderSummary,
} from "@hull-eats/types";
import { HUB_MENU_CATEGORY_CUSTOM_ID, parseMerchantWorkspaceUpdateInput, type HubPortalLocale } from "@hull-eats/types";

import { apiBaseUrl, customerWebBaseUrl } from "./merchant-config";
import { friendlyMerchantMessage } from "./hub-merchant-errors";
import { merchantJson } from "./merchant-request";

export { apiBaseUrl, customerWebBaseUrl };

export type MerchantLoginResponse = {
  token: string;
  user: HubUser;
  workspace: MerchantWorkspace;
};

export type CreateCategoryFormState = {
  presetId: string;
  name: string;
  description: string;
  defaultPrice: string;
};

export type MerchantDriverTracking = {
  drivers: Array<{
    courierProfileId: string;
    courierName: string;
    currentStatus: string;
    rating: number | null;
    latestLocation?: {
      latitude: number;
      longitude: number;
      accuracyMeters?: number;
      heading?: number;
      updatedAt: string;
    };
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
  }>;
  totals: {
    driverCount: number;
    orderCount: number;
    cashDue: number;
    cashOrderCount: number;
  };
  liveMapAllowed?: boolean;
  liveMapMessage?: string;
};

export type MerchantOrderPrintResponse = {
  payload: {
    qrCodeData?: string;
  };
  preview: string;
  queued?: boolean;
  printJobId?: string;
  message?: string;
};

type HubRole = MembershipRole;

export async function loginToHub(usernameOrEmail: string, password: string): Promise<MerchantLoginResponse> {
  return merchantJson<MerchantLoginResponse>("/v1/merchant/auth/login", "login", {
    method: "POST",
    body: JSON.stringify({ username: usernameOrEmail, password }),
  });
}

export async function requestHubPasswordReset(email: string): Promise<MerchantPasswordResetRequestResult> {
  return merchantJson<MerchantPasswordResetRequestResult>("/v1/merchant/auth/password-reset/request", "password_reset_request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyHubPasswordReset(email: string, code: string): Promise<MerchantPasswordResetVerifyResult> {
  return merchantJson<MerchantPasswordResetVerifyResult>("/v1/merchant/auth/password-reset/verify", "password_reset_verify", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export async function completeHubPasswordReset(
  email: string,
  code: string,
): Promise<MerchantPasswordResetCompleteResult> {
  return merchantJson<MerchantPasswordResetCompleteResult>("/v1/merchant/auth/password-reset/complete", "password_reset_complete", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export async function fetchWorkspace(token: string, hubId: string): Promise<MerchantWorkspace> {
  return merchantJson<MerchantWorkspace>(`/v1/merchant/hubs/${hubId}/workspace`, "workspace_fetch", {
    cache: "no-store",
    token,
  });
}

export async function saveWorkspace(
  token: string,
  hubId: string,
  input: { settings?: Partial<HubSettings>; menuSections?: HubMenuSection[] },
  options?: { timeoutMs?: number },
): Promise<MerchantWorkspace> {
  let payload: ReturnType<typeof parseMerchantWorkspaceUpdateInput>;
  try {
    payload = parseMerchantWorkspaceUpdateInput(input);
  } catch (error) {
    const issues =
      error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues: unknown }).issues)
        ? (error as { issues: Array<{ path?: (string | number)[]; message?: string }> }).issues
        : null;
    if (issues?.length) {
      throw new Error(
        friendlyMerchantMessage(
          issues.map((issue) => `${issue.path?.join(".") ?? "request"}: ${issue.message ?? "invalid"}`).join("; "),
          "workspace_save",
        ),
      );
    }
    throw error;
  }

  return merchantJson<MerchantWorkspace>(`/v1/merchant/hubs/${hubId}/workspace`, "workspace_save", {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
    timeoutMs: options?.timeoutMs ?? 120_000,
  });
}

export async function changeHubPassword(
  token: string,
  hubId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<{ changed: boolean; user: HubUser }> {
  return merchantJson<{ changed: boolean; user: HubUser }>(`/v1/merchant/hubs/${hubId}/password`, "password_change", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export async function submitMerchantContactMessage(
  token: string,
  hubId: string,
  input: { senderPhone?: string; subject: string; message: string; orderNumber?: string; sourcePath?: string },
): Promise<{ id: string }> {
  return merchantJson<{ id: string }>(`/v1/merchant/hubs/${hubId}/contact-messages`, "support", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export async function createBusinessUser(
  token: string,
  hubId: string,
  input: { fullName: string; email: string; username: string; password: string; role: HubRole },
): Promise<HubUser> {
  return merchantJson<HubUser>(`/v1/merchant/hubs/${hubId}/users`, "user_create", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export async function deleteBusinessUser(
  token: string,
  hubId: string,
  userId: string,
): Promise<{ deletedUserId: string }> {
  return merchantJson<{ deletedUserId: string }>(`/v1/merchant/hubs/${hubId}/users/${userId}`, "user_delete", {
    method: "DELETE",
    token,
  });
}

export async function createMenuCategory(
  token: string,
  hubId: string,
  input: CreateCategoryFormState,
): Promise<HubMenuSection> {
  const presetKey = input.presetId && input.presetId !== HUB_MENU_CATEGORY_CUSTOM_ID ? input.presetId : undefined;
  return merchantJson<HubMenuSection>(`/v1/merchant/hubs/${hubId}/menu-sections`, "menu_category", {
    method: "POST",
    token,
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      defaultPrice: input.defaultPrice.trim() ? Number(input.defaultPrice) : null,
      presetKey,
    }),
  });
}

export async function deleteMenuCategory(
  token: string,
  hubId: string,
  sectionId: string,
): Promise<{ deletedSectionId: string }> {
  return merchantJson<{ deletedSectionId: string }>(`/v1/merchant/hubs/${hubId}/menu-sections/${sectionId}`, "menu_category", {
    method: "DELETE",
    token,
  });
}

export async function createMenuItem(
  token: string,
  hubId: string,
  sectionId: string,
  input: {
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
    requiresIdVerification?: boolean;
    components: MenuItem["components"];
    optionGroups: MenuItem["optionGroups"];
  },
): Promise<HubMenuSection["items"][number]> {
  return merchantJson<HubMenuSection["items"][number]>(
    `/v1/merchant/hubs/${hubId}/menu-sections/${sectionId}/items`,
    "menu_item",
    { method: "POST", token, body: JSON.stringify(input) },
  );
}

export async function deleteMenuItem(
  token: string,
  hubId: string,
  itemId: string,
): Promise<{ deletedItemId: string }> {
  return merchantJson<{ deletedItemId: string }>(`/v1/merchant/hubs/${hubId}/menu-items/${itemId}`, "menu_item", {
    method: "DELETE",
    token,
  });
}

export async function previewMenuImport(
  token: string,
  hubId: string,
  imageName: string,
): Promise<MerchantWorkspace["pendingImports"][number]> {
  return merchantJson<MerchantWorkspace["pendingImports"][number]>(
    `/v1/merchant/hubs/${hubId}/menu-imports/preview`,
    "menu_import",
    { method: "POST", token, body: JSON.stringify({ imageName }) },
  );
}

export async function previewMenuTextImport(
  token: string,
  hubId: string,
  rawText: string,
): Promise<MerchantWorkspace["pendingImports"][number]> {
  return merchantJson<MerchantWorkspace["pendingImports"][number]>(
    `/v1/merchant/hubs/${hubId}/menu-imports/text-preview`,
    "menu_import",
    { method: "POST", token, body: JSON.stringify({ rawText }) },
  );
}

export async function applyMenuImport(
  token: string,
  hubId: string,
  importId: string,
  acceptedCandidateIds: string[],
): Promise<MerchantWorkspace> {
  return merchantJson<MerchantWorkspace>(`/v1/merchant/hubs/${hubId}/menu-imports/${importId}/apply`, "menu_import", {
    method: "POST",
    token,
    body: JSON.stringify({ acceptedCandidateIds }),
  });
}

export async function fetchMerchantOrders(token: string): Promise<OrderSummary[]> {
  return merchantJson<OrderSummary[]>("/v1/merchant/orders", "orders", { cache: "no-store", token });
}

export async function fetchMerchantOrderHistory(token: string): Promise<OrderSummary[]> {
  return merchantJson<OrderSummary[]>("/v1/merchant/orders/history", "orders", { cache: "no-store", token });
}

export async function fetchMerchantDriverTracking(token: string): Promise<MerchantDriverTracking> {
  return merchantJson<MerchantDriverTracking>("/v1/merchant/drivers/tracking", "orders", { cache: "no-store", token });
}

export async function printMerchantOrderReceipt(token: string, orderId: string): Promise<MerchantOrderPrintResponse> {
  return merchantJson<MerchantOrderPrintResponse>(`/v1/merchant/orders/${encodeURIComponent(orderId)}/print`, "print", {
    method: "POST",
    token,
  });
}

export async function acceptMerchantOrder(token: string, orderId: string, prepTimeMinutes: number): Promise<OrderSummary> {
  return merchantJson<OrderSummary>(`/v1/merchant/orders/${encodeURIComponent(orderId)}/accept`, "order_action", {
    method: "POST",
    token,
    body: JSON.stringify({ prepTimeMinutes }),
  });
}

export async function rejectMerchantOrder(token: string, orderId: string, reason: string): Promise<OrderSummary> {
  return merchantJson<OrderSummary>(`/v1/merchant/orders/${encodeURIComponent(orderId)}/reject`, "order_action", {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
}

export async function updateMerchantPreferredLocale(
  token: string,
  hubId: string,
  preferredLocale: HubPortalLocale,
): Promise<HubUser> {
  const payload = await merchantJson<{ user: HubUser }>(`/v1/merchant/hubs/${hubId}/me/locale`, "locale_update", {
    method: "PATCH",
    token,
    body: JSON.stringify({ preferredLocale }),
  });
  return payload.user;
}
