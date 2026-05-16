"use client";

import type { CSSProperties } from "react";
import type { HubSettings } from "@hull-eats/types";
import {
  HULL_AREA_OUTWARD_CENTROIDS,
  createDefaultHullPostcodeZones,
  formatHullSectorLabel,
  getHullZoneEnabledSectors,
  isHullZoneSectorEnabled,
  listHullSectorsForOutward,
  hubOrderFulfillmentOptions,
  listKnownHullOutwardCodes,
  mergeHullPostcodeZones,
  milesToMeters,
  resolveBusinessOrigin,
  type HubOrderFulfillment,
  type DeliveryMode,
  type HullPostcodeZone,
  type HullSectorBoundaryCollection,
  type HullSectorBoundaryProperties,
  type HullSectorDigit,
} from "@hull-eats/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "leaflet/dist/leaflet.css";

const HULL_MAP_BOUNDS = {
  north: 53.83,
  south: 53.7,
  east: -0.18,
  west: -0.48,
} as const;

const HULL_EATS_MAP_STROKE = "#079bc8";
const HULL_EATS_MAP_FILL = "#23cdff";
const HULL_SECTOR_BOUNDARIES_URL = "/geo/hull-postcode-sectors.geojson";

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

const sectorToolbarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "0 14px 10px",
};

const sectorToolbarButtonStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 10,
  border: "1px solid rgba(7, 155, 200, 0.45)",
  background: "linear-gradient(180deg, rgba(35, 205, 255, 0.18), rgba(7, 155, 200, 0.08))",
  fontWeight: 800,
  fontSize: "0.78rem",
  color: "#0a4d66",
  cursor: "pointer",
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
  const [sectorBoundaries, setSectorBoundaries] = useState<HullSectorBoundaryCollection | null>(null);
  const [boundariesError, setBoundariesError] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    void fetch(HULL_SECTOR_BOUNDARIES_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Boundary data missing (${response.status})`);
        }
        return response.json() as Promise<HullSectorBoundaryCollection>;
      })
      .then((collection) => {
        if (!cancelled) {
          setSectorBoundaries(collection);
          setBoundariesError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSectorBoundaries(null);
          setBoundariesError(
            error instanceof Error
              ? error.message
              : "Could not load Hull postcode boundary data.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const setOutwardSectorsAll = useCallback((outwardCode: string, selectAll: boolean) => {
    const upper = outwardCode.toUpperCase();
    setActiveZoneCode(upper);
    setExpandedOutward(upper);

    const current = zonesRef.current;
    patchZones(
      current.map((zone) => {
        if (zone.code !== upper) {
          return zone;
        }
        const enabledSectors = selectAll ? [...listHullSectorsForOutward(upper)] : [];
        return {
          ...zone,
          enabledSectors,
          enabled: enabledSectors.length > 0,
        };
      }),
    );
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

        const enabledSectors = listHullSectorsForOutward(upper).filter((digit) => selected.has(digit));
        return {
          ...zone,
          enabledSectors,
          enabled: enabledSectors.length > 0,
        };
      }),
    );
  }, []);

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
        const fitBounds: import("leaflet").LatLngBounds[] = [];

        if (sectorBoundaries?.features?.length) {
          const geoLayer = L.geoJSON(sectorBoundaries, {
            style: (feature) => {
              const outward = feature?.properties?.outward ?? "";
              const sector = feature?.properties?.sector ?? "";
              const zone = zones.find((entry) => entry.code === outward);
              const isOn = zone ? isHullZoneSectorEnabled(zone, sector) : false;
              const isEditingOutward = expandedOutward === outward;
              const showOutline = isEditingOutward && !isOn;

              if (!isOn && !showOutline) {
                return { opacity: 0, fillOpacity: 0, weight: 0 };
              }

              return {
                color: isOn ? HULL_EATS_MAP_STROKE : "#9aa3ad",
                weight: isOn ? (focusCode === outward ? 2.5 : 2) : 1,
                lineJoin: "round",
                lineCap: "round",
                fillColor: isOn ? HULL_EATS_MAP_FILL : "transparent",
                fillOpacity: isOn ? (focusCode === outward ? 0.38 : 0.3) : 0,
                dashArray: showOutline ? "4 4" : undefined,
              };
            },
            onEachFeature: (feature, layer) => {
              const outward = feature.properties?.outward ?? "";
              const sector = feature.properties?.sector ?? "";
              const label = feature.properties?.label ?? formatHullSectorLabel(outward, sector);
              layer.bindTooltip(label, { direction: "top", sticky: true });
              layer.on("click", () => toggleSector(outward, sector as HullSectorDigit));
            },
          }).addTo(layers);

          const boundsAccumulator = L.latLngBounds([]);
          geoLayer.eachLayer((layer) => {
            const props = (
              layer as import("leaflet").Layer & { feature?: { properties?: HullSectorBoundaryProperties } }
            ).feature?.properties;
            if (!props) {
              return;
            }
            const zone = zones.find((entry) => entry.code === props.outward);
            if (!zone || !isHullZoneSectorEnabled(zone, props.sector)) {
              return;
            }
            if ("getBounds" in layer && typeof layer.getBounds === "function") {
              boundsAccumulator.extend(layer.getBounds());
            }
          });
          if (boundsAccumulator.isValid()) {
            fitBounds.push(boundsAccumulator);
          }
        }

        if (businessOrigin) {
          L.marker([businessOrigin.lat, businessOrigin.lng], { title: settings.name || "Your business" }).addTo(layers);
        }

        if (fitBounds.length > 0) {
          map.fitBounds(fitBounds[0]!, { padding: [36, 36], maxZoom: 14 });
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
    sectorBoundaries,
    toggleSector,
  ]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <label style={styles.field}>
        <span style={styles.darkFieldLabel}>Customer order options</span>
        <select
          style={styles.lightInput}
          value={settings.orderFulfillment}
          onChange={(event) => onChange({ orderFulfillment: event.target.value as HubOrderFulfillment })}
        >
          {hubOrderFulfillmentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p style={{ ...styles.subtleInfo, margin: "8px 0 0" }}>
          Controls whether buyers see delivery, collection, or both on your storefront.
        </p>
      </label>

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
            The map uses official open UK postcode sector boundaries (ONS / Royal Mail, via postcodes-mapit). Tick a sector
            to deliver there — the blue shape is that postcode area on the ground, not a radius. Set a full hub postcode
            in Business profile (e.g. HU3 1AB) for an exact shop pin; save hub settings to store coordinates.
          </p>
          {boundariesError ? (
            <p style={{ ...styles.subtleInfo, color: "#9b1c1c", margin: 0 }}>
              Map boundaries could not be loaded: {boundariesError}. Run{" "}
              <code style={{ fontSize: "0.85em" }}>pnpm geo:build-hull-sectors</code> after downloading the boundary archive
              (see scripts/build-hull-sector-boundaries.mjs).
            </p>
          ) : null}
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
              const availableSectors = listHullSectorsForOutward(code);
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
                    <>
                      <div style={sectorToolbarStyle}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#5d6775" }}>
                          Sectors for {code}
                        </span>
                        <button
                          type="button"
                          style={sectorToolbarButtonStyle}
                          onClick={(event) => {
                            event.stopPropagation();
                            const allOn = availableSectors.length > 0 && selectedCount === availableSectors.length;
                            setOutwardSectorsAll(code, !allOn);
                          }}
                        >
                          {availableSectors.length > 0 && selectedCount === availableSectors.length
                            ? `Deselect all ${code}`
                            : `Select all ${code}`}
                        </button>
                      </div>
                      <div style={sectorPanelStyle}>
                      {availableSectors.length === 0 ? (
                        <p style={{ ...styles.subtleInfo, margin: 0, gridColumn: "1 / -1" }}>
                          No sector boundaries in map data for {code}.
                        </p>
                      ) : null}
                      {availableSectors.map((digit) => {
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
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
