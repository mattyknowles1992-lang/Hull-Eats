import { z } from "zod";

/** BCP 47-style locale codes for the merchant hub portal UI (not customer storefront). */
export const HUB_PORTAL_LOCALES = [
  "en-GB",
  "ar",
  "bn",
  "zh",
  "nl",
  "fa",
  "fil",
  "fr",
  "de",
  "gu",
  "hi",
  "it",
  "lt",
  "ne",
  "pa",
  "pl",
  "pt",
  "ro",
  "so",
  "es",
  "ta",
  "tr",
  "uk",
  "ur",
] as const;

export type HubPortalLocale = (typeof HUB_PORTAL_LOCALES)[number];

export const hubPortalLocaleSchema = z.enum(HUB_PORTAL_LOCALES);

export const DEFAULT_HUB_PORTAL_LOCALE: HubPortalLocale = "en-GB";

export type HubPortalLocaleOption = {
  value: HubPortalLocale;
  /** English name shown in parentheses, e.g. Polish */
  label: string;
  /** Name in that language, e.g. Polski */
  nativeLabel: string;
};

/** Sorted by English label for the account language picker. */
export const HUB_PORTAL_LOCALE_OPTIONS: ReadonlyArray<HubPortalLocaleOption> = [
  { value: "ar", label: "Arabic", nativeLabel: "العربية" },
  { value: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { value: "zh", label: "Chinese", nativeLabel: "中文" },
  { value: "nl", label: "Dutch", nativeLabel: "Nederlands" },
  { value: "en-GB", label: "English (UK)", nativeLabel: "English (UK)" },
  { value: "fa", label: "Persian", nativeLabel: "فارسی" },
  { value: "fil", label: "Filipino", nativeLabel: "Filipino" },
  { value: "fr", label: "French", nativeLabel: "Français" },
  { value: "de", label: "German", nativeLabel: "Deutsch" },
  { value: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { value: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { value: "it", label: "Italian", nativeLabel: "Italiano" },
  { value: "lt", label: "Lithuanian", nativeLabel: "Lietuvių" },
  { value: "ne", label: "Nepali", nativeLabel: "नेपाली" },
  { value: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ" },
  { value: "pl", label: "Polish", nativeLabel: "Polski" },
  { value: "pt", label: "Portuguese", nativeLabel: "Português" },
  { value: "ro", label: "Romanian", nativeLabel: "Română" },
  { value: "so", label: "Somali", nativeLabel: "Soomaali" },
  { value: "es", label: "Spanish", nativeLabel: "Español" },
  { value: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { value: "tr", label: "Turkish", nativeLabel: "Türkçe" },
  { value: "uk", label: "Ukrainian", nativeLabel: "Українська" },
  { value: "ur", label: "Urdu", nativeLabel: "اردو" },
];

const RTL_LOCALES = new Set<HubPortalLocale>(["ar", "fa", "ur"]);

export const isRtlHubPortalLocale = (locale: HubPortalLocale): boolean => RTL_LOCALES.has(locale);

/** e.g. Polski (Polish), Español (Spanish). English (UK) stays as-is. */
export function formatHubPortalLocaleOptionLabel(option: HubPortalLocaleOption): string {
  if (option.nativeLabel === option.label) {
    return option.label;
  }
  return `${option.nativeLabel} (${option.label})`;
}

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
