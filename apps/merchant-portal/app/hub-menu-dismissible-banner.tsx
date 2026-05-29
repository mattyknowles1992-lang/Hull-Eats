"use client";

import { useEffect, useState, type ReactNode } from "react";

import { readBrowserStorage, writeBrowserStorage } from "./browser-storage";

type HubMenuDismissibleBannerProps = {
  storageKey: string;
  children: ReactNode;
  role?: "status" | "alert";
};

export function HubMenuDismissibleBanner({ storageKey, children, role = "status" }: HubMenuDismissibleBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readBrowserStorage(storageKey) !== "1");
  }, [storageKey]);

  const dismiss = () => {
    writeBrowserStorage(storageKey, "1");
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
