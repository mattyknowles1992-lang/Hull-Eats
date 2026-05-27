"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import {
  DEFAULT_HUB_PORTAL_LOCALE,
  isRtlHubPortalLocale,
  normalizeHubPortalLocale,
  type HubPortalLocale,
} from "./locales";
import { createHubPortalTranslator, type HubPortalMessagePath, type HubPortalTranslator, type TranslateParams } from "./translate";

type HubPortalI18nContextValue = {
  locale: HubPortalLocale;
  isRtl: boolean;
  setLocale: (locale: HubPortalLocale) => void;
  t: (path: HubPortalMessagePath, params?: TranslateParams) => string;
  translator: HubPortalTranslator;
};

const HubPortalI18nContext = createContext<HubPortalI18nContextValue | null>(null);

export const HubPortalI18nProvider = ({
  children,
  initialLocale = DEFAULT_HUB_PORTAL_LOCALE,
}: PropsWithChildren<{ initialLocale?: HubPortalLocale }>) => {
  const [locale, setLocaleState] = useState<HubPortalLocale>(() => normalizeHubPortalLocale(initialLocale));

  useEffect(() => {
    setLocaleState(normalizeHubPortalLocale(initialLocale));
  }, [initialLocale]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlHubPortalLocale(locale) ? "rtl" : "ltr";
  }, [locale]);

  const translator = useMemo(() => createHubPortalTranslator(locale), [locale]);

  const setLocale = useCallback((next: HubPortalLocale) => {
    setLocaleState(normalizeHubPortalLocale(next));
  }, []);

  const value = useMemo<HubPortalI18nContextValue>(
    () => ({
      locale,
      isRtl: isRtlHubPortalLocale(locale),
      setLocale,
      t: translator.t,
      translator,
    }),
    [locale, setLocale, translator],
  );

  return <HubPortalI18nContext.Provider value={value}>{children}</HubPortalI18nContext.Provider>;
};

export const useHubPortalI18n = (): HubPortalI18nContextValue => {
  const context = useContext(HubPortalI18nContext);
  if (!context) {
    throw new Error("useHubPortalI18n must be used within HubPortalI18nProvider");
  }
  return context;
};
