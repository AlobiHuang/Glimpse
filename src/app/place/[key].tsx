import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { openCity } from '@/components/CityCard';
import { layersLine } from '@/components/PlaceCard';
import { openPhoto, timeLine } from '@/components/Print';
import { Button, Empty, HourSwatch, Label } from '@/components/ui';
import { api } from '@/lib/api';
import { useContentWidth } from '@/lib/layout';
import { catalogDate, catalogNumber } from '@/lib/places';
import { useApp } from '@/lib/store';
import type { Photo, Place } from '@/lib/types';
import { colors, fonts, radius, space, type } from '@/theme';

const when = (p: Photo) => new Date(p.takenAt ?? p.createdAt).getTime();

function gapLabel(ms: number): string {
  const days = Math.round(ms / 86_400_000);
  if (days < 1) return 'the same day';
  if (days < 45) return `${days} ${days === 1 ? 'day' : 'days'}`;
  const months = Math.round(days / 30);
  if (months < 18) return `${months} months`;
  return `${(days / 365).toFixed(1).replace('.0', '')} years`;
}

/**
 * Layers: one place, through time. Every glimpse ever kept of it, stacked by date.
 * Scrub the timeline to watch the same corner change with the seasons and years.
 */
export default function PlaceScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { notify, refreshFeed } = useApp();
  const width = useContentWidth();
  const [place, setPlace] = useState<Place | null | undefined>(undefined);
  const [layers, setLayers] = useState<Photo[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([api.getPlace(key), api.listGlimpses({ placeKey: key, limit: 200 })]).then(
      ([p, list]) => {
        if (!active) return;
        const oldestFirst = [...list].sort((a, b) => when(a) - when(b));
        setPlace(p);
        setLayers(oldestFirst);
        setIndex(oldestFirst.length - 1);
      },
      () => active && setPlace(null),
    );
    return () => {
      active = false;
    };
  }, [key]);

  if (place === undefined) return <ActivityIndicator style={{ marginTop: space.xxl }} color={colors.pencil} />;
  if (!place || !layers.length) return <Empty title="This place has no layers yet" />;

  const current = layers[Math.min(index, layers.length - 1)];
  const first = when(layers[0]);
  const last = when(layers[layers.length - 1]);
  const span = Math.max(1, last - first);
  const trackW = width - space.lg * 2;
  const ratio = current.width && current.height ? current.width / current.height : 4 / 5;
  const years = [...new Set(layers.map((l) => new Date(when(l)).getFullYear()))];

  const toggleFollow = () => {
    const next = !place.followedByMe;
    setPlace({ ...place, followedByMe: next });
    api.setFollowingPlace(place.key, next).then(
      () => {
        notify(next ? `Following ${place.name}. New layers show in your Archive.` : `Stopped following ${place.name}.`);
        refreshFeed();
      },
      () => {
        setPlace({ ...place, followedByMe: !next });
        notify('Couldn’t update.');
      },
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl }}>
      <Stack.Screen options={{ title: 'Layers' }} />
      <View style={{ gap: 6 }}>
        <Pressable onPress={() => place.city && openCity(place.city)} hitSlop={6} accessibilityRole="link">
          <Label>{[place.city, layersLine(place)].filter(Boolean).join(' · ')}</Label>
        </Pressable>
        <Text style={type.display}>{place.name}</Text>
        <Button small variant={place.followedByMe ? 'ink' : 'outline'} label={place.followedByMe ? '✓ Following this place' : '+ Follow this place'} onPress={toggleFollow} style={{ alignSelf: 'flex-start', marginTop: space.xs }} />
      </View>

      <Pressable onPress={() => openPhoto(current)} style={styles.print} accessibilityRole="imagebutton" accessibilityLabel={`Layer ${index + 1} of ${layers.length}`}>
        <Image source={current.imageUrl} style={[styles.image, { aspectRatio: Math.min(Math.max(ratio, 0.8), 1.4) }]} contentFit="cover" transition={350} />
        <View style={styles.labelRow}>
          <Label>{catalogNumber(current.catalogNo)}</Label>
          <View style={styles.inline}>
            <HourSwatch localTime={current.localTime} />
            <Label>{timeLine(current)}</Label>
          </View>
        </View>
        <Text style={type.place}>{catalogDate(current.takenAt ?? current.createdAt)}</Text>
        {current.caption ? <Text style={type.small}>{current.caption}</Text> : null}
      </Pressable>

      {/* The timeline: each tick is a layer, placed by date. */}
      <View style={{ gap: space.sm }}>
        <View style={styles.scrubHead}>
          <Label color={colors.ink}>
            Layer {index + 1} of {layers.length}
          </Label>
          <Label>{index === layers.length - 1 ? 'newest' : `${gapLabel(last - when(current))} before the newest`}</Label>
        </View>
        <View style={[styles.track, { width: trackW }]}>
          <View style={styles.line} />
          {layers.map((l, i) => {
            const x = layers.length === 1 ? trackW / 2 : ((when(l) - first) / span) * (trackW - 16) + 8;
            const selected = i === index;
            return (
              <Pressable
                key={l.id}
                onPress={() => setIndex(i)}
                hitSlop={{ top: 14, bottom: 14, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel={`Layer ${i + 1}`}
                style={[styles.tick, { left: x - (selected ? 7 : 5) }, selected && styles.tickOn]}
              />
            );
          })}
        </View>
        <View style={styles.years}>
          {years.map((y) => (
            <Label key={y}>{y}</Label>
          ))}
        </View>
        <View style={styles.steps}>
          <Button small variant="outline" label="← Earlier" disabled={index === 0} onPress={() => setIndex(index - 1)} style={{ flex: 1 }} />
          <Button small variant="outline" label="Later →" disabled={index === layers.length - 1} onPress={() => setIndex(index + 1)} style={{ flex: 1 }} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: 6 }}>
        {layers.map((l, i) => (
          <Pressable key={l.id} onPress={() => setIndex(i)} accessibilityRole="button" accessibilityLabel={`Layer ${i + 1}`}>
            <Image source={l.imageUrl} style={[styles.thumb, i === index && styles.thumbOn]} contentFit="cover" />
            <Text style={[styles.thumbYear, i === index && { color: colors.stamp }]}>{new Date(when(l)).getFullYear()}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={type.small}>
        Layers are glimpses of the same place by different people, years apart. None of them are named. What stays is the place.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  print: { gap: 6 },
  image: { width: '100%', backgroundColor: colors.sunken, borderRadius: radius.lg },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  scrubHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 28, justifyContent: 'center' },
  line: { position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: colors.rule },
  tick: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.faint },
  tickOn: { width: 14, height: 14, backgroundColor: colors.stamp, borderColor: colors.stamp },
  years: { flexDirection: 'row', justifyContent: 'space-between' },
  steps: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  thumb: { width: 54, height: 54, backgroundColor: colors.sunken, opacity: 0.75, borderRadius: 8 },
  thumbOn: { opacity: 1, borderWidth: 2, borderColor: colors.stamp },
  thumbYear: { ...fonts.mono, fontSize: 9.5, color: colors.pencil, textAlign: 'center', marginTop: 3 },
});
