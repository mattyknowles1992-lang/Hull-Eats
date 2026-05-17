import Link from "next/link";

import { initialHubs } from "../../data";

const fallbackHub = initialHubs[0]!;

function StatusPill({ value }: { value: string }) {
  const colors =
    value === "live"
      ? { bg: "rgba(111, 240, 191, 0.12)", fg: "#6ff0bf" }
      : value === "setup" || value === "pending" || value === "assigned" || value === "preparing"
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

export default async function HubDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  const hub = initialHubs.find((entry) => entry.slug === resolved.slug) ?? fallbackHub;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(7, 155, 200, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(35, 205, 255, 0.12), transparent 26%), linear-gradient(180deg, #020814 0%, #041120 40%, #091a31 100%)",
        color: "#f7fbff",
      }}
      className="he-admin-page"
    >
      <div className="he-admin-shell">
        <header className="he-admin-header">
          <div>
            <p className="he-admin-eyebrow">
              Hub breakdown
            </p>
            <h1 style={{ margin: "8px 0 0", fontSize: 46, lineHeight: 0.95, fontFamily: "Georgia, serif" }}>{hub.businessName}</h1>
            <p style={{ margin: "14px 0 0", color: "#9fb2c9", lineHeight: 1.7, maxWidth: 760 }}>
              Internal admin view for order volume, sales shape, active orders, and operational notes for this hub.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/"
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
            <StatusPill value={hub.status} />
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
          {[
            { label: "Orders today", value: String(hub.orderVolumeToday) },
            { label: "Orders this week", value: String(hub.orderVolumeWeek) },
            { label: "Gross sales", value: hub.grossSalesWeek },
            { label: "Average order", value: hub.averageOrderValue },
            { label: "Lead time", value: hub.deliveryLeadTime },
          ].map((metric) => (
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

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(300px, 0.9fr)", gap: 18 }}>
          <section
            style={{
              borderRadius: 24,
              border: "1px solid rgba(188, 213, 255, 0.14)",
              background: "rgba(11, 24, 44, 0.78)",
              boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
              padding: 20,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 30, fontFamily: "Georgia, serif" }}>Active orders</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {hub.activeOrders.map((order) => (
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
                    <strong style={{ fontSize: 18 }}>{order.id}</strong>
                    <StatusPill value={order.status} />
                  </div>
                  <div style={{ display: "grid", gap: 6, marginTop: 12, color: "#9fb2c9", fontSize: 14 }}>
                    <span>Customer: {order.customerName}</span>
                    <span>Total: {order.total}</span>
                    <span>Placed: {order.placedAgo}</span>
                  </div>
                </article>
              ))}
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
              <h2 style={{ margin: 0, fontSize: 28, fontFamily: "Georgia, serif" }}>Hub identity</h2>
              <div style={{ display: "grid", gap: 10, marginTop: 16, color: "#dce9ff", fontSize: 14 }}>
                <div>Owner: {hub.ownerName}</div>
                <div>Type: {hub.type}</div>
                <div>Slug: {hub.slug}</div>
                <div>Hub username: {hub.hubUsername}</div>
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
              <h2 style={{ margin: 0, fontSize: 28, fontFamily: "Georgia, serif" }}>Operational notes</h2>
              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {hub.notes.map((note) => (
                  <article
                    key={note}
                    style={{
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      padding: 14,
                      color: "#9fb2c9",
                      lineHeight: 1.6,
                    }}
                  >
                    {note}
                  </article>
                ))}
              </div>
            </section>
          </section>
        </section>
      </div>
    </main>
  );
}
