import { z } from "zod";

/** BCP 47-style locale codes for the merchant hub portal UI (not customer storefront). */
export const HUB_PORTAL_LOCALES = [
  "en-GB",
  "pl",
  "ro",
  "ar",
  "ur",
  "bn",
  "hi",
  "tr",
  "es",
  "lt",
  "uk",
] as const;

export type HubPortalLocale = (typeof HUB_PORTAL_LOCALES)[number];

export const hubPortalLocaleSchema = z.enum(HUB_PORTAL_LOCALES);

export const DEFAULT_HUB_PORTAL_LOCALE: HubPortalLocale = "en-GB";

export const HUB_PORTAL_LOCALE_OPTIONS: ReadonlyArray<{ value: HubPortalLocale; label: string; nativeLabel: string }> = [
  { value: "en-GB", label: "English (UK)", nativeLabel: "English (UK)" },
  { value: "pl", label: "Polish", nativeLabel: "Polski" },
  { value: "ro", label: "Romanian", nativeLabel: "Română" },
  { value: "ar", label: "Arabic", nativeLabel: "العربية" },
  { value: "ur", label: "Urdu", nativeLabel: "اردو" },
  { value: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { value: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { value: "tr", label: "Turkish", nativeLabel: "Türkçe" },
  { value: "es", label: "Spanish", nativeLabel: "Español" },
  { value: "lt", label: "Lithuanian", nativeLabel: "Lietuvių" },
  { value: "uk", label: "Ukrainian", nativeLabel: "Українська" },
];

const RTL_LOCALES = new Set<HubPortalLocale>(["ar", "ur"]);

export const isRtlHubPortalLocale = (locale: HubPortalLocale): boolean => RTL_LOCALES.has(locale);

export const normalizeHubPortalLocale = (value: unknown): HubPortalLocale => {
  const parsed = hubPortalLocaleSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    const match = HUB_PORTAL_LOCALES.find((locale) => locale.toLowerCase() === lowered);
    if (match) {
      return match;
    }
    if (lowered.startsWith("en")) {
      return "en-GB";
    }
  }
  return DEFAULT_HUB_PORTAL_LOCALE;
};
