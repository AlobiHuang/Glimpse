import { ANALYSIS_WIDTH, type Pixels } from './photoQuality';

/** Web: draw a 640-px-wide copy of the photo onto a canvas and read its pixels. */
export async function loadPixels(uri: string, width = ANALYSIS_WIDTH): Promise<Pixels> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = uri;
  await img.decode();
  const w = Math.min(width, img.naturalWidth || width);
  const h = Math.max(1, Math.round((w * (img.naturalHeight || w)) / (img.naturalWidth || w)));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not read the photo');
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  return { width: w, height: h, data };
}
