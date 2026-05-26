"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  isHullMarketplaceResaleEnabled,
  isHullServicesEnabled,
} from "../src/lib/customer-product-flags";

type AppKey = "eats" | "services" | "marketplace";

const apps: Array<{
  key: AppKey;
  href: string;
  label: string;
  image: string;
}> = [
  {
    key: "eats",
    href: "/",
    label: "Hull Eats",
    image: "/brand/hull-eats-logo.jpeg",
  },
  {
    key: "services",
    href: "/services",
    label: "Hull Services",
    image: "/brand/hull-services-logo.png",
  },
  {
    key: "marketplace",
    href: "/marketplace",
    label: "Hull Marketplace",
    image: "/brand/hull-services-logo.png",
  },
];

const getActiveApp = (pathname: string): AppKey => {
  if (pathname.startsWith("/services")) {
    return "services";
  }

  if (pathname.startsWith("/marketplace")) {
    return "marketplace";
  }

  return "eats";
};

function visibleApps() {
  return apps.filter((app) => {
    if (app.key === "eats") {
      return true;
    }
    if (app.key === "services") {
      return isHullServicesEnabled();
    }
    return isHullMarketplaceResaleEnabled();
  });
}

export function AppSwitcher() {
  const pathname = usePathname();
  const appsOnShow = visibleApps();
  const activeKey = getActiveApp(pathname);
  const activeApp = appsOnShow.find((app) => app.key === activeKey) ?? appsOnShow[0]!;
  const secondaryApps = appsOnShow.filter((app) => app.key !== activeApp.key);

  return (
    <nav className="app-switcher" aria-label="Hull Eats app switcher">
      <Link href={activeApp.href} className="app-switcher-main" aria-label={`${activeApp.label} home`}>
        <img src={activeApp.image} alt={activeApp.label} className="brand-logo" />
      </Link>
      {secondaryApps.length > 0 ? (
        <div className="app-switcher-secondary">
          {secondaryApps.map((app) => (
            <Link key={app.key} href={app.href} className="app-switcher-icon" aria-label={app.label}>
              <img src={app.image} alt={app.label} className="brand-logo" />
            </Link>
          ))}
        </div>
      ) : null}
    </nav>
  );
}
