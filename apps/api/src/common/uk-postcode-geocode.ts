import { parseUkOutwardCode } from "@hull-eats/types";

export type GeocodedPoint = {
  latitude: number;
  longitude: number;
  /** postcodes.io | google */
  source: string;
  /** Normalised postcode or outcode used for the lookup */
  label: string;
};

const formatUkPostcodeForDisplay = (compact: string): string => {
  const inward = compact.slice(-3);
  const outward = compact.slice(0, -3);
  return `${outward} ${inward}`;
};

export const normaliseUkPostcodeCompact = (postcode: string): string | null => {
  const compact = postcode.trim().toUpperCase().replace(/\s+/g, "");
  if (!compact) {
    return null;
  }
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact) && !/^[A-Z]{1,2}\d[A-Z\d]?$/.test(compact)) {
    return null;
  }
  return compact;
};

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const signal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(timeoutMs)
      : undefined;
  return fetch(url, { ...init, signal });
}

async function geocodeWithPostcodesIo(postcode: string): Promise<GeocodedPoint | null> {
  const compact = normaliseUkPostcodeCompact(postcode);
  if (!compact) {
    return null;
  }

  const spaced = formatUkPostcodeForDisplay(compact);
  const response = await fetchWithTimeout(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(spaced)}`,
    { headers: { Accept: "application/json" } },
    8_000,
  );

  if (response.ok) {
    const body = (await response.json()) as {
      status: number;
      result?: { latitude: number; longitude: number; postcode: string };
    };
    if (body.status === 200 && body.result) {
      return {
        latitude: body.result.latitude,
        longitude: body.result.longitude,
        source: "postcodes.io",
        label: body.result.postcode,
      };
    }
  }

  const outward = parseUkOutwardCode(compact);
  if (!outward) {
    return null;
  }

  const outResponse = await fetchWithTimeout(
    `https://api.postcodes.io/outcodes/${encodeURIComponent(outward)}`,
    { headers: { Accept: "application/json" } },
    8_000,
  );
  if (!outResponse.ok) {
    return null;
  }

  const outBody = (await outResponse.json()) as {
    status: number;
    result?: { latitude: number; longitude: number; outcode: string };
  };
  if (outBody.status !== 200 || !outBody.result) {
    return null;
  }

  return {
    latitude: outBody.result.latitude,
    longitude: outBody.result.longitude,
    source: "postcodes.io",
    label: outBody.result.outcode,
  };
}

async function geocodeWithGoogle(postcode: string, apiKey: string): Promise<GeocodedPoint | null> {
  const query = `${postcode.trim()}, UK`;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("region", "uk");

  const response = await fetchWithTimeout(url.toString(), {}, 8_000);
  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as {
    status: string;
    results?: Array<{ geometry: { location: { lat: number; lng: number } }; formatted_address: string }>;
  };

  if (body.status !== "OK" || !body.results?.[0]) {
    return null;
  }

  const hit = body.results[0];
  return {
    latitude: hit.geometry.location.lat,
    longitude: hit.geometry.location.lng,
    source: "google",
    label: hit.formatted_address,
  };
}

/**
 * Resolve a UK postcode (or outward) to WGS84 coordinates.
 * Prefers postcodes.io (free, UK-native). Falls back to Google Geocoding when
 * `GOOGLE_GEOCODING_API_KEY` or `GOOGLE_MAPS_GEOCODING_KEY` is set.
 */
export async function geocodeUkPostcode(postcode: string): Promise<GeocodedPoint | null> {
  const trimmed = postcode.trim();
  if (!trimmed) {
    return null;
  }

  const fromPostcodesIo = await geocodeWithPostcodesIo(trimmed);
  if (fromPostcodesIo) {
    return fromPostcodesIo;
  }

  const googleKey =
    process.env.GOOGLE_GEOCODING_API_KEY?.trim() || process.env.GOOGLE_MAPS_GEOCODING_KEY?.trim() || "";
  if (googleKey) {
    return geocodeWithGoogle(trimmed, googleKey);
  }

  return null;
}
