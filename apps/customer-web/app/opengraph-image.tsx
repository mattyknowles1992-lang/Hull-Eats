import { ImageResponse } from "next/og";

export const alt = "Hull Eats — food delivery and takeaway in Hull";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "linear-gradient(145deg, #060b14 0%, #152238 45%, #0a1018 100%)",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#c9a227",
            marginBottom: 20,
          }}
        >
          Kingston upon Hull
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.05,
            marginBottom: 24,
          }}
        >
          Hull Eats
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: "#e8eef8",
            lineHeight: 1.35,
            maxWidth: 900,
          }}
        >
          Food delivery, takeaway & local shops — order online across Hull
        </div>
      </div>
    ),
    { ...size },
  );
}
