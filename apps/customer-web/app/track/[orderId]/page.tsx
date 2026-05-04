import { TrackingClient } from "./tracking-client";

type TrackingPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { orderId } = await params;

  return <TrackingClient orderId={decodeURIComponent(orderId)} />;
}
