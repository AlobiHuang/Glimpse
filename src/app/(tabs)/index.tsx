import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CityCard } from '@/components/CityCard';
import { CountUp, Rise } from '@/components/motion';
import PhotoMap, { type MapMarker, type MapTarget } from '@/components/PhotoMap';
import { PlaceCard } from '@/components/PlaceCard';
import { openPhoto, Print, timeLine } from '@/components/Print';
import { PullIndicator } from '@/components/PullIndicator';
import { Empty, HourSwatch, Label, Mark, SectionHeader, Wordmark } from '@/components/ui';
import { api } from '@/lib/api';
import { bandFor, HOUR_BANDS } from '@/lib/hourLight';
import { thumbUrl } from '@/lib/format';
import { getMyLocation } from '@/lib/location';
import { DOT_COLORS } from '@/lib/mapColors';
import { catalogNumber } from '@/lib/places';
import { promptDayLabel, todaysPrompt } from '@/lib/prompts';
import { useApp } from '@/lib/store';
import { ARCHIVE_COUNT_MIN } from '@/lib/config';
import type { ArchiveStats, CityDefinition, FeedSlot, Photo, Place } from '@/lib/types';
import { useCollect } from '@/lib/useCollect';
import { useWebPullToRefresh } from '@/lib/usePullToRefresh';
import { colors, fonts, radius, space, type } from '@/theme';

type View_ = 'list' | 'map';

let nonce = 0;

/**
 * The Archive: what Glimpse is, at a glance. Today's observation, how everyone defines
 * their cities, the places you follow, and the newest glimpses as catalogued prints.
 * Switch to Map to see the whole archive as squares on a paper map, colored by hour.
 */
export default function ArchiveScreen() {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const { feedVersion, notify } = useApp();
  const [mode, setMode] = useState<View_>('list');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [slots, setSlots] = useState<Record<string, FeedSlot>>({});
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [cities, setCities] = useState<CityDefinition[]>([]);
  const [followed, setFollowed] = useState<Place[]>([]);
  const [observationCount, setObservationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<Photo>>(null);
  const prompt = todaysPrompt();

  const update = useCallback((id: string, patch: Partial<Photo>) => setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))), []);
  const { keep, toggleBeenHere, share, keepSheet } = useCollect(update);

  const load = useCallback(async (fresh = false) => {
    const [featured, trial, newest, s, c, f, obs] = await Promise.all([
      api.listGlimpses({ feed: 'featured', limit: 30, fresh }),
      api.listGlimpses({ feed: 'fresh', limit: 8 }),
      api.listGlimpses({ limit: 30 }),
      api.stats(),
      api.listCities(),
      api.listFollowedPlaces(),
      api.listGlimpses({ prompt: todaysPrompt().key, limit: 50 }),
    ]);
    const feed = buildFeed(featured, trial, newest);
    setPhotos(feed.map((i) => i.photo));
    setSlots(Object.fromEntries(feed.map((i) => [i.photo.id, i.slot])));
    setStats(s);
    setCities(c);
    setFollowed(f);
    setObservationCount(obs.length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load()
        .catch(() => notify('Couldn’t open the archive.'))
        .finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when something changes elsewhere
    }, [feedVersion]),
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    load(true)
      .catch(() => notify('Couldn’t refresh.'))
      .finally(() => setRefreshing(false));
  }, [load, notify]);

  // Count what people actually looked at (once each, never shown). It's how a fresh glimpse
  // graduates from its trial slot, and the denominator of its keep rate.
  const seen = useRef(new Set<string>());
  const pendingViews = useRef<string[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: { item: Photo }[] }) => {
    for (const { item } of viewableItems) {
      if (seen.current.has(item.id) || item.isMine || item.visibility !== 'archive') continue;
      seen.current.add(item.id);
      pendingViews.current.push(item.id);
    }
    if (flushTimer.current || !pendingViews.current.length) return;
    flushTimer.current = setTimeout(() => {
      const ids = pendingViews.current.splice(0, 50);
      flushTimer.current = null;
      api.recordViews(ids).catch(() => {});
    }, 1500);
  }, []);

  const pull = useWebPullToRefresh(listRef, { enabled: mode === 'list' && !loading, refreshing, onRefresh: refresh });

  // Opened with ?focus=<id> (from a glimpse's "On the map"): switch to the map there.
  useEffect(() => {
    if (!focus) return;
    const t = setTimeout(() => setMode('map'), 0);
    return () => clearTimeout(t);
  }, [focus]);

  const featuredMode = Object.values(slots).includes('featured');
  const header = (
    <View style={styles.headerBlock}>
      {/* The real count of shared glimpses, shown once there are enough for it to mean something. */}
      <Text style={styles.manifesto}>
        {stats && stats.glimpses >= ARCHIVE_COUNT_MIN ? (
          <>
            <CountUp value={stats.glimpses} /> photos people took{'\n'}but{' '}
          </>
        ) : (
          <>Photos people took{'\n'}but </>
        )}
        <Text style={styles.manifestoEm}>never posted.</Text>
      </Text>
      {stats ? (
        <Label>
          {stats.cities} cities · {stats.places.toLocaleString('en-US')} places · no names
        </Label>
      ) : null}

      {/* A card with two targets: the text opens the observation, the pill opens Capture.
          (Kept as siblings, not nested, so the web build doesn't put a button inside a button.) */}
      <View style={styles.observation}>
        <Pressable
          onPress={() => router.push({ pathname: '/observation/[key]', params: { key: prompt.key } })}
          style={({ pressed }) => [{ gap: 6 }, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <View style={styles.obsTop}>
            <Text style={styles.obsKicker}>Today’s observation · {promptDayLabel(prompt.key)}</Text>
          </View>
          <Text style={type.title}>{prompt.title}</Text>
          <Text style={type.small}>{prompt.description}</Text>
        </Pressable>
        <View style={styles.obsBottom}>
          <Text style={styles.obsCount}>{observationCount === 1 ? '1 glimpse so far' : `${observationCount} glimpses so far`}</Text>
          <Pressable onPress={() => router.navigate({ pathname: '/capture', params: { prompt: prompt.key } })} hitSlop={8} accessibilityRole="button" style={styles.obsButton}>
            <Ionicons name="camera" size={15} color="#FFFFFF" />
            <Text style={styles.obsButtonText}>Capture one</Text>
          </Pressable>
        </View>
      </View>

      {cities.length ? (
        <View style={styles.section}>
          <SectionHeader title="Cities, as defined by everyone" action="See all" onAction={() => router.navigate('/search')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll} style={styles.bleed}>
            {cities.slice(0, 8).map((c) => (
              <CityCard key={c.city} city={c} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {followed.length ? (
        <View style={styles.section}>
          <SectionHeader title="Places you follow" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll} style={styles.bleed}>
            {followed.map((p) => (
              <PlaceCard key={p.key} place={p} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={[styles.section, { marginBottom: 0 }]}>
        <SectionHeader title={featuredMode ? 'Featured' : 'Newest in the archive'} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Wordmark size={27} />
          {api.mode === 'demo' ? (
            <View style={styles.demoPill}>
              <Text style={styles.demoText}>Demo</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={() => setMode(mode === 'list' ? 'map' : 'list')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={mode === 'list' ? 'Show map' : 'Show list'}
        >
          <Ionicons name={mode === 'list' ? 'map-outline' : 'list-outline'} size={26} color={colors.ink} />
        </Pressable>
      </View>

      {mode === 'map' ? (
        <ArchiveMap focusId={focus} />
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.pencil} />
        </View>
      ) : (
        <>
          <PullIndicator pull={pull} refreshing={refreshing && Platform.OS === 'web'} />
          <FlatList
            ref={listRef}
            data={photos}
            keyExtractor={(p) => p.id}
            ListHeaderComponent={header}
            renderItem={({ item, index }) => (
              <Rise delay={index < 4 ? 120 + index * 90 : 0} style={styles.item}>
                <Print photo={item} slot={slots[item.id]} onKeep={keep} onBeenHere={toggleBeenHere} onShare={share} />
              </Rise>
            )}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEWABILITY}
            ListEmptyComponent={<Empty title="The archive is empty" body="Be the first to keep a glimpse of your city." />}
            ListFooterComponent={
              photos.length ? (
                <View style={styles.footer}>
                  <Mark size={22} />
                  <Label>{featuredMode ? 'End of the featured glimpses' : 'End of the newest glimpses'}</Label>
                </View>
              ) : null
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.pencil} />}
          />
        </>
      )}
      {keepSheet}
    </SafeAreaView>
  );
}

const VIEWABILITY = { itemVisiblePercentThreshold: 60, minimumViewTime: 600 };

/** Below this many Featured picks (an archive's first weeks), the home feed is simply the newest glimpses. */
const FEATURED_MIN = 5;
/** One post in this many is a fresh glimpse getting its trial in front of people. */
const FRESH_EVERY = 5;

/**
 * The home feed. With enough Featured picks: those, newest pick first, with every 5th post a
 * fresh glimpse that's new to the archive. Before that: the newest shared glimpses.
 */
function buildFeed(featured: Photo[], fresh: Photo[], newest: Photo[]): { photo: Photo; slot: FeedSlot }[] {
  if (featured.length < FEATURED_MIN) {
    return newest.filter((p) => p.visibility === 'archive').map((photo) => ({ photo, slot: 'newest' as const }));
  }
  const out: { photo: Photo; slot: FeedSlot }[] = [];
  const queue = fresh.filter((p) => !featured.some((f) => f.id === p.id));
  featured.forEach((photo, i) => {
    out.push({ photo, slot: 'featured' });
    if ((i + 1) % (FRESH_EVERY - 1) === 0 && queue.length) out.push({ photo: queue.shift()!, slot: 'fresh' });
  });
  return out;
}

/** The whole archive on a paper map. Yours are stamped; kept are ink; the rest show their hour. */
function ArchiveMap({ focusId }: { focusId?: string }) {
  const { notify, feedVersion } = useApp();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [target, setTarget] = useState<MapTarget | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  // "Your world": only what you took or kept. "Everyone": the whole archive.
  const [scope, setScope] = useState<'mine' | 'all'>('mine');

  useEffect(() => {
    let active = true;
    api.listMapPhotos().then(
      (list) => {
        if (!active) return;
        setPhotos(list);
        const f = focusId ? list.find((p) => p.id === focusId) : null;
        if (f) {
          if (!f.isMine && !f.keptByMe) setScope('all');
          setSelectedId(f.id);
          setTarget({ lat: f.latitude!, lng: f.longitude!, zoom: 15, nonce: ++nonce });
        }
      },
      () => notify('Couldn’t load the map.'),
    );
    return () => {
      active = false;
    };
  }, [focusId, notify, feedVersion]);

  const shown = useMemo(() => (scope === 'mine' ? photos.filter((p) => p.isMine || p.keptByMe) : photos), [photos, scope]);
  const cityCount = useMemo(() => new Set(shown.map((p) => p.city).filter(Boolean)).size, [shown]);
  const markers = useMemo<MapMarker[]>(
    () =>
      shown.map((p) => ({
        id: p.id,
        lat: p.latitude!,
        lng: p.longitude!,
        label: p.placeName ?? 'Glimpse',
        color: p.isMine ? DOT_COLORS.mine : p.keptByMe ? DOT_COLORS.kept : bandFor(p.localTime).color,
        weight: p.isMine ? 2 : p.keptByMe ? 1 : 0,
        thumb: thumbUrl(p.imageUrl),
      })),
    [shown],
  );
  const selected = photos.find((p) => p.id === selectedId) ?? null;

  const nearMe = async () => {
    setLocating(true);
    try {
      const here = await getMyLocation();
      setMe(here);
      setTarget({ ...here, zoom: 13, nonce: ++nonce });
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Couldn’t find you.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <PhotoMap markers={markers} selectedId={selectedId} target={target} me={me} onSelect={setSelectedId} frameKey={scope} />
      <View style={styles.scopeWrap} pointerEvents="box-none">
        <View style={styles.scope}>
          {(['mine', 'all'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setScope(s);
                setSelectedId(null);
              }}
              style={[styles.scopeItem, scope === s && styles.scopeOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: scope === s }}
            >
              <Text style={[styles.scopeText, scope === s && { color: '#FFFFFF' }]}>{s === 'mine' ? 'Your world' : 'Everyone'}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.scopeCount}>
          {shown.length} glimpses · {cityCount} {cityCount === 1 ? 'city' : 'cities'}
        </Text>
      </View>
      <View style={[styles.legend, { top: 92 }]} pointerEvents="box-none">
        <View style={styles.legendCard}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: DOT_COLORS.mine }]} />
            <Text style={styles.legendText}>Yours</Text>
            <View style={[styles.legendDot, { backgroundColor: DOT_COLORS.kept, marginLeft: 8 }]} />
            <Text style={styles.legendText}>Kept</Text>
          </View>
          <View style={styles.legendRow}>
            {HOUR_BANDS.map((b) => (
              <View key={b.key} style={[styles.legendDot, { backgroundColor: b.color, width: 12 }]} />
            ))}
            <Text style={[styles.legendText, { color: colors.pencil }]}>by hour</Text>
          </View>
        </View>
        <Pressable onPress={nearMe} style={styles.nearBtn} accessibilityRole="button">
          {locating ? <ActivityIndicator size="small" color={colors.ink} /> : <View style={styles.legendRow}><Ionicons name="navigate" size={14} color={colors.stamp} /><Text style={styles.obsCount}>Around me</Text></View>}
        </Pressable>
      </View>
      {selected ? (
        <Pressable onPress={() => openPhoto(selected)} style={styles.selCard} accessibilityRole="button">
          <Image source={selected.imageUrl} style={styles.selImage} contentFit="cover" />
          <View style={{ flex: 1, gap: 4 }}>
            <Label>{catalogNumber(selected.catalogNo)}</Label>
            <Text style={type.place} numberOfLines={2}>
              {selected.placeName ?? 'Somewhere'}
            </Text>
            <View style={styles.legendRow}>
              <HourSwatch localTime={selected.localTime} />
              <Label>{timeLine(selected)}</Label>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  demoPill: { backgroundColor: colors.stampSoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  demoText: { ...fonts.sansSemi, fontSize: 12, color: colors.stamp },
  headerBlock: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
  manifesto: { ...fonts.serif, fontSize: 28, lineHeight: 33, color: colors.ink, letterSpacing: -0.8 },
  manifestoEm: { ...fonts.serifItalic, color: colors.stamp },
  observation: {
    marginTop: space.lg,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 6,
    backgroundColor: colors.stampSoft,
  },
  obsKicker: { ...fonts.sansSemi, fontSize: 13, color: colors.stamp },
  obsCount: { ...fonts.sansMedium, fontSize: 14, color: colors.ink },
  obsButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.stamp, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  obsButtonText: { ...fonts.sansSemi, fontSize: 13, color: '#FFFFFF' },
  obsTop: { flexDirection: 'row' },
  obsBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  section: { marginTop: space.xl },
  bleed: { marginHorizontal: -space.lg },
  hScroll: { paddingHorizontal: space.lg, gap: space.md },
  item: { paddingBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.rule },
  footer: { alignItems: 'center', gap: space.sm, paddingBottom: space.xxxl, paddingTop: space.md },
  scopeWrap: { position: 'absolute', top: space.md, left: 0, right: 0, alignItems: 'center', gap: 6 },
  scope: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: radius.pill, padding: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  scopeItem: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.pill },
  scopeOn: { backgroundColor: colors.ink },
  scopeText: { ...fonts.sansSemi, fontSize: 14, color: colors.ink },
  scopeCount: { ...fonts.sansSemi, fontSize: 12, color: colors.ink, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  legend: { position: 'absolute', top: space.md, left: space.md, right: space.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  legendCard: { backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: radius.md, padding: space.sm, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.rule },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { ...fonts.sansMedium, fontSize: 12, color: colors.ink },
  legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#FFFFFF' },
  nearBtn: { backgroundColor: colors.paper, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, minHeight: 34, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  selCard: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.print,
    borderRadius: radius.print,
    padding: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  selImage: { width: 76, height: 76, backgroundColor: colors.sunken, borderRadius: 8 },
});
