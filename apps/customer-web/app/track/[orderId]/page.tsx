import type { Metadata } from "next";

import { buildNoIndexMetadata } from "../../../src/lib/seo";
import { TrackingClient } from "./tracking-client";

export const metadata: Metadata = buildNoIndexMetadata("Track order");

type TrackingPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { orderId } = await params;

  return <TrackingClient orderId={decodeURIComponent(orderId)} />;
}
