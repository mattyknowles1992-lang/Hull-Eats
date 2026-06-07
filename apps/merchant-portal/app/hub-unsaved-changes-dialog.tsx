"use client";

import type { CSSProperties } from "react";

type HubUnsavedChangesDialogProps = {
  open: boolean;
  busy?: boolean;
  title: string;
  copy: string;
  saveLabel: string;
  discardLabel: string;
  stayLabel: string;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
};

export function HubUnsavedChangesDialog({
  open,
  busy = false,
  title,
  copy,
  saveLabel,
  discardLabel,
  stayLabel,
  onSave,
  onDiscard,
  onStay,
}: HubUnsavedChangesDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div style={backdrop} role="presentation" onClick={busy ? undefined : onStay}>
      <section
        style={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hub-unsaved-changes-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="hub-unsaved-changes-title" style={titleStyle}>
          {title}
        </h2>
        <p style={copyStyle}>{copy}</p>
        <div style={actions}>
          <button type="button" style={primaryButton} onClick={onSave} disabled={busy}>
            {busy ? "Saving…" : saveLabel}
          </button>
          <button type="button" style={secondaryButton} onClick={onDiscard} disabled={busy}>
            {discardLabel}
          </button>
          <button type="button" style={ghostButton} onClick={onStay} disabled={busy}>
            {stayLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 17, 21, 0.55)",
  display: "grid",
  placeItems: "center",
  padding: 24,
  zIndex: 1200,
};

const dialog: CSSProperties = {
  width: "min(100%, 440px)",
  background: "#fff",
  borderRadius: 18,
  padding: "22px 22px 18px",
  boxShadow: "0 24px 60px rgba(15, 17, 21, 0.22)",
  display: "grid",
  gap: 14,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  lineHeight: 1.25,
  color: "#101216",
};

const copyStyle: CSSProperties = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.5,
  color: "rgba(15, 17, 21, 0.72)",
};

const actions: CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 4,
};

const primaryButton: CSSProperties = {
  border: "none",
  borderRadius: 999,
  padding: "12px 18px",
  background: "#101216",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton: CSSProperties = {
  border: "1px solid rgba(15, 17, 21, 0.14)",
  borderRadius: 999,
  padding: "12px 18px",
  background: "#fff",
  color: "#101216",
  fontWeight: 600,
  cursor: "pointer",
};

const ghostButton: CSSProperties = {
  border: "none",
  borderRadius: 999,
  padding: "10px 18px",
  background: "transparent",
  color: "rgba(15, 17, 21, 0.72)",
  fontWeight: 600,
  cursor: "pointer",
};
