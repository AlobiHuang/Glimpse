import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Label } from '@/components/ui';
import type { CityDefinition } from '@/lib/types';
import { colors, fonts, radius, space, type } from '@/theme';

export function openCity(city: string) {
  router.push({ pathname: '/city/[name]', params: { name: city } });
}

/** A dictionary entry for a city, written by everyone who collected it. */
export function CityCard({ city, width = 250 }: { city: CityDefinition; width?: number }) {
  return (
    <Pressable
      onPress={() => openCity(city.city)}
      style={({ pressed }) => [styles.card, { width }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`${city.city}: ${city.words
        .slice(0, 5)
        .map((w) => w.word)
        .join(', ')}`}
    >
      <View style={styles.strip}>
        {city.coverUrls.slice(0, 3).map((u) => (
          <Image key={u} source={u} style={styles.thumb} contentFit="cover" />
        ))}
      </View>
      <Text style={styles.entry}>
        <Text style={[type.title, { fontSize: 20 }]}>{city.city} </Text>
        <Text style={styles.pos}>(n.)</Text>
      </Text>
      <Text style={styles.words} numberOfLines={2}>
        {city.words
          .slice(0, 5)
          .map((w) => w.word)
          .join(' · ')}
      </Text>
      <Label>Defined by {city.definerCount.toLocaleString('en-US')} people</Label>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.print,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    padding: space.md,
    gap: 6,
  },
  strip: { flexDirection: 'row', gap: 4, height: 64, marginBottom: 4 },
  thumb: { flex: 1, backgroundColor: colors.sunken, borderRadius: 8 },
  entry: { marginTop: 2 },
  pos: { fontStyle: 'italic', fontWeight: '400', fontSize: 18, color: colors.pencil },
  words: { ...fonts.sans, fontSize: 14, lineHeight: 20, color: colors.ink },
});
