"use client";

import type { CSSProperties } from "react";
import type { HubSettings } from "@hull-eats/types";
import {
  HULL_AREA_OUTWARD_CENTROIDS,
  HULL_SECTOR_DIGITS,
  createDefaultHullPostcodeZones,
  formatHullSectorLabel,
  getHullSectorCentroid,
  getHullZoneEnabledSectors,
  hullZoneHasCoverage,
  isHullZoneSectorEnabled,
  listHullSectorDigits,
  listKnownHullOutwardCodes,
  mergeHullPostcodeZones,
  milesToMeters,
  resolveBusinessOrigin,
  type DeliveryMode,
  type HullPostcodeZone,
  type HullSectorDigit,
} from "@hull-eats/types";
import { voronoi as hullSectorVoronoi } from "d3-voronoi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "leaflet/dist/leaflet.css";

const HULL_MAP_BOUNDS = {
  north: 53.83,
  south: 53.7,
  east: -0.18,
  west: -0.48,
} as const;

/** Tighter than map bounds so Voronoi cells clip sooner over the Humber (less tint bleeding into open water). */
const HULL_SECTOR_VORONOI_EXTENT = {
  west: HULL_MAP_BOUNDS.west,
  south: 53.696,
  east: -0.27,
  north: HULL_MAP_BOUNDS.north - 0.012,
} as const;

const HULL_EATS_MAP_STROKE = "#079bc8";
const HULL_EATS_MAP_FILL = "#23cdff";

/** Fixed sector seed points for Voronoi cells (same centroids as map pins). Not official postcode boundaries. */
type HullSectorSite = { outward: string; sector: HullSectorDigit; lng: number; lat: number };

function hullOutwardSectorSites(outward: string): HullSectorSite[] {
  return listHullSectorDigits()
    .map((sector) => {
      const c = getHullSectorCentroid(outward, sector);
      return c ? { outward, sector, lng: c.lng, lat: c.lat } : null;
    })
    .filter((entry): entry is HullSectorSite => Boolean(entry));
}

/** Local clip per outward so sector polygons do not compete across the estuary (global Voronoi was flooding water). */
function hullOutwardVoronoiExtent(outward: string): [[number, number], [number, number]] {
  const pts = listHullSectorDigits()
    .map((digit) => getHullSectorCentroid(outward, digit))
    .filter((p): p is { lat: number; lng: number } => Boolean(p));
  if (pts.length === 0) {
    const c = HULL_AREA_OUTWARD_CENTROIDS[outward];
    if (!c) {
      return [
        [HULL_SECTOR_VORONOI_EXTENT.west, HULL_SECTOR_VORONOI_EXTENT.south],
        [HULL_SECTOR_VORONOI_EXTENT.east, HULL_SECTOR_VORONOI_EXTENT.north],
      ];
    }
    const pad = 0.038;
    return [
      [c.lng - pad, c.lat - pad],
      [c.lng + pad, c.lat + pad],
    ];
  }

  let minLng = pts[0]!.lng;
  let maxLng = pts[0]!.lng;
  let minLat = pts[0]!.lat;
  let maxLat = pts[0]!.lat;
  for (const p of pts) {
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
  }

  const spanLng = maxLng - minLng;
  const spanLat = maxLat - minLat;
  const padLng = Math.max(0.016, spanLng * 0.42 + 0.008);
  const padLat = Math.max(0.012, spanLat * 0.42 + 0.006);

  const x0 = Math.max(HULL_SECTOR_VORONOI_EXTENT.west, minLng - padLng);
  const y0 = Math.max(HULL_SECTOR_VORONOI_EXTENT.south, minLat - padLat);
  const x1 = Math.min(HULL_SECTOR_VORONOI_EXTENT.east, maxLng + padLng);
  const y1 = Math.min(HULL_SECTOR_VORONOI_EXTENT.north, maxLat + padLat);

  if (x1 <= x0 || y1 <= y0) {
    return [
      [HULL_SECTOR_VORONOI_EXTENT.west, HULL_SECTOR_VORONOI_EXTENT.south],
      [HULL_SECTOR_VORONOI_EXTENT.east, HULL_SECTOR_VORONOI_EXTENT.north],
    ];
  }

  return [
    [x0, y0],
    [x1, y1],
  ];
}

const leafletIconAssets = {
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
};

const outwardListStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const outwardRowStyle: CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "rgba(255, 255, 255, 0.98)",
  overflow: "hidden",
};

const outwardHeaderButtonStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 14px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: "0.95rem",
  color: "#111318",
  textAlign: "left",
};

const outwardHeaderActiveStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(35, 205, 255, 0.14), rgba(7, 155, 200, 0.06))",
};

const sectorPanelStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))",
  gap: 8,
  padding: "0 14px 14px",
};

const sectorCheckboxLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "rgba(248, 250, 252, 0.98)",
  fontWeight: 700,
  fontSize: "0.82rem",
  color: "#4a5560",
  cursor: "pointer",
};

const sectorCheckboxLabelOnStyle: CSSProperties = {
  borderColor: "rgba(7, 155, 200, 0.65)",
  background: "linear-gradient(180deg, rgba(35, 205, 255, 0.22), rgba(7, 155, 200, 0.1))",
  color: "#0a4d66",
};

type HubDeliveryConfigProps = {
  settings: HubSettings;
  onChange: (patch: Partial<HubSettings>) => void;
  /** When set, postcode changes trigger live geocode (postcodes.io via API) for the shop pin. */
  apiBaseUrl?: string;
  hubId?: string;
  merchantToken?: string;
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

export function HubDeliveryConfig({
  settings,
  onChange,
  apiBaseUrl,
  hubId,
  merchantToken,
  styles,
}: HubDeliveryConfigProps) {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const zonesRef = useRef<HullPostcodeZone[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [mapReady, setMapReady] = useState(false);
  const [expandedOutward, setExpandedOutward] = useState<string | null>(null);
  const [activeZoneCode, setActiveZoneCode] = useState<string | null>(null);
  const [pinGeocodeNote, setPinGeocodeNote] = useState<string | null>(null);

  const zones = useMemo(
    () =>
      settings.deliveryPostcodeZones.length > 0
        ? mergeHullPostcodeZones(settings.deliveryPostcodeZones)
        : createDefaultHullPostcodeZones(),
    [settings.deliveryPostcodeZones],
  );

  zonesRef.current = zones;

  const businessOrigin = useMemo(
    () =>
      resolveBusinessOrigin({
        storePostcode: settings.postcode,
        originLatitude: settings.deliveryOriginLatitude,
        originLongitude: settings.deliveryOriginLongitude,
      }),
    [settings.postcode, settings.deliveryOriginLatitude, settings.deliveryOriginLongitude],
  );

  useEffect(() => {
    const postcode = settings.postcode.trim();
    if (!postcode || !apiBaseUrl || !hubId || !merchantToken) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const base = apiBaseUrl.replace(/\/$/, "");
          const url = `${base}/v1/merchant/hubs/${encodeURIComponent(hubId)}/geocode?postcode=${encodeURIComponent(postcode)}`;
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${merchantToken}` },
          });
          if (!response.ok) {
            if (!cancelled) {
              setPinGeocodeNote("Could not place shop pin — check the hub postcode in Business profile.");
            }
            return;
          }
          const body = (await response.json()) as {
            latitude: number;
            longitude: number;
            source?: string;
            label?: string;
          };
          if (cancelled) {
            return;
          }
          onChangeRef.current({
            deliveryOriginLatitude: body.latitude,
            deliveryOriginLongitude: body.longitude,
          });
          setPinGeocodeNote(
            body.label
              ? `Shop pin: ${body.label} (${body.source ?? "UK postcode lookup"})`
              : "Shop pin placed from your hub postcode.",
          );
        } catch {
          if (!cancelled) {
            setPinGeocodeNote("Shop pin lookup failed — save hub settings to retry.");
          }
        }
      })();
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [settings.postcode, apiBaseUrl, hubId, merchantToken]);

  const setMode = (deliveryMode: DeliveryMode) => {
    onChange({ deliveryMode });
  };

  const patchZones = (nextZones: HullPostcodeZone[]) => {
    onChange({ deliveryPostcodeZones: nextZones });
  };

  const panToOutward = useCallback((code: string) => {
    const upper = code.toUpperCase();
    const map = mapRef.current;
    const center = HULL_AREA_OUTWARD_CENTROIDS[upper];
    setActiveZoneCode(upper);
    setExpandedOutward(upper);
    if (!map || !center) {
      return;
    }

    map.flyTo([center.lat, center.lng], 13, { duration: 0.45 });
  }, []);

  const toggleSector = useCallback((outwardCode: string, sector: HullSectorDigit) => {
    const upper = outwardCode.toUpperCase();
    setActiveZoneCode(upper);
    setExpandedOutward(upper);

    const current = zonesRef.current;
    patchZones(
      current.map((zone) => {
        if (zone.code !== upper) {
          return zone;
        }

        const selected = new Set(getHullZoneEnabledSectors(zone));
        if (selected.has(sector)) {
          selected.delete(sector);
        } else {
          selected.add(sector);
        }

        const enabledSectors = HULL_SECTOR_DIGITS.filter((digit) => selected.has(digit));
        return {
          ...zone,
          enabledSectors,
          enabled: enabledSectors.length > 0,
        };
      }),
    );
  }, []);

  const setZoneRadius = (code: string, radiusMiles: number) => {
    const upper = code.toUpperCase();
    const clamped = Math.min(40, Math.max(0.1, radiusMiles));
    const current = zonesRef.current;
    patchZones(
      current.map((zone) => (zone.code === upper ? { ...zone, radiusMiles: clamped } : zone)),
    );
    setActiveZoneCode(upper);
  };

  const hasAnySectorSelected = useMemo(
    () => zones.some((zone) => getHullZoneEnabledSectors(zone).length > 0),
    [zones],
  );

  const deselectAllSectors = useCallback(() => {
    const current = zonesRef.current;
    const anySelected = current.some((zone) => getHullZoneEnabledSectors(zone).length > 0);
    if (!anySelected) {
      return;
    }
    const ok = window.confirm(
      "Remove every selected postcode sector? Your Hull delivery map will show no coverage until you tick sectors again.",
    );
    if (!ok) {
      return;
    }
    onChange({
      deliveryPostcodeZones: current.map((zone) => ({
        ...zone,
        enabled: false,
        enabledSectors: [],
      })),
    });
    setExpandedOutward(null);
    setActiveZoneCode(null);
  }, [onChange]);

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
        const focusCode = activeZoneCode ?? expandedOutward ?? null;
        const sectorBounds: import("leaflet").LatLngBounds[] = [];

        for (const outward of listKnownHullOutwardCodes()) {
          const sites = hullOutwardSectorSites(outward);
          if (sites.length < 2) {
            continue;
          }

          const extent = hullOutwardVoronoiExtent(outward);
          const rings = hullSectorVoronoi<HullSectorSite>()
            .x((d) => d.lng)
            .y((d) => d.lat)
            .extent(extent)
            .polygons(sites);

          for (const ring of rings) {
            if (!ring || ring.length < 3) {
              continue;
            }

            const site = ring.data as HullSectorSite;
            const zone = zones.find((entry) => entry.code === site.outward);
            if (!zone) {
              continue;
            }

            const isOn = isHullZoneSectorEnabled(zone, site.sector);
            const isFocusOutward = zone.code === focusCode;

            const latLngs = ring.map((coord) => L.latLng(coord[1], coord[0]));

            const cell = L.polygon(latLngs, {
              color: isOn ? HULL_EATS_MAP_STROKE : "#b8c2cc",
              weight: isFocusOutward && isOn ? 2.5 : isOn ? 1.75 : 0.85,
              lineJoin: "round",
              lineCap: "round",
              fillColor: isOn ? HULL_EATS_MAP_FILL : "#f1f4f7",
              fillOpacity: isOn ? (isFocusOutward ? 0.36 : 0.26) : 0.14,
            })
              .bindTooltip(formatHullSectorLabel(site.outward, site.sector), { direction: "top", sticky: true })
              .on("click", () => toggleSector(site.outward, site.sector))
              .addTo(layers);

            if (isOn && isFocusOutward) {
              sectorBounds.push(cell.getBounds());
            }
          }
        }

        if (businessOrigin) {
          L.marker([businessOrigin.lat, businessOrigin.lng], { title: settings.name || "Your business" }).addTo(layers);
        }

        if (sectorBounds.length > 0) {
          const combined = sectorBounds[0]!;
          for (let index = 1; index < sectorBounds.length; index += 1) {
            combined.extend(sectorBounds[index]!);
          }
          map.fitBounds(combined, { padding: [36, 36], maxZoom: 14 });
          return;
        }

        if (focusCode && HULL_AREA_OUTWARD_CENTROIDS[focusCode]) {
          const focus = HULL_AREA_OUTWARD_CENTROIDS[focusCode];
          map.flyTo([focus.lat, focus.lng], 13, { duration: 0.35 });
          return;
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
    expandedOutward,
    settings.deliveryOriginLatitude,
    settings.deliveryOriginLongitude,
    toggleSector,
  ]);

  const activeZone = zones.find((zone) => zone.code === activeZoneCode) ?? null;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <p style={styles.eyebrow}>Delivery area</p>
        <h2 style={{ ...styles.sectionTitle, marginTop: 6, marginBottom: 8 }}>Map your delivery coverage</h2>
        <p style={{ ...styles.panelCopy, margin: 0, maxWidth: 720 }}>
          Choose one method: a single radius from your business, or Hull postcode areas (HU1–HU16) with sector-level
          tick boxes (e.g. HU7 1, HU7 2). Mile band fees below still set what customers pay by distance from your shop.
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
            setExpandedOutward(null);
            setActiveZoneCode(null);
            if (settings.deliveryPostcodeZones.length === 0) {
              onChange({ deliveryPostcodeZones: createDefaultHullPostcodeZones() });
            }
          }}
        >
          Hull postcode areas
        </button>
      </div>

      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 8,
          marginBottom: 16,
          paddingBottom: 10,
          marginLeft: -2,
          marginRight: -2,
          background: "linear-gradient(180deg, rgba(255, 254, 252, 0.98) 0%, rgba(255, 254, 252, 0.97) 78%, rgba(255, 254, 252, 0) 100%)",
        }}
      >
        <div ref={mapHostRef} style={styles.mapFrame} aria-label="Hull delivery area map" />
        {pinGeocodeNote ? <p style={{ ...styles.subtleInfo, margin: "8px 0 0" }}>{pinGeocodeNote}</p> : null}
      </div>

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
            Orange circle shows your delivery radius. The shop pin is placed from your hub postcode using UK postcode
            lookup (postcodes.io) when you save or update the postcode.
          </p>
        </label>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <p style={styles.subtleInfo}>
            The map starts with no sectors selected and stays visible while you scroll on mobile. Postcode sectors use
            real coordinates from postcodes.io (sample addresses per HU sector). Shading is an approximate tile per
            district, not official boundary data — but it aligns much closer to land than before. Set a full hub postcode
            in Business profile (e.g. HU3 1AB) so the shop pin is exact; save hub settings to store coordinates.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              style={hasAnySectorSelected ? styles.modeButton : { ...styles.modeButton, opacity: 0.45, cursor: "not-allowed" }}
              disabled={!hasAnySectorSelected}
              onClick={deselectAllSectors}
            >
              Deselect all sectors
            </button>
            {!hasAnySectorSelected ? (
              <span style={{ ...styles.subtleInfo, margin: 0 }}>No sectors selected yet.</span>
            ) : null}
          </div>
          <div style={outwardListStyle}>
            {listKnownHullOutwardCodes().map((code) => {
              const zone = zones.find((entry) => entry.code === code)!;
              const expanded = expandedOutward === code;
              const selectedCount = getHullZoneEnabledSectors(zone).length;
              const isActive = activeZoneCode === code;

              return (
                <div key={code} style={outwardRowStyle}>
                  <button
                    type="button"
                    style={{
                      ...outwardHeaderButtonStyle,
                      ...(expanded || isActive ? outwardHeaderActiveStyle : {}),
                    }}
                    aria-expanded={expanded}
                    onClick={() => {
                      if (expanded) {
                        setExpandedOutward(null);
                      } else {
                        panToOutward(code);
                      }
                    }}
                  >
                    <span>{code}</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#5d6775" }}>
                      {selectedCount > 0 ? `${selectedCount} sector${selectedCount === 1 ? "" : "s"} on` : "None selected"}
                      {expanded ? " ▲" : " ▼"}
                    </span>
                  </button>
                  {expanded ? (
                    <div style={sectorPanelStyle}>
                      {listHullSectorDigits().map((digit) => {
                        const checked = isHullZoneSectorEnabled(zone, digit);
                        return (
                          <label
                            key={`${code}-${digit}`}
                            style={checked ? sectorCheckboxLabelOnStyle : sectorCheckboxLabelStyle}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSector(code, digit)}
                            />
                            {formatHullSectorLabel(code, digit)}
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {activeZone && hullZoneHasCoverage(activeZone) ? (
            <label style={styles.field}>
              <span style={styles.darkFieldLabel}>Default radius for {activeZone.code} (miles, optional reference)</span>
              <input
                type="number"
                min={0.1}
                max={40}
                step={0.1}
                style={styles.lightInput}
                value={activeZone.radiusMiles}
                onChange={(event) => setZoneRadius(activeZone.code, Number(event.target.value) || 1.5)}
              />
            </label>
          ) : (
            <p style={styles.subtleInfo}>Open a postcode and tick at least one sector to enable delivery there.</p>
          )}
        </div>
      )}
    </div>
  );
}
