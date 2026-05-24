"use client";

import { useEffect } from "react";

type HubTransientBannerProps = {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
  variant?: "success" | "error";
};

export function HubTransientBanner({
  message,
  onDismiss,
  durationMs = 4500,
  variant = "success",
}: HubTransientBannerProps) {
  useEffect(() => {
    if (!message.trim()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDismiss();
    }, durationMs);

    return () => window.clearTimeout(timeoutId);
  }, [message, onDismiss, durationMs]);

  if (!message.trim()) {
    return null;
  }

  return (
    <p
      className={`he-hub-banner he-hub-banner--toast${variant === "error" ? " he-hub-banner--error" : ""}`}
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {message}
    </p>
  );
}
