import type { HubPortalLocale } from "@hull-eats/types";

import type { HubPortalMessages } from "./en-GB";
import { enGBMessages } from "./en-GB";
import { plMessages } from "./pl";
import { roMessages } from "./ro";
import { esMessages } from "./es";
import { trMessages } from "./tr";
import { arMessages } from "./ar";
import { urMessages } from "./ur";
import { bnMessages } from "./bn";
import { hiMessages } from "./hi";
import { ltMessages } from "./lt";
import { ukMessages } from "./uk";

export const messagesByLocale: Record<HubPortalLocale, HubPortalMessages> = {
  "en-GB": enGBMessages,
  pl: plMessages,
  ro: roMessages,
  es: esMessages,
  tr: trMessages,
  ar: arMessages,
  ur: urMessages,
  bn: bnMessages,
  hi: hiMessages,
  lt: ltMessages,
  uk: ukMessages,
};
