import type { HullSectorDigit } from "./delivery-pricing";

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
