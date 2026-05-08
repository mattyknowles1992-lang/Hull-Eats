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

  const progress = useMemo(() => {
    if (!order) {
      return 0.12;
    }

    if (order.status === "delivered") {
      return 1;
    }

    if (order.delivery?.courierLocation) {
      return 0.72;
    }

    if (order.status === "picked_up") {
      return 0.58;
    }

    if (order.status === "preparing") {
      return 0.35;
    }

    return 0.2;
  }, [order]);

  const delivery = order?.delivery;
  const location = delivery?.courierLocation;

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
          <div className="route-line">
            <span className="route-dot route-dot-start" />
            <span className="route-dot route-dot-driver" style={{ left: `${Math.round(progress * 100)}%` }} />
            <span className="route-dot route-dot-end" />
          </div>
          <div className="tracking-map-copy">
            <strong>{formatStatus(order?.status ?? "loading")}</strong>
            <span>
              {location
                ? `Courier location ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                : "The courier location will appear here once the driver scans the receipt."}
            </span>
          </div>
        </article>

        <aside className="tracking-panel">
          <div>
            <span className="muted-copy">Customer delivery PIN</span>
            <strong className="tracking-pin">{delivery?.confirmationCode ?? "----"}</strong>
            <p>Give this PIN to the driver at the door. The order only marks delivered when it matches.</p>
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
              <strong>{location ? new Date(location.updatedAt).toLocaleTimeString("en-GB") : "Not live yet"}</strong>
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
          min-height: 470px;
          padding: 34px;
          display: grid;
          align-content: center;
          gap: 42px;
          overflow: hidden;
          position: relative;
        }

        .tracking-map::before {
          content: "";
          position: absolute;
          inset: 18px;
          border-radius: 22px;
          background:
            linear-gradient(90deg, rgba(35, 205, 255, 0.08) 1px, transparent 1px),
            linear-gradient(0deg, rgba(35, 205, 255, 0.08) 1px, transparent 1px);
          background-size: 44px 44px;
        }

        .route-line {
          position: relative;
          z-index: 1;
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(90deg, #071118, #23cdff);
        }

        .route-dot {
          position: absolute;
          top: 50%;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          transform: translate(-50%, -50%);
          border: 5px solid #ffffff;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
        }

        .route-dot-start {
          left: 0;
          background: #071118;
        }

        .route-dot-driver {
          background: #23cdff;
          transition: left 600ms ease;
        }

        .route-dot-end {
          left: 100%;
          background: #087fa1;
        }

        .tracking-map-copy {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 10px;
          width: min(520px, 100%);
          padding: 22px;
          border-radius: 22px;
          background: rgba(7, 17, 24, 0.92);
          color: #ffffff;
        }

        .tracking-map-copy strong {
          text-transform: capitalize;
          font-size: 30px;
        }

        .tracking-map-copy span {
          color: rgba(255, 255, 255, 0.72);
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
            min-height: 360px;
            padding: 24px;
          }
        }
      `}</style>
    </main>
  );
}
