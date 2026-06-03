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
  init: RequestInit & { token?: string; timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs, ...requestInit } = init;
  const abortSignal =
    timeoutMs != null && timeoutMs > 0 && typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(timeoutMs)
      : undefined;

  try {
    return await apiJson<T>(path, {
      baseUrl: apiBaseUrl,
      token: requestInit.token,
      cache: requestInit.cache,
      method: requestInit.method,
      body: requestInit.body,
      headers: requestInit.headers,
      signal: abortSignal,
    });
  } catch (error) {
    if (
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "TimeoutError")
    ) {
      throw new Error(
        friendlyMerchantMessage(
          "The save took too long or your connection dropped. Check your internet, then press Save draft again.",
          context,
        ),
      );
    }
    if (isApiRequestError(error)) {
      throw new Error(await readMerchantApiError(error.response, context));
    }
    throw error;
  }
}
