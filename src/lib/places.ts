/** "Alfama, Lisbon" → "alfama-lisbon". Glimpses with the same key stack into one place's Layers. */
export function placeKeyOf(placeName: string | null | undefined): string | null {
  if (!placeName) return null;
  const key = placeName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return key || null;
}

const NORTHERN_SEASONS = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter'];
const FLIP: Record<string, string> = { Winter: 'Summer', Summer: 'Winter', Spring: 'Autumn', Autumn: 'Spring' };

/** Season where the photo was taken (flipped south of the equator). */
export function seasonOf(iso: string | null, latitude: number | null): string | null {
  if (!iso) return null;
  const s = NORTHERN_SEASONS[new Date(iso).getMonth()];
  return latitude !== null && latitude < 0 ? FLIP[s] : s;
}

/** "15:12" → "3:12 pm" */
export function clock(localTime: string | null): string | null {
  if (!localTime) return null;
  const [h, m] = localTime.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "Tue 14 Oct 2025" */
export function catalogDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** "No. 38,201" */
export function catalogNumber(n: number): string {
  return `No. ${n.toLocaleString('en-US')}`;
}

/** Hour label for the Now view: 0 → "Midnight", 15 → "3 pm". */
export function hourLabel(h: number): string {
  if (h === 0) return 'Midnight';
  if (h === 12) return 'Noon';
  return `${h % 12} ${h < 12 ? 'am' : 'pm'}`;
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd". */
export function ordinal(n: number): string {
  const s = n % 100;
  if (s >= 11 && s <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** "Alfama, Lisbon" → "Lisbon" (the last part is taken as the city). */
export function cityFromPlace(placeName: string): string | null {
  const parts = placeName.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}
