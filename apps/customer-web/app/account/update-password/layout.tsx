import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import { buildNoIndexMetadata } from "../../../src/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata("Update password");

export default function UpdatePasswordLayout({ children }: PropsWithChildren) {
  return children;
}
