import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openCity } from '@/components/CityCard';
import { openPlace } from '@/components/Print';
import { Chip, Label, SectionHeader } from '@/components/ui';
import { Wall } from '@/components/Wall';
import { api } from '@/lib/api';
import { useContentWidth } from '@/lib/layout';
import type { CityDefinition, Photo } from '@/lib/types';
import { colors, fonts, radius, space, type } from '@/theme';

const HINTS = ['a city', 'a street', 'a word, like “fog”', 'trams', 'Alfama', 'windows', 'golden hour', 'Tokyo'];

/**
 * The Index: the archive's card catalogue. Search places, cities, and the words people use
 * to define them. With nothing typed, it lists every city with its definition.
 */
export default function IndexScreen() {
  const width = useContentWidth();
  const [q, setQ] = useState('');
  const [cities, setCities] = useState<CityDefinition[]>([]);
  const [results, setResults] = useState<Photo[] | null>(null);
  const [hint, setHint] = useState(0);

  useFocusEffect(
    useCallback(() => {
      api.listCities().then(setCities, () => {});
    }, []),
  );

  // Rotate the placeholder so people learn what they can search for.
  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 2600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const needle = q.trim();
    let active = true;
    const t = setTimeout(() => {
      if (!needle) {
        if (active) setResults(null);
        return;
      }
      api.listGlimpses({ q: needle, limit: 60 }).then(
        (list) => active && setResults(list),
        () => active && setResults([]),
      );
    }, 220);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  const needle = q.trim().toLowerCase();
  const cityMatches = useMemo(
    () => (needle ? cities.filter((c) => c.city.toLowerCase().includes(needle) || c.words.some((w) => w.word.toLowerCase().includes(needle))) : cities),
    [cities, needle],
  );
  const places = useMemo(() => {
    if (!results) return [];
    const seen = new Map<string, { key: string; name: string; count: number }>();
    for (const p of results) {
      if (!p.placeKey || !p.placeName) continue;
      const e = seen.get(p.placeKey) ?? { key: p.placeKey, name: p.placeName, count: 0 };
      e.count++;
      seen.set(p.placeKey, e);
    }
    return [...seen.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [results]);

  const topWords = useMemo(() => {
    const all = new Map<string, number>();
    for (const c of cities) for (const w of c.words) all.set(w.word, (all.get(w.word) ?? 0) + w.count);
    return [...all.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
  }, [cities]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xxxl }}>
        <View style={styles.head}>
          <Text style={type.display}>Search</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.pencil} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={`Search ${HINTS[hint]}`}
              placeholderTextColor={colors.faint}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search the archive"
            />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear">
                <Ionicons name="close-circle" size={18} color={colors.faint} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {!needle ? (
          <View style={styles.section}>
            <SectionHeader title="Words people use" />
            <View style={styles.chips}>
              {topWords.map(([w, n]) => (
                <Chip key={w} label={w} count={n} onPress={() => setQ(w)} />
              ))}
            </View>
          </View>
        ) : null}

        {cityMatches.length ? (
          <View style={styles.section}>
            <SectionHeader title={needle ? 'Cities' : `Every city · ${cities.length}`} />
            {cityMatches.map((c) => (
              <Pressable key={c.city} onPress={() => openCity(c.city)} style={({ pressed }) => [styles.entry, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                <View style={styles.entryHead}>
                  <Text style={type.place}>
                    {c.city} <Text style={styles.pos}>(n.)</Text>
                  </Text>
                  <Label>{c.glimpseCount.toLocaleString('en-US')}</Label>
                </View>
                <Text style={styles.entryWords} numberOfLines={1}>
                  {c.words
                    .slice(0, 5)
                    .map((w) => w.word)
                    .join(' · ')}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {needle && places.length ? (
          <View style={styles.section}>
            <SectionHeader title="Places" />
            {places.map((p) => (
              <Pressable key={p.key} onPress={() => openPlace(p.key)} style={({ pressed }) => [styles.entry, styles.entryHead, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                <Text style={type.place}>{p.name}</Text>
                <Label>{p.count === 1 ? '1 layer' : `${p.count} layers`}</Label>
              </Pressable>
            ))}
          </View>
        ) : null}

        {needle ? (
          <View style={styles.wallSection}>
            <View style={{ paddingHorizontal: space.lg }}>
              <SectionHeader title={results ? `Glimpses · ${results.length}` : 'Glimpses'} />
            </View>
            {results === null ? (
              <ActivityIndicator color={colors.pencil} />
            ) : results.length ? (
              <Wall photos={results} width={width} />
            ) : (
              <Text style={[type.small, { paddingHorizontal: space.lg }]}>Nothing in the archive matches “{q.trim()}” yet.</Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  head: { padding: space.lg, gap: space.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.sunken,
  },
  input: { flex: 1, ...fonts.sans, fontSize: 16, color: colors.ink, paddingVertical: 12 },
  section: { marginTop: space.lg, paddingHorizontal: space.lg },
  wallSection: { marginTop: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  entry: { paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.rule, gap: 2 },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  pos: { fontStyle: 'italic', fontWeight: '400', fontSize: 16, color: colors.pencil },
  entryWords: { ...fonts.sans, fontSize: 14, color: colors.pencil },
});
