import type { ReactNode } from "react";

import { MarketplaceReviewGate } from "./marketplace-review-gate";

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MarketplaceReviewGate />
      {children}
    </>
  );
}
