"use client";

import { useMemo } from "react";

import type { KitchenTicketSettings } from "@hull-eats/types";
import { isKitchenTicketBlockVisible, mergeLineFromOrderNotes, sampleKitchenTicketPayload } from "@hull-eats/types";

export const HULL_EATS_TICKET_LOGO_PLACEHOLDER = "/brand/hull-eats-logo.png";

const SAMPLE_ORDER = {
  paymentStatus: "paid",
  paymentMethod: "dojo_card",
  customerPhone: "01482 000000",
  addressLine1: "12 Example Street",
  city: "Hull",
  postcode: "HU1 1AA",
  subtotalAmount: 8.5,
  deliveryFee: 2.5,
  totalAmount: 11,
  currency: "GBP",
} as const;

function formatMoney(value: number): string {
  return `£${value.toFixed(2)}`;
}

function formatPlacedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type MockupLineProps = {
  settings: KitchenTicketSettings;
  detailMode: KitchenTicketSettings["detailMode"];
  showComponents: boolean;
};

function MockupLine({ settings, detailMode, showComponents }: MockupLineProps) {
  const payload = sampleKitchenTicketPayload();
  const line = mergeLineFromOrderNotes(payload.lines[0]!, { ...settings, detailMode });
  const buildParts = showComponents ? (line.components ?? []).filter((c) => !c.removed) : [];
  const options = line.selectedOptions ?? [];

  return (
    <div className="hub-ticket-mockup__item">
      <p className="hub-ticket-mockup__item-head">
        <span className="hub-ticket-mockup__line-num">1.</span> {line.quantity} x {line.name}
      </p>
      {line.totalPrice !== undefined ? (
        <p className="hub-ticket-mockup__item-meta">Item total: {formatMoney(line.totalPrice)}</p>
      ) : null}
      {options.map((option) => (
        <p key={`${option.groupName}-${option.valueName}`} className="hub-ticket-mockup__check">
          <span className="hub-ticket-mockup__box hub-ticket-mockup__box--on" aria-hidden="true" />
          {option.groupName}: {option.valueName}
          {option.priceDelta > 0 ? ` +${formatMoney(option.priceDelta)}` : ""}
        </p>
      ))}
      {showComponents && buildParts.length > 0 ? (
        <div className="hub-ticket-mockup__build">
          <p className="hub-ticket-mockup__build-title">BUILD:</p>
          {buildParts.map((part) => (
            <p key={part.label} className="hub-ticket-mockup__check">
              <span className="hub-ticket-mockup__box hub-ticket-mockup__box--on" aria-hidden="true" />
              {part.label} x{part.quantity}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type OrderTicketVisualMockupProps = {
  detailMode: KitchenTicketSettings["detailMode"];
  settings: KitchenTicketSettings;
  logoSrc: string;
  logoIsPlaceholder?: boolean;
  compact?: boolean;
  className?: string;
};

export function OrderTicketVisualMockup({
  detailMode,
  settings,
  logoSrc,
  logoIsPlaceholder = false,
  compact = false,
  className = "",
}: OrderTicketVisualMockupProps) {
  const effectiveSettings = useMemo(() => ({ ...settings, detailMode }), [settings, detailMode]);
  const payload = sampleKitchenTicketPayload();
  const show = (blockId: Parameters<typeof isKitchenTicketBlockVisible>[1]) =>
    isKitchenTicketBlockVisible(effectiveSettings, blockId);
  const showComponents = detailMode === "in_depth" && show("buildComponents");
  const showLogo = show("ticketLogo");

  return (
    <article
      className={`hub-ticket-mockup hub-ticket-mockup--order${compact ? " hub-ticket-mockup--compact" : ""} ${className}`.trim()}
      aria-hidden={compact}
    >
      {showLogo ? (
        <div className="hub-ticket-mockup__logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt=""
            className={`hub-ticket-mockup__logo${logoIsPlaceholder ? " hub-ticket-mockup__logo--placeholder" : ""}`}
          />
        </div>
      ) : null}
      {show("headerBranding") ? (
        <div className="hub-ticket-mockup__brand">
          <p className="hub-ticket-mockup__brand-name">HULL EATS</p>
          <p className="hub-ticket-mockup__brand-tag">Anything you want. Delivered.</p>
          {payload.storeName ? <p className="hub-ticket-mockup__store">{payload.storeName}</p> : null}
        </div>
      ) : null}
      <hr className="hub-ticket-mockup__rule" />
      {show("ticketTitle") ? (
        <>
          <p className="hub-ticket-mockup__title">ORDER TICKET</p>
          {!compact ? (
            <p className="hub-ticket-mockup__flow">Cook · stick on bag · scan to deliver</p>
          ) : (
            <p className="hub-ticket-mockup__flow hub-ticket-mockup__flow--compact">Cook → bag → scan</p>
          )}
        </>
      ) : null}
      {show("placedAt") ? <p className="hub-ticket-mockup__meta">Placed: {formatPlacedAt(payload.placedAtIso)}</p> : null}
      {show("orderNumber") ? <p className="hub-ticket-mockup__order"># {payload.orderNumber}</p> : null}
      {show("prepTime") && payload.prepTimeMinutes ? (
        <p className="hub-ticket-mockup__prep">PREP TIME: {payload.prepTimeMinutes} minutes</p>
      ) : null}
      <hr className="hub-ticket-mockup__rule" />
      <p className="hub-ticket-mockup__checklist-title">CHECKLIST</p>
      <MockupLine settings={effectiveSettings} detailMode={detailMode} showComponents={showComponents} />
      {show("orderNotes") && payload.notes ? (
        <p className="hub-ticket-mockup__notes">ORDER NOTES: {payload.notes}</p>
      ) : null}
      {!compact && show("totals") ? (
        <>
          <hr className="hub-ticket-mockup__rule" />
          <div className="hub-ticket-mockup__totals">
            <p>Subtotal: {formatMoney(SAMPLE_ORDER.subtotalAmount)}</p>
            <p>Delivery charge: {formatMoney(SAMPLE_ORDER.deliveryFee)}</p>
            <p>
              <strong>Total due: {formatMoney(SAMPLE_ORDER.totalAmount)}</strong>
            </p>
          </div>
        </>
      ) : null}
      {!compact && show("payment") ? (
        <>
          <hr className="hub-ticket-mockup__rule" />
          <div className="hub-ticket-mockup__payment">
            <p className="hub-ticket-mockup__paid">ORDER HAS BEEN PAID</p>
          </div>
        </>
      ) : null}
      {!compact && show("customerBlock") ? (
        <>
          <hr className="hub-ticket-mockup__rule" />
          <div className="hub-ticket-mockup__customer">
            <p className="hub-ticket-mockup__section-label">Customer details:</p>
            <p>{payload.customerName}</p>
            <p>Phone: {SAMPLE_ORDER.customerPhone}</p>
          </div>
        </>
      ) : null}
      {!compact && show("deliveryAddress") ? (
        <div className="hub-ticket-mockup__address">
          <p className="hub-ticket-mockup__section-label">Delivery address:</p>
          <p>{SAMPLE_ORDER.addressLine1}</p>
          <p>
            {SAMPLE_ORDER.city} {SAMPLE_ORDER.postcode}
          </p>
        </div>
      ) : null}
      {!compact && show("courierQr") ? (
        <>
          <hr className="hub-ticket-mockup__rule" />
          <div className="hub-ticket-mockup__qr">
            <div className="hub-ticket-mockup__qr-box" aria-hidden="true" />
            <p className="hub-ticket-mockup__qr-label">Scan with courier app</p>
            <p className="hub-ticket-mockup__meta">Backup: {payload.orderNumber}</p>
          </div>
        </>
      ) : null}
    </article>
  );
}

/** @deprecated Use OrderTicketVisualMockup */
export const KitchenTicketVisualMockup = OrderTicketVisualMockup;

export function resolveTicketMockupLogo(ticketLogoUrl?: string): { src: string; isPlaceholder: boolean } {
  const uploaded = ticketLogoUrl?.trim();
  if (uploaded) {
    return { src: uploaded, isPlaceholder: false };
  }
  return { src: HULL_EATS_TICKET_LOGO_PLACEHOLDER, isPlaceholder: true };
}
