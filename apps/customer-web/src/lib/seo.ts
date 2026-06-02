import type { Metadata } from "next";

import type { MenuItem, StoreSummary } from "@hull-eats/types";

import { getMarketplaceCategory, type MarketplaceCategory } from "./marketplace-categories";
import { absoluteUrl, getSiteOrigin } from "./site-url";

export const siteConfig = {
  name: "Hull Eats",
  legalName: "Hull Eats",
  locale: "en_GB",
  languageTag: "en-GB",
  region: "Kingston upon Hull",
  regionShort: "Hull",
  country: "United Kingdom",
  defaultTitle: "Hull Eats — Food delivery & takeaway in Hull",
  defaultDescription:
    "Order food delivery in Hull from 100+ local restaurants, takeaways, shops, and specialists. Cheap bites to luxury treats — pizza, kebabs, groceries, bakery, alcohol, and more with clear delivery pricing.",
  keywords: [
    "food delivery Hull",
    "takeaway Hull",
    "order food Hull",
    "Hull takeaway delivery",
    "restaurant delivery Hull",
    "cheap food delivery Hull",
    "grocery delivery Hull",
    "pizza delivery Hull",
    "late night food Hull",
    "Kingston upon Hull food",
    "Hull Eats",
    "local food Hull",
    "best takeaway Hull",
    "food near me Hull",
  ],
  twitterHandle: "@HullEats",
  contactEmail: "hello@hulleats.co.uk",
} as const;

/** Next.js file-based OG image (1200×630). */
export const defaultOgImagePath = "/opengraph-image";

export function getDefaultOgImageUrl(): string {
  return absoluteUrl(defaultOgImagePath);
}

const googleBotIndex = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

type OgImageInput = {
  url: string;
  width?: number;
  height?: number;
  alt: string;
};

function resolveOgImages(imageUrl?: string): OgImageInput[] {
  if (imageUrl && imageUrl !== getDefaultOgImageUrl()) {
    return [
      {
        url: imageUrl,
        alt: `${siteConfig.name} — ${siteConfig.regionShort} food delivery`,
      },
    ];
  }

  return [
    {
      url: getDefaultOgImageUrl(),
      width: 1200,
      height: 630,
      alt: `${siteConfig.name} — ${siteConfig.regionShort} food delivery`,
    },
  ];
}

function buildOpenGraph(input: {
  title: string;
  description: string;
  path: string;
  imageUrl?: string;
  type?: "website" | "article";
}): Metadata["openGraph"] {
  const url = absoluteUrl(input.path);
  const images = resolveOgImages(input.imageUrl);

  return {
    type: input.type ?? "website",
    locale: siteConfig.locale,
    url,
    siteName: siteConfig.name,
    title: input.title,
    description: input.description,
    images,
  };
}

function buildTwitter(input: { title: string; description: string; imageUrl?: string }): Metadata["twitter"] {
  const images = resolveOgImages(input.imageUrl);

  return {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    title: input.title,
    description: input.description,
    images: images.map((image) => image.url),
  };
}

function baseMetadata(partial: Metadata): Metadata {
  return {
    metadataBase: new URL(getSiteOrigin()),
    authors: [{ name: siteConfig.name, url: getSiteOrigin() }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    ...partial,
  };
}

/** Full document title (bypasses root `%s | Hull Eats` template). */
export function pageTitle(shortTitle: string): Metadata["title"] {
  return { absolute: `${shortTitle} | ${siteConfig.name}` };
}

export function buildRootMetadata(): Metadata {
  const title = siteConfig.defaultTitle;
  const description = siteConfig.defaultDescription;

  return baseMetadata({
    title: {
      default: siteConfig.defaultTitle,
      template: `%s | ${siteConfig.name}`,
    },
    description,
    keywords: [...siteConfig.keywords],
    alternates: {
      canonical: "/",
      languages: {
        "en-GB": "/",
      },
    },
    openGraph: buildOpenGraph({ title, description, path: "/" }),
    twitter: buildTwitter({ title, description }),
    robots: googleBotIndex,
    category: "food",
    applicationName: siteConfig.name,
    appleWebApp: {
      capable: true,
      title: siteConfig.name,
      statusBarStyle: "black-translucent",
    },
  });
}

export function buildHomeMetadata(): Metadata {
  const title = "Food delivery in Hull — takeaways, restaurants & local shops";
  const description =
    "Browse 100+ Hull businesses on Hull Eats. Order takeaway, restaurant meals, groceries, bakery, butcher, alcohol, desserts, and convenience delivery across Kingston upon Hull with transparent fees.";

  return baseMetadata({
    title,
    description,
    keywords: [
      ...siteConfig.keywords,
      "Hull food marketplace",
      "order takeaway online Hull",
      "Hull restaurant delivery",
    ],
    alternates: { canonical: "/", languages: { "en-GB": "/" } },
    openGraph: buildOpenGraph({ title, description, path: "/" }),
    twitter: buildTwitter({ title, description }),
    robots: googleBotIndex,
  });
}

export function buildStaticPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
  imageUrl?: string;
}): Metadata {
  const fullTitle = `${input.title} | ${siteConfig.name}`;

  return baseMetadata({
    title: pageTitle(input.title),
    description: input.description,
    keywords: input.keywords,
    alternates: {
      canonical: input.path,
      languages: { "en-GB": input.path },
    },
    openGraph: buildOpenGraph({
      title: fullTitle,
      description: input.description,
      path: input.path,
      imageUrl: input.imageUrl,
    }),
    twitter: buildTwitter({
      title: fullTitle,
      description: input.description,
      imageUrl: input.imageUrl,
    }),
    robots: input.noIndex ? { index: false, follow: false } : googleBotIndex,
  });
}

export function buildStoreMetadata(store: StoreSummary, menuItemCount = 0): Metadata {
  const cuisine = store.cuisineLabel?.trim();
  const shortTitle = cuisine
    ? `${store.name} — ${cuisine} delivery in Hull`
    : `${store.name} — order delivery in Hull`;
  const title = `${shortTitle} | ${siteConfig.name}`;
  const indexable = store.menuSetupComplete && menuItemCount > 0;
  const description = [
    `Order from ${store.name} in ${siteConfig.regionShort}.`,
    cuisine ? `${cuisine} available for delivery and collection.` : null,
    store.onboardingMessage?.trim() || null,
    indexable
      ? `Browse ${menuItemCount} menu items, customise your order, and checkout on Hull Eats.`
      : "This Hull Eats storefront is being set up — check back soon for the full menu.",
  ]
    .filter(Boolean)
    .join(" ");

  const path = `/stores/${store.slug}`;

  return baseMetadata({
    title: pageTitle(shortTitle),
    description,
    keywords: [
      store.name,
      `${store.name} Hull`,
      `${store.name} delivery`,
      `${store.name} menu`,
      cuisine ?? "",
      store.type,
      "food delivery Hull",
      store.postcode,
      store.city,
    ].filter(Boolean),
    alternates: { canonical: path, languages: { "en-GB": path } },
    openGraph: buildOpenGraph({
      title,
      description,
      path,
      imageUrl: store.heroImageUrl ?? store.logoImageUrl,
    }),
    twitter: buildTwitter({
      title,
      description,
      imageUrl: store.heroImageUrl ?? store.logoImageUrl,
    }),
    robots: indexable
      ? googleBotIndex
      : {
          index: false,
          follow: true,
          googleBot: { index: false, follow: true },
        },
  });
}

export function buildCategoryMetadata(category: MarketplaceCategory, storeCount: number): Metadata {
  const shortTitle = `${category.label} delivery in Hull — order online`;
  const title = `${shortTitle} | ${siteConfig.name}`;
  const description = `${category.description} Discover ${storeCount > 0 ? `${storeCount}+ ` : ""}${category.label.toLowerCase()} businesses delivering across ${siteConfig.regionShort} on Hull Eats.`;
  const path = `/categories/${category.slug}`;

  return baseMetadata({
    title: pageTitle(shortTitle),
    description,
    keywords: [
      `${category.label} Hull`,
      `${category.label} delivery Hull`,
      ...category.keywords,
      "Hull Eats",
      "food delivery Hull",
    ],
    alternates: { canonical: path, languages: { "en-GB": path } },
    openGraph: buildOpenGraph({
      title,
      description,
      path,
      imageUrl: category.heroImages[0] ?? category.imageUrl,
    }),
    twitter: buildTwitter({
      title,
      description,
      imageUrl: category.heroImages[0] ?? category.imageUrl,
    }),
    robots: googleBotIndex,
  });
}

export function buildSeoLandingMetadata(input: {
  title: string;
  description: string;
  path: string;
  keywords: string[];
  imageUrl?: string;
}): Metadata {
  const fullTitle = `${input.title} | ${siteConfig.name}`;

  return baseMetadata({
    title: pageTitle(input.title),
    description: input.description,
    keywords: input.keywords,
    alternates: { canonical: input.path, languages: { "en-GB": input.path } },
    openGraph: buildOpenGraph({
      title: fullTitle,
      description: input.description,
      path: input.path,
      imageUrl: input.imageUrl,
    }),
    twitter: buildTwitter({
      title: fullTitle,
      description: input.description,
      imageUrl: input.imageUrl,
    }),
    robots: googleBotIndex,
  });
}

export function buildNoIndexMetadata(title: string): Metadata {
  return baseMetadata({
    title: pageTitle(title),
    robots: { index: false, follow: false, nocache: true },
  });
}

export function getCategoryForMetadata(slug: string) {
  return getMarketplaceCategory(slug);
}
