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

import { useHubPortalI18n } from "@hull-eats/i18n";

import { HubFreeTypeNumberInput } from "./hub-free-type-number-input";

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

const MAP_SECTOR_PADDING: [number, number] = [40, 40];
const MAP_OUTWARD_PADDING: [number, number] = [36, 36];
const MAP_OVERVIEW_PADDING: [number, number] = [40, 40];

/** Consistent camera when selecting Hull postcode areas on the map. */
const HULL_SECTOR_MAX_ZOOM = 14.5;
const HULL_OUTWARD_MAX_ZOOM = 13.25;
const HULL_ENABLED_MAX_ZOOM = 12.75;

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

const sectorToolbarButtonStyle: CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid rgba(7, 155, 200, 0.45)",
  background: "linear-gradient(180deg, rgba(35, 205, 255, 0.18), rgba(7, 155, 200, 0.08))",
  fontWeight: 800,
  fontSize: "0.72rem",
  color: "#0a4d66",
  cursor: "pointer",
};

const outwardRowExpandedStyle: CSSProperties = {
  boxShadow: "0 10px 28px rgba(7, 155, 200, 0.1)",
  transition: "box-shadow 0.28s ease",
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
  const { t } = useHubPortalI18n();
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapStickyRef = useRef<HTMLDivElement | null>(null);
  const mapSentinelRef = useRef<HTMLDivElement | null>(null);
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
  const [mapPinned, setMapPinned] = useState(false);
  const [mapStickyHeight, setMapStickyHeight] = useState(320);

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
    (outwardCode: string, nextFee: number | null) => {
      if (readOnly) {
        return;
      }
      const upper = outwardCode.toUpperCase();
      patchZones(
        zonesRef.current.map((zone) =>
          zone.code !== upper
            ? zone
            : {
                ...zone,
                fee: nextFee == null ? null : Number(nextFee.toFixed(2)),
              },
        ),
      );
    },
    [readOnly],
  );

  const setZoneMinimumOrder = useCallback(
    (outwardCode: string, nextMinimum: number | null) => {
      if (readOnly) {
        return;
      }
      const upper = outwardCode.toUpperCase();
      patchZones(
        zonesRef.current.map((zone) =>
          zone.code !== upper
            ? zone
            : {
                ...zone,
                minimumOrderAmount: nextMinimum == null ? null : Number(nextMinimum.toFixed(2)),
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
      deliveryDistanceRanges: [
        ...radiusRanges,
        {
          maxMiles: Math.max(0.5, nextMaxMiles),
          fee: settings.deliveryFee,
          minimumOrderAmount: settings.minimumOrderAmount,
        },
      ],
    });
  }, [onChange, radiusRanges, readOnly, settings.deliveryFee, settings.minimumOrderAmount]);

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
        if (sectorFeature && flyToFeatureBounds([sectorFeature], MAP_SECTOR_PADDING, HULL_SECTOR_MAX_ZOOM)) {
          return;
        }
        const centroid = getHullSectorCentroid(mapFocus.outward, mapFocus.sector);
        if (centroid && safeFlyTo(centroid.lat, centroid.lng, HULL_SECTOR_MAX_ZOOM)) {
          return;
        }
      }

      if (mapFocus?.outward) {
        const outwardFeatures = features.filter((feature) => feature.properties.outward === mapFocus.outward);
        if (flyToFeatureBounds(outwardFeatures, MAP_OUTWARD_PADDING, HULL_OUTWARD_MAX_ZOOM)) {
          return;
        }
        const center = HULL_AREA_OUTWARD_CENTROIDS[mapFocus.outward];
        if (center && safeFlyTo(center.lat, center.lng, HULL_OUTWARD_MAX_ZOOM)) {
          return;
        }
      }

      if (!initialCameraDoneRef.current) {
        initialCameraDoneRef.current = true;
        const enabledFeatures = features.filter((feature) => {
          const zone = zones.find((entry) => entry.code === feature.properties.outward);
          return zone != null && isHullZoneSectorEnabled(zone, feature.properties.sector);
        });
        if (flyToFeatureBounds(enabledFeatures, MAP_OVERVIEW_PADDING, HULL_ENABLED_MAX_ZOOM)) {
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    const refreshSize = () => {
      try {
        map.invalidateSize();
      } catch {
        // Leaflet can throw if the map was torn down mid-resize (Safari navigation).
      }
    };

    refreshSize();
    const t1 = window.setTimeout(refreshSize, 120);
    const t2 = window.setTimeout(refreshSize, 480);
    window.addEventListener("resize", refreshSize);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", refreshSize);
    };
  }, [mapReady, settings.deliveryMode]);

  useEffect(() => {
    const node = mapStickyRef.current;
    if (!node) {
      return;
    }

    const measure = () => {
      setMapStickyHeight(node.offsetHeight);
    };

    measure();
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    resizeObserver?.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [mapReady, pinGeocodeNote]);

  useEffect(() => {
    const sentinel = mapSentinelRef.current;
    if (!sentinel || !mapReady) {
      return;
    }

    const mobileQuery = window.matchMedia("(max-width: 960px)");
    let observer: IntersectionObserver | null = null;

    const readStickyTopPx = () => {
      const raw =
        getComputedStyle(document.documentElement).getPropertyValue("--hub-map-sticky-top").trim() || "0px";
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const connect = () => {
      observer?.disconnect();
      observer = null;

      const desktopSplit =
        window.matchMedia("(min-width: 961px)").matches && settings.deliveryMode === "postcode_zones";
      if (desktopSplit) {
        setMapPinned(false);
        return;
      }

      if (!mobileQuery.matches && settings.deliveryMode !== "postcode_zones") {
        setMapPinned(false);
        return;
      }

      const topPx = readStickyTopPx();
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) {
            return;
          }
          setMapPinned(!entry.isIntersecting);
        },
        { threshold: [0, 1], rootMargin: `-${topPx}px 0px 0px 0px` },
      );
      observer.observe(sentinel);
    };

    connect();
    mobileQuery.addEventListener("change", connect);
    return () => {
      mobileQuery.removeEventListener("change", connect);
      observer?.disconnect();
    };
  }, [mapReady, settings.deliveryMode]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // Leaflet can throw if the map was torn down mid-resize.
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [mapReady, settings.deliveryMode]);

  useEffect(() => {
    if (!mapPinned) {
      return;
    }
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // Leaflet can throw if the map was torn down mid-resize.
      }
    }, 60);
    return () => window.clearTimeout(timer);
  }, [mapPinned]);

  const isPostcodeZones = settings.deliveryMode === "postcode_zones";

  const deliveryMapBlock = (
    <div
      className={`he-delivery-map-anchor${isPostcodeZones ? " he-delivery-map-anchor--zone-workspace" : ""}`}
    >
      <div ref={mapSentinelRef} className="he-delivery-map-sentinel" aria-hidden />
      {mapPinned ? (
        <div className="he-delivery-map-sticky-placeholder" style={{ height: mapStickyHeight }} aria-hidden />
      ) : null}
      <div ref={mapStickyRef} className={`he-delivery-map-sticky${mapPinned ? " is-pinned" : ""}`}>
        <div ref={mapHostRef} className="he-delivery-map-frame" aria-label={t("delivery.hullDeliveryMap")} />
        {pinGeocodeNote ? <p style={{ ...styles.subtleInfo, margin: "8px 0 0" }}>{pinGeocodeNote}</p> : null}
      </div>
    </div>
  );

  const postcodeZonesPanel = (
    <div className="he-postcode-zones-workspace__list" style={{ display: "grid", gap: 14 }}>
      <p style={styles.subtleInfo}>
        The map uses official open UK postcode sector boundaries (ONS / Royal Mail, via postcodes-mapit). Tick a sector to
        deliver there, then set the price for that outward block. On desktop the map stays beside this list while you scroll.
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
                  <div className="he-postcode-zone-fees">
                    <label className="he-postcode-zone-fees__field">
                      <span className="he-postcode-zone-fees__label">Delivery fee for {code} (£)</span>
                      <HubFreeTypeNumberInput
                        nullable
                        min={0}
                        className="he-postcode-zone-fees__input"
                        value={zone.fee}
                        disabled={readOnly}
                        placeholder={settings.deliveryFee > 0 ? settings.deliveryFee.toFixed(2) : "Uses flat fee"}
                        onCommit={(fee) => setZoneFee(code, fee)}
                      />
                      <p className="he-postcode-zone-fees__hint">
                        Blank = hub flat fee. <code>0</code> = free for this block.
                      </p>
                    </label>
                    <label className="he-postcode-zone-fees__field">
                      <span className="he-postcode-zone-fees__label">Minimum order for {code} (£)</span>
                      <HubFreeTypeNumberInput
                        nullable
                        min={0}
                        className="he-postcode-zone-fees__input"
                        value={zone.minimumOrderAmount}
                        disabled={readOnly}
                        placeholder={
                          settings.minimumOrderAmount > 0 ? settings.minimumOrderAmount.toFixed(2) : "Uses flat minimum"
                        }
                        onCommit={(minimumOrderAmount) => setZoneMinimumOrder(code, minimumOrderAmount)}
                      />
                      <p className="he-postcode-zone-fees__hint">Blank = hub flat minimum for this block.</p>
                    </label>
                  </div>
                  <div className="he-postcode-sector-toolbar">
                    <span className="he-postcode-sector-toolbar__label">Sectors for {code}</span>
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
                  <div className="he-postcode-sector-panel">
                    {availableSectors.length === 0 ? (
                      <p style={{ ...styles.subtleInfo, margin: 0, gridColumn: "1 / -1", fontSize: "0.72rem" }}>
                        No sector boundaries in map data for {code}.
                      </p>
                    ) : null}
                    {availableSectors.map((digit) => {
                      const checked = isHullZoneSectorEnabled(zone, digit);
                      return (
                        <label
                          key={`${code}-${digit}`}
                          className={checked ? "he-postcode-sector-chip is-on" : "he-postcode-sector-chip"}
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
  );

  return (
    <div className="he-delivery-config-panel" style={{ display: "grid", gap: 18 }}>
      <label style={styles.field}>
        <span style={styles.darkFieldLabel}>{t("delivery.customerOrderOptions")}</span>
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
          {t("delivery.customerOrderOptionsHint")}
        </p>
      </label>

      <div>
        <p style={styles.eyebrow}>{t("delivery.deliveryArea")}</p>
        <h2 style={{ ...styles.sectionTitle, marginTop: 6, marginBottom: 8 }}>{t("delivery.deliveryCoverageTitle")}</h2>
        <p style={{ ...styles.panelCopy, margin: 0, maxWidth: 720 }}>{t("delivery.deliveryCoverageCopy")}</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          style={settings.deliveryMode === "business_radius" ? styles.modeButtonActive : styles.modeButton}
          disabled={readOnly}
          onClick={() => setMode("business_radius")}
        >
          {t("delivery.radiusFromBusiness")}
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
          {t("delivery.hullPostcodeAreas")}
        </button>
      </div>
      <p style={{ ...styles.subtleInfo, margin: "0 0 4px" }}>{t("delivery.deliveryModeLockHint")}</p>

      {isPostcodeZones ? (
        <div className="he-postcode-zones-workspace">
          {deliveryMapBlock}
          {postcodeZonesPanel}
        </div>
      ) : (
        <>
          {deliveryMapBlock}
      {settings.deliveryMode === "business_radius" ? (
        <div style={{ display: "grid", gap: 14 }}>
          <label style={styles.field}>
            <span style={styles.darkFieldLabel}>Delivery radius from your business (miles)</span>
            <HubFreeTypeNumberInput
              min={0.1}
              max={40}
              style={styles.lightInput}
              value={settings.deliveryRadiusMiles}
              disabled={readOnly}
              onCommit={(deliveryRadiusMiles) => onChange({ deliveryRadiusMiles })}
            />
            <p style={styles.subtleInfo}>
              Orange circle shows your delivery radius. The shop pin is placed from your hub postcode using UK postcode
              lookup (postcodes.io) when you save or update the postcode.
            </p>
          </label>

          <label style={styles.field}>
            <span style={styles.darkFieldLabel}>Flat delivery fee (£)</span>
            <HubFreeTypeNumberInput
              min={0}
              style={styles.lightInput}
              value={settings.deliveryFee}
              disabled={readOnly}
              onCommit={(deliveryFee) => onChange({ deliveryFee })}
            />
            <p style={styles.subtleInfo}>Used across the radius unless one of the custom distance ranges below matches first.</p>
          </label>

          <label style={styles.field}>
            <span style={styles.darkFieldLabel}>Flat minimum order (£)</span>
            <HubFreeTypeNumberInput
              min={0}
              style={styles.lightInput}
              value={settings.minimumOrderAmount}
              disabled={readOnly}
              onCommit={(minimumOrderAmount) => onChange({ minimumOrderAmount })}
            />
            <p style={styles.subtleInfo}>Default minimum for nearby delivery. Custom ranges and postcode blocks can override this.</p>
          </label>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <span style={styles.darkFieldLabel}>Custom distance ranges</span>
              <p style={{ ...styles.subtleInfo, margin: "6px 0 0" }}>
                Set delivery fee and minimum order per distance band. Hull Eats uses the first range that covers the customer.
              </p>
            </div>
            <div style={distanceRangeListStyle}>
              {radiusRanges.map((range, index) => (
                <div key={`${range.maxMiles}-${index}`} style={distanceRangeRowStyle}>
                  <label style={styles.field}>
                    <span style={styles.darkFieldLabel}>Up to miles</span>
                    <HubFreeTypeNumberInput
                      min={0.1}
                      max={40}
                      style={styles.lightInput}
                      value={range.maxMiles}
                      disabled={readOnly}
                      onCommit={(maxMiles) => updateDistanceRange(index, { maxMiles })}
                    />
                  </label>
                  <label style={styles.field}>
                    <span style={styles.darkFieldLabel}>Fee (£)</span>
                    <HubFreeTypeNumberInput
                      min={0}
                      style={styles.lightInput}
                      value={range.fee}
                      disabled={readOnly}
                      onCommit={(fee) => updateDistanceRange(index, { fee })}
                    />
                  </label>
                  <label style={styles.field}>
                    <span style={styles.darkFieldLabel}>Min order (£)</span>
                    <HubFreeTypeNumberInput
                      nullable
                      min={0}
                      style={styles.lightInput}
                      value={range.minimumOrderAmount ?? null}
                      disabled={readOnly}
                      placeholder={settings.minimumOrderAmount > 0 ? settings.minimumOrderAmount.toFixed(2) : "Uses flat minimum"}
                      onCommit={(minimumOrderAmount) => updateDistanceRange(index, { minimumOrderAmount })}
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
      ) : null}
        </>
      )}
    </div>
  );
}
