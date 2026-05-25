import { HubDetailClient } from "./hub-detail-client";

export default async function HubDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  return <HubDetailClient slug={resolved.slug} />;
}
