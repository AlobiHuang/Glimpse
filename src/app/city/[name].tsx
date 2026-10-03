import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Mosaic, openMosaic } from '@/components/Mosaic';
import PhotoMap, { type MapMarker } from '@/components/PhotoMap';
import { PlaceCard } from '@/components/PlaceCard';
import { openPhoto } from '@/components/Print';
import { Empty, Label, SectionHeader } from '@/components/ui';
import { Wall } from '@/components/Wall';
import { api } from '@/lib/api';
import { thumbUrl } from '@/lib/format';
import { bandFor } from '@/lib/hourLight';
import { landmarkFor, mosaicProgress } from '@/lib/landmarks';
import { DOT_COLORS } from '@/lib/mapColors';
import { useContentWidth } from '@/lib/layout';
import { useApp } from '@/lib/store';
import type { CityDefinition, CityPortrait, Photo, Place } from '@/lib/types';
import { colors, fonts, radius, space, type } from '@/theme';

/**
 * A city, as defined by everyone who collected it: a dictionary entry made of their words,
 * its places (each with layers through time), and every glimpse. Tap a word to see the
 * glimpses that defined the city that way.
 */
export default function CityScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { feedVersion } = useApp();
  const width = useContentWidth();
  const [city, setCity] = useState<CityDefinition | null | undefined>(undefined);
  const [places, setPlaces] = useState<Place[]>([]);
  const [portrait, setPortrait] = useState<CityPortrait | null>(null);
  const [word, setWord] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[] | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.getCity(name), api.listPlacesInCity(name), api.getMyCity(name)]).then(
      ([c, p, mine]) => {
        if (!active) return;
        setCity(c);
        setPlaces(p);
        setPortrait(mine);
      },
      () => active && setCity(null),
    );
    return () => {
      active = false;
    };
  }, [name, feedVersion]);

  useEffect(() => {
    let active = true;
    api.listGlimpses({ city: name, q: word ?? undefined, limit: 60 }).then(
      (list) => active && setPhotos(list),
      () => active && setPhotos([]),
    );
    return () => {
      active = false;
    };
  }, [name, word, feedVersion]);

  // The city as a map: every glimpse pinned where it was taken. Picking a word re-pins only
  // the glimpses kept with that word, so you can see where "bridges" or "steam" live.
  const markers = useMemo<MapMarker[]>(
    () =>
      (photos ?? [])
        .filter((p) => p.latitude !== null && p.longitude !== null)
        .map((p) => ({
          id: p.id,
          lat: p.latitude!,
          lng: p.longitude!,
          label: p.placeName ?? 'Glimpse',
          color: p.isMine ? DOT_COLORS.mine : p.keptByMe ? DOT_COLORS.kept : bandFor(p.localTime).color,
          weight: p.isMine ? 2 : p.keptByMe ? 1 : 0,
          thumb: thumbUrl(p.imageUrl),
        })),
    [photos],
  );
  const onPin = (id: string | null) => {
    const p = id ? photos?.find((x) => x.id === id) : null;
    if (p) openPhoto(p);
  };

  if (city === undefined) return <ActivityIndicator style={{ marginTop: space.xxl }} color={colors.pencil} />;
  if (city === null) return <Empty title={`Nothing from ${name} yet`} body="Be the first to keep a glimpse of it." />;

  const max = city.words[0]?.count ?? 1;
  const landmark = landmarkFor(city.city);
  const tiles = portrait ? [...portrait.photos].reverse().map((p) => p.imageUrl) : [];
  const progress = mosaicProgress(tiles.length);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: space.xxxl }}>
      <Stack.Screen options={{ title: city.city }} />
      <View style={styles.head}>
        <Label>
          {[city.country, `${city.glimpseCount.toLocaleString('en-US')} glimpses`, `${city.placeCount} places here`].filter(Boolean).join(' · ')}
        </Label>
        <Text style={styles.entry}>
          {city.city} <Text style={styles.pos}>(n.)</Text>
        </Text>
        <Text style={type.small}>As defined by {city.definerCount.toLocaleString('en-US')} people who kept a glimpse of it.</Text>
      </View>

      <View style={styles.mapCard}>
        {photos !== null ? (
          <PhotoMap markers={markers} selectedId={null} target={null} me={null} onSelect={onPin} frameKey={word ?? '*'} fitMaxZoom={16} photoZoom={10} wheelZoom={false} />
        ) : null}
        <View style={styles.mapPill} pointerEvents="none">
          <Text style={styles.mapPillText}>
            {word ? `“${word}” · ` : ''}
            {markers.length === 1 ? '1 glimpse pinned' : `${markers.length} glimpses pinned`}
          </Text>
        </View>
      </View>
      <Text style={[type.small, styles.hint]}>Tap a word to pin only the glimpses kept with it.</Text>

      <View style={styles.senses}>
        {city.words.slice(0, 8).map((w, i) => {
          const selected = word === w.word;
          return (
            <Pressable
              key={w.word}
              onPress={() => setWord(selected ? null : w.word)}
              style={({ pressed }) => [styles.sense, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={styles.senseNo}>{i + 1}.</Text>
              <Text style={[styles.senseWord, selected && { color: colors.stamp }]}>{w.word}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { width: `${(w.count / max) * 100}%` }, selected && { backgroundColor: colors.stamp }]} />
              </View>
              <Label style={{ width: 36, textAlign: 'right' }}>{w.count}</Label>
            </Pressable>
          );
        })}
      </View>

      {landmark ? (
        <Pressable onPress={() => openMosaic(city.city)} style={({ pressed }) => [styles.portrait, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Mosaic landmark={landmark} tiles={tiles} width={64} />
          <View style={{ flex: 1, gap: 3 }}>
            <Label color={colors.stamp}>Your {city.city}</Label>
            <Text style={type.place}>{tiles.length ? `${tiles.length} of ${progress.current.tiles} tiles` : 'Start your mosaic'}</Text>
            <Text style={type.small}>
              {tiles.length ? `Keep or take ${progress.remaining} more to finish the ${progress.current.name.toLowerCase()}.` : `Every glimpse you keep here becomes a tile of ${landmark.title.toLowerCase()}.`}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {places.length ? (
        <View style={styles.section}>
          <SectionHeader title="Places, layered through time" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
            {places.map((p) => (
              <PlaceCard key={p.key} place={p} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={[styles.section, { paddingHorizontal: 0 }]}>
        <View style={{ paddingHorizontal: space.lg }}>
          <SectionHeader title={word ? `Glimpses that say “${word}”` : 'Every glimpse'} action={word ? 'Show all' : undefined} onAction={() => setWord(null)} />
        </View>
        {photos === null ? <ActivityIndicator color={colors.pencil} /> : photos.length ? <Wall photos={photos} width={width} /> : <Text style={[type.small, { paddingHorizontal: space.lg }]}>No glimpses with that word in the sample yet.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  head: { padding: space.lg, paddingBottom: space.md, gap: 6 },
  mapCard: { height: 380, marginHorizontal: space.lg, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.sunken },
  mapPill: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mapPillText: { ...fonts.sansSemi, fontSize: 12, color: colors.ink },
  hint: { marginHorizontal: space.lg, marginTop: space.md, marginBottom: space.xs },
  entry: { ...fonts.serif, fontSize: 36, lineHeight: 42, color: colors.ink, letterSpacing: -1 },
  pos: { fontStyle: 'italic', fontWeight: '400', fontSize: 20, color: colors.pencil },
  senses: { paddingHorizontal: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.rule, marginHorizontal: space.lg, paddingTop: space.sm, paddingLeft: 0, paddingRight: 0 },
  sense: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 7 },
  senseNo: { ...fonts.mono, fontSize: 12, color: colors.pencil, width: 20 },
  senseWord: { ...fonts.sansSemi, fontSize: 17, color: colors.ink, width: 130 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.sunken, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.ink },
  portrait: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    margin: space.lg,
    padding: space.md,
    backgroundColor: colors.stampSoft,
    borderRadius: radius.lg,
  },
  section: { marginTop: space.lg, paddingHorizontal: space.lg },
});
