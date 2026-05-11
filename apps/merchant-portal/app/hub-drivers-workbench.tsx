"use client";

import { useCallback, useEffect, useState } from "react";

import type { MerchantDriverAssignment, MerchantDriverCashUpResponse } from "@hull-eats/types";

const formatMoney = (value: number) => `£${value.toFixed(2)}`;

const hullTrackingBounds = {
  minLatitude: 53.7,
  maxLatitude: 53.83,
  minLongitude: -0.48,
  maxLongitude: -0.18,
};

const clampPercentage = (value: number) => Math.min(96, Math.max(4, value));

const mapHullPosition = (latitude: number, longitude: number) => ({
  left: `${clampPercentage(((longitude - hullTrackingBounds.minLongitude) / (hullTrackingBounds.maxLongitude - hullTrackingBounds.minLongitude)) * 100)}%`,
  top: `${clampPercentage((1 - (latitude - hullTrackingBounds.minLatitude) / (hullTrackingBounds.maxLatitude - hullTrackingBounds.minLatitude)) * 100)}%`,
});

const formatTrackingTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No ping yet";

type DriverTrackingDriver = {
  courierProfileId: string;
  courierName: string;
  currentStatus: string;
  rating: number | null;
  latestLocation?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    heading?: number;
    updatedAt: string;
  };
  orders: Array<{
    orderId: string;
    orderNumber: string;
    status: string;
    customerName: string;
    dropoffAddress: string;
    paymentStatus: string;
    paymentMethod: string;
    cashDue: number;
    totalAmount: number;
    scannedAt: string | null;
    pickedUpAt: string | null;
    locationUpdatedAt: string | null;
  }>;
  totalCashDue: number;
  orderCount: number;
};

type TrackingPayload = {
  drivers: DriverTrackingDriver[];
  totals: {
    driverCount: number;
    orderCount: number;
    cashDue: number;
    cashOrderCount: number;
  };
  liveMapAllowed?: boolean;
  liveMapMessage?: string;
};

type DriverWorkbenchTab = "dashboard" | "analysis" | "team";

const shell: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  padding: 18,
  boxShadow: "0 18px 34px rgba(15, 17, 21, 0.06)",
  minHeight: 200,
};

const tabRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 16,
};

const tabBtn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(15,17,21,0.14)",
  background: "#f4f6f9",
  padding: "10px 16px",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 14,
};

const tabBtnActive: React.CSSProperties = {
  ...tabBtn,
  background: "#101216",
  color: "#fff",
  borderColor: "#101216",
};

const primaryButton: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  background: "linear-gradient(180deg, #f4a020, #e07810)",
  color: "#101216",
  padding: "10px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(15,17,21,0.2)",
  background: "#fff",
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const driverTrackingGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 0.9fr) minmax(360px, 1.1fr)",
  gap: 18,
  alignItems: "start",
};

const driverMapPanel: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(232,247,249,0.96))",
  padding: 16,
  boxShadow: "0 18px 32px rgba(15, 17, 21, 0.08)",
};

const driverMapHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  marginBottom: 12,
};

const driverMapTitle: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  fontSize: 22,
  color: "#101216",
};

const driverMapCanvas: React.CSSProperties = {
  position: "relative",
  minHeight: 360,
  overflow: "hidden",
  borderRadius: 22,
  border: "1px solid rgba(13, 138, 168, 0.2)",
  background:
    "linear-gradient(90deg, rgba(13,138,168,0.08) 1px, transparent 1px), linear-gradient(0deg, rgba(13,138,168,0.08) 1px, transparent 1px), radial-gradient(circle at 55% 44%, rgba(35,205,255,0.24), transparent 30%), linear-gradient(135deg, #f8fcfd, #dff4f6)",
  backgroundSize: "56px 56px, 56px 56px, auto, auto",
};

const driverMapAreaLabel: React.CSSProperties = {
  position: "absolute",
  transform: "translate(-50%, -50%)",
  color: "rgba(15, 17, 21, 0.42)",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const driverMapMarker: React.CSSProperties = {
  position: "absolute",
  width: 42,
  height: 54,
  display: "grid",
  placeItems: "center",
  transformOrigin: "50% 100%",
};

const driverMarkerLogo: React.CSSProperties = {
  width: 38,
  height: 38,
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  border: "3px solid #fff",
  background: "linear-gradient(135deg, #0f1115, #0d8aa8)",
  color: "#fff",
  fontSize: 16,
  fontWeight: 950,
  boxShadow: "0 16px 28px rgba(15, 17, 21, 0.22)",
};

const driverMapEmpty: React.CSSProperties = {
  position: "absolute",
  inset: "auto 18px 18px",
  padding: 14,
  borderRadius: 18,
  background: "rgba(255,255,255,0.9)",
  color: "#566070",
  fontWeight: 800,
};

const driverCardList: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const driverCard: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "rgba(255,255,255,0.96)",
  padding: 16,
  boxShadow: "0 18px 32px rgba(15, 17, 21, 0.07)",
};

const itemTopRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const driverName: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 950,
};

const panelCopyDark: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#596271",
  lineHeight: 1.55,
  fontSize: 14,
};

const orangeBadge: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 12px",
  background: "rgba(224, 120, 16, 0.15)",
  color: "#7a3e00",
  fontWeight: 800,
  fontSize: 13,
};

const darkBadge: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 12px",
  background: "rgba(15, 17, 21, 0.08)",
  fontWeight: 800,
  fontSize: 13,
};

const driverOrderList: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 12,
};

const driverOrderRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
  paddingBottom: 10,
  borderBottom: "1px solid rgba(15,17,21,0.06)",
};

const driverOrderMeta: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12,
  color: "#596271",
};

const driverOrderAddress: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 13,
  color: "#101216",
};

const driverOrderTotals: React.CSSProperties = {
  textAlign: "right",
  fontWeight: 800,
};

const emptyStateCard: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  border: "1px dashed rgba(15,17,21,0.15)",
  color: "#596271",
  fontWeight: 700,
};

const summaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginBottom: 18,
};

const summaryCard: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15,17,21,0.08)",
  padding: 14,
  background: "#fafbfc",
};

const summaryLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#596271",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const summaryValue: React.CSSProperties = {
  display: "block",
  marginTop: 6,
  fontSize: 26,
  fontWeight: 950,
  color: "#101216",
};

const eyebrowDark: React.CSSProperties = {
  margin: 0,
  color: "#9b4a12",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const sectionTitle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
  fontFamily: "Georgia, serif",
};

const tableShell: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "2px solid rgba(15,17,21,0.12)",
  fontWeight: 900,
  color: "#101216",
};

const td: React.CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid rgba(15,17,21,0.06)",
};

type Props = {
  apiBaseUrl: string;
  token: string;
  hubId: string;
  storeName: string;
  driverTracking: TrackingPayload | null;
  onRefreshTracking: () => void;
  onNotice: (message: string) => void;
};

async function fetchCashUp(apiBaseUrl: string, token: string, hubId: string, period: string): Promise<MerchantDriverCashUpResponse> {
  const response = await fetch(
    `${apiBaseUrl}/v1/merchant/hubs/${encodeURIComponent(hubId)}/drivers/cash-up?period=${encodeURIComponent(period)}`,
    {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) {
    throw new Error(`Cash-up failed (${response.status})`);
  }
  return (await response.json()) as MerchantDriverCashUpResponse;
}

async function fetchAssignments(apiBaseUrl: string, token: string, hubId: string): Promise<MerchantDriverAssignment[]> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${encodeURIComponent(hubId)}/drivers/assignments`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Assignments failed (${response.status})`);
  }
  return (await response.json()) as MerchantDriverAssignment[];
}

async function postAssignment(apiBaseUrl: string, token: string, hubId: string, email: string) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${encodeURIComponent(hubId)}/drivers/assignments`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Add driver failed (${response.status})`);
  }
  return (await response.json()) as MerchantDriverAssignment[];
}

async function deleteAssignment(apiBaseUrl: string, token: string, hubId: string, courierProfileId: string) {
  const response = await fetch(
    `${apiBaseUrl}/v1/merchant/hubs/${encodeURIComponent(hubId)}/drivers/assignments/${encodeURIComponent(courierProfileId)}`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) {
    throw new Error(`Remove driver failed (${response.status})`);
  }
}

export function HubDriversWorkbench({ apiBaseUrl, token, hubId, storeName, driverTracking, onRefreshTracking, onNotice }: Props) {
  const [tab, setTab] = useState<DriverWorkbenchTab>("dashboard");
  const [cashPeriod, setCashPeriod] = useState<string>("today");
  const [cashUp, setCashUp] = useState<MerchantDriverCashUpResponse | null>(null);
  const [cashError, setCashError] = useState("");
  const [assignments, setAssignments] = useState<MerchantDriverAssignment[]>([]);
  const [teamEmail, setTeamEmail] = useState("");
  const [teamError, setTeamError] = useState("");

  const loadCashUp = useCallback(async () => {
    setCashError("");
    try {
      const data = await fetchCashUp(apiBaseUrl, token, hubId, cashPeriod);
      setCashUp(data);
    } catch (e) {
      setCashUp(null);
      setCashError(e instanceof Error ? e.message : "Could not load cash-up.");
    }
  }, [apiBaseUrl, hubId, token, cashPeriod]);

  const loadAssignments = useCallback(async () => {
    setTeamError("");
    try {
      const rows = await fetchAssignments(apiBaseUrl, token, hubId);
      setAssignments(rows);
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : "Could not load courier team.");
    }
  }, [apiBaseUrl, hubId, token]);

  useEffect(() => {
    if (tab === "analysis") {
      void loadCashUp();
    }
  }, [tab, loadCashUp]);

  useEffect(() => {
    if (tab === "team") {
      void loadAssignments();
    }
  }, [tab, loadAssignments]);

  const liveAllowed = driverTracking?.liveMapAllowed !== false;
  const liveMessage = driverTracking?.liveMapMessage;

  return (
    <section style={shell}>
      <p style={eyebrowDark}>Drivers &amp; delivery</p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h2 style={sectionTitle}>Driver dashboard</h2>
          <p style={{ ...panelCopyDark, maxWidth: 920 }}>
            Dashboard shows live jobs scanned in the Hull Eats Courier app. Cash-up uses orders placed in the selected period where a courier is assigned. Team links courier
            accounts (created in admin) to <strong>{storeName}</strong> so their app only lists this takeaway&apos;s jobs.
          </p>
        </div>
        <button type="button" style={secondaryButton} onClick={() => void onRefreshTracking()}>
          Refresh live data
        </button>
      </div>

      <div style={tabRow}>
        <button type="button" style={tab === "dashboard" ? tabBtnActive : tabBtn} onClick={() => setTab("dashboard")}>
          Live dashboard
        </button>
        <button type="button" style={tab === "analysis" ? tabBtnActive : tabBtn} onClick={() => setTab("analysis")}>
          Cash-up &amp; analysis
        </button>
        <button type="button" style={tab === "team" ? tabBtnActive : tabBtn} onClick={() => setTab("team")}>
          Courier team
        </button>
      </div>

      {tab === "dashboard" ? (
        <>
          {!liveAllowed && liveMessage ? (
            <p style={{ margin: "0 0 12px", padding: 12, borderRadius: 14, background: "rgba(224,120,16,0.12)", fontWeight: 700, color: "#5c3b00" }}>
              {liveMessage}
            </p>
          ) : null}

          <div style={summaryGrid}>
            <article style={summaryCard}>
              <span style={summaryLabel}>Drivers on deliveries</span>
              <strong style={summaryValue}>{driverTracking?.totals.driverCount ?? 0}</strong>
            </article>
            <article style={summaryCard}>
              <span style={summaryLabel}>Active delivery orders</span>
              <strong style={summaryValue}>{driverTracking?.totals.orderCount ?? 0}</strong>
            </article>
            <article style={summaryCard}>
              <span style={summaryLabel}>Cash orders (live)</span>
              <strong style={summaryValue}>{driverTracking?.totals.cashOrderCount ?? 0}</strong>
            </article>
            <article style={summaryCard}>
              <span style={summaryLabel}>Cash due back</span>
              <strong style={summaryValue}>{formatMoney(driverTracking?.totals.cashDue ?? 0)}</strong>
            </article>
          </div>

          <section style={driverTrackingGrid}>
            <article style={driverMapPanel}>
              <div style={driverMapHeader}>
                <div>
                  <span style={summaryLabel}>Hull area map</span>
                  <strong style={driverMapTitle}>{liveAllowed ? "Driver locations" : "Map paused"}</strong>
                </div>
                <span style={darkBadge}>Hull only</span>
              </div>
              <div style={{ ...driverMapCanvas, opacity: liveAllowed ? 1 : 0.35 }} aria-label="Live driver map preview">
                <span style={{ ...driverMapAreaLabel, left: "12%", top: "18%" }}>Beverley Rd</span>
                <span style={{ ...driverMapAreaLabel, left: "52%", top: "28%" }}>City centre</span>
                <span style={{ ...driverMapAreaLabel, left: "66%", top: "62%" }}>Holderness Rd</span>
                <span style={{ ...driverMapAreaLabel, left: "22%", top: "74%" }}>Hessle Rd</span>
                {liveAllowed
                  ? (driverTracking?.drivers ?? []).map((driver, index) =>
                      driver.latestLocation ? (
                        <span
                          key={driver.courierProfileId}
                          title={`${driver.courierName} / ${formatTrackingTime(driver.latestLocation.updatedAt)}`}
                          style={{
                            ...driverMapMarker,
                            ...mapHullPosition(driver.latestLocation.latitude, driver.latestLocation.longitude),
                            transform: `translate(-50%, -100%) rotate(${driver.latestLocation.heading ?? 0}deg)`,
                          }}
                        >
                          <span style={{ ...driverMarkerLogo, transform: `rotate(-${driver.latestLocation.heading ?? 0}deg)` }}>
                            {driver.courierName.slice(0, 1).toUpperCase() || index + 1}
                          </span>
                        </span>
                      ) : null,
                    )
                  : null}
                {liveAllowed && (driverTracking?.drivers ?? []).every((d) => !d.latestLocation) ? (
                  <div style={driverMapEmpty}>Driver locations appear here after couriers send a GPS ping from the app.</div>
                ) : null}
                {!liveAllowed ? (
                  <div style={driverMapEmpty}>Live map is available during configured opening hours (store_hours). Outside those times, use order tracking links.</div>
                ) : null}
              </div>
            </article>

            <div style={driverCardList}>
              {(driverTracking?.drivers ?? []).map((driver) => (
                <article key={driver.courierProfileId} style={driverCard}>
                  <div style={itemTopRow}>
                    <div>
                      <h3 style={driverName}>{driver.courierName}</h3>
                      <p style={panelCopyDark}>
                        {driver.currentStatus.replaceAll("_", " ")} / {driver.orderCount} orders / location {formatTrackingTime(driver.latestLocation?.updatedAt)}
                      </p>
                    </div>
                    <span style={driver.totalCashDue > 0 ? orangeBadge : darkBadge}>
                      {driver.totalCashDue > 0 ? `Cash due ${formatMoney(driver.totalCashDue)}` : "No cash due"}
                    </span>
                  </div>

                  <div style={driverOrderList}>
                    {driver.orders.map((order) => (
                      <div key={order.orderId} style={driverOrderRow}>
                        <div>
                          <strong>{order.orderNumber}</strong>
                          <p style={driverOrderMeta}>
                            {order.customerName} / {order.status.replaceAll("_", " ")} / scanned {formatTrackingTime(order.scannedAt)}
                          </p>
                          <p style={driverOrderAddress}>{order.paymentMethod.replaceAll("_", " ")} · {order.dropoffAddress || "No address"}</p>
                        </div>
                        <div style={driverOrderTotals}>
                          <span>{formatMoney(order.totalAmount)}</span>
                          <div style={{ fontSize: 12, fontWeight: 700, color: order.cashDue > 0 ? "#7a3e00" : "#596271" }}>
                            {order.cashDue > 0 ? `Collect ${formatMoney(order.cashDue)}` : "Paid online"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}

              {(driverTracking?.drivers ?? []).length === 0 ? (
                <div style={emptyStateCard}>
                  No scanned delivery orders yet. Couriers sign in with Hull Eats Courier, scan the receipt QR, then orders appear here with cash totals.
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {tab === "analysis" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 800, color: "#101216" }}>Period</span>
            {(["today", "yesterday", "last_7_days"] as const).map((p) => (
              <button key={p} type="button" style={cashPeriod === p ? tabBtnActive : tabBtn} onClick={() => setCashPeriod(p)}>
                {p === "today" ? "Today" : p === "yesterday" ? "Yesterday" : "Last 7 days"}
              </button>
            ))}
            <button type="button" style={primaryButton} onClick={() => void loadCashUp()}>
              Refresh
            </button>
          </div>

          {cashError ? <p style={{ color: "#b42318", fontWeight: 800 }}>{cashError}</p> : null}

          {cashUp ? (
            <>
              <p style={{ ...panelCopyDark, margin: 0 }}>
                <strong>{cashUp.rangeLabel}</strong> · {new Date(cashUp.rangeStartIso).toLocaleString("en-GB")} → {new Date(cashUp.rangeEndIso).toLocaleString("en-GB")}
              </p>

              <div style={{ overflowX: "auto" }}>
                <table style={tableShell}>
                  <thead>
                    <tr>
                      <th style={th}>Driver</th>
                      <th style={th}>Paid orders</th>
                      <th style={{ ...th, textAlign: "right" }}>Paid total</th>
                      <th style={th}>Cash orders</th>
                      <th style={{ ...th, textAlign: "right" }}>Cash to collect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashUp.drivers.map((row) => (
                      <tr key={row.courierProfileId}>
                        <td style={td}>{row.courierName}</td>
                        <td style={td}>{row.paidOrderCount}</td>
                        <td style={{ ...td, textAlign: "right" }}>{formatMoney(row.paidOrderTotal)}</td>
                        <td style={td}>{row.cashOrderCount}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 900 }}>{formatMoney(row.cashOrderTotal)}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 950, background: "rgba(15,17,21,0.04)" }}>
                      <td style={td}>Totals</td>
                      <td style={td}>{cashUp.totals.paidOrderCount}</td>
                      <td style={{ ...td, textAlign: "right" }}>{formatMoney(cashUp.totals.paidOrderTotal)}</td>
                      <td style={td}>{cashUp.totals.cashOrderCount}</td>
                      <td style={{ ...td, textAlign: "right" }}>{formatMoney(cashUp.totals.cashOrderTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p style={{ ...summaryLabel, marginTop: 8 }}>Quick cash-up (per driver)</p>
              <div style={{ overflowX: "auto" }}>
                <table style={tableShell}>
                  <thead>
                    <tr>
                      {cashUp.drivers.map((row) => (
                        <th key={row.courierProfileId} style={{ ...th, textAlign: "center" }}>
                          {row.courierName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {cashUp.drivers.map((row) => (
                        <td key={row.courierProfileId} style={{ ...td, textAlign: "center", fontSize: 18, fontWeight: 950 }}>
                          {formatMoney(row.cashOrderTotal)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            !cashError && <div style={emptyStateCard}>Loading cash-up…</div>
          )}
        </div>
      ) : null}

      {tab === "team" ? (
        <div style={{ display: "grid", gap: 14, maxWidth: 720 }}>
          <p style={panelCopyDark}>
            Add the courier&apos;s <strong>login email</strong> (same as their Hull Eats Courier app account). The driver must already exist in the{" "}
            <strong>admin portal</strong>. Once linked, their app only shows delivery jobs for this store.
          </p>
          {teamError ? <p style={{ color: "#b42318", fontWeight: 800 }}>{teamError}</p> : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input
              type="email"
              placeholder="courier@example.com"
              value={teamEmail}
              onChange={(e) => setTeamEmail(e.target.value)}
              style={{
                flex: "1 1 240px",
                borderRadius: 12,
                border: "1px solid rgba(15,17,21,0.14)",
                padding: "10px 12px",
                fontSize: 15,
              }}
            />
            <button
              type="button"
              style={primaryButton}
              onClick={async () => {
                setTeamError("");
                try {
                  const next = await postAssignment(apiBaseUrl, token, hubId, teamEmail.trim());
                  setAssignments(next);
                  setTeamEmail("");
                  onNotice("Courier linked to this hub.");
                } catch (e) {
                  setTeamError(e instanceof Error ? e.message : "Could not add courier.");
                }
              }}
            >
              Link courier
            </button>
            <button type="button" style={secondaryButton} onClick={() => void loadAssignments()}>
              Reload list
            </button>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 900, color: "#101216" }}>Linked couriers</span>
            {assignments.length === 0 ? <div style={emptyStateCard}>No couriers linked yet.</div> : null}
            {assignments.map((row) => (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(15,17,21,0.08)",
                  background: "#fafbfc",
                }}
              >
                <div>
                  <strong>{row.courierName}</strong>
                  <div style={{ fontSize: 13, color: "#596271" }}>{row.courierEmail}</div>
                </div>
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={async () => {
                    try {
                      await deleteAssignment(apiBaseUrl, token, hubId, row.courierProfileId);
                      await loadAssignments();
                      onNotice("Courier unlinked from this hub.");
                    } catch (e) {
                      setTeamError(e instanceof Error ? e.message : "Remove failed.");
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
