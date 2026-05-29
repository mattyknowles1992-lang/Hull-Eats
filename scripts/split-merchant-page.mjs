import fs from "node:fs";

const pagePath = new URL("../apps/merchant-portal/app/page.tsx", import.meta.url);
let content = fs.readFileSync(pagePath, "utf8");

const importBlock = `import { friendlyCaughtError } from "./hub-merchant-errors";
import {
  acceptMerchantOrder,
  apiBaseUrl,
  applyMenuImport,
  changeHubPassword,
  completeHubPasswordReset,
  createBusinessUser,
  createMenuCategory,
  createMenuItem,
  customerWebBaseUrl,
  deleteBusinessUser,
  deleteMenuCategory,
  deleteMenuItem,
  fetchMerchantDriverTracking,
  fetchMerchantOrderHistory,
  fetchMerchantOrders,
  fetchWorkspace,
  loginToHub,
  previewMenuImport,
  previewMenuTextImport,
  printMerchantOrderReceipt,
  rejectMerchantOrder,
  requestHubPasswordReset,
  saveWorkspace,
  submitMerchantContactMessage,
  updateMerchantPreferredLocale,
  verifyHubPasswordReset,
  type CreateCategoryFormState,
  type MerchantDriverTracking,
} from "./merchant-api";
import {
  clearMerchantSessionFromBrowser,
  merchantLastLoginEmailKey,
  merchantSessionStorageKey,
  persistMerchantSessionToBrowser,
  resolveActiveHubUser,
  type StoredMerchantSession,
} from "./merchant-session";
import {
  cloneHubSettings,
  cloneMenuSections,
  emptyHubSettings,
  hubWorkspaceSnapshotsEqual,
  mergeGeocodedSettingsFromServer,
  normalizeWorkspaceSettings,
  type HubWorkspaceSnapshot,
} from "./merchant-workspace-state";
`;

if (!content.includes('from "./merchant-api"')) {
  content = content.replace(
    'import { HE_BRAND } from "./portal-brand";',
    `import { HE_BRAND } from "./portal-brand";\n${importBlock}`,
  );
}

const stripBetween = (source, startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Could not strip block: ${startNeedle} -> ${endNeedle}`);
  }
  return source.slice(0, start) + source.slice(end);
};

content = stripBetween(content, "const defaultApiBaseUrl", "type MerchantBootStatus");
if (!content.includes("type MerchantBootStatus")) {
  content = stripBetween(content, "const defaultApiBaseUrl", "const hullTrackingBounds");
}
content = stripBetween(content, "async function loginToHub", "const escapeHtml = (value: string)");

content = content.replace(
  /const settings = \{\s*\.\.\.workspace\.settings,\s*deliveryPostcodeZones:\s*[\s\S]*?createDefaultHullPostcodeZones\(\),\s*\};/,
  "const settings = normalizeWorkspaceSettings(workspace.settings);",
);

content = content.replace(
  /const message = error instanceof Error \? error\.message : "([^"]+)";/g,
  (_, fallback) => {
    const map = {
      "Save failed.": "workspace_save",
      "Hub login failed.": "login",
      "Password change failed.": "password_change",
      "Menu publish failed.": "workspace_save",
      "Business user creation failed.": "user_create",
      "Business user delete failed.": "user_delete",
      "Menu import preview failed.": "menu_import",
      "Menu text import preview failed.": "menu_import",
      "Menu import apply failed.": "menu_import",
    };
    const ctx = map[fallback] ?? "generic";
    return `const message = friendlyCaughtError(error, "${ctx}");`;
  },
);

content = content.replace(
  'setLoginError(message);',
  'setLoginError(friendlyCaughtError(error, "login"));',
);

content = content.replace(
  /setResetNotice\(error instanceof Error \? error\.message : "([^"]+)"\);/g,
  (_, msg) => {
    const ctx =
      msg.includes("request") ? "password_reset_request" : msg.includes("verification") ? "password_reset_verify" : "password_reset_complete";
    return `setResetNotice(friendlyCaughtError(error, "${ctx}"));`;
  },
);

content = content.replace(
  'setSupportNotice(error instanceof Error ? error.message : "Support request failed.");',
  'setSupportNotice(friendlyCaughtError(error, "support"));',
);

content = content.replace(
  "window.localStorage.removeItem(merchantSessionStorageKey);",
  "clearMerchantSessionFromBrowser();",
);

fs.writeFileSync(pagePath, content);
