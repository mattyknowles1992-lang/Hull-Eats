"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CreateHubCourierResponse,
  MerchantDriverAssignment,
  MerchantDriverCashUpResponse,
} from "@hull-eats/types";
import { useHubPortalI18n } from "@hull-eats/i18n";

import "leaflet/dist/leaflet.css";

const formatMoney = (value: number) => `£${value.toFixed(2)}`;

const hullTrackingBounds = {
  minLatitude: 53.7,
  maxLatitude: 53.83,
  minLongitude: -0.48,
  maxLongitude: -0.18,
};

const leafletIconAssets = {
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
};

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

const teamInputStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(15,17,21,0.14)",
  padding: "10px 12px",
  fontSize: 15,
  width: "100%",
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
  readOnly?: boolean;
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

function suggestCourierPassword() {
  const chunk = Math.random().toString(36).slice(2, 8);
  return `Hull${chunk}!`;
}

async function createHubDriver(
  apiBaseUrl: string,
  token: string,
  hubId: string,
  body: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    vehicleRegistration?: string;
  },
) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${encodeURIComponent(hubId)}/drivers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      const message = Array.isArray(parsed.message) ? parsed.message[0] : parsed.message;
      if (message) {
        throw new Error(message);
      }
    } catch (error) {
      if (error instanceof Error && error.message !== text) {
        throw error;
      }
    }
    throw new Error(text || `Create driver failed (${response.status})`);
  }

  return (await response.json()) as CreateHubCourierResponse;
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

export function HubDriversWorkbench({
  apiBaseUrl,
  token,
  hubId,
  storeName,
  driverTracking,
  onRefreshTracking,
  onNotice,
  readOnly = false,
}: Props) {
  const { t } = useHubPortalI18n();
  const formatTrackingTime = (value?: string | null) =>
    value
      ? new Date(value).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : t("delivery.noPingYet");
  const [tab, setTab] = useState<DriverWorkbenchTab>("dashboard");
  const [cashPeriod, setCashPeriod] = useState<string>("today");
  const [cashUp, setCashUp] = useState<MerchantDriverCashUpResponse | null>(null);
  const [cashError, setCashError] = useState("");
  const [assignments, setAssignments] = useState<MerchantDriverAssignment[]>([]);
  const [teamEmail, setTeamEmail] = useState("");
  const [teamError, setTeamError] = useState("");
  const [driverFullName, setDriverFullName] = useState("");
  const [driverEmail, setDriverEmail] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverPassword, setDriverPassword] = useState(() => suggestCourierPassword());
  const [showDriverPassword, setShowDriverPassword] = useState(false);
  const [driverVehicleReg, setDriverVehicleReg] = useState("");
  const [creatingDriver, setCreatingDriver] = useState(false);
  const [driverCredentials, setDriverCredentials] = useState<{
    fullName: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const driverMapHostRef = useRef<HTMLDivElement | null>(null);
  const driverMapRef = useRef<import("leaflet").Map | null>(null);
  const driverMapLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [driverMapReady, setDriverMapReady] = useState(false);

  const loadCashUp = useCallback(async () => {
    setCashError("");
    try {
      const data = await fetchCashUp(apiBaseUrl, token, hubId, cashPeriod);
      setCashUp(data);
    } catch (e) {
      setCashUp(null);
      setCashError(e instanceof Error ? e.message : t("drivers.couldNotLoadCashUp"));
    }
  }, [apiBaseUrl, hubId, token, cashPeriod]);

  const loadAssignments = useCallback(async () => {
    setTeamError("");
    try {
      const rows = await fetchAssignments(apiBaseUrl, token, hubId);
      setAssignments(rows);
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : t("drivers.couldNotLoadTeam"));
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

  useEffect(() => {
    if (tab !== "dashboard") {
      return;
    }

    let disposed = false;
    let map: import("leaflet").Map | null = null;

    void (async () => {
      const host = driverMapHostRef.current;
      if (!host) {
        return;
      }

      const L = (await import("leaflet")).default;
      if (disposed) {
        return;
      }

      L.Icon.Default.mergeOptions(leafletIconAssets);

      map = L.map(host, { zoomControl: true, scrollWheelZoom: true });
      const hullBounds = L.latLngBounds(
        L.latLng(hullTrackingBounds.minLatitude, hullTrackingBounds.minLongitude),
        L.latLng(hullTrackingBounds.maxLatitude, hullTrackingBounds.maxLongitude),
      );
      map.fitBounds(hullBounds, { padding: [24, 24] });
      map.setMaxBounds(
        L.latLngBounds(
          L.latLng(hullTrackingBounds.minLatitude - 0.02, hullTrackingBounds.minLongitude - 0.04),
          L.latLng(hullTrackingBounds.maxLatitude + 0.02, hullTrackingBounds.maxLongitude + 0.04),
        ),
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      driverMapRef.current = map;
      driverMapLayerRef.current = L.layerGroup().addTo(map);
      setDriverMapReady(true);
    })();

    return () => {
      disposed = true;
      if (map) {
        map.remove();
      }
      driverMapRef.current = null;
      driverMapLayerRef.current = null;
      setDriverMapReady(false);
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "dashboard" || !driverMapReady) {
      return;
    }

    const map = driverMapRef.current;
    const layers = driverMapLayerRef.current;
    if (!map || !layers) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) {
        return;
      }

      const hullBounds = L.latLngBounds(
        L.latLng(hullTrackingBounds.minLatitude, hullTrackingBounds.minLongitude),
        L.latLng(hullTrackingBounds.maxLatitude, hullTrackingBounds.maxLongitude),
      );

      layers.clearLayers();

      if (!liveAllowed) {
        map.fitBounds(hullBounds, { padding: [24, 24], maxZoom: 12 });
        return;
      }

      const locationBounds = L.latLngBounds([]);
      const driversWithLocations = (driverTracking?.drivers ?? []).filter((driver) => driver.latestLocation);

      driversWithLocations.forEach((driver, index) => {
        const latestLocation = driver.latestLocation;
        if (!latestLocation) {
          return;
        }

        const marker = L.marker([latestLocation.latitude, latestLocation.longitude], {
          title: driver.courierName,
          icon: L.divIcon({
            className: "he-driver-live-marker",
            html: `<span style="
              width:38px;
              height:38px;
              display:grid;
              place-items:center;
              border-radius:999px;
              border:3px solid #fff;
              background:linear-gradient(135deg, #0f1115, #0d8aa8);
              color:#fff;
              font:900 16px/1 system-ui;
              box-shadow:0 16px 28px rgba(15,17,21,0.22);
            ">${driver.courierName.slice(0, 1).toUpperCase() || String(index + 1)}</span>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          }),
        });

        marker
          .bindTooltip(`${driver.courierName} • ${formatTrackingTime(latestLocation.updatedAt)}`, {
            direction: "top",
            opacity: 0.92,
          })
          .addTo(layers);

        locationBounds.extend([latestLocation.latitude, latestLocation.longitude]);
      });

      if (driversWithLocations.length > 0 && locationBounds.isValid()) {
        map.fitBounds(locationBounds.pad(0.3), { padding: [28, 28], maxZoom: 14 });
      } else {
        map.fitBounds(hullBounds, { padding: [24, 24], maxZoom: 12 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, driverMapReady, driverTracking, liveAllowed]);

  return (
    <section style={shell}>
      <p style={eyebrowDark}>{t("delivery.driversEyebrow")}</p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h2 style={sectionTitle}>{t("delivery.driverDashboard")}</h2>
          <p style={{ ...panelCopyDark, maxWidth: 920 }}>{t("drivers.dashboardCopy", { storeName })}</p>
        </div>
        <button type="button" style={secondaryButton} onClick={() => void onRefreshTracking()}>
          {t("delivery.refreshLiveData")}
        </button>
      </div>

      <div style={tabRow}>
        <button type="button" style={tab === "dashboard" ? tabBtnActive : tabBtn} onClick={() => setTab("dashboard")}>
          {t("delivery.liveDashboard")}
        </button>
        <button type="button" style={tab === "analysis" ? tabBtnActive : tabBtn} onClick={() => setTab("analysis")}>
          {t("delivery.cashUpAnalysis")}
        </button>
        <button type="button" style={tab === "team" ? tabBtnActive : tabBtn} onClick={() => setTab("team")}>
          {t("delivery.courierTeam")}
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
              <span style={summaryLabel}>{t("drivers.driversOnDeliveries")}</span>
              <strong style={summaryValue}>{driverTracking?.totals.driverCount ?? 0}</strong>
            </article>
            <article style={summaryCard}>
              <span style={summaryLabel}>{t("drivers.activeDeliveryOrders")}</span>
              <strong style={summaryValue}>{driverTracking?.totals.orderCount ?? 0}</strong>
            </article>
            <article style={summaryCard}>
              <span style={summaryLabel}>{t("drivers.cashOrdersLive")}</span>
              <strong style={summaryValue}>{driverTracking?.totals.cashOrderCount ?? 0}</strong>
            </article>
            <article style={summaryCard}>
              <span style={summaryLabel}>{t("drivers.cashDueBack")}</span>
              <strong style={summaryValue}>{formatMoney(driverTracking?.totals.cashDue ?? 0)}</strong>
            </article>
          </div>

          <section style={driverTrackingGrid}>
            <article style={driverMapPanel}>
              <div style={driverMapHeader}>
                <div>
                  <span style={summaryLabel}>{t("drivers.hullAreaMap")}</span>
                  <strong style={driverMapTitle}>{liveAllowed ? t("delivery.driverLocations") : t("delivery.mapPaused")}</strong>
                </div>
                <span style={darkBadge}>{t("drivers.hullOnly")}</span>
              </div>
              <div style={{ ...driverMapCanvas, opacity: liveAllowed ? 1 : 0.35 }} aria-label={t("drivers.liveDriverMapAria")}>
                <div ref={driverMapHostRef} style={{ position: "absolute", inset: 0 }} />
                {liveAllowed && (driverTracking?.drivers ?? []).every((d) => !d.latestLocation) ? (
                  <div style={driverMapEmpty}>{t("drivers.mapEmptyLive")}</div>
                ) : null}
                {!liveAllowed ? (
                  <div style={driverMapEmpty}>{t("drivers.mapEmptyPaused")}</div>
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
                        {driver.currentStatus.replaceAll("_", " ")} / {t("drivers.ordersCount", { count: driver.orderCount })} / {t("drivers.locationAt", { time: formatTrackingTime(driver.latestLocation?.updatedAt) })}
                      </p>
                    </div>
                    <span style={driver.totalCashDue > 0 ? orangeBadge : darkBadge}>
                      {driver.totalCashDue > 0 ? t("drivers.cashDue", { amount: formatMoney(driver.totalCashDue) }) : t("drivers.noCashDue")}
                    </span>
                  </div>

                  <div style={driverOrderList}>
                    {driver.orders.map((order) => (
                      <div key={order.orderId} style={driverOrderRow}>
                        <div>
                          <strong>{order.orderNumber}</strong>
                          <p style={driverOrderMeta}>
                            {order.customerName} / {order.status.replaceAll("_", " ")} / {t("drivers.scannedAt", { time: formatTrackingTime(order.scannedAt) })}
                          </p>
                          <p style={driverOrderAddress}>{order.paymentMethod.replaceAll("_", " ")} · {order.dropoffAddress || t("drivers.noAddress")}</p>
                        </div>
                        <div style={driverOrderTotals}>
                          <span>{formatMoney(order.totalAmount)}</span>
                          <div style={{ fontSize: 12, fontWeight: 700, color: order.cashDue > 0 ? "#7a3e00" : "#596271" }}>
                            {order.cashDue > 0 ? t("drivers.collectCash", { amount: formatMoney(order.cashDue) }) : t("drivers.paidOnline")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}

              {(driverTracking?.drivers ?? []).length === 0 ? (
                <div style={emptyStateCard}>{t("drivers.noScannedOrders")}</div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {tab === "analysis" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 800, color: "#101216" }}>{t("drivers.period")}</span>
            {(["today", "yesterday", "last_7_days"] as const).map((p) => (
              <button key={p} type="button" style={cashPeriod === p ? tabBtnActive : tabBtn} onClick={() => setCashPeriod(p)}>
                {p === "today" ? t("drivers.today") : p === "yesterday" ? t("drivers.yesterday") : t("drivers.last7Days")}
              </button>
            ))}
            <button type="button" style={primaryButton} onClick={() => void loadCashUp()}>
              {t("common.refresh")}
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
                      <th style={th}>{t("drivers.driverColumn")}</th>
                      <th style={th}>{t("drivers.paidOrders")}</th>
                      <th style={{ ...th, textAlign: "right" }}>{t("drivers.paidTotal")}</th>
                      <th style={th}>{t("drivers.cashOrders")}</th>
                      <th style={{ ...th, textAlign: "right" }}>{t("drivers.cashToCollect")}</th>
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
                      <td style={td}>{t("drivers.totals")}</td>
                      <td style={td}>{cashUp.totals.paidOrderCount}</td>
                      <td style={{ ...td, textAlign: "right" }}>{formatMoney(cashUp.totals.paidOrderTotal)}</td>
                      <td style={td}>{cashUp.totals.cashOrderCount}</td>
                      <td style={{ ...td, textAlign: "right" }}>{formatMoney(cashUp.totals.cashOrderTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p style={{ ...summaryLabel, marginTop: 8 }}>{t("drivers.quickCashUp")}</p>
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
            !cashError && <div style={emptyStateCard}>{t("drivers.loadingCashUp")}</div>
          )}
        </div>
      ) : null}

      {tab === "team" ? (
        <div style={{ display: "grid", gap: 18, maxWidth: 760 }}>
          <p style={panelCopyDark}>{t("drivers.teamIntro", { storeName })}</p>

          {driverCredentials ? (
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                border: "1px solid rgba(15,17,21,0.1)",
                background: "rgba(244, 160, 32, 0.12)",
              }}
            >
              <strong style={{ display: "block", marginBottom: 8 }}>{t("drivers.shareCredentials")}</strong>
              <p style={{ margin: "0 0 10px", fontSize: 14, color: "#3d4652" }}>
                {t("drivers.credentialsEmail", { email: driverCredentials.email })}
                <br />
                {t("drivers.credentialsPassword", { password: driverCredentials.temporaryPassword })}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#596271" }}>{t("drivers.credentialsChangeHint")}</p>
              <button
                type="button"
                style={{ ...secondaryButton, marginTop: 12 }}
                onClick={() => setDriverCredentials(null)}
              >
                {t("drivers.dismiss")}
              </button>
            </div>
          ) : null}

          {teamError ? <p style={{ color: "#b42318", fontWeight: 800 }}>{teamError}</p> : null}

          {readOnly ? (
            <p style={panelCopyDark}>{t("drivers.viewOnlyDrivers")}</p>
          ) : (
            <section style={{ display: "grid", gap: 12 }}>
              <span style={{ fontWeight: 900, color: "#101216" }}>{t("drivers.addNewDriver")}</span>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#3d4652" }}>{t("users.fullName")}</span>
                <input
                  value={driverFullName}
                  onChange={(e) => setDriverFullName(e.target.value)}
                  placeholder={t("drivers.driverNamePlaceholder")}
                  style={teamInputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#3d4652" }}>{t("drivers.loginEmail")}</span>
                <input
                  type="email"
                  value={driverEmail}
                  onChange={(e) => setDriverEmail(e.target.value)}
                  placeholder={t("drivers.driverEmailPlaceholder")}
                  style={teamInputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#3d4652" }}>{t("drivers.phoneOptional")}</span>
                <input
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder={t("drivers.phonePlaceholder")}
                  style={teamInputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#3d4652" }}>{t("drivers.vehicleRegOptional")}</span>
                <input
                  value={driverVehicleReg}
                  onChange={(e) => setDriverVehicleReg(e.target.value.toUpperCase())}
                  placeholder={t("drivers.vehiclePlaceholder")}
                  style={teamInputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#3d4652" }}>{t("drivers.temporaryPassword")}</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type={showDriverPassword ? "text" : "password"}
                    value={driverPassword}
                    onChange={(e) => setDriverPassword(e.target.value)}
                    style={{ ...teamInputStyle, flex: "1 1 200px" }}
                  />
                  <button type="button" style={secondaryButton} onClick={() => setShowDriverPassword((v) => !v)}>
                    {showDriverPassword ? t("auth.hide") : t("auth.show")}
                  </button>
                  <button type="button" style={secondaryButton} onClick={() => setDriverPassword(suggestCourierPassword())}>
                    {t("drivers.newPassword")}
                  </button>
                </div>
              </label>
              <button
                type="button"
                style={primaryButton}
                disabled={creatingDriver}
                onClick={async () => {
                  if (!driverFullName.trim() || !driverEmail.trim() || driverPassword.length < 8) {
                    setTeamError(t("drivers.createDriverValidation"));
                    return;
                  }
                  setTeamError("");
                  setCreatingDriver(true);
                  try {
                    const result = await createHubDriver(apiBaseUrl, token, hubId, {
                      fullName: driverFullName.trim(),
                      email: driverEmail.trim().toLowerCase(),
                      phone: driverPhone.trim(),
                      password: driverPassword,
                      vehicleRegistration: driverVehicleReg.trim() || undefined,
                    });
                    setAssignments(result.assignments);
                    if (result.temporaryPassword) {
                      setDriverCredentials({
                        fullName: result.fullName,
                        email: result.email,
                        temporaryPassword: result.temporaryPassword,
                      });
                      onNotice(t("drivers.driverAddedShare", { name: result.fullName }));
                    } else {
                      onNotice(result.message ?? t("drivers.driverLinked"));
                    }
                    setDriverFullName("");
                    setDriverEmail("");
                    setDriverPhone("");
                    setDriverVehicleReg("");
                    setDriverPassword(suggestCourierPassword());
                  } catch (e) {
                    setTeamError(e instanceof Error ? e.message : t("drivers.couldNotAddDriver"));
                  } finally {
                    setCreatingDriver(false);
                  }
                }}
              >
                {creatingDriver ? t("delivery.addingDriver") : t("delivery.addDriver")}
              </button>
            </section>
          )}

          <details style={{ fontSize: 14, color: "#596271" }}>
            <summary style={{ fontWeight: 800, color: "#101216", cursor: "pointer" }}>{t("drivers.linkExistingTitle")}</summary>
            <p style={{ margin: "10px 0" }}>{t("drivers.linkExistingCopy")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <input
                type="email"
                placeholder={t("drivers.driverEmailPlaceholder")}
                value={teamEmail}
                disabled={readOnly}
                onChange={(e) => setTeamEmail(e.target.value)}
                style={{ ...teamInputStyle, flex: "1 1 240px" }}
              />
              <button
                type="button"
                style={primaryButton}
                disabled={readOnly}
                onClick={async () => {
                  setTeamError("");
                  try {
                    const next = await postAssignment(apiBaseUrl, token, hubId, teamEmail.trim());
                    setAssignments(next);
                    setTeamEmail("");
                    onNotice(t("drivers.driverLinkedHub"));
                  } catch (e) {
                    setTeamError(e instanceof Error ? e.message : t("drivers.couldNotLinkDriver"));
                  }
                }}
              >
                {t("drivers.linkExisting")}
              </button>
            </div>
          </details>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 900, color: "#101216" }}>{t("drivers.yourDrivers")}</span>
              <button type="button" style={secondaryButton} onClick={() => void loadAssignments()}>
                {t("drivers.reloadList")}
              </button>
            </div>
            {assignments.length === 0 ? <div style={emptyStateCard}>{t("drivers.noDriversYet")}</div> : null}
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
                {readOnly ? null : (
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={async () => {
                      try {
                        await deleteAssignment(apiBaseUrl, token, hubId, row.courierProfileId);
                        await loadAssignments();
                        onNotice(t("drivers.driverRemoved"));
                      } catch (e) {
                        setTeamError(e instanceof Error ? e.message : t("drivers.removeFailed"));
                      }
                    }}
                  >
                    {t("common.remove")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
