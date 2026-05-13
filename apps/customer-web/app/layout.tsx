import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import type { PropsWithChildren } from "react";

import "./globals.css";

import { ActiveOrderStrip } from "../src/components/active-order-strip";
import { SiteFooter } from "../src/components/site-footer";

const headingFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Hull Eats",
  description: "Mobile-first ordering platform for restaurants, takeaways, and shops in Hull.",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
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
