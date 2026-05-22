"use client";

import { useEffect, useState, type ReactNode } from "react";

type HubMenuDismissibleBannerProps = {
  storageKey: string;
  children: ReactNode;
  role?: "status" | "alert";
};

export function HubMenuDismissibleBanner({ storageKey, children, role = "status" }: HubMenuDismissibleBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(storageKey) !== "1");
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // ignore quota / private mode
    }
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="he-hub-banner he-hub-banner--dismissible" role={role}>
      <div className="he-hub-banner__body">{children}</div>
      <button type="button" className="he-hub-banner__close" onClick={dismiss} aria-label="Close message">
        Close
      </button>
    </div>
  );
}
