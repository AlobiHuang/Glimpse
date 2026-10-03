import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { glide, Rise } from '@/components/motion';
import { Label, Link } from '@/components/ui';
import { Wall } from '@/components/Wall';
import { api } from '@/lib/api';
import { hourIn, KNOWN_CITIES, nowMs } from '@/lib/cityTime';
import { bandForHour, skyForHour } from '@/lib/hourLight';
import { useContentWidth } from '@/lib/layout';
import { hourLabel } from '@/lib/places';
import { useApp } from '@/lib/store';
import type { Photo } from '@/lib/types';
import { colors, fonts, radius, space } from '@/theme';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const currentHour = () => new Date(nowMs()).getHours();

/**
 * Now: one hour, everywhere. Pick an hour and see every glimpse taken at that local time,
 * across all cities and years. The screen takes on the color of that hour's light.
 */
export default function NowScreen() {
  const { feedVersion, notify } = useApp();
  const width = useContentWidth();
  const [hour, setHour] = useState(currentHour);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const strip = useRef<ScrollView>(null);
  const sky = skyForHour(hour);
  const band = bandForHour(hour);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      api.listGlimpses({ localHour: hour, limit: 60 }).then(
        (list) => active && setPhotos(list),
        () => active && notify('Couldn’t load this hour.'),
      );
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when the archive changes
    }, [hour, feedVersion]),
  );

  // Cities where it's this hour right now.
  const happeningNow = useMemo(() => KNOWN_CITIES.filter((c) => hourIn(c) === hour).slice(0, 4), [hour]);

  const pick = (h: number) => {
    setPhotos(null);
    setHour(h);
  };

  return (
    <SafeAreaView style={[styles.screen, glide, { backgroundColor: sky.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl }}>
        <View style={styles.head}>
          <Label color={sky.soft}>Now · one hour, everywhere</Label>
          <Rise key={hour} distance={10}>
            <Text style={[styles.clock, { color: sky.ink }]}>{hourLabel(hour)}</Text>
          </Rise>
          <Text style={[styles.sub, { color: sky.soft }]}>
            {band.name}. Every glimpse taken at {hourLabel(hour).toLowerCase()} local time, in any city, in any year.
          </Text>
          {happeningNow.length ? (
            <Text style={[styles.live, { color: sky.ink }]}>
              <Text style={{ color: colors.stamp }}>● </Text>
              It’s {hourLabel(hour).toLowerCase()} in {happeningNow.join(', ')} right now.
            </Text>
          ) : null}
        </View>

        <ScrollView
          ref={strip}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
          onLayout={() => strip.current?.scrollTo({ x: Math.max(0, hour * 34 - 140), animated: false })}
        >
          {HOURS.map((h) => {
            const s = skyForHour(h);
            const selected = h === hour;
            return (
              <Pressable
                key={h}
                onPress={() => pick(h)}
                accessibilityRole="button"
                accessibilityLabel={hourLabel(h)}
                accessibilityState={{ selected }}
                style={[styles.hour, glide, { backgroundColor: s.bg }, selected && { borderColor: sky.ink, transform: [{ scaleY: 1.15 }] }]}
              >
                <Text style={[styles.hourText, { color: s.ink }]}>{h % 3 === 0 || selected ? (h === 0 ? '12a' : h === 12 ? '12p' : `${h % 12}${h < 12 ? 'a' : 'p'}`) : ''}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.countRow}>
          <Label color={sky.soft}>{photos ? (photos.length === 1 ? '1 glimpse at this hour' : `${photos.length} glimpses at this hour`) : 'Developing…'}</Label>
          {hour !== currentHour() ? (
            <Link label="Back to now" color={sky.ink} onPress={() => pick(currentHour())} />
          ) : null}
        </View>

        {photos === null ? (
          <ActivityIndicator color={sky.ink} style={{ marginTop: space.xxl }} />
        ) : photos.length ? (
          <Wall photos={photos} width={width} />
        ) : (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: sky.ink }]}>Nobody has kept {hourLabel(hour).toLowerCase()} yet.</Text>
            <Text style={[styles.sub, { color: sky.soft, textAlign: 'center' }]}>
              If you’re out at this hour, the archive is waiting for your glimpse.
            </Text>
            <View style={styles.neighbours}>
              {[hour - 1, hour + 1].map((h) => {
                const n = (h + 24) % 24;
                return (
                  <Pressable key={n} onPress={() => pick(n)} style={[styles.neighbour, { borderColor: sky.ink }]} accessibilityRole="button">
                    <Text style={{ ...fonts.sansSemi, fontSize: 14, color: sky.ink }}>Try {hourLabel(n)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  head: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm },
  clock: { ...fonts.serif, fontSize: 56, lineHeight: 62, letterSpacing: -2 },
  sub: { ...fonts.sans, fontSize: 14, lineHeight: 20 },
  live: { ...fonts.sansSemi, fontSize: 15, lineHeight: 21, marginTop: space.xs },
  strip: { paddingHorizontal: space.lg, paddingVertical: space.lg, gap: 4, alignItems: 'center' },
  hour: { width: 30, height: 44, borderRadius: 8, borderWidth: 1.5, borderColor: 'transparent', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 4 },
  hourText: { ...fonts.sansSemi, fontSize: 9.5 },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg, marginBottom: space.md },
  empty: { alignItems: 'center', padding: space.xxl, gap: space.md },
  emptyTitle: { ...fonts.serif, fontSize: 22, lineHeight: 27, textAlign: 'center' },
  neighbours: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  neighbour: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 8 },
});
