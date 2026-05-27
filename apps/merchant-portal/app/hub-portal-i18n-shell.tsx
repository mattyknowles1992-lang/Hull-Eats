"use client";

import type { PropsWithChildren } from "react";

import { HubPortalI18nProvider } from "@hull-eats/i18n";
import { normalizeHubPortalLocale, type HubPortalLocale } from "@hull-eats/types";

export const HubPortalI18nShell = ({
  children,
  initialLocale,
}: PropsWithChildren<{ initialLocale?: HubPortalLocale | string | null }>) => (
  <HubPortalI18nProvider initialLocale={normalizeHubPortalLocale(initialLocale ?? "en-GB")}>{children}</HubPortalI18nProvider>
);
