import { Image } from 'expo-image';
import { Rise } from '@/components/motion';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { openPhoto } from '@/components/Print';
import { HourSwatch, Label } from '@/components/ui';
import { catalogNumber } from '@/lib/places';
import type { Photo } from '@/lib/types';
import { colors, fonts, radius, space } from '@/theme';

type Props = {
  photos: Photo[];
  /** Total width available for the wall. */
  width: number;
  columns?: number;
  gap?: number;
  onPress?: (photo: Photo) => void;
  /** Show only the photo, no label (for dense walls). */
  bare?: boolean;
};

const LABEL_HEIGHT = 40;

/**
 * An uneven wall of small prints. Every photo keeps its real shape and drops into the
 * shortest column. Each print carries a tiny archive label: number, hour swatch, place.
 */
export function Wall({ photos, width, columns = 2, gap = space.md, onPress = openPhoto, bare }: Props) {
  const colWidth = (width - gap * (columns + 1)) / columns;

  const cols = useMemo(() => {
    const out: { photo: Photo; height: number }[][] = Array.from({ length: columns }, () => []);
    const heights = new Array(columns).fill(0);
    for (const photo of photos) {
      const ratio = photo.width && photo.height ? photo.height / photo.width : 1.25;
      const height = colWidth * Math.min(Math.max(ratio, 0.5), 1.9);
      const shortest = heights.indexOf(Math.min(...heights));
      out[shortest].push({ photo, height });
      heights[shortest] += height + (bare ? 0 : LABEL_HEIGHT) + gap;
    }
    return out;
  }, [photos, columns, colWidth, gap, bare]);

  if (colWidth <= 0) return null;

  return (
    <View style={[styles.wall, { gap, paddingHorizontal: gap }]}>
      {cols.map((col, i) => (
        <View key={i} style={{ width: colWidth, gap }}>
          {col.map(({ photo, height }, row) => (
            <Rise key={photo.id} delay={Math.min((row * columns + i) * 55, 600)}>
            <Pressable
              key={photo.id}
              onPress={() => onPress(photo)}
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Glimpse of ${photo.placeName ?? 'somewhere'}`}
            >
              <Image source={photo.imageUrl} style={[styles.image, { width: '100%', height, backgroundColor: colors.sunken }]} contentFit="cover" transition={200} />
              {bare ? null : (
                <View style={styles.meta}>
                  <View style={styles.metaRow}>
                    <Text style={[styles.place, { flex: 1 }]} numberOfLines={1}>
                      {photo.placeName ?? 'Somewhere'}
                    </Text>
                    <HourSwatch localTime={photo.localTime} size={7} />
                  </View>
                  <Label style={{ fontSize: 9.5 }}>{catalogNumber(photo.catalogNo)}</Label>
                </View>
              )}
            </Pressable>
            </Rise>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wall: { flexDirection: 'row', alignItems: 'flex-start' },
  image: { borderRadius: radius.print, overflow: 'hidden' },
  meta: { paddingTop: 6, paddingHorizontal: 2, paddingBottom: 2, gap: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  place: { ...fonts.sansSemi, fontSize: 13, lineHeight: 17, color: colors.ink },
});
