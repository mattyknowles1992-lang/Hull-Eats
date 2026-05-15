import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  title: "Hull Eats Merchant Portal",
  description: "Merchant order operations shell",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @keyframes hub-save-pulse {
            0%,
            100% {
              box-shadow:
                0 0 0 3px rgba(255, 106, 0, 0.35),
                0 14px 24px rgba(255, 106, 0, 0.22);
            }
            50% {
              box-shadow:
                0 0 0 5px rgba(255, 106, 0, 0.5),
                0 16px 28px rgba(255, 106, 0, 0.32);
            }
          }
        `}</style>
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
