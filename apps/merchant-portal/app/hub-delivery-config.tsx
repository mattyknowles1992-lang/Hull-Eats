"use client";

import type { CSSProperties } from "react";
import type { HubSettings } from "@hull-eats/types";
import {
  HULL_AREA_OUTWARD_CENTROIDS,
  createDefaultHullPostcodeZones,
  type DeliveryDistanceRange,
  formatHullSectorLabel,
  getHullZoneEnabledSectors,
  getHullSectorCentroid,
  isHullZoneSectorEnabled,
  listHullSectorsForOutward,
  hubOrderFulfillmentOptions,
  listKnownHullOutwardCodes,
  isValidMapCoordinate,
  mergeHullPostcodeZones,
  milesToMeters,
  resolveBusinessOrigin,
  type HubOrderFulfillment,
  type DeliveryMode,
  type HullPostcodeZone,
  type HullSectorBoundaryCollection,
  type HullSectorBoundaryFeature,
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

type MapFocus = {
  outward: string;
  sector?: HullSectorDigit;
};

const MAP_CAMERA_EASE = {
  duration: 0.95,
  easeLinearity: 0.22,
} as const;

const MAP_SECTOR_PADDING: [number, number] = [52, 52];
const MAP_OUTWARD_PADDING: [number, number] = [44, 44];
const MAP_OVERVIEW_PADDING: [number, number] = [40, 40];

type LeafletModule = typeof import("leaflet");

/** Approximate bounds for a mile-radius circle without attaching a Leaflet layer to the map. */
function deliveryRadiusBounds(L: LeafletModule, lat: number, lng: number, miles: number): import("leaflet").LatLngBounds {
  const safeMiles = Math.max(0.1, Number(miles) || 0.1);
  const meters = milesToMeters(safeMiles);
  const latOffset = meters / 111_320;
  const lngOffset = meters / (111_320 * Math.cos((lat * Math.PI) / 180));
  return L.latLngBounds([lat - latOffset, lng - lngOffset], [lat + latOffset, lng + lngOffset]);
}

function boundsLookValid(bounds: import("leaflet").LatLngBounds | null | undefined): bounds is import("leaflet").LatLngBounds {
  if (!bounds?.isValid?.()) {
    return false;
  }
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return [sw.lat, sw.lng, ne.lat, ne.lng].every((value) => Number.isFinite(value));
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
  transition: "background 0.24s ease",
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
  transition: "border-color 0.22s ease, background 0.22s ease, color 0.22s ease, box-shadow 0.22s ease, transform 0.18s ease",
};

const sectorCheckboxLabelOnStyle: CSSProperties = {
  borderColor: "rgba(7, 155, 200, 0.65)",
  background: "linear-gradient(180deg, rgba(35, 205, 255, 0.22), rgba(7, 155, 200, 0.1))",
  color: "#0a4d66",
  boxShadow: "0 6px 16px rgba(7, 155, 200, 0.14)",
  transform: "translateY(-1px)",
};

const outwardRowExpandedStyle: CSSProperties = {
  boxShadow: "0 10px 28px rgba(7, 155, 200, 0.1)",
  transition: "box-shadow 0.28s ease",
};

const postcodeFeeRowStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: "0 14px 14px",
};

const distanceRangeListStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const distanceRangeRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "end",
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
  readOnly?: boolean;
};

export function HubDeliveryConfig({
  settings,
  onChange,
  apiBaseUrl,
  hubId,
  merchantToken,
  styles,
  readOnly = false,
}: HubDeliveryConfigProps) {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const zonesRef = useRef<HullPostcodeZone[]>([]);
  const initialCameraDoneRef = useRef(false);
  const requestOverviewRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [mapReady, setMapReady] = useState(false);
  const [expandedOutward, setExpandedOutward] = useState<string | null>(null);
  const [activeZoneCode, setActiveZoneCode] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null);
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
  const radiusRanges = settings.deliveryDistanceRanges;

  zonesRef.current = zones;

  const businessOrigin = useMemo(() => {
    const origin = resolveBusinessOrigin({
      storePostcode: settings.postcode,
      originLatitude: settings.deliveryOriginLatitude,
      originLongitude: settings.deliveryOriginLongitude,
    });
    if (!origin || !isValidMapCoordinate(origin.lat, origin.lng)) {
      return null;
    }
    return origin;
  }, [settings.postcode, settings.deliveryOriginLatitude, settings.deliveryOriginLongitude]);

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
    if (readOnly) {
      return;
    }
    onChange({ deliveryMode });
  };

  const patchZones = (nextZones: HullPostcodeZone[]) => {
    onChange({ deliveryPostcodeZones: nextZones });
  };

  const setZoneFee = useCallback(
    (outwardCode: string, nextFee: string) => {
      if (readOnly) {
        return;
      }
      const upper = outwardCode.toUpperCase();
      const parsed = nextFee.trim() === "" ? null : Math.max(0, Number(nextFee) || 0);
      patchZones(
        zonesRef.current.map((zone) =>
          zone.code !== upper
            ? zone
            : {
                ...zone,
                fee: parsed == null ? null : Number(parsed.toFixed(2)),
              },
        ),
      );
    },
    [readOnly],
  );

  const addDistanceRange = useCallback(() => {
    if (readOnly) {
      return;
    }
    const lastRange = radiusRanges[radiusRanges.length - 1];
    const nextMaxMiles = Math.min(40, Number(((lastRange?.maxMiles ?? 0) + 1).toFixed(1)));
    onChange({
      deliveryDistanceRanges: [...radiusRanges, { maxMiles: Math.max(0.5, nextMaxMiles), fee: settings.deliveryFee }],
    });
  }, [onChange, radiusRanges, readOnly, settings.deliveryFee]);

  const updateDistanceRange = useCallback(
    (index: number, patch: Partial<DeliveryDistanceRange>) => {
      if (readOnly) {
        return;
      }
      onChange({
        deliveryDistanceRanges: radiusRanges.map((range, rangeIndex) =>
          rangeIndex === index
            ? {
                ...range,
                ...patch,
              }
            : range,
        ),
      });
    },
    [onChange, radiusRanges, readOnly],
  );

  const removeDistanceRange = useCallback(
    (index: number) => {
      if (readOnly) {
        return;
      }
      onChange({
        deliveryDistanceRanges: radiusRanges.filter((_, rangeIndex) => rangeIndex !== index),
      });
    },
    [onChange, radiusRanges, readOnly],
  );

  const focusMap = useCallback((focus: MapFocus) => {
    const upper = focus.outward.toUpperCase();
    setActiveZoneCode(upper);
    setMapFocus({ outward: upper, sector: focus.sector });
  }, []);

  const focusOutward = useCallback(
    (code: string) => {
      const upper = code.toUpperCase();
      setExpandedOutward(upper);
      focusMap({ outward: upper });
    },
    [focusMap],
  );

  const setOutwardSectorsAll = useCallback((outwardCode: string, selectAll: boolean) => {
    if (readOnly) {
      return;
    }
    const upper = outwardCode.toUpperCase();
    setExpandedOutward(upper);
    focusMap({ outward: upper });

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
  }, [focusMap, readOnly]);

  const toggleSector = useCallback((outwardCode: string, sector: HullSectorDigit) => {
    if (readOnly) {
      return;
    }
    const upper = outwardCode.toUpperCase();
    setExpandedOutward(upper);
    focusMap({ outward: upper, sector });

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
  }, [focusMap, readOnly]);

  const hasAnySectorSelected = useMemo(
    () => zones.some((zone) => getHullZoneEnabledSectors(zone).length > 0),
    [zones],
  );

  const deselectAllSectors = useCallback(() => {
    if (readOnly) {
      return;
    }
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
    setMapFocus(null);
    requestOverviewRef.current = true;
    initialCameraDoneRef.current = false;
  }, [onChange, readOnly]);

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
          color: "#079bc8",
          fillColor: "#079bc8",
          fillOpacity: 0.14,
          weight: 2,
        }).addTo(layers);
        return;
      }

      if (settings.deliveryMode === "postcode_zones") {
        const focusCode = activeZoneCode ?? expandedOutward ?? null;

        if (sectorBoundaries?.features?.length) {
          L.geoJSON(sectorBoundaries, {
            style: (feature) => {
              const outward = feature?.properties?.outward ?? "";
              const sector = feature?.properties?.sector ?? "";
              const zone = zones.find((entry) => entry.code === outward);
              const isOn = zone ? isHullZoneSectorEnabled(zone, sector) : false;
              const isEditingOutward = expandedOutward === outward;
              const showOutline = isEditingOutward && !isOn;
              const isFocusSector =
                mapFocus != null &&
                mapFocus.outward === outward &&
                mapFocus.sector != null &&
                mapFocus.sector === sector;

              if (!isOn && !showOutline) {
                return { opacity: 0, fillOpacity: 0, weight: 0 };
              }

              return {
                color: isOn ? HULL_EATS_MAP_STROKE : "#9aa3ad",
                weight: isOn ? (isFocusSector ? 2.75 : focusCode === outward ? 2.25 : 2) : 1,
                lineJoin: "round",
                lineCap: "round",
                fillColor: isOn ? HULL_EATS_MAP_FILL : "transparent",
                fillOpacity: isOn ? (isFocusSector ? 0.42 : focusCode === outward ? 0.34 : 0.28) : 0,
                dashArray: showOutline ? "4 6" : undefined,
              };
            },
            onEachFeature: (feature, layer) => {
              const outward = feature.properties?.outward ?? "";
              const sector = feature.properties?.sector ?? "";
              const label = feature.properties?.label ?? formatHullSectorLabel(outward, sector);
              layer.bindTooltip(label, { direction: "top", sticky: true, opacity: 0.92 });
              layer.on("click", () => toggleSector(outward, sector as HullSectorDigit));
            },
          }).addTo(layers);
        }

        if (businessOrigin) {
          L.marker([businessOrigin.lat, businessOrigin.lng], { title: settings.name || "Your business" }).addTo(layers);
        }
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
    mapFocus,
    sectorBoundaries,
    toggleSector,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    let cancelled = false;

    void import("leaflet").then((leafletModule) => {
      if (cancelled) {
        return;
      }

      const L = leafletModule.default;
      const hullBounds = L.latLngBounds(
        L.latLng(HULL_MAP_BOUNDS.south, HULL_MAP_BOUNDS.west),
        L.latLng(HULL_MAP_BOUNDS.north, HULL_MAP_BOUNDS.east),
      );

      const safeFlyTo = (lat: number, lng: number, zoom: number) => {
        if (!isValidMapCoordinate(lat, lng)) {
          return false;
        }
        try {
          map.invalidateSize();
          map.flyTo([lat, lng], zoom, MAP_CAMERA_EASE);
          return true;
        } catch {
          return false;
        }
      };

      const safeFlyToBounds = (
        bounds: import("leaflet").LatLngBounds,
        padding: [number, number],
        maxZoom: number,
      ) => {
        if (!boundsLookValid(bounds)) {
          return false;
        }
        try {
          map.invalidateSize();
          map.flyToBounds(bounds, {
            padding,
            maxZoom,
            ...MAP_CAMERA_EASE,
          });
          return true;
        } catch {
          return false;
        }
      };

      const flyToFeatureBounds = (features: HullSectorBoundaryFeature[], padding: [number, number], maxZoom: number) => {
        if (features.length === 0) {
          return false;
        }
        const layer = L.geoJSON({ type: "FeatureCollection", features } as HullSectorBoundaryCollection);
        const bounds = layer.getBounds();
        layer.remove();
        return safeFlyToBounds(bounds, padding, maxZoom);
      };

      const flyToHullOverview = () => {
        safeFlyToBounds(hullBounds, MAP_OVERVIEW_PADDING, 11);
      };

      if (settings.deliveryMode === "business_radius" && businessOrigin) {
        const bounds = deliveryRadiusBounds(
          L,
          businessOrigin.lat,
          businessOrigin.lng,
          settings.deliveryRadiusMiles,
        );
        if (!safeFlyToBounds(bounds, [32, 32], 13)) {
          safeFlyTo(businessOrigin.lat, businessOrigin.lng, 12);
        }
        return;
      }

      if (settings.deliveryMode !== "postcode_zones") {
        return;
      }

      if (requestOverviewRef.current) {
        requestOverviewRef.current = false;
        initialCameraDoneRef.current = true;
        flyToHullOverview();
        return;
      }

      const features = sectorBoundaries?.features ?? [];

      if (mapFocus?.sector) {
        const sectorFeature = features.find(
          (feature) =>
            feature.properties.outward === mapFocus.outward && feature.properties.sector === mapFocus.sector,
        );
        if (sectorFeature && flyToFeatureBounds([sectorFeature], MAP_SECTOR_PADDING, 15)) {
          return;
        }
        const centroid = getHullSectorCentroid(mapFocus.outward, mapFocus.sector);
        if (centroid && safeFlyTo(centroid.lat, centroid.lng, 14.5)) {
          return;
        }
      }

      if (mapFocus?.outward) {
        const outwardFeatures = features.filter((feature) => feature.properties.outward === mapFocus.outward);
        if (flyToFeatureBounds(outwardFeatures, MAP_OUTWARD_PADDING, 13)) {
          return;
        }
        const center = HULL_AREA_OUTWARD_CENTROIDS[mapFocus.outward];
        if (center && safeFlyTo(center.lat, center.lng, 12.5)) {
          return;
        }
      }

      if (!initialCameraDoneRef.current) {
        initialCameraDoneRef.current = true;
        const enabledFeatures = features.filter((feature) => {
          const zone = zones.find((entry) => entry.code === feature.properties.outward);
          return zone != null && isHullZoneSectorEnabled(zone, feature.properties.sector);
        });
        if (flyToFeatureBounds(enabledFeatures, MAP_OVERVIEW_PADDING, 12)) {
          return;
        }
        flyToHullOverview();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    mapReady,
    settings.deliveryMode,
    settings.deliveryRadiusMiles,
    businessOrigin,
    zones,
    mapFocus,
    sectorBoundaries,
  ]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <label style={styles.field}>
        <span style={styles.darkFieldLabel}>Customer order options</span>
        <select
          style={styles.lightInput}
          value={settings.orderFulfillment}
          disabled={readOnly}
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
          Choose one method: radius delivery with one flat fee plus optional custom distance ranges, or Hull postcode
          blocks with a fee on each selected outward area.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          style={settings.deliveryMode === "business_radius" ? styles.modeButtonActive : styles.modeButton}
          disabled={readOnly}
          onClick={() => setMode("business_radius")}
        >
          Radius from business
        </button>
        <button
          type="button"
          style={settings.deliveryMode === "postcode_zones" ? styles.modeButtonActive : styles.modeButton}
          disabled={readOnly}
          onClick={() => {
            setMode("postcode_zones");
            setExpandedOutward(null);
            setActiveZoneCode(null);
            setMapFocus(null);
            initialCameraDoneRef.current = false;
            requestOverviewRef.current = true;
            if (settings.deliveryPostcodeZones.length === 0) {
              onChange({ deliveryPostcodeZones: createDefaultHullPostcodeZones() });
            }
          }}
        >
          Hull postcode areas
        </button>
      </div>
      <p style={{ ...styles.subtleInfo, margin: "0 0 4px" }}>
        Only the selected method is used for customer checkout and delivery fees. Other settings stay saved here so
        you can switch methods without starting again.
      </p>

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
        <div style={{ display: "grid", gap: 14 }}>
          <label style={styles.field}>
            <span style={styles.darkFieldLabel}>Delivery radius from your business (miles)</span>
            <input
              type="number"
              min={0.1}
              max={40}
              step={0.1}
              style={styles.lightInput}
              value={settings.deliveryRadiusMiles}
              disabled={readOnly}
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

          <label style={styles.field}>
            <span style={styles.darkFieldLabel}>Flat delivery fee (£)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              style={styles.lightInput}
              value={settings.deliveryFee}
              disabled={readOnly}
              onChange={(event) => onChange({ deliveryFee: Math.max(0, Number(event.target.value) || 0) })}
            />
            <p style={styles.subtleInfo}>Used across the radius unless one of the custom distance ranges below matches first.</p>
          </label>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <span style={styles.darkFieldLabel}>Custom distance ranges (£)</span>
              <p style={{ ...styles.subtleInfo, margin: "6px 0 0" }}>
                Add as many radius price blocks as you need. Hull Eats will use the first range that covers the customer.
              </p>
            </div>
            <div style={distanceRangeListStyle}>
              {radiusRanges.map((range, index) => (
                <div key={`${range.maxMiles}-${index}`} style={distanceRangeRowStyle}>
                  <label style={styles.field}>
                    <span style={styles.darkFieldLabel}>Up to miles</span>
                    <input
                      type="number"
                      min={0.1}
                      max={40}
                      step={0.1}
                      style={styles.lightInput}
                      value={range.maxMiles}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateDistanceRange(index, {
                          maxMiles: Math.min(40, Math.max(0.1, Number(event.target.value) || 0.1)),
                        })
                      }
                    />
                  </label>
                  <label style={styles.field}>
                    <span style={styles.darkFieldLabel}>Fee (£)</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      style={styles.lightInput}
                      value={range.fee}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateDistanceRange(index, {
                          fee: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    style={readOnly ? { ...styles.modeButton, opacity: 0.5, cursor: "not-allowed" } : styles.modeButton}
                    disabled={readOnly}
                    onClick={() => removeDistanceRange(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {radiusRanges.length === 0 ? (
                <p style={{ ...styles.subtleInfo, margin: 0 }}>No custom ranges yet. Customers will use the flat delivery fee above.</p>
              ) : null}
            </div>
            <div>
              <button
                type="button"
                style={readOnly ? { ...styles.modeButton, opacity: 0.5, cursor: "not-allowed" } : styles.modeButton}
                disabled={readOnly}
                onClick={addDistanceRange}
              >
                Add custom range
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <p style={styles.subtleInfo}>
            The map uses official open UK postcode sector boundaries (ONS / Royal Mail, via postcodes-mapit). Tick a sector
            to deliver there, then set the price for that outward block. Clicking the map now keeps focus on the map instead
            of jumping the page down the postcode list.
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
              disabled={!hasAnySectorSelected || readOnly}
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
                <div
                  key={code}
                  style={{
                    ...outwardRowStyle,
                    ...(expanded || isActive ? outwardRowExpandedStyle : {}),
                  }}
                >
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
                        setActiveZoneCode(null);
                        setMapFocus(null);
                        requestOverviewRef.current = true;
                      } else {
                        focusOutward(code);
                      }
                    }}
                  >
                    <span>{code}</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#5d6775" }}>
                      {selectedCount > 0 ? `${selectedCount} sector${selectedCount === 1 ? "" : "s"} on` : "None selected"}
                      {zone.fee != null ? ` / £${zone.fee.toFixed(2)}` : " / flat fee"}
                      {expanded ? " ▲" : " ▼"}
                    </span>
                  </button>
                  {expanded ? (
                    <>
                      <div style={postcodeFeeRowStyle}>
                        <label style={styles.field}>
                          <span style={styles.darkFieldLabel}>Price for {code} (£)</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            style={styles.lightInput}
                            value={zone.fee ?? ""}
                            disabled={readOnly}
                            placeholder={settings.deliveryFee > 0 ? settings.deliveryFee.toFixed(2) : "Uses flat fee"}
                            onChange={(event) => setZoneFee(code, event.target.value)}
                          />
                          <p style={styles.subtleInfo}>
                            Leave blank to fall back to the hub flat delivery fee. Enter `0` if this postcode block should be free.
                          </p>
                        </label>
                      </div>
                      <div style={sectorToolbarStyle}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#5d6775" }}>
                          Sectors for {code}
                        </span>
                        <button
                          type="button"
                          style={sectorToolbarButtonStyle}
                          disabled={readOnly}
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
                              disabled={readOnly}
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
