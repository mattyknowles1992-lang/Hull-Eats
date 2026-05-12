"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useCallback, useEffect, useRef, useState } from "react";

import "leaflet/dist/leaflet.css";

/** Hull service area — maps cannot zoom/pan outside this box (Google strictBounds). */
export const HULL_MAP_BOUNDS = {
  north: 53.83,
  south: 53.7,
  east: -0.18,
  west: -0.48,
} as const;

/**
 * Leaflet fallback tile “skins”. OSM-derived tiles must keep a visible © line (licence);
 * we prefix with Hull Eats. Preview: set NEXT_PUBLIC_TRACKING_LEAFLET_SKIN and reload tracking page.
 * Values: `osm` | `carto-light` | `carto-dark`
 */
type LeafletSkinId = "osm" | "carto-light" | "carto-dark";

const LEAFLET_TILES: Record<
  LeafletSkinId,
  {
    url: string;
    attribution: string;
    maxZoom: number;
  }
> = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      'Hull Eats · © <a href="https://www.openstreetmap.org/copyright" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  "carto-light": {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      'Hull Eats · © <a href="https://www.openstreetmap.org/copyright" rel="noreferrer">OpenStreetMap</a> © <a href="https://carto.com/attributions" rel="noreferrer">CARTO</a>',
    maxZoom: 20,
  },
  "carto-dark": {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      'Hull Eats · © <a href="https://www.openstreetmap.org/copyright" rel="noreferrer">OpenStreetMap</a> © <a href="https://carto.com/attributions" rel="noreferrer">CARTO</a>',
    maxZoom: 20,
  },
};

const resolveLeafletSkin = (): LeafletSkinId => {
  const raw = process.env.NEXT_PUBLIC_TRACKING_LEAFLET_SKIN?.trim().toLowerCase();
  if (raw === "carto-light" || raw === "carto-dark" || raw === "osm") {
    return raw;
  }
  return "osm";
};

type TrackingLiveMapProps = {
  latitude: number;
  longitude: number;
  hasLiveLocation: boolean;
  statusFallbackLabel: string;
  mapUpdatedAt: string;
  mapAccuracy: string | null;
  /** When set, uses Maps JavaScript API (map only, no Street View). Otherwise Leaflet + raster tiles. */
  googleMapsApiKey: string | null;
};

const leafletIconAssets = {
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
};

let googleMapsLoadPromise: Promise<void> | null = null;

const loadGoogleMapsOnce = (apiKey: string) => {
  if (!googleMapsLoadPromise) {
    setOptions({ key: apiKey, v: "weekly" });
    googleMapsLoadPromise = importLibrary("maps")
      .then(() => undefined)
      .catch((error: unknown) => {
        googleMapsLoadPromise = null;
        throw error;
      });
  }
  return googleMapsLoadPromise;
};

export function TrackingLiveMap({
  latitude,
  longitude,
  hasLiveLocation,
  statusFallbackLabel,
  mapUpdatedAt,
  mapAccuracy,
  googleMapsApiKey,
}: TrackingLiveMapProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const roadPaneRef = useRef<HTMLDivElement | null>(null);

  const googleMapRef = useRef<google.maps.Map | null>(null);
  const googleMarkerRef = useRef<google.maps.Marker | null>(null);

  const leafletMapRef = useRef<import("leaflet").Map | null>(null);
  const leafletMarkerRef = useRef<import("leaflet").Marker | null>(null);

  const [engine, setEngine] = useState<"google" | "leaflet" | "idle">("idle");
  const leafletSkin = resolveLeafletSkin();

  const resetView = useCallback(() => {
    const pos = { lat: latitude, lng: longitude };
    const map = googleMapRef.current;
    if (map) {
      map.setCenter(pos);
      map.setZoom(16);
    }
    const lmap = leafletMapRef.current;
    if (lmap) {
      lmap.setView([latitude, longitude], 16, { animate: true });
    }
  }, [latitude, longitude]);

  useEffect(() => {
    const roadEl = roadPaneRef.current;
    if (!roadEl) {
      return;
    }

    const initialLat = latitude;
    const initialLng = longitude;

    let disposed = false;

    const teardownGoogle = () => {
      googleMarkerRef.current?.setMap(null);
      googleMarkerRef.current = null;
      if (googleMapRef.current && typeof google !== "undefined" && google.maps) {
        google.maps.event.clearInstanceListeners(googleMapRef.current);
      }
      googleMapRef.current = null;
      roadEl.innerHTML = "";
    };

    const teardownLeaflet = () => {
      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.remove();
        leafletMarkerRef.current = null;
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };

    const run = async () => {
      const pos = { lat: initialLat, lng: initialLng };
      teardownGoogle();
      teardownLeaflet();

      let createdGoogle = false;
      if (googleMapsApiKey) {
        try {
          await loadGoogleMapsOnce(googleMapsApiKey);
        } catch {
          /* falls through to Leaflet */
        }
        if (disposed) {
          return;
        }

        if (typeof google !== "undefined" && google.maps) {
          const bounds = new google.maps.LatLngBounds(
            { lat: HULL_MAP_BOUNDS.south, lng: HULL_MAP_BOUNDS.west },
            { lat: HULL_MAP_BOUNDS.north, lng: HULL_MAP_BOUNDS.east },
          );

          const map = new google.maps.Map(roadEl, {
            center: pos,
            zoom: 16,
            restriction: {
              latLngBounds: bounds,
              strictBounds: true,
            },
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
          });

          const marker = new google.maps.Marker({
            position: pos,
            map,
            title: "Courier location",
          });

          googleMapRef.current = map;
          googleMarkerRef.current = marker;
          setEngine("google");
          createdGoogle = true;
        }
      }

      if (createdGoogle || disposed) {
        return;
      }

      const L = (await import("leaflet")).default;
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions(leafletIconAssets);

      const hullBounds = L.latLngBounds(
        L.latLng(HULL_MAP_BOUNDS.south, HULL_MAP_BOUNDS.west),
        L.latLng(HULL_MAP_BOUNDS.north, HULL_MAP_BOUNDS.east),
      );

      const map = L.map(roadEl, {
        center: [initialLat, initialLng],
        zoom: 16,
        maxBounds: hullBounds,
        maxBoundsViscosity: 1,
        zoomControl: true,
        attributionControl: true,
      });

      const tiles = LEAFLET_TILES[leafletSkin];
      L.tileLayer(tiles.url, {
        maxZoom: tiles.maxZoom,
        attribution: tiles.attribution,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng]).addTo(map);

      const minZ = map.getBoundsZoom(hullBounds, true);
      if (typeof minZ === "number" && !Number.isNaN(minZ)) {
        map.setMinZoom(minZ);
      }
      map.setMaxZoom(tiles.maxZoom);

      leafletMapRef.current = map;
      leafletMarkerRef.current = marker;
      setEngine("leaflet");
    };

    void run();

    return () => {
      disposed = true;
      teardownGoogle();
      teardownLeaflet();
      setEngine("idle");
    };
    // Map engine is recreated only when the API key changes; live lat/lng updates move the marker instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- latitude/longitude handled in a separate effect
  }, [googleMapsApiKey, leafletSkin]);

  useEffect(() => {
    const pos = { lat: latitude, lng: longitude };
    if (engine === "google" && googleMarkerRef.current) {
      googleMarkerRef.current.setPosition(pos);
    }
    if (engine === "leaflet" && leafletMarkerRef.current) {
      leafletMarkerRef.current.setLatLng([latitude, longitude]);
    }
  }, [latitude, longitude, engine]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || engine === "idle") {
      return;
    }

    const sync = () => {
      if (googleMapRef.current && typeof google !== "undefined" && google.maps) {
        google.maps.event.trigger(googleMapRef.current, "resize");
      }
      leafletMapRef.current?.invalidateSize();
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);

    return () => observer.disconnect();
  }, [engine]);

  return (
    <div className="tracking-live-map-root">
      <div className="tracking-map-stage" ref={stageRef}>
        <div className="tracking-map-pane tracking-map-pane-road" ref={roadPaneRef} />

        <div className="tracking-map-toolbar" aria-label="Map controls">
          <div className="tracking-map-status" role="status">
            <span className={hasLiveLocation ? "live-dot is-live" : "live-dot"} />
            <span>{hasLiveLocation ? "Live driver location" : "Waiting for courier scan"}</span>
          </div>
          <div className="tracking-map-toolbar-trailing">
            <button type="button" className="tracking-map-reset" onClick={resetView}>
              Reset view
            </button>
          </div>
        </div>
      </div>

      <div className="tracking-map-under">
        <strong>{hasLiveLocation ? "Driver on the map" : statusFallbackLabel}</strong>
        <span>
          {hasLiveLocation
            ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}${mapAccuracy ? ` · ${mapAccuracy}` : ""}`
            : "When the courier scans the receipt, this map follows their latest phone location."}
        </span>
        <div className="tracking-map-actions">
          <small>Updated {mapUpdatedAt}</small>
          <small>
            {engine === "google"
              ? "Google Maps · zoom in freely; you cannot zoom out past the Hull area"
              : engine === "leaflet"
                ? `Hull area map (${leafletSkin}) · zoom in freely; panning stays within the service area`
                : "Loading map…"}
          </small>
        </div>
      </div>

      <style jsx>{`
        .tracking-live-map-root {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .tracking-map-stage {
          position: relative;
          min-height: 420px;
          height: min(52vh, 520px);
          border-radius: 22px;
          overflow: hidden;
          background: #0d1419;
          border: 2px solid #23cdff;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.06),
            0 18px 40px rgba(7, 17, 24, 0.12);
        }

        .tracking-map-pane {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .tracking-map-toolbar {
          position: absolute;
          z-index: 4;
          left: 16px;
          right: 16px;
          top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
          pointer-events: none;
        }

        .tracking-map-toolbar > * {
          pointer-events: auto;
        }

        .tracking-map-toolbar-trailing {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-left: auto;
        }

        .tracking-map-reset {
          min-height: 38px;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          background: rgba(7, 17, 24, 0.82);
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          backdrop-filter: blur(14px);
        }

        .tracking-map-reset:hover {
          filter: brightness(1.08);
        }

        .tracking-map-status {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 999px;
          background: rgba(7, 17, 24, 0.82);
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          backdrop-filter: blur(14px);
        }

        .live-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.55);
        }

        .live-dot.is-live {
          background: #23cdff;
          box-shadow: 0 0 0 6px rgba(35, 205, 255, 0.22);
        }

        .tracking-map-under {
          margin-top: 16px;
          display: grid;
          gap: 8px;
          padding: 18px 20px;
          border-radius: 20px;
          border: 1px solid rgba(18, 18, 18, 0.1);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 251, 255, 0.96));
        }

        .tracking-map-under strong {
          text-transform: capitalize;
          font-size: clamp(1.25rem, 2.5vw, 1.65rem);
          color: #151515;
        }

        .tracking-map-under span {
          color: #5d6268;
          line-height: 1.5;
        }

        .tracking-map-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }

        .tracking-map-actions small {
          color: #7a828c;
          font-weight: 700;
        }

        /* Leaflet adds controls inside the stage; keep attribution small inside the frame (text must stay). */
        .tracking-map-stage :global(.leaflet-control-attribution) {
          max-width: min(100%, 520px);
          margin: 0 10px 10px auto !important;
          padding: 4px 8px !important;
          font-size: 10px !important;
          line-height: 1.35 !important;
          border-radius: 10px !important;
          background: rgba(255, 255, 255, 0.88) !important;
          color: #3d454f !important;
          border: 1px solid rgba(15, 17, 21, 0.1) !important;
          box-shadow: 0 6px 14px rgba(7, 17, 24, 0.12);
        }

        .tracking-map-stage :global(.leaflet-control-attribution a) {
          color: #087fa1 !important;
        }

        @media (max-width: 600px) {
          .tracking-map-stage {
            min-height: 360px;
            height: min(48vh, 440px);
          }
        }
      `}</style>
    </div>
  );
}
