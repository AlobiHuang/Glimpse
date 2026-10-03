/**
 * EXIF comes back in different shapes on iOS and Android:
 * iOS nests groups ({Exif}, {GPS}, {TIFF}); Android returns a flat object.
 * This flattens both and pulls out what Glimpse shows in the photo info panel.
 */

type Exif = Record<string, unknown> | null | undefined;

export type ParsedExif = {
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  camera: string | null;
  /** iOS marks screenshots in the EXIF user comment. */
  screenshot: boolean;
};

function flatten(exif: Exif): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!exif) return out;
  for (const [key, value] of Object.entries(exif)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && key.startsWith('{')) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        // Prefix GPS keys so {GPS}.Latitude becomes GPSLatitude, matching Android.
        const name = key === '{GPS}' && !k.startsWith('GPS') ? `GPS${k}` : k;
        if (!(name in out)) out[name] = v;
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    // Android sometimes returns "40/1,44/1,3012/100" (degrees, minutes, seconds).
    if (value.includes('/')) {
      const parts = value.split(',').map((p) => {
        const [n, d] = p.split('/').map(Number);
        return d ? n / d : n;
      });
      if (parts.every(Number.isFinite)) {
        const [deg = 0, min = 0, sec = 0] = parts;
        return deg + min / 60 + sec / 3600;
      }
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function coordinate(value: unknown, ref: unknown, negativeRef: 'S' | 'W'): number | null {
  const n = toNumber(value);
  if (n === null) return null;
  const isNegative = typeof ref === 'string' && ref.toUpperCase().startsWith(negativeRef);
  return isNegative ? -Math.abs(n) : n;
}

/** EXIF dates look like "2024:05:01 18:22:10" (local time, no zone). */
function parseExifDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  const date = new Date(y, mo - 1, d, h, mi, s);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseExif(exif: Exif): ParsedExif {
  const f = flatten(exif);

  const make = typeof f.Make === 'string' ? f.Make.trim() : '';
  const model = typeof f.Model === 'string' ? f.Model.trim() : '';
  const camera = model.startsWith(make) ? model : [make, model].filter(Boolean).join(' ');

  const latitude = coordinate(f.GPSLatitude, f.GPSLatitudeRef, 'S');
  const longitude = coordinate(f.GPSLongitude, f.GPSLongitudeRef, 'W');
  const hasGps = latitude !== null && longitude !== null && !(latitude === 0 && longitude === 0);

  return {
    takenAt: parseExifDate(f.DateTimeOriginal ?? f.DateTimeDigitized ?? f.DateTime),
    latitude: hasGps ? latitude : null,
    longitude: hasGps ? longitude : null,
    camera: camera || null,
    screenshot: typeof f.UserComment === 'string' && /screenshot/i.test(f.UserComment),
  };
}
