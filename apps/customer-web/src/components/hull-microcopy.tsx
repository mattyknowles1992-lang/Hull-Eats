"use client";

import { useEffect, useState } from "react";

import { buildHullMicrocopy, wmoToBucket, type WeatherBucket } from "../lib/hull-microcopy";

const HULL_LAT = 53.7676;
const HULL_LON = -0.3274;

export function HullMicrocopy() {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();

    const fallback = () => {
      if (!cancelled) {
        setLine(buildHullMicrocopy(now, "unknown", null));
      }
    };

    const run = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${HULL_LAT}&longitude=${HULL_LON}&current_weather=true`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          fallback();
          return;
        }
        const data = (await res.json()) as {
          current_weather?: { weathercode?: number; temperature?: number };
        };
        const cw = data.current_weather;
        const code = typeof cw?.weathercode === "number" ? cw.weathercode : 0;
        const bucket: WeatherBucket = wmoToBucket(code);
        const temp = typeof cw?.temperature === "number" ? cw.temperature : null;
        if (!cancelled) {
          setLine(buildHullMicrocopy(new Date(), bucket, temp));
        }
      } catch {
        fallback();
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!line) {
    return null;
  }

  return (
    <p className="hull-microcopy" role="status">
      {line}
    </p>
  );
}
