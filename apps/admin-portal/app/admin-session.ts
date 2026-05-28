import { AdminApiError, adminSessionEmailStorageKey, adminSessionStorageKey } from "./admin-api";

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return decodeURIComponent(
    atob(padded)
      .split("")
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join(""),
  );
}

export function decodeAdminSessionPayload(token: string): { exp?: number } | null {
  const [encodedPayload] = token.split(".");
  if (!encodedPayload) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(encodedPayload)) as { exp?: number };
  } catch {
    return null;
  }
}

export function isAdminSessionTokenExpired(token: string, nowMs = Date.now()): boolean {
  const payload = decodeAdminSessionPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }

  return payload.exp * 1000 <= nowMs;
}

export function clearAdminSessionStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(adminSessionStorageKey);
  window.sessionStorage.removeItem(adminSessionEmailStorageKey);
}

export function readStoredAdminSessionToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.sessionStorage.getItem(adminSessionStorageKey);
  if (!token) {
    return null;
  }

  if (isAdminSessionTokenExpired(token)) {
    clearAdminSessionStorage();
    return null;
  }

  return token;
}

export function isAdminSessionAuthFailure(error: unknown): boolean {
  if (error instanceof AdminApiError) {
    return error.isAuthFailure;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("session token") ||
      message.includes("admin token") ||
      message.includes("authorization header") ||
      message.includes("missing authorization") ||
      /\b401\b/.test(message)
    );
  }

  return false;
}

export const adminSessionExpiredMessage = "Your admin session ended. Sign in again.";
