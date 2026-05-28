"use client";

import type { ChangeEvent, CSSProperties } from "react";
import { useRef, useState } from "react";

const MAX_FILE_BYTES = 2_500_000;
const MAX_EDGE_PX = 800;
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
    throw new Error("Could not prepare image.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (dataUrl.length > MAX_FILE_BYTES * 1.4) {
    throw new Error("Image too large — use a smaller file.");
  }
  return dataUrl;
}

type Props = {
  value?: string;
  disabled?: boolean;
  onChange: (next: string | undefined) => void;
};

export function HubMenuRowPhotoCell({ value, disabled, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file?.type.startsWith("image/")) {
      return;
    }

    setBusy(true);
    try {
      onChange(await fileToOptimisedDataUrl(file));
    } catch {
      // Row editor stays quiet; merchant can retry upload.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hub-menu-row-photo">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hub-menu-row-photo__file"
        disabled={disabled || busy}
        onChange={(event) => void handleFile(event)}
      />
      <button
        type="button"
        className="hub-menu-row-photo__btn"
        disabled={disabled || busy}
        title={value ? "Replace photo" : "Add photo"}
        onClick={() => fileRef.current?.click()}
      >
        {value ? (
          <img src={value} alt="" style={thumb} />
        ) : (
          <span style={placeholder}>{busy ? "…" : "Photo"}</span>
        )}
      </button>
      {value ? (
        <button type="button" className="hub-menu-row-photo__clear" disabled={disabled} onClick={() => onChange(undefined)}>
          ×
        </button>
      ) : null}
    </div>
  );
}

const thumb: CSSProperties = { width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 };
const placeholder: CSSProperties = { fontSize: "0.72rem", fontWeight: 800, color: "#5b6470" };
