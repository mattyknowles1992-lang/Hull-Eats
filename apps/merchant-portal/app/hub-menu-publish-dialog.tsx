"use client";

import type { CSSProperties } from "react";

import type { HubMenuBoardRecord, MenuPublishIssue, MenuPublishSummary } from "./menu-studio-core";

type HubMenuPublishDialogProps = {
  open: boolean;
  summary: MenuPublishSummary;
  publishing: boolean;
  publishingBoard?: HubMenuBoardRecord | null;
  publishWithKnownIssues: boolean;
  onPublishWithKnownIssuesChange: (checked: boolean) => void;
  onNavigateToIssue: (issue: MenuPublishIssue) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function HubMenuPublishDialog({
  open,
  summary,
  publishing,
  publishingBoard,
  publishWithKnownIssues,
  onPublishWithKnownIssuesChange,
  onNavigateToIssue,
  onCancel,
  onConfirm,
}: HubMenuPublishDialogProps) {
  if (!open) {
    return null;
  }

  const hasBlockingIssues = summary.issues.length > 0;
  const canPublish = !hasBlockingIssues || publishWithKnownIssues;

  return (
    <div style={backdrop} role="presentation" onClick={onCancel}>
      <section
        style={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-publish-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p style={eyebrow}>Publish menu</p>
        <h2 id="menu-publish-dialog-title" style={title}>
          Update your live Hull Eats menu?
        </h2>
        <p style={copy}>
          {publishingBoard
            ? publishingBoard.publishMode === "replace"
              ? `Publishing "${publishingBoard.name}" will replace your current live customer menu.`
              : `Publishing "${publishingBoard.name}" will add its categories alongside your existing live menu.`
            : "Customers only see changes after you publish. Your draft stays in this hub until then."}
        </p>

        <div style={statsGrid}>
          <div style={statCard}>
            <strong>{summary.liveCount}</strong>
            <span>Live &amp; orderable</span>
          </div>
          <div style={statCard}>
            <strong>{summary.soldOutCount}</strong>
            <span>Sold out (visible)</span>
          </div>
          <div style={statCard}>
            <strong>{summary.hiddenCount}</strong>
            <span>Hidden</span>
          </div>
        </div>

        {summary.newItemCount > 0 || summary.removedItemCount > 0 ? (
          <ul style={changeList}>
            {summary.newItemCount > 0 ? <li>{summary.newItemCount} new item{summary.newItemCount === 1 ? "" : "s"} in this publish</li> : null}
            {summary.removedItemCount > 0 ? (
              <li>{summary.removedItemCount} item{summary.removedItemCount === 1 ? "" : "s"} removed from the live menu</li>
            ) : null}
          </ul>
        ) : null}

        {hasBlockingIssues ? (
          <div className="he-hub-banner he-hub-banner--error" role="alert">
            <strong>Fix these before publishing</strong>
            <p style={issueHint}>Click an issue to jump to it in the menu builder. Fields stay highlighted in red until fixed.</p>
            <ul className="hub-menu-publish-issue-list">
              {summary.issues.map((issue) => (
                <li key={issue.id}>
                  <button type="button" className="hub-menu-publish-issue-link" onClick={() => onNavigateToIssue(issue)}>
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
            <label style={overrideRow}>
              <input
                type="checkbox"
                checked={publishWithKnownIssues}
                onChange={(event) => onPublishWithKnownIssuesChange(event.target.checked)}
              />
              <span>Publish with known issues</span>
            </label>
          </div>
        ) : (
          <div className="he-hub-banner" role="status">
            Your menu passes the publish checklist.
          </div>
        )}

        <div style={actions}>
          <button type="button" style={secondaryButton} onClick={onCancel} disabled={publishing}>
            Keep editing
          </button>
          <button type="button" className="he-portal-primary" style={primaryButton} onClick={onConfirm} disabled={publishing || !canPublish}>
            {publishing ? "Publishing…" : publishingBoard ? `Publish ${publishingBoard.name}` : "Publish to live menu"}
          </button>
        </div>
      </section>
    </div>
  );
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  background: "rgba(8, 12, 18, 0.55)",
  display: "grid",
  placeItems: "center",
  padding: 20,
};

const dialog: CSSProperties = {
  width: "min(520px, 100%)",
  maxHeight: "min(90vh, 720px)",
  overflow: "auto",
  padding: 22,
  borderRadius: 18,
  background: "#fff",
  border: "1px solid rgba(15, 17, 21, 0.12)",
  boxShadow: "0 24px 60px rgba(8, 12, 18, 0.2)",
  display: "grid",
  gap: 14,
};

const eyebrow: CSSProperties = {
  margin: 0,
  color: "#0680a6",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const title: CSSProperties = { margin: "4px 0 0", fontSize: "1.35rem", fontFamily: "Georgia, serif" };
const copy: CSSProperties = { margin: 0, color: "#5b6470", lineHeight: 1.6 };
const statsGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 };
const statCard: CSSProperties = {
  display: "grid",
  gap: 4,
  padding: 12,
  borderRadius: 12,
  background: "rgba(7, 155, 200, 0.08)",
  border: "1px solid rgba(7, 155, 200, 0.2)",
  textAlign: "center",
};
const changeList: CSSProperties = { margin: 0, paddingLeft: 20, color: "#3d4652", lineHeight: 1.6 };
const issueHint: CSSProperties = { margin: "8px 0 0", fontSize: "0.84rem", lineHeight: 1.45 };
const overrideRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  marginTop: 12,
  fontSize: "0.88rem",
  fontWeight: 700,
  cursor: "pointer",
};
const actions: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 4 };
const secondaryButton: CSSProperties = {
  border: "1px solid rgba(15, 17, 21, 0.16)",
  borderRadius: 12,
  background: "#fff",
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};
const primaryButton: CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 800,
  cursor: "pointer",
  color: "#fff",
};
