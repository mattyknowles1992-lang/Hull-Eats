import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import type { PropsWithChildren } from "react";

import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
