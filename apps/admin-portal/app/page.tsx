import Link from "next/link";

export default function AdminPortalEntryPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at top left, rgba(255, 107, 0, 0.18), transparent 24%), linear-gradient(180deg, #020814 0%, #08182e 100%)",
        color: "#f7fbff",
        fontFamily: "Manrope, system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(100%, 640px)",
          borderRadius: 28,
          border: "1px solid rgba(188, 213, 255, 0.14)",
          background: "rgba(10, 24, 46, 0.9)",
          boxShadow: "0 28px 58px rgba(0, 0, 0, 0.34)",
          padding: 28,
        }}
      >
        <p style={{ margin: 0, color: "#ffb47d", fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Internal access
        </p>
        <h1 style={{ margin: "10px 0 0", fontSize: 42, lineHeight: 1, fontFamily: "Georgia, serif" }}>Hull Eats admin</h1>
        <p style={{ margin: "16px 0 0", color: "#9fb2c9", lineHeight: 1.7 }}>
          The working internal route for the admin console is kept off the obvious homepage path. Use the hidden admin
          route below to access the current hub creation and user provisioning shell.
        </p>

        <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/headminhe"
            style={{
              minHeight: 52,
              padding: "0 20px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 18,
              background: "linear-gradient(180deg, #ff8a33, #ff6b00)",
              color: "#fff",
              fontWeight: 900,
              textDecoration: "none",
              boxShadow: "0 18px 34px rgba(255, 107, 0, 0.28)",
            }}
          >
            Open /headminhe
          </Link>
        </div>
      </div>
    </main>
  );
}
