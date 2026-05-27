import type { HubPortalLocale } from "./locales";
import { DEFAULT_HUB_PORTAL_LOCALE } from "./locales";
import type { HubPortalMessages } from "./messages/en-GB";
import { enGBMessages } from "./messages/en-GB";
import { messagesByLocale } from "./messages/registry";

export type HubPortalMessagePath =
  | {
      [Section in keyof HubPortalMessages]: {
        [Key in keyof HubPortalMessages[Section]]: `${Section & string}.${Key & string}`;
      }[keyof HubPortalMessages[Section]];
    }[keyof HubPortalMessages];

export type TranslateParams = Record<string, string | number>;

const resolvePath = (messages: HubPortalMessages, path: string): string | undefined => {
  const parts = path.split(".");
  let cursor: unknown = messages;

  for (const part of parts) {
    if (typeof cursor !== "object" || cursor === null || !(part in cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }

  return typeof cursor === "string" ? cursor : undefined;
};

const interpolate = (template: string, params?: TranslateParams): string => {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
};

export const getHubPortalMessages = (locale: HubPortalLocale): HubPortalMessages =>
  messagesByLocale[locale] ?? messagesByLocale[DEFAULT_HUB_PORTAL_LOCALE];

export const createHubPortalTranslator = (locale: HubPortalLocale) => {
  const messages = getHubPortalMessages(locale);

  const t = (path: HubPortalMessagePath, params?: TranslateParams): string => {
    const resolved = resolvePath(messages, path) ?? resolvePath(enGBMessages, path) ?? path;
    return interpolate(resolved, params);
  };

  return { t, messages, locale };
};

export type HubPortalTranslator = ReturnType<typeof createHubPortalTranslator>;
