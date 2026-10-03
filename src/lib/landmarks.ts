/**
 * Each city's mosaic picture: as you collect glimpses of a city, they become the tiles of
 * one famous view of it. Images are from Unsplash (Unsplash License) — see DEMO_PHOTO_CREDITS.md.
 */
export type Landmark = { title: string; unsplash: string; credit: string };

export const LANDMARKS: Record<string, Landmark> = {
  Boston: { title: 'The harbor skyline', unsplash: 'photo-1565127803082-69dd82351360', credit: 'jacob Licht' },
  Lisbon: { title: 'Rooftops down to the river', unsplash: 'photo-1501927023255-9063be98970c', credit: 'Liam McKay' },
  Tokyo: { title: 'The city that never stops', unsplash: 'photo-1498036882173-b41c28a8ba34', credit: 'Pawel Nolbert' },
  Kyoto: { title: 'A pagoda in the trees', unsplash: 'photo-1545569341-9eb8b30979d9', credit: 'Su San Lee' },
  Paris: { title: 'The tower', unsplash: 'photo-1549144511-f099e773c147', credit: 'cyril mzn' },
  'New York': { title: 'The Manhattan Bridge', unsplash: 'photo-1492666673288-3c4b4576ad9a', credit: 'Redd Francisco' },
  'Hong Kong': { title: 'Victoria Harbour at night', unsplash: 'photo-1689817675970-130577e6c247', credit: 'Emma Lau' },
  Fujiyoshida: { title: 'Fuji over the pagoda', unsplash: 'photo-1528164344705-47542687000d', credit: 'Manuel Cosentino' },
};

/**
 * Mosaic levels. Each level is a finer picture: more tiles, more detail.
 * cols × rows = tiles; tiles are square, so the picture is cols:rows in shape.
 */
export const MOSAIC_LEVELS = [
  { tiles: 24, cols: 4, rows: 6, name: 'Sketch' },
  { tiles: 60, cols: 6, rows: 10, name: 'Study' },
  { tiles: 120, cols: 8, rows: 15, name: 'Portrait' },
  { tiles: 200, cols: 10, rows: 20, name: 'Masterpiece' },
] as const;

export type MosaicLevel = (typeof MOSAIC_LEVELS)[number];

/** The level you're working on now (the first one not yet complete), and the one you finished. */
export function mosaicProgress(collected: number) {
  const current = MOSAIC_LEVELS.find((l) => collected < l.tiles) ?? MOSAIC_LEVELS[MOSAIC_LEVELS.length - 1];
  const completed = [...MOSAIC_LEVELS].reverse().find((l) => collected >= l.tiles) ?? null;
  return { current, completed, remaining: Math.max(0, current.tiles - collected) };
}

export function landmarkUrl(landmark: Landmark, w: number, h: number): string {
  return `https://images.unsplash.com/${landmark.unsplash}?w=${w}&h=${h}&fit=crop&crop=entropy&auto=format&q=75`;
}

/** Cities without a chosen view still get a mosaic, drawn over a quiet paper texture. */
export function landmarkFor(city: string): Landmark | null {
  return LANDMARKS[city] ?? null;
}
