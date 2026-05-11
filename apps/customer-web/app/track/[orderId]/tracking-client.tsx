"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { TrackedOrder } from "@hull-eats/types";

import { AppSwitcher } from "../../app-switcher";
import { trackOrder } from "../../../src/lib/api";
import { TrackingLiveMap } from "./tracking-live-map";

type TrackingClientProps = {
  orderId: string;
};

const statusCopy: Record<string, string> = {
  pending: "The kitchen has your order.",
  accepted: "The kitchen accepted your order.",
  preparing: "Your food is being prepared.",
  assigned: "A courier is ready for dispatch.",
  picked_up: "Your courier is on the way.",
  delivered: "Delivered. Enjoy your food.",
};

const formatStatus = (status: string) => status.replaceAll("_", " ");

const formatMoney = (value: number) => `£${value.toFixed(2)}`;

const hullFallbackLocation = {
  latitude: 53.7676,
  longitude: -0.3274,
};

const hullMapBounds = {
  minLatitude: 53.7,
  maxLatitude: 53.83,
  minLongitude: -0.48,
  maxLongitude: -0.18,
};

const googleMapsApiKeyRaw = process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
const googleMapsApiKey = googleMapsApiKeyRaw && googleMapsApiKeyRaw.length > 0 ? googleMapsApiKeyRaw : null;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const clampToHullBounds = (latitude: number, longitude: number) => ({
  latitude: clamp(latitude, hullMapBounds.minLatitude, hullMapBounds.maxLatitude),
  longitude: clamp(longitude, hullMapBounds.minLongitude, hullMapBounds.maxLongitude),
});

export function TrackingClient({ orderId }: TrackingClientProps) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    let isMounted = true;

    const sync = async () => {
      try {
        const nextOrder = await trackOrder(orderId);

        if (isMounted) {
          setOrder(nextOrder);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load live tracking.");
        }
      }
    };

    void sync();
    const timer = window.setInterval(sync, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [orderId]);

  const delivery = order?.delivery;
  const location = delivery?.courierLocation;
  const boundedLocation = clampToHullBounds(location?.latitude ?? hullFallbackLocation.latitude, location?.longitude ?? hullFallbackLocation.longitude);
  const mapLatitude = boundedLocation.latitude;
  const mapLongitude = boundedLocation.longitude;
  const mapUpdatedAt = location ? new Date(location.updatedAt).toLocaleTimeString("en-GB") : "Waiting for driver scan";
  const mapAccuracy = location?.accuracyMeters ? `Accuracy ${Math.round(location.accuracyMeters)}m` : null;
  const isDelivered = order ? order.status === "delivered" || delivery?.status === "delivered" : false;
  const lineItems = order?.items ?? [];
  const linesSubtotal = lineItems.reduce((sum, line) => sum + line.totalPrice, 0);

  return (
    <main className="tracking-shell">
      <header className="topbar">
        <AppSwitcher />
      </header>

      <section className="tracking-hero">
        <div>
          <p className="eyebrow">Live order tracking</p>
          <h1>{order?.orderNumber ?? orderId}</h1>
          <p>{order ? statusCopy[order.status] ?? "Your order is moving through Hull Eats." : "Loading the live delivery link."}</p>
        </div>
        <Link href="/" className="glass-button">
          Back to marketplace
        </Link>
      </section>

      {errorMessage ? <p className="form-message form-message-error">{errorMessage}</p> : null}

      {!isDelivered ? (
        <section className="tracking-grid">
          <article className="tracking-map tracking-map-live">
            <TrackingLiveMap
              latitude={location ? location.latitude : mapLatitude}
              longitude={location ? location.longitude : mapLongitude}
              hasLiveLocation={Boolean(location)}
              statusFallbackLabel={formatStatus(order?.status ?? "loading")}
              mapUpdatedAt={mapUpdatedAt}
              mapAccuracy={mapAccuracy}
              googleMapsApiKey={googleMapsApiKey}
            />
          </article>

          <aside className="tracking-panel">
            <div>
              <span className="muted-copy">Customer delivery PIN</span>
              <strong className="tracking-pin">{delivery?.confirmationCode ?? "----"}</strong>
              <p>
                Tell the courier this PIN when they arrive. They enter it to complete delivery only after you confirm it matches
                your order.
              </p>
            </div>
            <div className="checkout-summary">
              <div className="glance-row">
                <span className="muted-copy">Store</span>
                <strong>{delivery?.storeName ?? "Hull Eats"}</strong>
              </div>
              <div className="glance-row">
                <span className="muted-copy">Dropoff</span>
                <strong>{delivery?.dropoffAddress ?? "Waiting for delivery details"}</strong>
              </div>
              <div className="glance-row">
                <span className="muted-copy">Updated</span>
                <strong>{mapUpdatedAt}</strong>
              </div>
              <div className="glance-row">
                <span className="muted-copy">Courier</span>
                <strong>
                  {delivery?.courierName
                    ? `${delivery.courierName}${delivery.courierRating ? ` · ${delivery.courierRating.toFixed(1)} rating` : ""}`
                    : "Shown after scan"}
                </strong>
              </div>
            </div>
          </aside>
        </section>
      ) : (
        <section className="tracking-delivered-panel" aria-live="polite">
          <div className="tracking-delivered-icon" aria-hidden="true">
            <span>✓</span>
          </div>
          <div>
            <p className="eyebrow">Delivered</p>
            <h2 className="tracking-delivered-title">Live tracking closed</h2>
            <p className="tracking-delivered-copy">
              Your order is marked delivered. The courier confirmed your delivery PIN with you before completing the drop-off.
            </p>
            <div className="checkout-summary tracking-delivered-meta">
              <div className="glance-row">
                <span className="muted-copy">Store</span>
                <strong>{delivery?.storeName ?? "Hull Eats"}</strong>
              </div>
              {delivery?.deliveredAt ? (
                <div className="glance-row">
                  <span className="muted-copy">Completed</span>
                  <strong>{new Date(delivery.deliveredAt).toLocaleString("en-GB")}</strong>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}

      {lineItems.length > 0 ? (
        <section className="tracking-order-items" aria-labelledby="tracking-order-items-heading">
          <div className="tracking-order-items-header">
            <h2 id="tracking-order-items-heading">Your order</h2>
            <p className="muted-copy">Items on this receipt stay here for reference after tracking ends.</p>
          </div>
          <ul className="tracking-order-items-list">
            {lineItems.map((line, index) => (
              <li key={line.id ?? `${line.name}-${index}`} className="tracking-order-line">
                <div>
                  <strong>
                    {line.quantity} × {line.name}
                  </strong>
                  {line.notes ? <p className="tracking-order-line-notes">{line.notes}</p> : null}
                </div>
                <div className="tracking-order-line-prices">
                  <span className="muted-copy">{formatMoney(line.unitPrice)} each</span>
                  <strong>{formatMoney(line.totalPrice)}</strong>
                </div>
              </li>
            ))}
          </ul>
          <div className="tracking-order-items-footer">
            <span className="muted-copy">Lines subtotal</span>
            <strong>{formatMoney(linesSubtotal)}</strong>
            <span className="muted-copy">· order total {order ? formatMoney(order.totalAmount) : "—"}</span>
          </div>
        </section>
      ) : null}

      <style jsx>{`
        .tracking-shell {
          display: grid;
          gap: 24px;
          padding: 36px min(5vw, 56px) 64px;
        }

        .tracking-hero,
        .tracking-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.6fr);
          gap: 20px;
          align-items: stretch;
        }

        .tracking-hero {
          align-items: end;
        }

        .tracking-hero h1 {
          margin: 4px 0;
          color: #151515;
          font-size: clamp(42px, 7vw, 92px);
          line-height: 0.92;
        }

        .tracking-hero p {
          max-width: 620px;
          color: #5d6268;
          font-size: 18px;
        }

        .tracking-map,
        .tracking-panel {
          border: 1px solid rgba(18, 18, 18, 0.1);
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 24px 70px rgba(15, 15, 15, 0.08);
        }

        .tracking-map-live {
          padding: 14px 14px 18px;
          overflow: visible;
          min-height: 0;
        }

        .tracking-panel {
          padding: 24px;
          display: grid;
          gap: 22px;
        }

        .tracking-pin {
          display: block;
          margin: 8px 0;
          color: #087fa1;
          font-size: 56px;
          letter-spacing: 0;
        }

        .tracking-panel p {
          color: #5d6268;
          line-height: 1.6;
        }

        .tracking-delivered-panel {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 22px;
          align-items: start;
          padding: 28px;
          border: 1px solid rgba(23, 156, 106, 0.28);
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(23, 156, 106, 0.08), rgba(255, 255, 255, 0.98));
          box-shadow: 0 24px 70px rgba(15, 15, 15, 0.08);
        }

        .tracking-delivered-icon {
          width: 64px;
          height: 64px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #179c6b;
          color: #ffffff;
          font-size: 28px;
          font-weight: 900;
          box-shadow: 0 16px 36px rgba(23, 156, 106, 0.35);
        }

        .tracking-delivered-title {
          margin: 6px 0 10px;
          font-size: clamp(1.5rem, 3vw, 2rem);
          color: #151515;
        }

        .tracking-delivered-copy {
          margin: 0 0 16px;
          max-width: 640px;
          color: #5d6268;
          line-height: 1.6;
        }

        .tracking-delivered-meta {
          margin-top: 8px;
        }

        .tracking-order-items {
          border: 1px solid rgba(18, 18, 18, 0.1);
          background: #ffffff;
          border-radius: 28px;
          padding: 24px 26px 26px;
          box-shadow: 0 24px 70px rgba(15, 15, 15, 0.08);
        }

        .tracking-order-items-header h2 {
          margin: 0 0 6px;
          font-size: clamp(1.35rem, 2.6vw, 1.75rem);
          color: #151515;
        }

        .tracking-order-items-header p {
          margin: 0;
        }

        .tracking-order-items-list {
          list-style: none;
          margin: 18px 0 0;
          padding: 0;
          display: grid;
          gap: 12px;
        }

        .tracking-order-line {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 14px 16px;
          border-radius: 18px;
          border: 1px solid rgba(18, 18, 18, 0.08);
          background: rgba(246, 251, 255, 0.65);
        }

        .tracking-order-line strong {
          color: #151515;
        }

        .tracking-order-line-notes {
          margin: 6px 0 0;
          font-size: 14px;
          color: #5d6268;
        }

        .tracking-order-line-prices {
          text-align: right;
          display: grid;
          gap: 4px;
          flex-shrink: 0;
        }

        .tracking-order-items-footer {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid rgba(18, 18, 18, 0.08);
          display: flex;
          flex-wrap: wrap;
          gap: 8px 14px;
          align-items: baseline;
        }

        .tracking-order-items-footer strong {
          font-size: 1.15rem;
          color: #151515;
        }

        @media (max-width: 900px) {
          .tracking-hero,
          .tracking-grid {
            grid-template-columns: 1fr;
          }

          .tracking-delivered-panel {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
