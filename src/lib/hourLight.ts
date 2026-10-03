/**
 * Hour Light: every glimpse is colored by the light at the hour it was taken.
 * Used for the swatch on catalogue labels, map dots, and the Now view's sky.
 */
export type HourBand = { key: string; name: string; color: string; ink: string; from: number; to: number };

export const HOUR_BANDS: HourBand[] = [
  { key: 'night', name: 'Night', color: '#2E3A5C', ink: '#F4F1EA', from: 21, to: 4 },
  { key: 'dawn', name: 'Dawn', color: '#F2B5A7', ink: '#1A1814', from: 5, to: 7 },
  { key: 'morning', name: 'Morning', color: '#F3D9A4', ink: '#1A1814', from: 8, to: 10 },
  { key: 'noon', name: 'Noon', color: '#F5F1E6', ink: '#1A1814', from: 11, to: 14 },
  { key: 'golden', name: 'Golden hour', color: '#E9B872', ink: '#1A1814', from: 15, to: 17 },
  { key: 'dusk', name: 'Dusk', color: '#C46A4A', ink: '#FFFFFF', from: 18, to: 20 },
];

export function bandForHour(hour: number): HourBand {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  return HOUR_BANDS.find((b) => (b.from <= b.to ? h >= b.from && h <= b.to : h >= b.from || h <= b.to))!;
}

/** "15:12" → the Golden hour band. Unknown time → Noon (neutral). */
export function bandFor(localTime: string | null | undefined): HourBand {
  if (!localTime) return HOUR_BANDS[3];
  return bandForHour(Number(localTime.slice(0, 2)));
}

/** A sky color for every hour, blended between bands — for the Now view's background. */
const SKY = [
  '#25304D', '#25304D', '#2A3554', '#34405E', '#4A4F6B', '#B98A8C', '#F2B5A7', '#F5C9A6',
  '#F3D9A4', '#F5E3BC', '#F5EBD2', '#F5F1E6', '#F5F1E6', '#F5EEDB', '#F3E4C4', '#EFCF97',
  '#E9B872', '#E2A062', '#C46A4A', '#8E5150', '#4E4560', '#34405E', '#2E3A5C', '#28324F',
];

export function skyForHour(hour: number): { bg: string; ink: string; soft: string } {
  const h = ((hour % 24) + 24) % 24;
  const dark = h <= 4 || h >= 19;
  return { bg: SKY[h], ink: dark ? '#F4F1EA' : '#1A1814', soft: dark ? 'rgba(244,241,234,0.72)' : 'rgba(26,24,20,0.62)' };
}
