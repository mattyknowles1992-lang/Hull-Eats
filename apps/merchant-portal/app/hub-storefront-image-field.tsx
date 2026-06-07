"use client";

import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useId, useRef, useState } from "react";

import type { StorefrontHeroCrop } from "@hull-eats/types";
import {
  STOREFRONT_HERO_CARD_ASPECT,
  defaultStorefrontHeroCrop,
  storefrontHeroMediaStyle,
} from "@hull-eats/types";

const MAX_FILE_BYTES = 2_500_000;
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.84;

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
    throw new Error("Could not prepare storefront image.");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (dataUrl.length > MAX_FILE_BYTES * 1.4) {
    throw new Error("Image is still too large after resizing. Use a smaller photo.");
  }

  return dataUrl;
}

type HubStorefrontImageFieldProps = {
  value?: string;
  crop?: StorefrontHeroCrop;
  onChange: (next: { url: string; crop: StorefrontHeroCrop }) => void;
  disabled?: boolean;
};

type EditorSession = {
  imageUrl: string;
  crop: StorefrontHeroCrop;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function CropEditor({
  session,
  onSessionChange,
  onConfirm,
  onCancel,
}: {
  session: EditorSession;
  onSessionChange: (next: EditorSession) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startFocusX: number; startFocusY: number } | null>(
    null,
  );
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  const updateCrop = (patch: Partial<StorefrontHeroCrop>) => {
    onSessionChange({
      ...session,
      crop: { ...session.crop, ...patch },
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startFocusX: session.crop.focusX,
      startFocusY: session.crop.focusY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !frame || !imageSize) {
      return;
    }
    const rect = frame.getBoundingClientRect();
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const focusDeltaX = (deltaX / Math.max(rect.width, 1)) * 100;
    const focusDeltaY = (deltaY / Math.max(rect.height, 1)) * 100;
    updateCrop({
      focusX: clamp(drag.startFocusX - focusDeltaX, 0, 100),
      focusY: clamp(drag.startFocusY - focusDeltaY, 0, 100),
    });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const previewStyle = storefrontHeroMediaStyle(session.imageUrl, session.crop);

  return (
    <div className="hub-storefront-image-editor" style={editorShell}>
      <p style={editorTitle}>Position your storefront image</p>
      <p style={editorHint}>
        Drag to reposition. Use zoom to show more of the image or focus on a detail. The preview below matches your Hull Eats
        store card.
      </p>

      <div
        ref={frameRef}
        className="hub-storefront-image-editor__frame"
        style={editorFrame}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          src={session.imageUrl}
          alt=""
          draggable={false}
          style={editorImage(session.crop, imageSize)}
          onLoad={(event) => {
            const img = event.currentTarget;
            setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
          }}
        />
        <div style={editorFrameHint}>Drag image</div>
      </div>

      <label style={zoomField}>
        <span style={zoomLabel}>Zoom — lower shows more of the image</span>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.05}
          value={session.crop.zoom}
          onChange={(event) => updateCrop({ zoom: Number(event.target.value) })}
        />
        <span style={zoomValue}>{session.crop.zoom.toFixed(2)}×</span>
      </label>

      <div style={previewBlock}>
        <span style={previewLabel}>Store card preview</span>
        <div className="hub-storefront-image-editor__card-preview" style={{ ...cardPreview, ...previewStyle }}>
          <span style={cardPreviewChip}>Open now</span>
        </div>
      </div>

      <div style={editorActions}>
        <button type="button" style={confirmButton} onClick={onConfirm}>
          Use this image
        </button>
        <button type="button" style={cancelButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function editorImage(
  crop: StorefrontHeroCrop,
  imageSize: { width: number; height: number } | null,
): CSSProperties {
  if (!imageSize) {
    return {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: `${crop.focusX}% ${crop.focusY}%`,
      userSelect: "none",
      pointerEvents: "none",
    };
  }

  if (crop.zoom < 1) {
    return {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "contain",
      objectPosition: `${crop.focusX}% ${crop.focusY}%`,
      userSelect: "none",
      pointerEvents: "none",
    };
  }

  const widthPct = crop.zoom === 1 ? undefined : crop.zoom * 100;
  return {
    position: "absolute",
    left: `${crop.focusX}%`,
    top: `${crop.focusY}%`,
    transform: "translate(-50%, -50%)",
    width: widthPct ? `${widthPct}%` : "auto",
    height: crop.zoom === 1 ? "100%" : "auto",
    minWidth: crop.zoom === 1 ? "100%" : undefined,
    minHeight: crop.zoom === 1 ? "100%" : undefined,
    maxWidth: "none",
    userSelect: "none",
    pointerEvents: "none",
  };
}

export function HubStorefrontImageField({ value, crop, onChange, disabled }: HubStorefrontImageFieldProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editorSession, setEditorSession] = useState<EditorSession | null>(null);

  const openEditor = useCallback((imageUrl: string, initialCrop?: StorefrontHeroCrop) => {
    setEditorSession({
      imageUrl,
      crop: initialCrop ?? defaultStorefrontHeroCrop(),
    });
  }, []);

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
      openEditor(dataUrl, defaultStorefrontHeroCrop());
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not use that image.");
    } finally {
      setBusy(false);
    }
  };

  const confirmEditor = () => {
    if (!editorSession) {
      return;
    }
    onChange({ url: editorSession.imageUrl, crop: editorSession.crop });
    setEditorSession(null);
  };

  if (editorSession) {
    return (
      <CropEditor
        session={editorSession}
        onSessionChange={setEditorSession}
        onConfirm={confirmEditor}
        onCancel={() => setEditorSession(null)}
      />
    );
  }

  const previewStyle = value ? storefrontHeroMediaStyle(value, crop) : undefined;

  return (
    <div style={wrap}>
      <span style={label}>Storefront image</span>
      <p style={hint}>
        This image shows on the customer homepage card and the store page header. Upload, position it like a cover photo, then
        save hub changes.
      </p>

      <div style={previewRow}>
        {value && previewStyle ? (
          <div className="hub-storefront-image-field__card-preview" style={{ ...cardPreview, ...previewStyle }}>
            <span style={cardPreviewChip}>Preview</span>
          </div>
        ) : (
          <div style={previewPlaceholder}>No storefront image yet</div>
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
            {busy ? "Processing..." : value ? "Replace image" : "Upload image"}
          </button>
          {value ? (
            <>
              <button
                type="button"
                style={uploadButton}
                disabled={disabled || busy}
                onClick={() => openEditor(value, crop ?? defaultStorefrontHeroCrop())}
              >
                Adjust position
              </button>
              <button
                type="button"
                style={clearButton}
                disabled={disabled || busy}
                onClick={() => onChange({ url: "", crop: defaultStorefrontHeroCrop() })}
              >
                Remove
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <p style={errorText}>{error}</p> : null}
    </div>
  );
}

const wrap: CSSProperties = { display: "grid", gap: 8, gridColumn: "1 / -1" };
const label: CSSProperties = { fontWeight: 800, color: "#101216", fontSize: "0.88rem" };
const hint: CSSProperties = { margin: 0, fontSize: "0.82rem", color: "#5b6470", lineHeight: 1.45 };
const previewRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" };
const previewPlaceholder: CSSProperties = {
  width: "100%",
  maxWidth: 320,
  aspectRatio: `${STOREFRONT_HERO_CARD_ASPECT}`,
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
const cardPreview: CSSProperties = {
  width: "100%",
  maxWidth: 320,
  aspectRatio: `${STOREFRONT_HERO_CARD_ASPECT}`,
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  position: "relative",
  overflow: "hidden",
};
const cardPreviewChip: CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.85)",
  fontSize: "0.72rem",
  fontWeight: 800,
};
const actions: CSSProperties = { display: "grid", gap: 8, minWidth: 160 };
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
const errorText: CSSProperties = { margin: 0, color: "#8a2121", fontSize: "0.82rem", fontWeight: 700 };
const editorShell: CSSProperties = { display: "grid", gap: 12, gridColumn: "1 / -1" };
const editorTitle: CSSProperties = { margin: 0, fontWeight: 900, color: "#101216" };
const editorHint: CSSProperties = { margin: 0, fontSize: "0.82rem", color: "#5b6470", lineHeight: 1.45 };
const editorFrame: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 420,
  aspectRatio: `${STOREFRONT_HERO_CARD_ASPECT}`,
  borderRadius: 14,
  overflow: "hidden",
  border: "2px solid rgba(7, 155, 200, 0.45)",
  background: "#111",
  cursor: "grab",
  touchAction: "none",
};
const editorFrameHint: CSSProperties = {
  position: "absolute",
  left: 10,
  bottom: 10,
  padding: "4px 8px",
  borderRadius: 8,
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  fontSize: "0.72rem",
  fontWeight: 700,
  pointerEvents: "none",
};
const zoomField: CSSProperties = { display: "grid", gap: 6, maxWidth: 420 };
const zoomLabel: CSSProperties = { fontSize: "0.82rem", color: "#5b6470", fontWeight: 700 };
const zoomValue: CSSProperties = { fontSize: "0.78rem", color: "#5b6470" };
const previewBlock: CSSProperties = { display: "grid", gap: 8, maxWidth: 420 };
const previewLabel: CSSProperties = { fontSize: "0.82rem", color: "#5b6470", fontWeight: 700 };
const editorActions: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10 };
const confirmButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "none",
  background: "#101216",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};
const cancelButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.15)",
  background: "#fff",
  color: "#101216",
  fontWeight: 800,
  cursor: "pointer",
};
