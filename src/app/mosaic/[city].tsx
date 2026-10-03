import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { openCity } from '@/components/CityCard';
import { Mosaic } from '@/components/Mosaic';
import { Button, Empty, Label, Segmented } from '@/components/ui';
import { api } from '@/lib/api';
import { landmarkFor, MOSAIC_LEVELS, mosaicProgress, type MosaicLevel } from '@/lib/landmarks';
import { useContentWidth } from '@/lib/layout';
import type { CityPortrait } from '@/lib/types';
import { colors, fonts, radius, space, type } from '@/theme';

type Look = 'yours' | 'finished';

/**
 * Your mosaic of a city. A private reward for collecting: no ranks, no public counts.
 * Each level is a finer picture of the same view, made of more of your glimpses.
 */
export default function MosaicScreen() {
  const { city } = useLocalSearchParams<{ city: string }>();
  const width = useContentWidth();
  const [portrait, setPortrait] = useState<CityPortrait | null | undefined>(undefined);
  const [fillers, setFillers] = useState<string[]>([]);
  const [look, setLook] = useState<Look>('yours');
  const [levelPick, setLevelPick] = useState<MosaicLevel | null>(null);
  const landmark = landmarkFor(city);

  useEffect(() => {
    let active = true;
    Promise.all([api.getMyCity(city), api.listGlimpses({ city, limit: 60 })]).then(
      ([p, all]) => {
        if (!active) return;
        setPortrait(p);
        setFillers(all.map((g) => g.imageUrl));
      },
      () => active && setPortrait(null),
    );
    return () => {
      active = false;
    };
  }, [city]);

  if (portrait === undefined) {
    return <ActivityIndicator style={{ marginTop: space.xxl }} color={colors.pencil} />;
  }

  const tiles = portrait ? [...portrait.photos].reverse().map((p) => p.imageUrl) : [];
  const progress = mosaicProgress(tiles.length);
  const level = levelPick ?? progress.current;
  const preview = look === 'finished';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: `Your ${city}` }} />
      <View style={{ gap: 6 }}>
        <Label>Your {city} · private</Label>
        <Text style={type.display}>{landmark?.title ?? city}</Text>
        <Text style={type.small}>
          {tiles.length === 1 ? '1 glimpse collected' : `${tiles.length} glimpses collected`} in {city}.{' '}
          {progress.remaining > 0 ? `${progress.remaining} more to finish your ${progress.current.name.toLowerCase()}.` : 'Every level is complete.'}
        </Text>
      </View>

      <View style={styles.levels}>
        {MOSAIC_LEVELS.map((l) => {
          const doneLevel = tiles.length >= l.tiles;
          const selected = l.tiles === level.tiles;
          return (
            <Pressable
              key={l.tiles}
              onPress={() => setLevelPick(l)}
              style={[styles.level, selected && styles.levelOn]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text numberOfLines={1} style={[styles.levelName, selected && { color: '#FFFFFF' }]}>{l.name}</Text>
              <Label color={selected ? colors.stampSoft : doneLevel ? colors.stamp : colors.pencil}>{doneLevel ? '✓ ' : ''}{l.tiles} tiles</Label>
            </Pressable>
          );
        })}
      </View>

      <Segmented<Look>
        value={look}
        onChange={setLook}
        options={[
          { value: 'yours', label: 'Yours so far' },
          { value: 'finished', label: 'Preview finished' },
        ]}
      />

      {landmark ? (
        <View style={styles.frame}>
          <Mosaic landmark={landmark} tiles={preview ? [...tiles, ...fillers] : tiles} width={width - space.lg * 2 - 20} level={level} preview={preview} />
          <View style={styles.caption}>
            <Label>
              {level.name} · {level.cols} × {level.rows}
            </Label>
            <Label>{preview ? 'Preview' : `${Math.min(tiles.length, level.tiles)} / ${level.tiles}`}</Label>
          </View>
        </View>
      ) : (
        <Empty title="No view chosen for this city yet" body="Your glimpses are still counted. The mosaic appears once the city has a picture." />
      )}

      {portrait?.words.length ? (
        <View style={{ gap: 6 }}>
          <Label color={colors.ink}>Your words for {city}</Label>
          <Text style={type.quote}>
            {portrait.words
              .slice(0, 6)
              .map((w) => w.word)
              .join(' · ')}
          </Text>
        </View>
      ) : null}

      <Text style={type.small}>
        Every glimpse you take or keep in {city} becomes one tile, laid over the city’s view. Nobody else can see your mosaic, and there’s no leaderboard. It’s a portrait of the city as you’ve seen it.
      </Text>
      <Button label={`Collect more of ${city}`} onPress={() => openCity(city)} />
      {landmark ? <Label style={{ textAlign: 'center' }}>View: photo by {landmark.credit} on Unsplash</Label> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  levels: { flexDirection: 'row', gap: 6 },
  level: { flex: 1, backgroundColor: colors.sunken, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 8, gap: 2 },
  levelOn: { backgroundColor: colors.stamp },
  levelName: { ...fonts.sansSemi, fontSize: 13, color: colors.ink },
  frame: {
    backgroundColor: colors.sunken,
    padding: 10,
    borderRadius: radius.lg,
    gap: 8,
    alignItems: 'center',
  },
  caption: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
});
