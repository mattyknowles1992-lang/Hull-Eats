"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { ContactMessageRecord } from "@hull-eats/types";

import {
  fetchAdminContactMessages,
  fetchAdminCouriers,
  fetchAdminDeletedHubs,
  fetchAdminHubs,
  fetchAdminOrders,
  fetchAdminUsers,
  restoreAdminHub,
  type AdminCourierSummary,
  type AdminDeletedHubSummary,
  type AdminHubOrderSummary,
  type AdminHubSummary,
  type AdminHubUserSummary,
} from "../../admin-api";
import { adminSessionExpiredMessage, clearAdminSessionStorage, isAdminSessionAuthFailure, readStoredAdminSessionToken } from "../../admin-session";

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(7, 155, 200, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(35, 205, 255, 0.12), transparent 26%), linear-gradient(180deg, #020814 0%, #041120 40%, #091a31 100%)",
  color: "#f7fbff",
} as const;

function StatusPill({ value }: { value: string }) {
  const colors =
    value === "live" || value === "active" || value === "resolved"
      ? { bg: "rgba(111, 240, 191, 0.12)", fg: "#6ff0bf" }
      : value === "setup" || value === "pending" || value === "preparing" || value === "assigned" || value === "in_progress"
        ? { bg: "rgba(255, 209, 124, 0.12)", fg: "#ffd17c" }
        : { bg: "rgba(255, 159, 159, 0.12)", fg: "#ff9f9f" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 34,
        padding: "0 12px",
        borderRadius: 999,
        background: colors.bg,
        color: colors.fg,
        fontWeight: 800,
        textTransform: "capitalize",
      }}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

export function HubDetailClient({ slug }: { slug: string }) {
  const [hub, setHub] = useState<AdminHubSummary | null>(null);
  const [deletedHub, setDeletedHub] = useState<AdminDeletedHubSummary | null>(null);
  const [users, setUsers] = useState<AdminHubUserSummary[]>([]);
  const [couriers, setCouriers] = useState<AdminCourierSummary[]>([]);
  const [orders, setOrders] = useState<AdminHubOrderSummary[]>([]);
  const [messages, setMessages] = useState<ContactMessageRecord[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [restoreNotice, setRestoreNotice] = useState("");
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const token = readStoredAdminSessionToken();
    if (!token) {
      setState("error");
      setError(adminSessionExpiredMessage);
      return;
    }

    void (async () => {
      try {
        const [allHubs, allDeletedHubs, allUsers, allCouriers, allOrders, allMessages] = await Promise.all([
          fetchAdminHubs(token),
          fetchAdminDeletedHubs(token),
          fetchAdminUsers(token),
          fetchAdminCouriers(token),
          fetchAdminOrders(token),
          fetchAdminContactMessages(token),
        ]);
        const matchedHub = allHubs.find((entry) => entry.slug === slug) ?? null;
        const matchedDeletedHub = allDeletedHubs.find((entry) => entry.slug === slug) ?? null;

        if (matchedHub) {
          setHub(matchedHub);
          setDeletedHub(null);
          setUsers(allUsers.filter((user) => user.hubId === matchedHub.id));
          setCouriers(allCouriers.filter((courier) => courier.assignedStores.some((store) => store.hubId === matchedHub.id)));
          setOrders(allOrders.filter((order) => order.hubId === matchedHub.id));
          setMessages(allMessages.filter((message) => message.hubId === matchedHub.id));
          setState("ready");
          setError("");
          return;
        }

        if (matchedDeletedHub) {
          setHub(null);
          setDeletedHub(matchedDeletedHub);
          setUsers([]);
          setCouriers([]);
          setOrders(allOrders.filter((order) => order.hubId === matchedDeletedHub.id));
          setMessages(allMessages.filter((message) => message.hubId === matchedDeletedHub.id));
          setState("ready");
          setError("");
          return;
        }

        setState("error");
        setError("That hub could not be found in the live admin data.");
      } catch (nextError) {
        if (isAdminSessionAuthFailure(nextError)) {
          clearAdminSessionStorage();
          setState("error");
          setError(nextError instanceof Error ? nextError.message : adminSessionExpiredMessage);
          return;
        }

        setState("error");
        setError(nextError instanceof Error ? nextError.message : "Hub detail failed to load.");
      }
    })();
  }, [slug]);

  const metrics = useMemo(() => {
    if (!hub) {
      return [];
    }
    return [
      { label: "Orders today", value: String(hub.orderVolumeToday) },
      { label: "Orders this week", value: String(hub.orderVolumeWeek) },
      { label: "Gross sales", value: hub.grossSalesWeek },
      { label: "Average order", value: hub.averageOrderValue },
      { label: "Hub users", value: String(users.length) },
      { label: "Assigned couriers", value: String(couriers.length) },
      { label: "Support messages", value: String(messages.length) },
    ];
  }, [couriers.length, hub, messages.length, users.length]);

  const handleRestoreDeletedHub = async () => {
    if (!deletedHub) {
      return;
    }

    const token = readStoredAdminSessionToken();
    if (!token) {
      setRestoreNotice(adminSessionExpiredMessage);
      return;
    }

    if (
      !window.confirm(
        `Restore ${deletedHub.businessName}?\n\nThis will bring the hub back with the same marketplace and order settings it had before deletion.`,
      )
    ) {
      return;
    }

    setRestoring(true);
    setRestoreNotice("");
    try {
      await restoreAdminHub(token, deletedHub.id);
      window.location.href = "/";
    } catch (nextError) {
      if (isAdminSessionAuthFailure(nextError)) {
        clearAdminSessionStorage();
        setRestoreNotice(nextError instanceof Error ? nextError.message : adminSessionExpiredMessage);
      } else {
        setRestoreNotice(nextError instanceof Error ? nextError.message : "Hub restore failed.");
      }
    } finally {
      setRestoring(false);
    }
  };

  const pageTitle = hub?.businessName ?? deletedHub?.businessName ?? "Hub detail";

  return (
    <main style={pageStyle} className="he-admin-page he-admin-console-page">
      <div className="he-admin-shell">
        <header className="he-admin-header">
          <div>
            <p className="he-admin-eyebrow">{deletedHub ? "Deleted hub recovery" : "Hub breakdown"}</p>
            <h1 style={{ margin: "8px 0 0", fontSize: 46, lineHeight: 0.95, fontFamily: "Georgia, serif" }}>
              {pageTitle}
            </h1>
            <p style={{ margin: "14px 0 0", color: "#9fb2c9", lineHeight: 1.7, maxWidth: 760 }}>
              {deletedHub
                ? "This hub is in deleted recovery. Review the saved settings below and restore it before the 30-day window expires."
                : "Real admin detail for this hub’s live status, orders, assigned couriers, users, and support traffic."}
            </p>
          </div>

          <div className="he-admin-header-actions">
            <Link
              href={deletedHub ? "/?hubTab=deleted" : "/"}
              className="he-admin-back-link"
              style={{
                minHeight: 48,
                padding: "0 16px",
                borderRadius: 16,
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#f7fbff",
                fontWeight: 800,
                background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))",
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
              }}
            >
              Back to admin
            </Link>
            {hub ? <StatusPill value={hub.status} /> : null}
            {deletedHub ? <StatusPill value="deleted" /> : null}
          </div>
        </header>

        {state === "loading" ? (
          <section
            style={{
              borderRadius: 24,
              border: "1px solid rgba(188, 213, 255, 0.14)",
              background: "rgba(11, 24, 44, 0.78)",
              boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
              padding: 20,
            }}
          >
            Loading live hub detail...
          </section>
        ) : null}

        {state === "error" ? (
          <section
            style={{
              borderRadius: 24,
              border: "1px solid rgba(255,95,95,0.22)",
              background: "rgba(255,95,95,0.08)",
              boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
              padding: 20,
            }}
          >
            <strong style={{ display: "block", fontSize: 20 }}>Hub detail unavailable</strong>
            <p style={{ margin: "10px 0 0", color: "#ffd7d7", lineHeight: 1.7 }}>{error}</p>
          </section>
        ) : null}

        {state === "ready" && deletedHub ? (
          <section
            style={{
              borderRadius: 24,
              border: "1px solid rgba(255, 183, 183, 0.18)",
              background: "rgba(255, 95, 95, 0.06)",
              boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
              padding: 20,
              display: "grid",
              gap: 16,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <strong style={{ fontSize: 24 }}>Recovery details</strong>
              <p style={{ margin: 0, color: "#dce9ff", lineHeight: 1.7 }}>
                Deleted {new Date(deletedHub.deletedAt).toLocaleString("en-GB")} ·{" "}
                {deletedHub.daysRemaining === 0
                  ? "Expires today"
                  : `${deletedHub.daysRemaining} day${deletedHub.daysRemaining === 1 ? "" : "s"} left to recover`}
              </p>
              <p style={{ margin: 0, color: "#9fb2c9", lineHeight: 1.7 }}>
                Owner {deletedHub.ownerName}
                {deletedHub.hubUsername ? ` · Login ${deletedHub.hubUsername}` : ""}
              </p>
              <p style={{ margin: 0, color: "#9fb2c9", lineHeight: 1.7 }}>
                Before deletion: {deletedHub.wasListedOnMarketplace ? "listed on Hull Eats" : "not listed"}
                {deletedHub.wasAcceptingOrders ? ", accepting orders" : ", orders paused"}.
              </p>
              <p style={{ margin: 0, color: "#9fb2c9", lineHeight: 1.7 }}>
                Recoverable until {new Date(deletedHub.recoverableUntil).toLocaleString("en-GB")}.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={restoring}
                onClick={() => void handleRestoreDeletedHub()}
                style={{
                  minHeight: 46,
                  padding: "0 16px",
                  borderRadius: 16,
                  border: "1px solid rgba(126, 224, 255, 0.2)",
                  color: "#fff",
                  fontWeight: 900,
                  background: "linear-gradient(180deg, #23cdff, #079bc8)",
                  cursor: restoring ? "wait" : "pointer",
                  opacity: restoring ? 0.7 : 1,
                }}
              >
                {restoring ? "Restoring..." : "Restore hub"}
              </button>
            </div>

            {restoreNotice ? <p style={{ margin: 0, color: "#ffd7d7", lineHeight: 1.7 }}>{restoreNotice}</p> : null}

            {orders.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                <strong style={{ fontSize: 18 }}>Historical orders still on record ({orders.length})</strong>
                {orders.slice(0, 5).map((order) => (
                  <article
                    key={order.id}
                    style={{
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      padding: 14,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <strong>{order.orderNumber}</strong>
                      <StatusPill value={order.status} />
                    </div>
                    <p style={{ margin: "8px 0 0", color: "#9fb2c9", lineHeight: 1.6, fontSize: 14 }}>
                      {order.customerName} · £{order.totalAmount.toFixed(2)} · {new Date(order.placedAt).toLocaleString("en-GB")}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {state === "ready" && hub ? (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
              {metrics.map((metric) => (
                <article
                  key={metric.label}
                  style={{
                    borderRadius: 24,
                    border: "1px solid rgba(188, 213, 255, 0.14)",
                    background: "rgba(11, 24, 44, 0.78)",
                    boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
                    padding: 18,
                  }}
                >
                  <p style={{ margin: 0, color: "#9fb2c9", fontSize: 13, fontWeight: 700 }}>{metric.label}</p>
                  <strong style={{ display: "block", marginTop: 10, fontSize: 28 }}>{metric.value}</strong>
                </article>
              ))}
            </section>

            <section className="he-admin-detail-split">
              <section
                style={{
                  borderRadius: 24,
                  border: "1px solid rgba(188, 213, 255, 0.14)",
                  background: "rgba(11, 24, 44, 0.78)",
                  boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
                  padding: 20,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 30, fontFamily: "Georgia, serif" }}>Orders</h2>
                <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                  {orders.length === 0 ? (
                    <p style={{ color: "#9fb2c9", lineHeight: 1.6 }}>No live or recent orders were found for this hub yet.</p>
                  ) : (
                    orders.slice(0, 10).map((order) => (
                      <article
                        key={order.id}
                        style={{
                          borderRadius: 20,
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "rgba(255,255,255,0.04)",
                          padding: 16,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <strong style={{ fontSize: 18 }}>{order.orderNumber}</strong>
                          <StatusPill value={order.status} />
                        </div>
                        <div style={{ display: "grid", gap: 6, marginTop: 12, color: "#9fb2c9", fontSize: 14 }}>
                          <span>Customer: {order.customerName}</span>
                          <span>Total: £{order.totalAmount.toFixed(2)}</span>
                          <span>Courier: {order.courierName ?? "Not assigned"}</span>
                          <span>Placed: {new Date(order.placedAt).toLocaleString("en-GB")}</span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section style={{ display: "grid", gap: 18 }}>
                <section
                  style={{
                    borderRadius: 24,
                    border: "1px solid rgba(188, 213, 255, 0.14)",
                    background: "rgba(11, 24, 44, 0.78)",
                    boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
                    padding: 20,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 28, fontFamily: "Georgia, serif" }}>Hub users</h2>
                  <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                    {users.length === 0 ? (
                      <p style={{ color: "#9fb2c9", lineHeight: 1.6 }}>No active hub users were found.</p>
                    ) : (
                      users.map((user) => (
                        <article
                          key={user.id}
                          style={{
                            borderRadius: 18,
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.04)",
                            padding: 14,
                          }}
                        >
                          <strong>{user.fullName}</strong>
                          <div style={{ marginTop: 8, display: "grid", gap: 4, color: "#9fb2c9", fontSize: 14 }}>
                            <span>{user.email}</span>
                            <span>{user.username}</span>
                            <span>{user.role}</span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <section
                  style={{
                    borderRadius: 24,
                    border: "1px solid rgba(188, 213, 255, 0.14)",
                    background: "rgba(11, 24, 44, 0.78)",
                    boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
                    padding: 20,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 28, fontFamily: "Georgia, serif" }}>Assigned couriers</h2>
                  <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                    {couriers.length === 0 ? (
                      <p style={{ color: "#9fb2c9", lineHeight: 1.6 }}>No courier accounts are assigned to this hub yet.</p>
                    ) : (
                      couriers.map((courier) => (
                        <article
                          key={courier.courierProfileId}
                          style={{
                            borderRadius: 18,
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.04)",
                            padding: 14,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <strong>{courier.fullName}</strong>
                            <StatusPill value={courier.status} />
                          </div>
                          <div style={{ marginTop: 8, display: "grid", gap: 4, color: "#9fb2c9", fontSize: 14 }}>
                            <span>{courier.email}</span>
                            <span>{courier.vehicleType}</span>
                            <span>{courier.vehicleRegistration || "No registration recorded"}</span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <section
                  style={{
                    borderRadius: 24,
                    border: "1px solid rgba(188, 213, 255, 0.14)",
                    background: "rgba(11, 24, 44, 0.78)",
                    boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
                    padding: 20,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 28, fontFamily: "Georgia, serif" }}>Support inbox</h2>
                  <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                    {messages.length === 0 ? (
                      <p style={{ color: "#9fb2c9", lineHeight: 1.6 }}>No support messages are linked to this hub yet.</p>
                    ) : (
                      messages.map((message) => (
                        <article
                          key={message.id}
                          style={{
                            borderRadius: 18,
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.04)",
                            padding: 14,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <strong>{message.subject}</strong>
                            <StatusPill value={message.status} />
                          </div>
                          <p style={{ margin: "8px 0 0", color: "#9fb2c9", lineHeight: 1.6 }}>{message.message}</p>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              </section>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
