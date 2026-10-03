/** Time zones for cities in the archive, so the Now view can say where it's this hour right now. */
const CITY_TZ: Record<string, string> = {
  Lisbon: 'Europe/Lisbon',
  Boston: 'America/New_York',
  'New York': 'America/New_York',
  Tokyo: 'Asia/Tokyo',
  Kyoto: 'Asia/Tokyo',
  Fujiyoshida: 'Asia/Tokyo',
  'Hong Kong': 'Asia/Hong_Kong',
  Seoul: 'Asia/Seoul',
  Brighton: 'Europe/London',
  Oaxaca: 'America/Mexico_City',
  Rome: 'Europe/Rome',
  Paris: 'Europe/Paris',
  Berlin: 'Europe/Berlin',
  Melbourne: 'Australia/Melbourne',
  'San Francisco': 'America/Los_Angeles',
};

export function nowMs(): number {
  return Date.now();
}

/** The local hour (0–23) in a city right now, or null if we don't know its time zone. */
export function hourIn(city: string, at = nowMs()): number | null {
  const timeZone = CITY_TZ[city];
  if (!timeZone) return null;
  try {
    const h = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(at);
    return Number(h) % 24;
  } catch {
    return null;
  }
}

/** "3:12 pm" in that city right now. */
export function clockIn(city: string, at = nowMs()): string | null {
  const timeZone = CITY_TZ[city];
  if (!timeZone) return null;
  try {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(at).toLowerCase();
  } catch {
    return null;
  }
}

export const KNOWN_CITIES = Object.keys(CITY_TZ);
