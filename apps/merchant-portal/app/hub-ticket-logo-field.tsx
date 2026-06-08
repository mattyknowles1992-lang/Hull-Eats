"use client";

import type { ChangeEvent } from "react";
import { useId, useRef, useState } from "react";

const MAX_FILE_BYTES = 1_500_000;
const MAX_EDGE_PX = 800;
const JPEG_QUALITY = 0.86;

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
    throw new Error("Could not prepare ticket logo.");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (dataUrl.length > 200_000 * 1.4) {
    throw new Error("Logo is still too large after resizing. Use a smaller image.");
  }

  return dataUrl;
}

type Props = {
  value?: string;
  placeholderLogoSrc: string;
  disabled?: boolean;
  onChange: (nextUrl: string) => void;
};

export function HubTicketLogoField({ value, placeholderLogoSrc, disabled, onChange }: Props) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const displaySrc = value?.trim() || placeholderLogoSrc;
  const usingPlaceholder = !value?.trim();

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

    if (file.size > MAX_FILE_BYTES) {
      setError("Image is too large. Use a logo under 1.5MB.");
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

  return (
    <div className="hub-ticket-logo-field">
      <span className="hub-ticket-logo-field__label">Ticket logo</span>
      <p className="hub-ticket-logo-field__hint">
        Shown at the top of your order ticket. Upload your business logo, or leave blank to use the Hull Eats placeholder
        until you add one.
      </p>

      <div className="hub-ticket-logo-field__row">
        <div className="hub-ticket-logo-field__preview" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displaySrc} alt="" className="hub-ticket-logo-field__img" />
          {usingPlaceholder ? <span className="hub-ticket-logo-field__placeholder-tag">Hull Eats placeholder</span> : null}
        </div>

        <div className="hub-ticket-logo-field__actions">
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hub-ticket-logo-field__file"
            disabled={disabled || busy}
            onChange={(event) => void handleFile(event)}
          />
          <button
            type="button"
            className="hub-ticket-logo-field__upload"
            disabled={disabled || busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "Processing…" : value?.trim() ? "Replace logo" : "Upload logo"}
          </button>
          {value?.trim() ? (
            <button
              type="button"
              className="hub-ticket-logo-field__clear"
              disabled={disabled || busy}
              onClick={() => onChange("")}
            >
              Remove — use Hull Eats placeholder
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="hub-ticket-logo-field__error">{error}</p> : null}
    </div>
  );
}
