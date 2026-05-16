import type { HullSectorDigit } from "./delivery-pricing";
import { HULL_SECTOR_BOUNDARY_INDEX } from "./hull-sector-boundaries-index.generated";

export type HullSectorBoundaryProperties = {
  outward: string;
  sector: HullSectorDigit;
  label: string;
};

type HullSectorGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type HullSectorBoundaryFeature = {
  type: "Feature";
  properties: HullSectorBoundaryProperties;
  geometry: HullSectorGeometry;
};

export type HullSectorBoundaryCollection = {
  type: "FeatureCollection";
  metadata?: {
    source?: string;
    generatedAt?: string;
    featureCount?: number;
  };
  features: HullSectorBoundaryFeature[];
};

export const hullSectorBoundaryKey = (outward: string, sector: string) =>
  `${outward.trim().toUpperCase()}|${sector.trim()}`;

/** Sector digits that have a real boundary polygon in the bundled Hull GeoJSON. */
export const listHullSectorsForOutward = (outwardCode: string): readonly HullSectorDigit[] => {
  const outward = outwardCode.trim().toUpperCase();
  const sectors = HULL_SECTOR_BOUNDARY_INDEX[outward] ?? [];
  return [...sectors].sort((left, right) => Number(left) - Number(right));
};
