"use client";

import { useEffect } from "react";

export default function MerchantPortalError({
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
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        fontFamily: "var(--font-manrope, system-ui, sans-serif)",
        background: "#f4f6f8",
        color: "#1a1f26",
      }}
    >
      <section
        style={{
          width: "min(100%, 420px)",
          background: "#fff",
          borderRadius: 18,
          padding: "28px 24px",
          boxShadow: "0 18px 50px rgba(16, 24, 40, 0.12)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800 }}>Something went wrong</h1>
        <p style={{ margin: "14px 0 0", color: "#5c6573", lineHeight: 1.55, fontWeight: 650 }}>
          We could not open your Hull Eats hub on this device. Check your internet connection, then try again. If you were
          signing in, use your email or username and password once more.
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
      </section>
    </main>
  );
}
