import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'jpeg-js';
import { ANALYSIS_WIDTH, type Pixels } from './photoQuality';

/**
 * iPhone / Android: shrink the photo to 640 px wide with expo-image-manipulator, then decode
 * that small JPEG in JavaScript (jpeg-js) so the quality checks can read its pixels.
 * (The web version, photoPixels.web.ts, uses a canvas instead.)
 */
export async function loadPixels(uri: string, width = ANALYSIS_WIDTH): Promise<Pixels> {
  const image = await ImageManipulator.manipulate(uri).resize({ width }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.95, base64: true });
  if (!saved.base64) throw new Error('Could not read the photo');
  const binary = atob(saved.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const raw = decode(bytes, { useTArray: true, formatAsRGBA: true });
  return { width: raw.width, height: raw.height, data: raw.data };
}
