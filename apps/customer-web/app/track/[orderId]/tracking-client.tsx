"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { TrackedOrder } from "@hull-eats/types";

import { trackOrder } from "../../../src/lib/api";

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

const hullFallbackLocation = {
  latitude: 53.7676,
  longitude: -0.3274,
};

const buildMapSrc = (latitude: number, longitude: number) => {
  const delta = 0.012;
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
};

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
  const mapLatitude = location?.latitude ?? hullFallbackLocation.latitude;
  const mapLongitude = location?.longitude ?? hullFallbackLocation.longitude;
  const mapSrc = useMemo(() => buildMapSrc(mapLatitude, mapLongitude), [mapLatitude, mapLongitude]);
  const mapUpdatedAt = location ? new Date(location.updatedAt).toLocaleTimeString("en-GB") : "Waiting for driver scan";
  const mapAccuracy = location?.accuracyMeters ? `Accuracy ${Math.round(location.accuracyMeters)}m` : null;

  return (
    <main className="tracking-shell">
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

      <section className="tracking-grid">
        <article className="tracking-map">
          <iframe
            className="tracking-map-frame"
            title="Live Hull Eats courier location"
            src={mapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="tracking-map-status">
            <span className={location ? "live-dot is-live" : "live-dot"} />
            <span>{location ? "Live driver location" : "Waiting for courier scan"}</span>
          </div>
          <div className="tracking-map-copy">
            <strong>{location ? "Driver on the map" : formatStatus(order?.status ?? "loading")}</strong>
            <span>
              {location
                ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}${mapAccuracy ? ` - ${mapAccuracy}` : ""}`
                : "When the courier scans the receipt, this map follows their latest phone location."}
            </span>
            <div className="tracking-map-actions">
              <small>Updated {mapUpdatedAt}</small>
              <small>{location ? "Map follows the courier app" : "No driver position yet"}</small>
            </div>
          </div>
        </article>

        <aside className="tracking-panel">
          <div>
            <span className="muted-copy">Customer delivery PIN</span>
            <strong className="tracking-pin">{delivery?.confirmationCode ?? "----"}</strong>
            <p>This is the delivery code for this order. Give it to the courier at the door; the order only marks delivered when it matches.</p>
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

        .tracking-map {
          min-height: 520px;
          overflow: hidden;
          position: relative;
        }

        .tracking-map::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0)),
            radial-gradient(circle at 70% 20%, rgba(35, 205, 255, 0.14), transparent 34%);
        }

        .tracking-map-frame {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          filter: saturate(1.08) contrast(1.03);
        }

        .tracking-map-status {
          position: absolute;
          z-index: 1;
          top: 22px;
          left: 22px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 999px;
          background: rgba(7, 17, 24, 0.82);
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          backdrop-filter: blur(14px);
        }

        .live-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.55);
        }

        .live-dot.is-live {
          background: #23cdff;
          box-shadow: 0 0 0 6px rgba(35, 205, 255, 0.22);
        }

        .tracking-map-copy {
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: 24px;
          z-index: 1;
          display: grid;
          gap: 10px;
          width: auto;
          padding: 22px;
          border-radius: 22px;
          background: rgba(7, 17, 24, 0.92);
          color: #ffffff;
          backdrop-filter: blur(16px);
        }

        .tracking-map-copy strong {
          text-transform: capitalize;
          font-size: 30px;
        }

        .tracking-map-copy span {
          color: rgba(255, 255, 255, 0.72);
        }

        .tracking-map-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }

        .tracking-map-actions small {
          color: rgba(255, 255, 255, 0.62);
          font-weight: 700;
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

        @media (max-width: 900px) {
          .tracking-hero,
          .tracking-grid {
            grid-template-columns: 1fr;
          }

          .tracking-map {
            min-height: 440px;
          }

          .tracking-map-copy {
            left: 16px;
            right: 16px;
            bottom: 16px;
            padding: 18px;
          }

          .tracking-map-status {
            top: 16px;
            left: 16px;
          }
        }
      `}</style>
    </main>
  );
}
