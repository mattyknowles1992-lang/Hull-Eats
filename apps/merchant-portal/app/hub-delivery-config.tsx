"use client";

import type { CSSProperties } from "react";
import type { HubSettings } from "@hull-eats/types";
import {
  HULL_AREA_OUTWARD_CENTROIDS,
  createDefaultHullPostcodeZones,
  listKnownHullOutwardCodes,
  mergeHullPostcodeZones,
  milesToMeters,
  resolveBusinessOrigin,
  type DeliveryMode,
  type HullPostcodeZone,
} from "@hull-eats/types";
import { useEffect, useMemo, useRef, useState } from "react";

import "leaflet/dist/leaflet.css";

const HULL_MAP_BOUNDS = {
  north: 53.83,
  south: 53.7,
  east: -0.18,
  west: -0.48,
} as const;

const leafletIconAssets = {
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
};

type HubDeliveryConfigProps = {
  settings: HubSettings;
  onChange: (patch: Partial<HubSettings>) => void;
  styles: {
    eyebrow: CSSProperties;
    sectionTitle: CSSProperties;
    panelCopy: CSSProperties;
    field: CSSProperties;
    darkFieldLabel: CSSProperties;
    lightInput: CSSProperties;
    subtleInfo: CSSProperties;
    modeButton: CSSProperties;
    modeButtonActive: CSSProperties;
    mapFrame: CSSProperties;
    zoneChip: CSSProperties;
    zoneChipActive: CSSProperties;
    zoneList: CSSProperties;
  };
};

export function HubDeliveryConfig({ settings, onChange, styles }: HubDeliveryConfigProps) {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const zonesRef = useRef<HullPostcodeZone[]>([]);
  const onChangeRef = useRef(onChange);
  const [mapReady, setMapReady] = useState(false);
  const [activeZoneCode, setActiveZoneCode] = useState<string | null>(null);

  const zones = useMemo(
    () =>
      settings.deliveryPostcodeZones.length > 0
        ? mergeHullPostcodeZones(settings.deliveryPostcodeZones)
        : createDefaultHullPostcodeZones(),
    [settings.deliveryPostcodeZones],
  );

  zonesRef.current = zones;
  onChangeRef.current = onChange;

  const businessOrigin = useMemo(
    () =>
      resolveBusinessOrigin({
        storePostcode: settings.postcode,
        originLatitude: settings.deliveryOriginLatitude,
        originLongitude: settings.deliveryOriginLongitude,
      }),
    [settings.postcode, settings.deliveryOriginLatitude, settings.deliveryOriginLongitude],
  );

  const setMode = (deliveryMode: DeliveryMode) => {
    onChange({ deliveryMode });
  };

  const patchZones = (nextZones: HullPostcodeZone[]) => {
    onChange({ deliveryPostcodeZones: nextZones });
  };

  const toggleZone = (code: string) => {
    const upper = code.toUpperCase();
    setActiveZoneCode(upper);
    const current = zonesRef.current;
    patchZones(
      current.map((zone) => (zone.code === upper ? { ...zone, enabled: !zone.enabled } : zone)),
    );
  };

  const setZoneRadius = (code: string, radiusMiles: number) => {
    const upper = code.toUpperCase();
    const clamped = Math.min(40, Math.max(0.1, radiusMiles));
    const current = zonesRef.current;
    patchZones(
      current.map((zone) => (zone.code === upper ? { ...zone, radiusMiles: clamped, enabled: true } : zone)),
    );
    setActiveZoneCode(upper);
  };

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;

    void (async () => {
      const host = mapHostRef.current;
      if (!host) {
        return;
      }

      const L = (await import("leaflet")).default;
      if (disposed) {
        return;
      }

      L.Icon.Default.mergeOptions(leafletIconAssets);

      map = L.map(host, { zoomControl: true, scrollWheelZoom: true });
      map.fitBounds(
        L.latLngBounds(
          L.latLng(HULL_MAP_BOUNDS.south, HULL_MAP_BOUNDS.west),
          L.latLng(HULL_MAP_BOUNDS.north, HULL_MAP_BOUNDS.east),
        ),
      );
      map.setMaxBounds(
        L.latLngBounds(
          L.latLng(HULL_MAP_BOUNDS.south - 0.02, HULL_MAP_BOUNDS.west - 0.04),
          L.latLng(HULL_MAP_BOUNDS.north + 0.02, HULL_MAP_BOUNDS.east + 0.04),
        ),
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const layers = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerGroupRef.current = layers;
      setMapReady(true);
    })();

    return () => {
      disposed = true;
      if (map) {
        map.remove();
      }
      mapRef.current = null;
      layerGroupRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers || !mapReady) {
      return;
    }

    let cancelled = false;

    void import("leaflet").then((leafletModule) => {
      if (cancelled) {
        return;
      }

      const L = leafletModule.default;
      layers.clearLayers();

      if (settings.deliveryMode === "business_radius" && businessOrigin) {
        L.marker([businessOrigin.lat, businessOrigin.lng], { title: settings.name || "Your business" }).addTo(layers);
        const coverage = L.circle([businessOrigin.lat, businessOrigin.lng], {
          radius: milesToMeters(settings.deliveryRadiusMiles),
          color: "#ff6a00",
          fillColor: "#ff6a00",
          fillOpacity: 0.14,
          weight: 2,
        }).addTo(layers);
        map.fitBounds(coverage.getBounds(), { padding: [28, 28], maxZoom: 13 });
        return;
      }

      if (settings.deliveryMode === "postcode_zones") {
        const enabledZones = zones.filter((zone) => zone.enabled);
        const focusCode = activeZoneCode ?? enabledZones[0]?.code ?? null;

        for (const zone of zones) {
          const center = HULL_AREA_OUTWARD_CENTROIDS[zone.code];
          if (!center) {
            continue;
          }

          const isActive = zone.code === focusCode;
          const isEnabled = zone.enabled;

          if (isEnabled) {
            L.circle([center.lat, center.lng], {
              radius: milesToMeters(zone.radiusMiles),
              color: isActive ? "#079bc8" : "#4a8fb8",
              fillColor: isActive ? "#079bc8" : "#7eb8d4",
              fillOpacity: isActive ? 0.22 : 0.12,
              weight: isActive ? 3 : 2,
            }).addTo(layers);
          }

          L.circleMarker([center.lat, center.lng], {
            radius: isEnabled ? 10 : 7,
            color: isEnabled ? "#079bc8" : "#9aa3ad",
            fillColor: isEnabled ? "#23cdff" : "#e8edf2",
            fillOpacity: 1,
            weight: 2,
          })
            .bindTooltip(`${zone.code}${isEnabled ? ` · ${zone.radiusMiles} mi` : ""}`, { direction: "top" })
            .on("click", () => toggleZone(zone.code))
            .addTo(layers);
        }

        if (businessOrigin) {
          L.marker([businessOrigin.lat, businessOrigin.lng], { title: settings.name || "Your business" }).addTo(layers);
        }

        if (focusCode && HULL_AREA_OUTWARD_CENTROIDS[focusCode]) {
          const focus = HULL_AREA_OUTWARD_CENTROIDS[focusCode];
          const focusZone = zones.find((zone) => zone.code === focusCode);
          if (focusZone?.enabled) {
            map.fitBounds(
              L.circle([focus.lat, focus.lng], { radius: milesToMeters(focusZone.radiusMiles) }).getBounds(),
              { padding: [32, 32], maxZoom: 13 },
            );
            return;
          }
        }

        map.fitBounds(
          L.latLngBounds(
            L.latLng(HULL_MAP_BOUNDS.south, HULL_MAP_BOUNDS.west),
            L.latLng(HULL_MAP_BOUNDS.north, HULL_MAP_BOUNDS.east),
          ),
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    mapReady,
    settings.deliveryMode,
    settings.deliveryRadiusMiles,
    settings.name,
    businessOrigin,
    zones,
    activeZoneCode,
    settings.deliveryOriginLatitude,
    settings.deliveryOriginLongitude,
  ]);

  const activeZone = zones.find((zone) => zone.code === activeZoneCode) ?? null;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <p style={styles.eyebrow}>Delivery area</p>
        <h2 style={{ ...styles.sectionTitle, marginTop: 6, marginBottom: 8 }}>Map your delivery coverage</h2>
        <p style={{ ...styles.panelCopy, margin: 0, maxWidth: 720 }}>
          Choose one method: a single radius from your business, or separate Hull postcode areas (HU1–HU16) each with
          its own radius from that area&apos;s centre. Mile band fees below still set what customers pay by distance from
          your shop.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          style={settings.deliveryMode === "business_radius" ? styles.modeButtonActive : styles.modeButton}
          onClick={() => setMode("business_radius")}
        >
          Radius from business
        </button>
        <button
          type="button"
          style={settings.deliveryMode === "postcode_zones" ? styles.modeButtonActive : styles.modeButton}
          onClick={() => {
            setMode("postcode_zones");
            if (settings.deliveryPostcodeZones.length === 0) {
              onChange({ deliveryPostcodeZones: createDefaultHullPostcodeZones() });
            }
          }}
        >
          Hull postcode areas
        </button>
      </div>

      <div ref={mapHostRef} style={styles.mapFrame} aria-label="Hull delivery area map" />

      {settings.deliveryMode === "business_radius" ? (
        <label style={styles.field}>
          <span style={styles.darkFieldLabel}>Delivery radius from your business (miles)</span>
          <input
            type="number"
            min={0.1}
            max={40}
            step={0.1}
            style={styles.lightInput}
            value={settings.deliveryRadiusMiles}
            onChange={(event) =>
              onChange({
                deliveryRadiusMiles: Math.min(40, Math.max(0.1, Number(event.target.value) || 5)),
              })
            }
          />
          <p style={styles.subtleInfo}>
            Orange circle on the map shows where you deliver. Pin uses your hub postcode
            {settings.deliveryOriginLatitude != null ? " or the coordinates you set below" : ""}.
          </p>
        </label>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <p style={styles.subtleInfo}>
            Tap a postcode on the map or in the list to turn it on (blue). Set how many miles from that area&apos;s
            centre you deliver.
          </p>
          <div style={styles.zoneList}>
            {listKnownHullOutwardCodes().map((code) => {
              const zone = zones.find((entry) => entry.code === code)!;
              const isActive = activeZoneCode === code;
              return (
                <button
                  key={code}
                  type="button"
                  style={zone.enabled ? (isActive ? styles.zoneChipActive : styles.zoneChip) : styles.zoneChip}
                  onClick={() => {
                    setActiveZoneCode(code);
                    if (!zone.enabled) {
                      patchZones(zones.map((entry) => (entry.code === code ? { ...entry, enabled: true } : entry)));
                    }
                  }}
                >
                  {code}
                </button>
              );
            })}
          </div>
          {activeZone ? (
            <label style={styles.field}>
              <span style={styles.darkFieldLabel}>
                Radius for {activeZone.code} (miles){activeZone.enabled ? "" : " — enable this area first"}
              </span>
              <input
                type="number"
                min={0.1}
                max={40}
                step={0.1}
                style={styles.lightInput}
                value={activeZone.radiusMiles}
                disabled={!activeZone.enabled}
                onChange={(event) => setZoneRadius(activeZone.code, Number(event.target.value) || 1.5)}
              />
            </label>
          ) : (
            <p style={styles.subtleInfo}>Select a postcode area to set its radius.</p>
          )}
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        <span style={styles.darkFieldLabel}>Shop map pin (optional override)</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <label style={styles.field}>
            <span style={styles.darkFieldLabel}>Latitude</span>
            <input
              type="number"
              step="0.0001"
              style={styles.lightInput}
              value={settings.deliveryOriginLatitude ?? ""}
              placeholder="Auto from postcode"
              onChange={(event) => {
                const raw = event.target.value.trim();
                onChange({
                  deliveryOriginLatitude: raw === "" ? null : Number.isFinite(Number(raw)) ? Number(raw) : null,
                });
              }}
            />
          </label>
          <label style={styles.field}>
            <span style={styles.darkFieldLabel}>Longitude</span>
            <input
              type="number"
              step="0.0001"
              style={styles.lightInput}
              value={settings.deliveryOriginLongitude ?? ""}
              placeholder="Auto from postcode"
              onChange={(event) => {
                const raw = event.target.value.trim();
                onChange({
                  deliveryOriginLongitude: raw === "" ? null : Number.isFinite(Number(raw)) ? Number(raw) : null,
                });
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
