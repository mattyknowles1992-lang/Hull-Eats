import { ApiRequestError, apiJson } from "@hull-eats/sdk";

import { friendlyMerchantMessage, readMerchantApiError, type MerchantErrorContext } from "./hub-merchant-errors";
import { apiBaseUrl } from "./merchant-config";

function isApiRequestError(error: unknown): error is ApiRequestError {
  return (
    error instanceof ApiRequestError ||
    (typeof error === "object" &&
      error !== null &&
      "response" in error &&
      (error as { response?: unknown }).response instanceof Response)
  );
}

export async function merchantJson<T>(
  path: string,
  context: MerchantErrorContext,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  try {
    return await apiJson<T>(path, {
      baseUrl: apiBaseUrl,
      token: init.token,
      cache: init.cache,
      method: init.method,
      body: init.body,
      headers: init.headers,
    });
  } catch (error) {
    if (isApiRequestError(error)) {
      throw new Error(await readMerchantApiError(error.response, context));
    }
    throw error;
  }
}
