import type { StoreType } from "@hull-eats/types";

type VerticalMarkProps = {
  type: StoreType;
  title?: string;
};

/** Hull Eats–styled mark per storefront vertical (not stock photography). */
export function VerticalMark({ type, title }: VerticalMarkProps) {
  const label = title ?? (type === "takeaway" ? "Takeaway" : type === "shop" ? "Shop" : "Restaurant");

  if (type === "takeaway") {
    return (
      <svg className="vertical-mark vertical-mark-takeaway" viewBox="0 0 88 88" role="img" aria-label={`${label} mark`}>
        <defs>
          <linearGradient id="vm-tk-a" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c7f3" />
            <stop offset="100%" stopColor="#079bc8" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="72" height="72" rx="22" fill="rgba(7,17,24,0.55)" stroke="url(#vm-tk-a)" strokeWidth="2" />
        <path
          d="M28 58 L44 30 L60 58 Z"
          fill="none"
          stroke="url(#vm-tk-a)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <circle cx="44" cy="24" r="5" fill="#8be8ff" />
      </svg>
    );
  }

  if (type === "shop") {
    return (
      <svg className="vertical-mark vertical-mark-shop" viewBox="0 0 88 88" role="img" aria-label={`${label} mark`}>
        <defs>
          <linearGradient id="vm-sh-a" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#12b7e8" />
            <stop offset="100%" stopColor="#8be8ff" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="72" height="72" rx="22" fill="rgba(7,17,24,0.55)" stroke="url(#vm-sh-a)" strokeWidth="2" />
        <rect x="26" y="30" width="36" height="28" rx="6" fill="none" stroke="url(#vm-sh-a)" strokeWidth="3" />
        <path d="M32 30 V24 H56 V30" fill="none" stroke="url(#vm-sh-a)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="38" cy="44" r="3" fill="#8be8ff" />
        <circle cx="50" cy="44" r="3" fill="#8be8ff" />
      </svg>
    );
  }

  return (
    <svg className="vertical-mark vertical-mark-restaurant" viewBox="0 0 88 88" role="img" aria-label={`${label} mark`}>
      <defs>
        <linearGradient id="vm-rs-a" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8be8ff" />
          <stop offset="100%" stopColor="#12b7e8" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="72" height="72" rx="22" fill="rgba(7,17,24,0.55)" stroke="url(#vm-rs-a)" strokeWidth="2" />
      <ellipse cx="44" cy="40" rx="22" ry="10" fill="none" stroke="url(#vm-rs-a)" strokeWidth="3" />
      <path d="M30 40 Q44 22 58 40" fill="none" stroke="url(#vm-rs-a)" strokeWidth="3" strokeLinecap="round" />
      <rect x="40" y="50" width="8" height="14" rx="2" fill="url(#vm-rs-a)" />
    </svg>
  );
}
