/**
 * The basic checks every glimpse goes through before it can join the shared archive.
 * They run on the phone, on a small copy of the photo (see photoPixels.ts), in well under a second.
 *
 * A photo that doesn't pass is never rejected: it stays on your own map ("Your world") and the
 * app says why. Only photos that pass are shared with everyone, and only the best of those are
 * later Featured on the home screen.
 *
 * Two kinds of check:
 *  - hard (a screenshot, a duplicate): the photo stays on your map, full stop.
 *  - soft (small, soft focus, very dark): a measurement can be wrong — fog and night scenes are
 *    meant to look like that — so you can choose "Share anyway". That choice is recorded, and
 *    such photos are never Featured automatically; a person has to pick them.
 *
 * Thresholds were tuned on the sample photos (sharp ones score 200–4000) and blurred copies of
 * them (a 1.5 px blur at 640 px scores ~10). The server should repeat these checks before anything
 * is Featured — a phone can be tampered with.
 */
import { getText, setText } from './prefs';

export type Pixels = { width: number; height: number; data: Uint8Array | Uint8ClampedArray }; // RGBA

export type CheckKey = 'size' | 'sharp' | 'exposure' | 'photo' | 'new';
export type Check = { key: CheckKey; ok: boolean; label: string; why?: string; soft: boolean };

export type QualityReport = {
  /** True when every check passed: the glimpse can join the shared archive. */
  passed: boolean;
  /** True when a hard check failed: it can only stay on your own map. */
  blocked: boolean;
  checks: Check[];
  /** 64-bit difference hash (16 hex chars), for spotting duplicates. Null if the image couldn't be read. */
  hash: string | null;
  metrics: { shortSide: number | null; sharpness: number | null; brightness: number | null; dark: number | null; bright: number | null };
};

/** Shortest side, in pixels, of a photo the archive will share. */
export const MIN_SHORT_SIDE = 1000;
/** Width of the copy the checks look at. */
export const ANALYSIS_WIDTH = 640;
/** Variance of the Laplacian on the 640-px copy. Sharp photos score ~200–4000; blurred ones < 20. */
export const MIN_SHARPNESS = 40;
/** Two photos whose hashes differ in this many bits or fewer are the same picture. */
export const DUPLICATE_BITS = 6;

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Grayscale copy of the pixels. */
function gray(p: Pixels): Float32Array {
  const out = new Float32Array(p.width * p.height);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) out[i] = luma(p.data[j], p.data[j + 1], p.data[j + 2]);
  return out;
}

/** How much fine detail there is: variance of the Laplacian (a standard blur measure). */
export function sharpness(g: Float32Array, w: number, h: number): number {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = g[i - w] + g[i + w] + g[i - 1] + g[i + 1] - 4 * g[i];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** Average brightness (0–255) and the share of nearly black / nearly white pixels. */
export function exposure(g: Float32Array): { brightness: number; dark: number; bright: number } {
  let sum = 0;
  let dark = 0;
  let bright = 0;
  for (const v of g) {
    sum += v;
    if (v < 18) dark++;
    else if (v > 245) bright++;
  }
  const n = g.length || 1;
  return { brightness: sum / n, dark: dark / n, bright: bright / n };
}

/** Difference hash: shrink to 9×8, compare each pixel to its right neighbour. Survives resizing and recompression. */
export function dHash(g: Float32Array, w: number, h: number): string {
  const cols = 9;
  const rows = 8;
  const cell = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor((c * w) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * w) / cols));
      const y0 = Math.floor((r * h) / rows);
      const y1 = Math.max(y0 + 1, Math.floor(((r + 1) * h) / rows));
      let s = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) s += g[y * w + x];
      cell[r * cols + c] = s / ((x1 - x0) * (y1 - y0));
    }
  }
  let hex = '';
  for (let r = 0; r < rows; r++) {
    let byte = 0;
    for (let c = 0; c < 8; c++) byte = (byte << 1) | (cell[r * cols + c] > cell[r * cols + c + 1] ? 1 : 0);
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

export function hammingHex(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < a.length; i += 2) {
    let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

export type PhotoFacts = {
  width: number | null;
  height: number | null;
  mimeType: string;
  camera: string | null;
  /** iOS screenshots are marked as such in their EXIF. */
  screenshotTag: boolean;
};

/** Run every check. `pixels` is the 640-px copy of the photo (null if it couldn't be read). */
export function evaluate(facts: PhotoFacts, pixels: Pixels | null, recentHashes: string[] = []): QualityReport {
  const checks: Check[] = [];
  const shortSide = facts.width && facts.height ? Math.min(facts.width, facts.height) : null;

  checks.push(
    shortSide === null || shortSide >= MIN_SHORT_SIDE
      ? { key: 'size', ok: true, soft: true, label: 'Big enough to share' }
      : { key: 'size', ok: false, soft: true, label: 'Big enough to share', why: `It’s ${shortSide}px on its short side; the archive asks for ${MIN_SHORT_SIDE}px.` },
  );

  let sharp: number | null = null;
  let exp: { brightness: number; dark: number; bright: number } | null = null;
  let hash: string | null = null;
  if (pixels && pixels.width > 8 && pixels.height > 8) {
    const g = gray(pixels);
    sharp = sharpness(g, pixels.width, pixels.height);
    exp = exposure(g);
    hash = dHash(g, pixels.width, pixels.height);
  }

  checks.push(
    sharp === null || sharp >= MIN_SHARPNESS
      ? { key: 'sharp', ok: true, soft: true, label: 'In focus' }
      : { key: 'sharp', ok: false, soft: true, label: 'In focus', why: 'It looks blurry or shaken (or very soft, like fog).' },
  );

  // Night photos are welcome; only nearly-black or nearly-white frames fail.
  const tooDark = exp !== null && (exp.brightness < 22 || exp.dark > 0.85);
  const tooBright = exp !== null && (exp.brightness > 240 || exp.bright > 0.7);
  checks.push(
    !tooDark && !tooBright
      ? { key: 'exposure', ok: true, soft: true, label: 'Well lit' }
      : { key: 'exposure', ok: false, soft: true, label: 'Well lit', why: tooDark ? 'It’s almost all dark.' : 'It’s almost all washed out.' },
  );

  // Screenshots: tagged by iOS, or a PNG with no camera information at all.
  const screenshot = facts.screenshotTag || (/png/i.test(facts.mimeType) && !facts.camera);
  checks.push(
    !screenshot
      ? { key: 'photo', ok: true, soft: false, label: 'A photo, not a screenshot' }
      : { key: 'photo', ok: false, soft: false, label: 'A photo, not a screenshot', why: 'This looks like a screenshot.' },
  );

  const duplicate = hash !== null && recentHashes.some((h) => hammingHex(h, hash!) <= DUPLICATE_BITS);
  checks.push(
    !duplicate
      ? { key: 'new', ok: true, soft: false, label: 'Not one you’ve added before' }
      : { key: 'new', ok: false, soft: false, label: 'Not one you’ve added before', why: 'You’ve already added this photo.' },
  );

  return {
    passed: checks.every((c) => c.ok),
    blocked: checks.some((c) => !c.ok && !c.soft),
    checks,
    hash,
    metrics: { shortSide, sharpness: sharp, brightness: exp?.brightness ?? null, dark: exp?.dark ?? null, bright: exp?.bright ?? null },
  };
}

// The hashes of your recent uploads live on this device only, to catch accidental duplicates.
const RECENT_KEY = 'recentHashes';
const RECENT_MAX = 200;

export function recentHashes(): string[] {
  const raw = getText(RECENT_KEY);
  return raw ? raw.split(',').filter((h) => /^[0-9a-f]{16}$/.test(h)) : [];
}

export function rememberHash(hash: string | null): void {
  if (!hash) return;
  setText(RECENT_KEY, [hash, ...recentHashes().filter((h) => h !== hash)].slice(0, RECENT_MAX).join(','));
}
