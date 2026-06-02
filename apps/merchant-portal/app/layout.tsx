import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";

import { Manrope } from "next/font/google";

import "./globals.css";

import { HubPortalI18nShell } from "./hub-portal-i18n-shell";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hull Eats Merchant Portal",
  description: "Merchant order operations shell",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <HubPortalI18nShell>{children}</HubPortalI18nShell>
      </body>
    </html>
  );
}
