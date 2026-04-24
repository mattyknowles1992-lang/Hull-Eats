"use client";

import { useState } from "react";

const demoHubUsers = [
  {
    businessName: "Loaded Munch",
    username: "loaded-munch-admin",
    password: "temp-hub-pass",
    status: "live",
    capabilities: ["Manage full menu categories", "Edit prices and availability", "Update delivery lead times", "Upload and replace item images"],
  },
];

export default function MerchantPortalPage() {
  const [username, setUsername] = useState("loaded-munch-admin");
  const [password, setPassword] = useState("temp-hub-pass");
  const [activeHub, setActiveHub] = useState<(typeof demoHubUsers)[number] | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = () => {
    const hub = demoHubUsers.find((entry) => entry.username === username && entry.password === password);

    if (!hub) {
      setErrorMessage("The hub username or temporary password did not match this demo portal shell.");
      return;
    }

    setActiveHub(hub);
    setErrorMessage("");
  };

  if (!activeHub) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left, rgba(255, 107, 0, 0.12), transparent 24%), linear-gradient(180deg, #020814 0%, #08182e 100%)",
          color: "#f7fbff",
          fontFamily: "Manrope, system-ui, sans-serif",
          padding: "32px 18px 60px",
        }}
      >
        <div style={{ width: "min(100%, 620px)", margin: "8vh auto 0" }}>
          <section
            style={{
              borderRadius: 28,
              border: "1px solid rgba(188, 213, 255, 0.14)",
              background: "linear-gradient(180deg, rgba(10, 22, 42, 0.9), rgba(5, 15, 29, 0.88))",
              boxShadow: "0 22px 60px rgba(0, 0, 0, 0.28)",
              padding: 28,
            }}
          >
            <p style={{ margin: 0, color: "#ffb47d", fontSize: 13, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Merchant hub portal
            </p>
            <h1 style={{ margin: "10px 0 0", fontSize: 46, lineHeight: 0.95, fontFamily: "Georgia, serif" }}>
              Business sign-in
            </h1>
            <p style={{ margin: "16px 0 0", color: "#9fb2c9", lineHeight: 1.7 }}>
              This is the in-house business system. Hub users sign in here to manage items, prices, delivery timings,
              stock, and images that feed the customer marketplace.
            </p>

            <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Hub username</span>
                <input
                  style={{
                    width: "100%",
                    minHeight: 50,
                    borderRadius: 16,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#f7fbff",
                    padding: "0 14px",
                    outline: "none",
                  }}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Temporary password</span>
                <input
                  style={{
                    width: "100%",
                    minHeight: 50,
                    borderRadius: 16,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#f7fbff",
                    padding: "0 14px",
                    outline: "none",
                  }}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              style={{
                marginTop: 20,
                minHeight: 50,
                padding: "0 18px",
                borderRadius: 16,
                border: "1px solid rgba(255, 176, 113, 0.2)",
                color: "#fff",
                fontWeight: 900,
                background: "linear-gradient(180deg, #ff8a33, #ff6b00)",
                boxShadow: "0 18px 34px rgba(255, 107, 0, 0.28)",
                cursor: "pointer",
              }}
            >
              Sign in to hub
            </button>

            {errorMessage ? (
              <p
                style={{
                  marginTop: 16,
                  padding: "14px 16px",
                  borderRadius: 16,
                  color: "#ffd7d7",
                  background: "rgba(255, 95, 95, 0.12)",
                  border: "1px solid rgba(255, 95, 95, 0.2)",
                }}
              >
                {errorMessage}
              </p>
            ) : null}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(255, 107, 0, 0.12), transparent 24%), linear-gradient(180deg, #020814 0%, #08182e 100%)",
        color: "#f7fbff",
        fontFamily: "Manrope, system-ui, sans-serif",
        padding: "24px 18px 60px",
      }}
    >
      <div style={{ width: "min(100%, 1120px)", margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <p style={{ margin: 0, color: "#ffb47d", fontSize: 13, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Merchant hub
            </p>
            <h1 style={{ margin: "8px 0 0", fontSize: 44, lineHeight: 0.95, fontFamily: "Georgia, serif" }}>
              {activeHub.businessName}
            </h1>
            <p style={{ margin: "14px 0 0", color: "#9fb2c9", lineHeight: 1.7, maxWidth: 760 }}>
              This portal is the only place the business should add items, edit catalog, change prices, adjust delivery
              timings, and update images that appear in the customer marketplace.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveHub(null)}
            style={{
              minHeight: 48,
              padding: "0 16px",
              borderRadius: 16,
              border: "1px solid rgba(255, 255, 255, 0.18)",
              color: "#f7fbff",
              fontWeight: 800,
              background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(300px, 0.8fr)", gap: 18 }}>
          <section
            style={{
              borderRadius: 24,
              border: "1px solid rgba(188, 213, 255, 0.14)",
              background: "rgba(11, 24, 44, 0.78)",
              boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
              padding: 20,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 28, fontFamily: "Georgia, serif" }}>What this hub manages</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {activeHub.capabilities.map((capability) => (
                <article
                  key={capability}
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    padding: 16,
                  }}
                >
                  <strong>{capability}</strong>
                  <p style={{ margin: "8px 0 0", color: "#9fb2c9", lineHeight: 1.6 }}>
                    Changes made here become the source of truth for what customers can order in the marketplace.
                  </p>
                </article>
              ))}
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
            <h2 style={{ margin: 0, fontSize: 28, fontFamily: "Georgia, serif" }}>Next build slices</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 16, color: "#dce9ff" }}>
              <div>Menu categories and item creation</div>
              <div>Price and stock editing</div>
              <div>Delivery lead time controls</div>
              <div>Image upload and replacement</div>
              <div>Order inbox and print actions</div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
