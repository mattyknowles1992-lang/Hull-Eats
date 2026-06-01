import type { StoreSummary } from "@hull-eats/types";

import type { SeoLandingPage } from "./seo-landing-pages";
import { absoluteUrl, getSiteOrigin } from "./site-url";
import { siteConfig } from "./seo";

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: getSiteOrigin(),
    logo: absoluteUrl("/brand/hull-eats-logo.png"),
    areaServed: {
      "@type": "City",
      name: siteConfig.region,
    },
    description: siteConfig.defaultDescription,
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: getSiteOrigin(),
    description: siteConfig.defaultDescription,
    inLanguage: "en-GB",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${getSiteOrigin()}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildStoreRestaurantJsonLd(store: StoreSummary, menuItemCount?: number) {
  const addressParts = [store.addressLine1, store.addressLine2, store.city, store.postcode].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": absoluteUrl(`/stores/${store.slug}`),
    name: store.name,
    url: absoluteUrl(`/stores/${store.slug}`),
    image: store.heroImageUrl ?? store.logoImageUrl,
    servesCuisine: store.cuisineLabel,
    address: {
      "@type": "PostalAddress",
      streetAddress: [store.addressLine1, store.addressLine2].filter(Boolean).join(", ") || undefined,
      addressLocality: store.city || siteConfig.regionShort,
      postalCode: store.postcode,
      addressCountry: "GB",
    },
    description: store.onboardingMessage,
    ...(menuItemCount && menuItemCount > 0
      ? {
          hasMenu: {
            "@type": "Menu",
            name: `${store.name} menu`,
            hasMenuSection: {
              "@type": "MenuSection",
              name: "Menu",
              description: `Live menu with ${menuItemCount} items on Hull Eats`,
            },
          },
        }
      : {}),
    ...(addressParts.length > 0
      ? {
          location: {
            "@type": "Place",
            name: store.name,
            address: addressParts.join(", "),
          },
        }
      : {}),
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildItemListJsonLd(input: {
  name: string;
  description: string;
  path: string;
  items: { name: string; url: string; description?: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
      description: item.description,
    })),
  };
}

export function buildLandingPageJsonLd(page: SeoLandingPage, stores: StoreSummary[]) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      description: page.description,
      url: absoluteUrl(`/hull/${page.slug}`),
      isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: getSiteOrigin(),
      },
      about: {
        "@type": "Thing",
        name: `Food delivery in ${siteConfig.regionShort}`,
      },
    },
    buildItemListJsonLd({
      name: page.headline,
      description: page.description,
      path: `/hull/${page.slug}`,
      items: stores.slice(0, 50).map((store) => ({
        name: store.name,
        url: absoluteUrl(`/stores/${store.slug}`),
        description: store.cuisineLabel,
      })),
    }),
  ];
}

export function buildHomepageBusinessIndexJsonLd(stores: StoreSummary[]) {
  return buildItemListJsonLd({
    name: `Food businesses delivering in ${siteConfig.regionShort}`,
    description: siteConfig.defaultDescription,
    path: "/",
    items: stores.map((store) => ({
      name: store.name,
      url: absoluteUrl(`/stores/${store.slug}`),
      description: store.cuisineLabel,
    })),
  });
}
