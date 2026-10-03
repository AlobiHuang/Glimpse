import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { landmarkUrl, mosaicProgress, type Landmark, type MosaicLevel } from '@/lib/landmarks';
import { colors } from '@/theme';

type Props = {
  landmark: Landmark;
  /** Tile images, in the order they were collected (oldest first). */
  tiles: string[];
  width: number;
  /** Draw this level instead of the one you're working on. */
  level?: MosaicLevel;
  /** Fill every cell (cycling through `tiles`) to preview the finished picture. */
  preview?: boolean;
};

export function openMosaic(city: string) {
  router.push({ pathname: '/mosaic/[city]', params: { city } });
}

/** Cheap deterministic noise so the reveal order looks organic but never changes. */
const jitter = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Your city, drawn with your glimpses. The city's famous view sits underneath; each glimpse
 * you take or keep there becomes one tile laid over it, revealed from the middle outwards.
 * Cells you haven't collected yet are blank paper with a faint ghost of the picture.
 */
export function Mosaic({ landmark, tiles, width, level, preview }: Props) {
  const lvl = level ?? mosaicProgress(tiles.length).current;
  const cell = width / lvl.cols;
  const height = cell * lvl.rows;

  // Cells ordered from the center outwards, with a little noise.
  const order = useMemo(() => {
    const cx = (lvl.cols - 1) / 2;
    const cy = (lvl.rows - 1) / 2;
    const cells = Array.from({ length: lvl.cols * lvl.rows }, (_, i) => {
      const x = i % lvl.cols;
      const y = Math.floor(i / lvl.cols);
      const d = Math.hypot((x - cx) / lvl.cols, (y - cy) / lvl.rows);
      return { i, x, y, rank: d + jitter(i) * 0.18 };
    });
    return cells.sort((a, b) => a.rank - b.rank);
  }, [lvl]);

  const filled = preview ? order.length : Math.min(tiles.length, order.length);

  return (
    <View style={[styles.frame, { width, height }]} accessibilityRole="image" accessibilityLabel={`Mosaic of ${landmark.title}, ${filled} of ${order.length} tiles`}>
      <Image source={landmarkUrl(landmark, Math.round(width * 2), Math.round(height * 2))} style={StyleSheet.absoluteFill} contentFit="cover" />
      {order.map((c, n) => {
        const left = c.x * cell;
        const top = c.y * cell;
        if (n < filled) {
          const src = tiles.length ? tiles[n % tiles.length] : null;
          return (
            <View key={c.i} style={[styles.cell, { left, top, width: cell, height: cell }]}>
              {src ? <Image source={src} style={[StyleSheet.absoluteFill, { opacity: 0.42 }]} contentFit="cover" /> : null}
            </View>
          );
        }
        return <View key={c.i} style={[styles.cell, styles.locked, { left, top, width: cell, height: cell }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.sunken, borderRadius: 8 },
  cell: { position: 'absolute', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.35)' },
  locked: { backgroundColor: 'rgba(242,243,245,0.92)', borderColor: 'rgba(17,20,24,0.05)' },
});
