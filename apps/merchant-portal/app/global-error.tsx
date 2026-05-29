"use client";

import { useEffect } from "react";

export default function MerchantPortalGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          fontFamily: "system-ui, sans-serif",
          background: "#f4f6f8",
          color: "#1a1f26",
        }}
      >
        <main
          style={{
            width: "min(100%, 420px)",
            background: "#fff",
            borderRadius: 18,
            padding: "28px 24px",
            boxShadow: "0 18px 50px rgba(16, 24, 40, 0.12)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800 }}>Hull Eats hub unavailable</h1>
          <p style={{ margin: "14px 0 0", color: "#5c6573", lineHeight: 1.55 }}>
            The business portal hit a problem loading on this device. Refresh the page or try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 22,
              width: "100%",
              border: 0,
              borderRadius: 12,
              padding: "14px 16px",
              fontWeight: 800,
              fontSize: "1rem",
              cursor: "pointer",
              background: "#e85d04",
              color: "#fff",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
