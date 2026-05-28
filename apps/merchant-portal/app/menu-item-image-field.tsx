"use client";

import type { ChangeEvent, CSSProperties } from "react";
import { useId, useRef, useState } from "react";

const MAX_FILE_BYTES = 2_500_000;
const MAX_EDGE_PX = 1200;
const JPEG_QUALITY = 0.82;

async function fileToOptimisedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare image preview.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (dataUrl.length > MAX_FILE_BYTES * 1.4) {
    throw new Error("Image is still too large after resizing. Use a smaller photo or paste an image link.");
  }
  return dataUrl;
}

type MenuItemImageFieldProps = {
  value?: string;
  onChange: (next: string | undefined) => void;
  disabled?: boolean;
};

export function MenuItemImageField({ value, onChange, disabled }: MenuItemImageFieldProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_BYTES * 2) {
      setError("Image is too large. Use a photo under 5MB.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const dataUrl = await fileToOptimisedDataUrl(file);
      onChange(dataUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not use that image.");
    } finally {
      setBusy(false);
    }
  };

  const handleUrlChange = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange(undefined);
      return;
    }
    if (trimmed.startsWith("data:image/")) {
      onChange(trimmed);
      return;
    }
    onChange(trimmed);
  };

  return (
    <div style={wrap}>
      <span style={label}>Product photo</span>
      <p style={hint}>
        Each product needs its own photo (e.g. every pizza and every drink flavour). Category images are only for the menu
        banner — not shared across items.
      </p>

      <div style={previewRow}>
        {value ? (
          <img src={value} alt="" style={previewImg} />
        ) : (
          <div style={previewPlaceholder}>No photo yet</div>
        )}
        <div style={actions}>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            disabled={disabled || busy}
            onChange={(event) => void handleFile(event)}
          />
          <button
            type="button"
            style={uploadButton}
            disabled={disabled || busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "Processing…" : value ? "Replace photo" : "Upload photo"}
          </button>
          {value ? (
            <button type="button" style={clearButton} disabled={disabled || busy} onClick={() => onChange(undefined)}>
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <label style={urlField}>
        <span style={urlLabel}>Or paste image link</span>
        <input
          style={urlInput}
          value={value?.startsWith("data:") ? "" : (value ?? "")}
          disabled={disabled}
          placeholder="https://…"
          onChange={(event) => handleUrlChange(event.target.value)}
        />
      </label>

      {error ? <p style={errorText}>{error}</p> : null}
    </div>
  );
}

const wrap: CSSProperties = { display: "grid", gap: 8, gridColumn: "1 / -1" };
const label: CSSProperties = { fontWeight: 800, color: "#101216", fontSize: "0.88rem" };
const hint: CSSProperties = { margin: 0, fontSize: "0.82rem", color: "#5b6470", lineHeight: 1.45 };
const previewRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" };
const previewImg: CSSProperties = {
  width: 120,
  height: 120,
  objectFit: "cover",
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.12)",
};
const previewPlaceholder: CSSProperties = {
  width: 120,
  height: 120,
  borderRadius: 14,
  border: "1px dashed rgba(15, 17, 21, 0.2)",
  display: "grid",
  placeItems: "center",
  color: "#5b6470",
  fontSize: "0.78rem",
  fontWeight: 700,
  textAlign: "center",
  padding: 8,
};
const actions: CSSProperties = { display: "grid", gap: 8 };
const uploadButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid rgba(7, 155, 200, 0.35)",
  background: "rgba(7, 155, 200, 0.1)",
  color: "#064f68",
  fontWeight: 800,
  cursor: "pointer",
};
const clearButton: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "none",
  background: "transparent",
  color: "#8a2121",
  fontWeight: 800,
  cursor: "pointer",
};
const urlField: CSSProperties = { display: "grid", gap: 6 };
const urlLabel: CSSProperties = { fontSize: "0.82rem", color: "#5b6470", fontWeight: 700 };
const urlInput: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.15)",
  font: "inherit",
};
const errorText: CSSProperties = { margin: 0, color: "#8a2121", fontSize: "0.82rem", fontWeight: 700 };
