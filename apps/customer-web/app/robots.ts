import type { MetadataRoute } from "next";

import { absoluteUrl } from "../src/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/checkout/", "/account/", "/track/", "/register/", "/stores/*/kiosk"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
