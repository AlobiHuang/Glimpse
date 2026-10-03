import type { LocationPrecision } from './types';

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, 'y'],
    [60 * 60 * 24 * 30, 'mo'],
    [60 * 60 * 24 * 7, 'w'],
    [60 * 60 * 24, 'd'],
    [60 * 60, 'h'],
    [60, 'm'],
  ];
  for (const [size, label] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }
  return 'just now';
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function coords(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`;
}

/**
 * Applies the uploader's privacy choice before anything leaves the phone.
 * "approximate" rounds to 2 decimals (~1 km), so a home address can't be pinpointed.
 */
export function applyPrecision(
  lat: number | null,
  lng: number | null,
  precision: LocationPrecision,
): { latitude: number | null; longitude: number | null } {
  if (lat === null || lng === null || precision === 'hidden') return { latitude: null, longitude: null };
  if (precision === 'approximate') {
    return { latitude: Math.round(lat * 100) / 100, longitude: Math.round(lng * 100) / 100 };
  }
  return { latitude: lat, longitude: lng };
}

/** A small square version of a photo, for map pins. Unsplash images are resized by the CDN. */
export function thumbUrl(url: string, size = 160): string {
  if (!url.includes('images.unsplash.com')) return url;
  const u = url.replace(/([?&])w=\d+/, `$1w=${size}`).replace(/([?&])h=\d+/, `$1h=${size}`);
  return u.includes('fit=') ? u : `${u}&fit=crop`;
}
