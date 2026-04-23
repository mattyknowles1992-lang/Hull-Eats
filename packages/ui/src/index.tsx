import type { PropsWithChildren, ReactNode } from "react";

const colors = {
  page: "#f7f4ee",
  card: "#fffdf9",
  ink: "#1f1d1a",
  muted: "#6a645d",
  border: "#ddd3c5",
  accent: "#c85b31",
  success: "#1f7a4d",
  warning: "#9b6a00",
};

export const AppShell = ({
  title,
  eyebrow,
  actions,
  children,
}: PropsWithChildren<{ title: string; eyebrow?: string; actions?: ReactNode }>) => (
  <main
    style={{
      minHeight: "100vh",
      background: `radial-gradient(circle at top left, #f2dcc8 0, ${colors.page} 42%)`,
      color: colors.ink,
      padding: "32px 20px",
      fontFamily: "Georgia, 'Times New Roman', serif",
    }}
  >
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-end",
          marginBottom: 28,
        }}
      >
        <div>
          {eyebrow ? (
            <p style={{ color: colors.accent, margin: 0, fontSize: 14, letterSpacing: 1.2, textTransform: "uppercase" }}>
              {eyebrow}
            </p>
          ) : null}
          <h1 style={{ fontSize: 42, margin: "6px 0 0" }}>{title}</h1>
        </div>
        {actions}
      </header>
      {children}
    </div>
  </main>
);

export const SectionCard = ({ title, children }: PropsWithChildren<{ title: string }>) => (
  <section
    style={{
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 20,
      padding: 24,
      boxShadow: "0 8px 32px rgba(58, 42, 21, 0.08)",
      marginBottom: 18,
    }}
  >
    <h2 style={{ marginTop: 0, marginBottom: 14, fontSize: 24 }}>{title}</h2>
    {children}
  </section>
);

export const KeyValueRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      padding: "10px 0",
      borderBottom: `1px solid ${colors.border}`,
    }}
  >
    <span style={{ color: colors.muted }}>{label}</span>
    <strong>{value}</strong>
  </div>
);

export const StatusBadge = ({ status }: { status: string }) => {
  const background =
    status === "delivered" || status === "accepted"
      ? "#daf2df"
      : status === "pending" || status === "assigned"
        ? "#faefca"
        : "#efe6da";

  const foreground =
    status === "delivered" || status === "accepted"
      ? colors.success
      : status === "pending" || status === "assigned"
        ? colors.warning
        : colors.ink;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "6px 12px",
        fontSize: 13,
        fontWeight: 700,
        textTransform: "capitalize",
        background,
        color: foreground,
      }}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
};
