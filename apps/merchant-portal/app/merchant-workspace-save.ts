/** Client timeout for PATCH /workspace — large menus can be slow but must not hang forever. */
export const WORKSPACE_SAVE_TIMEOUT_MS = 120_000;

export const WORKSPACE_SAVE_MAX_ATTEMPTS = 4;

/** Delay before retry attempts 2–4 (ms). Attempt 1 runs immediately. */
export const WORKSPACE_SAVE_RETRY_DELAYS_MS = [0, 1_500, 4_000, 10_000] as const;

export function isRetryableWorkspaceSaveError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (!message.trim()) {
    return true;
  }
  if (message.includes("timed out") || message.includes("timeout") || message.includes("aborted") || message.includes("too long")) {
    return true;
  }
  if (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("network request failed")
  ) {
    return true;
  }
  if (/\b502\b/.test(message) || /\b503\b/.test(message) || /\b504\b/.test(message)) {
    return true;
  }
  if (message.includes("gateway") || message.includes("bad gateway") || message.includes("service unavailable")) {
    return true;
  }
  // Validation / permission errors should not retry.
  if (
    message.includes("invalid") ||
    message.includes("permission") ||
    message.includes("view-only") ||
    message.includes("cannot save an empty menu")
  ) {
    return false;
  }
  return false;
}

export function workspaceSaveRetryDelayMs(attemptIndex: number): number {
  const index = Math.max(0, Math.min(attemptIndex, WORKSPACE_SAVE_RETRY_DELAYS_MS.length - 1));
  return WORKSPACE_SAVE_RETRY_DELAYS_MS[index] ?? 5_000;
}

export function workspaceSaveAttemptNotice(attempt: number, maxAttempts: number): string {
  if (attempt <= 1) {
    return "Saving your draft to the hub…";
  }
  return `Connection interrupted — retrying save (${attempt}/${maxAttempts})…`;
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
