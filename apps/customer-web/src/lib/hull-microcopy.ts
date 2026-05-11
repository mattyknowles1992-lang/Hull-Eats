/** Small Hull-flavoured lines from time-of-day + optional weather (no API keys). */

export type WeatherBucket = "clear" | "cloud" | "wet" | "unknown";

export function timeBand(date: Date): "morning" | "midday" | "evening" | "night" {
  const h = date.getHours();
  if (h >= 5 && h < 11) {
    return "morning";
  }
  if (h >= 11 && h < 16) {
    return "midday";
  }
  if (h >= 16 && h < 22) {
    return "evening";
  }
  return "night";
}

/** WMO weather interpretation (Open-Meteo current_weather.weathercode). */
export function wmoToBucket(code: number): WeatherBucket {
  if (code === 0 || code === 1) {
    return "clear";
  }
  if (code >= 2 && code <= 48) {
    return "cloud";
  }
  if (code >= 51 && code <= 99) {
    return "wet";
  }
  return "unknown";
}

export function seasonHint(date: Date): "winter" | "summer" | "mid" {
  const m = date.getMonth();
  if (m === 11 || m <= 1) {
    return "winter";
  }
  if (m >= 5 && m <= 8) {
    return "summer";
  }
  return "mid";
}

export function buildHullMicrocopy(date: Date, weather: WeatherBucket, tempC: number | null): string {
  const band = timeBand(date);
  const season = seasonHint(date);
  const chilly = tempC !== null && tempC < 6;

  const lines: Record<"morning" | "midday" | "evening" | "night", Record<WeatherBucket, string[]>> = {
    morning: {
      clear: [
        "Bright start over Hull — good morning for a hot breakfast run.",
        "Clear skies this morning; your local kitchens are waking up too.",
      ],
      cloud: [
        "Soft Hull light this morning — still a great time to line up lunch early.",
        "Grey-sky Hull morning: comfort food weather without leaving the sofa.",
      ],
      wet: [
        "Rain on the tiles in Hull — delivery was invented for mornings like this.",
        "Wet start out there; let someone else do the dash down Beverley Road.",
      ],
      unknown: [
        "Hull’s awake — start the kettle, then start the browse.",
        "Morning in HU — local spots are gearing up for the lunch rush.",
      ],
    },
    midday: {
      clear: [
        "Lunch-hour Hull with blue gaps in the cloud — ideal for a quick drop-off.",
        "Clear enough to pop out, lazy enough to still order in. We get it.",
      ],
      cloud: [
        "Typical Hull midday: bright enough to be busy, cloudy enough to crave carbs.",
        "Overcast but mild — perfect excuse for something warm from a local menu.",
      ],
      wet: [
        "Rain at lunchtime in Hull — your table’s dry even if the street isn’t.",
        "Showers about: let couriers handle the puddles while you handle the sides.",
      ],
      unknown: [
        "Hull midday energy — kitchens are on, couriers are plotting the fastest cut-through.",
        "HU lunch window: same city, new orders cycling through every minute.",
      ],
    },
    evening: {
      clear: [
        "Clear Hull evening — sunset colours, takeaway bags, no drama.",
        "Dry skies after work; treat tonight like a mini Friday on the Humber.",
      ],
      cloud: [
        "Hull evening under a lid of cloud — streetlights on, ovens hotter.",
        "Moody skies, warm kitchens: classic HU tea-time setup.",
      ],
      wet: [
        "Wet Hull evening — the kettle, the telly, and a driver three minutes out.",
        "Rain drumming on the bay: perfect night to let Hull Eats do the legwork.",
      ],
      unknown: [
        "Evening slot in Hull — peak “what’s in the fridge?” energy. Answer: not enough.",
        "HU after dark: fewer queues at the lights, more bags at the door.",
      ],
    },
    night: {
      clear: [
        "Quiet clear night over Hull — late kitchens and honest cravings.",
        "Stars out, stomach rumbling: the city’s smallest hours still deliver.",
      ],
      cloud: [
        "Hull night with low cloud — neon, drizzle, and something spicy in a bag.",
        "Late HU cloud blanket — still plenty of lights on in the back kitchens.",
      ],
      wet: [
        "Rainy Hull night — slippers weather, not “run to the shop” weather.",
        "Wet streets, warm food: the Hull night shift in one sentence.",
      ],
      unknown: [
        "Hull after hours — fewer cars, same appetite.",
        "Night orders in HU: when the city slows, supper speeds up.",
      ],
    },
  };

  const pool = lines[band][weather] ?? lines[band].unknown;
  const base = pool[Math.floor((date.getMinutes() + date.getHours()) % pool.length)]!;

  if (chilly && season === "winter") {
    return `${base} Wrap up — it’s a chilly one out there.`;
  }
  if (tempC !== null && tempC >= 22 && season === "summer") {
    return `${base} Warm evening — cold drinks travel well.`;
  }

  return base;
}
