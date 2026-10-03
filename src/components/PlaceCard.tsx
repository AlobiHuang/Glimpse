import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { openPlace } from '@/components/Print';
import { Label } from '@/components/ui';
import type { Place } from '@/lib/types';
import { colors, fonts, radius, space } from '@/theme';

const year = (iso: string) => new Date(iso).getFullYear();

export function layersLine(place: Pick<Place, 'count' | 'firstAt'>): string {
  return `${place.count} ${place.count === 1 ? 'layer' : 'layers'} · since ${year(place.firstAt)}`;
}

/** A place, shown as a little stack of prints: every layer of it, across time. */
export function PlaceCard({ place, width = 150 }: { place: Place; width?: number }) {
  const stacked = Math.min(place.count, 3);
  return (
    <Pressable
      onPress={() => openPlace(place.key)}
      style={({ pressed }) => [{ width }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${layersLine(place)}`}
    >
      <View style={{ height: width * 0.92 + 8 }}>
        {Array.from({ length: stacked - 1 }).map((_, i) => (
          <View
            key={i}
            style={[styles.sheet, { width: width - 6, height: width * 0.92, top: 0, left: 3 + i * 3, transform: [{ rotate: `${(i + 1) * 2.2}deg` }] }]}
          />
        ))}
        <View style={[styles.sheet, styles.top, { width: width - 6, height: width * 0.92, top: 6, left: 0 }]}>
          <Image source={place.coverUrl} style={styles.image} contentFit="cover" />
        </View>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {place.name}
      </Text>
      <Label>{layersLine(place)}</Label>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    backgroundColor: colors.print,
    borderRadius: radius.print,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
  },
  top: { padding: 5 },
  image: { flex: 1, backgroundColor: colors.sunken, borderRadius: 8 },
  name: { ...fonts.sansSemi, fontSize: 14, lineHeight: 19, color: colors.ink, marginTop: space.sm },
});
