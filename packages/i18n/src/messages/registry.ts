import type { HubPortalLocale } from "@hull-eats/types";

import type { HubPortalMessages } from "./en-GB";
import { enGBMessages } from "./en-GB";
import { arMessages } from "./ar";
import { bnMessages } from "./bn";
import { deMessages } from "./de";
import { esMessages } from "./es";
import { faMessages } from "./fa";
import { filMessages } from "./fil";
import { frMessages } from "./fr";
import { guMessages } from "./gu";
import { hiMessages } from "./hi";
import { itMessages } from "./it";
import { ltMessages } from "./lt";
import { neMessages } from "./ne";
import { nlMessages } from "./nl";
import { paMessages } from "./pa";
import { plMessages } from "./pl";
import { ptMessages } from "./pt";
import { roMessages } from "./ro";
import { soMessages } from "./so";
import { taMessages } from "./ta";
import { trMessages } from "./tr";
import { ukMessages } from "./uk";
import { urMessages } from "./ur";
import { zhMessages } from "./zh";

export const messagesByLocale: Record<HubPortalLocale, HubPortalMessages> = {
  "en-GB": enGBMessages,
  ar: arMessages,
  bn: bnMessages,
  zh: zhMessages,
  nl: nlMessages,
  fa: faMessages,
  fil: filMessages,
  fr: frMessages,
  de: deMessages,
  gu: guMessages,
  hi: hiMessages,
  it: itMessages,
  lt: ltMessages,
  ne: neMessages,
  pa: paMessages,
  pl: plMessages,
  pt: ptMessages,
  ro: roMessages,
  so: soMessages,
  es: esMessages,
  ta: taMessages,
  tr: trMessages,
  uk: ukMessages,
  ur: urMessages,
};
