import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionSheet } from '@/components/ActionSheet';
import { Mosaic, openMosaic } from '@/components/Mosaic';
import { PlaceCard } from '@/components/PlaceCard';
import { Empty, Label, Row, Segmented, SectionHeader } from '@/components/ui';
import { Wall } from '@/components/Wall';
import { api } from '@/lib/api';
import { CONTACT_EMAIL } from '@/lib/config';
import { landmarkFor, mosaicProgress } from '@/lib/landmarks';
import { useContentWidth } from '@/lib/layout';
import { setFlag } from '@/lib/prefs';
import { useApp } from '@/lib/store';
import type { CityPortrait, Photo, Place } from '@/lib/types';
import { colors, fonts, radius, space, type } from '@/theme';

type Tab = 'taken' | 'kept' | 'places';

/**
 * Yours: private by design. Your cities (each a mosaic you're slowly completing),
 * what you've taken and kept, the places you follow, and your settings.
 */
export default function YoursScreen() {
  const { feedVersion, refreshFeed, notify, reloadMe } = useApp();
  const width = useContentWidth();
  const [cities, setCities] = useState<CityPortrait[]>([]);
  const [mine, setMine] = useState<Photo[]>([]);
  const [kept, setKept] = useState<Photo[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tab, setTab] = useState<Tab>('taken');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([api.listMyCities(), api.listMine(), api.listKept(), api.listFollowedPlaces()]).then(
        ([c, m, k, p]) => {
          if (!active) return;
          setCities(c);
          setMine(m);
          setKept(k);
          setPlaces(p);
        },
        () => notify('Couldn’t load your collection.'),
      );
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when the archive changes
    }, [feedVersion]),
  );

  const deleteEverything = async () => {
    setConfirmDelete(false);
    try {
      await api.deleteAccount();
      await reloadMe();
      refreshFeed();
      notify('Everything you added has been deleted.');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Couldn’t delete your account.');
    }
  };

  const shown = tab === 'taken' ? mine : kept;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl }}>
        <View style={styles.head}>
          <Label>Only you can see this page</Label>
          <Text style={type.display}>Your cities</Text>
          <Text style={type.small}>Every glimpse you take or keep in a city is a tile. Collect enough and the city’s picture appears.</Text>
        </View>

        <View style={styles.cities}>
          {cities.length === 0 ? (
            <Empty title="No cities yet" body="Keep a glimpse from the archive, or capture one, to start your first city." />
          ) : (
            cities.map((c) => <CityPortraitRow key={c.city} portrait={c} />)
          )}
        </View>

        <View style={styles.tabs}>
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'taken', label: `Taken · ${mine.length}` },
              { value: 'kept', label: `Kept · ${kept.length}` },
              { value: 'places', label: `Places · ${places.length}` },
            ]}
          />
        </View>

        {tab === 'places' ? (
          places.length ? (
            <View style={styles.placeGrid}>
              {places.map((p) => (
                <PlaceCard key={p.key} place={p} width={(width - space.lg * 2 - space.md) / 2} />
              ))}
            </View>
          ) : (
            <Empty title="No places followed" body="Follow a place from its Layers page to see it change over time." />
          )
        ) : shown.length ? (
          <View style={{ marginTop: space.md }}>
            <Wall photos={shown} width={width} />
          </View>
        ) : (
          <Empty
            title={tab === 'taken' ? 'Nothing taken yet' : 'Nothing kept yet'}
            body={tab === 'taken' ? 'Your glimpses carry no name. Only this page knows they’re yours.' : 'Tap Keep on any glimpse. Nobody else sees what you keep.'}
          />
        )}

        <View style={styles.settings}>
          <SectionHeader title="The fine print" />
        </View>
        <Row label="How Glimpse works" hint="See the welcome guide again" onPress={() => {
          setFlag('welcomed', false);
          router.push('/welcome');
        }} />
        <Row label="Community rules" onPress={() => router.push('/rules')} />
        <Row label="Contact us" hint={CONTACT_EMAIL} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />
        <Row
          label="Show hidden glimpses again"
          hint="Undo everything you’ve hidden"
          onPress={() =>
            api.unblockAll().then(
              () => {
                refreshFeed();
                notify('Hidden glimpses will show again.');
              },
              () => notify('Couldn’t do that.'),
            )
          }
        />
        <Row label="Delete everything I’ve added" hint="Your glimpses, notes, keeps and account" destructive onPress={() => setConfirmDelete(true)} />
        {api.mode === 'demo' ? (
          <Text style={[type.small, styles.demo]}>Demo archive: sample glimpses are from Unsplash. Anything you add disappears when the app reloads.</Text>
        ) : null}
      </ScrollView>

      <ActionSheet
        visible={confirmDelete}
        title="Delete everything?"
        message="Your glimpses, notes, keeps and followed places are removed from the archive for good."
        actions={[{ label: 'Delete everything', destructive: true, onPress: deleteEverything }]}
        onClose={() => setConfirmDelete(false)}
      />
    </SafeAreaView>
  );
}

function CityPortraitRow({ portrait }: { portrait: CityPortrait }) {
  const landmark = landmarkFor(portrait.city);
  const tiles = [...portrait.photos].reverse().map((p) => p.imageUrl);
  const { current, completed, remaining } = mosaicProgress(tiles.length);
  return (
    <Pressable onPress={() => openMosaic(portrait.city)} style={({ pressed }) => [styles.portrait, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      {landmark ? (
        <Mosaic landmark={landmark} tiles={tiles} width={92} />
      ) : (
        <View style={styles.noLandmark}>
          <Text style={styles.initial}>{portrait.city[0]}</Text>
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={type.title}>{portrait.city}</Text>
        <Label>
          {portrait.takenCount} taken · {portrait.keptCount} kept
        </Label>
        {portrait.words.length ? (
          <Text style={styles.words} numberOfLines={1}>
            {portrait.words
              .slice(0, 4)
              .map((w) => w.word)
              .join(' · ')}
          </Text>
        ) : null}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, (tiles.length / current.tiles) * 100)}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {completed && remaining === 0 ? `${completed.name} complete` : `${current.name} · ${remaining} more to finish`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  head: { padding: space.lg, gap: space.sm },
  cities: { paddingHorizontal: space.lg, gap: space.md },
  portrait: {
    flexDirection: 'row',
    gap: space.lg,
    alignItems: 'center',
    backgroundColor: colors.print,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
  },
  noLandmark: { width: 92, height: 138, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  initial: { ...fonts.serifItalic, fontSize: 48, color: colors.pencil },
  words: { ...fonts.sans, fontSize: 14, color: colors.ink },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.sunken, marginTop: 4, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: colors.stamp },
  progressText: { ...fonts.sansSemi, fontSize: 13, color: colors.stamp },
  tabs: { paddingHorizontal: space.lg, marginTop: space.xl },
  placeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, padding: space.lg },
  settings: { paddingHorizontal: space.lg, marginTop: space.xxl },
  demo: { padding: space.lg, textAlign: 'center' },
});
