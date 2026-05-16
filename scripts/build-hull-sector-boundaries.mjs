/**
 * Build apps/merchant-portal/public/geo/hull-postcode-sectors.geojson from the
 * open GB postcode boundary archive (NSUL Voronoi unions, postcodes-mapit).
 *
 * Prerequisite — download once (~1GB):
 *   curl -L -o .cache/gb-postcodes-v5.tar.bz2 \
 *     https://postcodes-mapit-static.s3.eu-west-2.amazonaws.com/data/gb-postcodes-v5.tar.bz2
 *
 * Usage: node scripts/build-hull-sector-boundaries.mjs
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tarPath = join(root, ".cache", "gb-postcodes-v5.tar.bz2");
const extractRoot = join(root, ".cache", "gb-postcodes-v5-sectors");
const outPath = join(root, "apps", "merchant-portal", "public", "geo", "hull-postcode-sectors.geojson");

const HULL_OUTWARDS = [
  "HU1", "HU2", "HU3", "HU4", "HU5", "HU6", "HU7", "HU8", "HU9",
  "HU10", "HU11", "HU12", "HU13", "HU14", "HU15", "HU16",
];

const parseSectorFile = (fileName) => {
  const match = fileName.match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)\s+(\d)\.geojson$/i);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const outward = match[1].toUpperCase();
  const sector = match[2];
  if (!HULL_OUTWARDS.includes(outward) || !/^[1-9]$/.test(sector)) {
    return null;
  }
  return { outward, sector };
};

const extractHullSectorsFromTar = () => {
  mkdirSync(extractRoot, { recursive: true });
  const tarArgs = ["-xjf", tarPath, "-C", extractRoot, ...HULL_OUTWARDS.map((code) => `gb-postcodes-v5/sectors/${code}`)];
  console.log("Extracting Hull sector folders from archive (one tar pass)…");
  const result = spawnSync("tar", tarArgs, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(result.stderr || "tar extract failed");
  }
};

const mergeFromExtractedTree = () => {
  const sectorsRoot = join(extractRoot, "gb-postcodes-v5", "sectors");
  const features = [];

  for (const outward of HULL_OUTWARDS) {
    const outwardDir = join(sectorsRoot, outward);
    if (!existsSync(outwardDir)) {
      continue;
    }
    for (const fileName of readdirSync(outwardDir)) {
      const parsed = parseSectorFile(fileName);
      if (!parsed) {
        continue;
      }
      const raw = readFileSync(join(outwardDir, fileName), "utf8");
      const geometry = JSON.parse(raw);
      features.push({
        type: "Feature",
        properties: {
          outward: parsed.outward,
          sector: parsed.sector,
          label: `${parsed.outward} ${parsed.sector}`,
        },
        geometry: geometry.type === "Feature" ? geometry.geometry : geometry,
      });
      console.log("Added", parsed.outward, parsed.sector);
    }
  }

  return features;
};

if (!existsSync(tarPath)) {
  console.error(`Missing ${tarPath}`);
  process.exit(1);
}

if (!existsSync(join(extractRoot, "gb-postcodes-v5", "sectors", "HU1"))) {
  extractHullSectorsFromTar();
}

const features = mergeFromExtractedTree();
if (features.length === 0) {
  throw new Error("No sector polygons found — check archive download.");
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  `${JSON.stringify({
    type: "FeatureCollection",
    metadata: {
      source: "postcodes-mapit gb-postcodes-v5 (ONS NSUL Voronoi unions, OGL)",
      generatedAt: new Date().toISOString(),
      featureCount: features.length,
    },
    features,
  })}\n`,
  "utf8",
);
console.log(`Wrote ${features.length} features to ${outPath}`);
