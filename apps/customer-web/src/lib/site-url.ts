const productionDefault = "https://hulleats.co.uk";
const renderDefault = "https://hull-eats.onrender.com";

/** Canonical public origin for metadata, sitemaps, and JSON-LD. */
export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return productionDefault;
  }

  return renderDefault;
}

export function absoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteOrigin()}${normalizedPath}`;
}
