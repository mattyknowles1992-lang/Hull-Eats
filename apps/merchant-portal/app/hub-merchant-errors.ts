export type MerchantErrorContext =
  | "login"
  | "session_restore"
  | "workspace_fetch"
  | "workspace_save"
  | "password_reset_request"
  | "password_reset_verify"
  | "password_reset_complete"
  | "password_change"
  | "locale_update"
  | "support"
  | "user_create"
  | "user_delete"
  | "menu_category"
  | "menu_item"
  | "menu_import"
  | "orders"
  | "order_action"
  | "print"
  | "generic";

const CONTEXT_FALLBACK: Record<MerchantErrorContext, string> = {
  login: "We could not sign you in. Check your email or username and password, then try again.",
  session_restore: "We could not reopen your hub on this device. Please sign in again.",
  workspace_fetch: "We could not load your hub. Check your connection and try again.",
  workspace_save:
    "We could not save your changes. Check your internet connection, fix any highlighted menu or settings fields, then try again.",
  password_reset_request: "We could not send a reset code. Check the email address and try again.",
  password_reset_verify: "That code did not work. Check the six digits from your email and try again.",
  password_reset_complete: "We could not set your new password. Request a new code and try again.",
  password_change: "We could not change your password. Check your current password and try again.",
  locale_update: "We could not save your language preference. Try again in a moment.",
  support: "We could not send your message. Try again or call Hull Eats support.",
  user_create: "We could not add that team member. Check their details and try again.",
  user_delete: "We could not remove that team member. Try again in a moment.",
  menu_category: "We could not update that menu category. Try again.",
  menu_item: "We could not update that menu item. Try again.",
  menu_import: "We could not process that menu import. Check the file or pasted text and try again.",
  orders: "We could not load orders. Refresh or try again shortly.",
  order_action: "We could not update that order. Try again.",
  print: "We could not print that receipt. Try again.",
  generic: "Something went wrong. Please try again.",
};

const STATUS_HINTS: Record<number, string> = {
  400: "Some details look invalid. Check the form and try again.",
  401: "Your sign-in details were not accepted. Check your email or username and password.",
  403: "Your account does not have permission to do that.",
  404: "We could not find that hub or item. Refresh the page and try again.",
  409: "That change conflicts with something already saved. Refresh and try again.",
  413: "That upload is too large. Use a smaller file and try again.",
  429: "Too many attempts. Wait a minute and try again.",
};

function isNetworkFailure(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("failed to fetch") ||
    lowered.includes("networkerror") ||
    lowered.includes("load failed") ||
    lowered.includes("network request failed")
  );
}

function looksTechnical(message: string): boolean {
  return (
    /\bstatus\s+\d{3}\b/i.test(message) ||
    /\(\d{3}\)/.test(message) ||
    /\b(request|settings|menuSections|menuItems)\./i.test(message) ||
    /:\s*invalid\b/i.test(message) ||
    message.includes("Hub workspace save failed") ||
    message.includes("Hub login failed with status") ||
    message.includes("failed with status")
  );
}

function mapKnownApiMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const lowered = trimmed.toLowerCase();

  if (lowered.includes("invalid credentials") || lowered.includes("incorrect password") || lowered.includes("unauthorized")) {
    return CONTEXT_FALLBACK.login;
  }
  if (lowered.includes("must change password") || lowered.includes("temporary password")) {
    return "Your password must be changed before you can continue. Use the reset flow or ask your Hull Eats contact.";
  }
  if (lowered.includes("forbidden") || lowered.includes("not allowed")) {
    return STATUS_HINTS[403] ?? CONTEXT_FALLBACK.generic;
  }
  if (lowered.includes("not found")) {
    return STATUS_HINTS[404] ?? CONTEXT_FALLBACK.generic;
  }
  if (lowered.includes("too many")) {
    return STATUS_HINTS[429] ?? CONTEXT_FALLBACK.generic;
  }

  return null;
}

function humanizeValidationMessage(message: string): string {
  if (!looksTechnical(message)) {
    return message;
  }

  if (/menu|price|category|item|opening|delivery|settings/i.test(message)) {
    return "Some menu or hub settings look incomplete or invalid. Check prices, names, and delivery details, then save again.";
  }

  return CONTEXT_FALLBACK.workspace_save;
}

export function friendlyMerchantMessage(raw: string, context: MerchantErrorContext = "generic"): string {
  const message = raw.trim();
  if (!message) {
    return CONTEXT_FALLBACK[context];
  }

  if (isNetworkFailure(message)) {
    return "We could not reach Hull Eats. Check your internet connection and try again.";
  }

  const known = mapKnownApiMessage(message);
  if (known) {
    return known;
  }

  if (looksTechnical(message)) {
    if (context === "workspace_save") {
      return humanizeValidationMessage(message);
    }
    return CONTEXT_FALLBACK[context];
  }

  return message;
}

export function friendlyCaughtError(error: unknown, context: MerchantErrorContext): string {
  if (error instanceof TypeError && /undefined|null/i.test(String(error.message))) {
    return CONTEXT_FALLBACK[context];
  }

  const raw = error instanceof Error ? error.message : "";
  return friendlyMerchantMessage(raw || CONTEXT_FALLBACK[context], context);
}

export async function readMerchantApiError(response: Response, context: MerchantErrorContext): Promise<string> {
  const statusHint = STATUS_HINTS[response.status];

  try {
    const body = (await response.json()) as {
      message?: string | string[];
      error?: string;
      issues?: Array<{ path?: string | string[]; message?: string }>;
    };

    if (Array.isArray(body.issues) && body.issues.length > 0) {
      const hasMenuOrSettings = body.issues.some((issue) => {
        const path = Array.isArray(issue.path) ? issue.path.join(".") : issue.path ?? "";
        return /menu|settings|price|delivery|opening|category|item/i.test(path);
      });
      if (hasMenuOrSettings || context === "workspace_save") {
        return humanizeValidationMessage("validation");
      }
      return STATUS_HINTS[400] ?? CONTEXT_FALLBACK[context];
    }

    if (Array.isArray(body.message)) {
      return friendlyMerchantMessage(body.message.join(" "), context);
    }
    if (typeof body.message === "string" && body.message.trim()) {
      return friendlyMerchantMessage(body.message, context);
    }
    if (typeof body.error === "string" && body.error.trim()) {
      return friendlyMerchantMessage(body.error, context);
    }
  } catch {
    // Fall through to status-based copy.
  }

  if (statusHint) {
    return statusHint;
  }

  if (response.status >= 500) {
    return "Hull Eats is having a temporary problem. Please try again in a few minutes.";
  }

  return CONTEXT_FALLBACK[context];
}
