import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import type { PropsWithChildren } from "react";

import "./globals.css";

import { ActiveOrderStrip } from "../src/components/active-order-strip";
import { JsonLd } from "../src/components/json-ld";
import { SiteFooter } from "../src/components/site-footer";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "../src/lib/seo-json-ld";
import { buildRootMetadata } from "../src/lib/seo";

const headingFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = buildRootMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en-GB" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <JsonLd data={[buildOrganizationJsonLd(), buildWebSiteJsonLd()]} />
        <a className="he-skip-link" href="#site-main">
          Skip to main content
        </a>
        <div className="he-ambient-ground" aria-hidden="true" />
        <div id="site-main">
          {children}
          <SiteFooter />
          <ActiveOrderStrip />
        </div>
      </body>
    </html>
  );
}
