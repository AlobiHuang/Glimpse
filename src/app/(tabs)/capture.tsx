import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mosaic } from '@/components/Mosaic';
import { Button, Chip, HourSwatch, Label, Link, Mark, Segmented, ToggleRow } from '@/components/ui';
import { api } from '@/lib/api';
import { parseExif } from '@/lib/exif';
import { landmarkFor, mosaicProgress } from '@/lib/landmarks';
import { useContentWidth } from '@/lib/layout';
import { checkText } from '@/lib/moderation';
import { loadPixels } from '@/lib/photoPixels';
import { evaluate, recentHashes, rememberHash, type QualityReport } from '@/lib/photoQuality';
import { catalogNumber, cityFromPlace, clock, ordinal, seasonOf } from '@/lib/places';
import { todaysPrompt } from '@/lib/prompts';
import { useApp } from '@/lib/store';
import type { CityPortrait, LocationPrecision, QualitySummary, UploadResult, Visibility } from '@/lib/types';
import { colors, fonts, radius, space, type } from '@/theme';

type Draft = {
  uri: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  camera: string | null;
  latitude: number | null;
  longitude: number | null;
  /** iOS marked it as a screenshot. */
  screenshot: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');
const localTimeOf = (iso: string | null) => {
  const d = iso ? new Date(iso) : new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

async function placeNameFor(latitude: number, longitude: number): Promise<{ place: string | null; city: string | null }> {
  try {
    const [p] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!p) return { place: null, city: null };
    const city = p.city || p.subregion || null;
    const local = p.district || p.name || p.street;
    return { place: [local, city].filter(Boolean).join(', ') || null, city };
  } catch {
    return { place: null, city: null }; // not available on every platform (e.g. web)
  }
}

/**
 * Capture: three seconds, not a post. Take or pick a photo, name the place, optionally give
 * one word for the city, and it goes into the archive with a catalogue number — no name.
 */
export default function CaptureScreen() {
  const { me, refreshFeed, notify } = useApp();
  const width = useContentWidth();
  const prompt = todaysPrompt();
  const { prompt: promptParam } = useLocalSearchParams<{ prompt?: string }>();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [city, setCity] = useState('');
  const [word, setWord] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [precision, setPrecision] = useState<LocationPrecision>('approximate');
  const [joinPrompt, setJoinPrompt] = useState(promptParam === prompt.key);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [done, setDone] = useState<{ result: UploadResult; portrait: CityPortrait | null } | null>(null);
  // The photo checks (lib/photoQuality.ts): null while they run.
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [shareAnyway, setShareAnyway] = useState(false);
  const [keepPrivate, setKeepPrivate] = useState(false);
  const checkRun = useRef(0);

  // Arriving from "Capture one" on today's observation turns it on.
  useEffect(() => {
    if (promptParam !== prompt.key) return;
    const t = setTimeout(() => setJoinPrompt(true), 0);
    return () => clearTimeout(t);
  }, [promptParam, prompt.key]);

  // Suggest the words other people use for this city.
  useEffect(() => {
    const name = city.trim();
    if (!name) {
      const t = setTimeout(() => setSuggestions([]), 0);
      return () => clearTimeout(t);
    }
    let active = true;
    const t = setTimeout(() => {
      api
        .getCity(name)
        .then((c) => active && setSuggestions(c?.words.slice(0, 6).map((w) => w.word) ?? []))
        .catch(() => {});
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [city]);

  const reset = () => {
    setDraft(null);
    setPlaceName('');
    setCity('');
    setWord('');
    setCaption('');
    setPrecision('approximate');
    setQuality(null);
    setShareAnyway(false);
    setKeepPrivate(false);
  };

  /** Look at a small copy of the photo: size, focus, light, screenshot, duplicate. */
  const runChecks = async (d: Draft) => {
    const run = ++checkRun.current;
    setQuality(null);
    setShareAnyway(false);
    let pixels = null;
    try {
      pixels = await loadPixels(d.uri);
    } catch {
      // Couldn't read the pixels: the size and screenshot checks still run.
    }
    if (run !== checkRun.current) return; // a newer photo was picked meanwhile
    setQuality(evaluate({ width: d.width, height: d.height, mimeType: d.mimeType, camera: d.camera, screenshotTag: d.screenshot }, pixels, recentHashes()));
  };

  const applyPlace = (found: { place: string | null; city: string | null }) => {
    if (found.place) setPlaceName(found.place);
    if (found.city) setCity(found.city);
  };

  const pick = async (source: 'camera' | 'library') => {
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify(`Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings to continue.`);
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], exif: true, quality: 0.85 };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;

    const asset = result.assets[0];
    const exif = parseExif(asset.exif);
    const next: Draft = {
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      width: asset.width ?? null,
      height: asset.height ?? null,
      takenAt: exif.takenAt ?? (source === 'camera' ? new Date().toISOString() : null),
      camera: exif.camera,
      latitude: exif.latitude,
      longitude: exif.longitude,
      screenshot: exif.screenshot,
    };
    setDraft(next);
    void runChecks(next);
    if (next.latitude === null && source === 'camera') await locateMe(next);
    else if (next.latitude !== null && next.longitude !== null) applyPlace(await placeNameFor(next.latitude, next.longitude));
  };

  const locateMe = async (base: Draft | null = draft) => {
    if (!base) return;
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        notify('Location is off. You can still type the place.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDraft({ ...base, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      applyPlace(await placeNameFor(pos.coords.latitude, pos.coords.longitude));
    } catch {
      notify('Couldn’t get your location.');
    } finally {
      setLocating(false);
    }
  };

  const onPlaceChange = (text: string) => {
    setPlaceName(text);
    const guessed = cityFromPlace(text);
    if (guessed) setCity(guessed);
  };

  // Shared with everyone only if the checks pass (or soft ones fail and you share anyway),
  // and you didn't choose to keep it to yourself. Otherwise it lives on your own map.
  const shareable = !!quality && (quality.passed || (!quality.blocked && shareAnyway));
  const visibility: Visibility = shareable && !keepPrivate ? 'archive' : 'private';

  const submit = async () => {
    if (!draft || !quality) return;
    for (const text of [caption, placeName, city, word]) {
      const check = checkText(text);
      if (!check.ok) {
        notify(check.reason);
        return;
      }
    }
    setBusy(true);
    try {
      const result = await api.uploadPhoto({
        localUri: draft.uri,
        mimeType: draft.mimeType,
        width: draft.width,
        height: draft.height,
        caption,
        placeName: placeName.trim() || null,
        city: city.trim() || null,
        latitude: draft.latitude,
        longitude: draft.longitude,
        locationPrecision: precision,
        takenAt: draft.takenAt,
        localTime: localTimeOf(draft.takenAt),
        camera: draft.camera,
        word: word.trim() || null,
        promptKey: joinPrompt ? prompt.key : null,
        visibility,
        quality: summarize(quality, visibility === 'archive' && !quality.passed),
        imageHash: quality.hash,
      });
      rememberHash(quality.hash);
      const portrait = result.photo.city ? await api.getMyCity(result.photo.city) : null;
      reset();
      refreshFeed();
      setDone({ result, portrait });
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Couldn’t add it to the archive.');
    } finally {
      setBusy(false);
    }
  };

  // Apple requires agreeing to the rules before posting (guideline 1.2).
  if (me && !me.acceptedTerms) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.intro}>
          <Mark size={40} />
          <Label>Before your first glimpse</Label>
          <Text style={[type.title, styles.centerText]}>An archive only works if it’s kept with care.</Text>
          <Text style={[type.small, styles.centerText]}>Glimpse has no names, so it has a few rules instead. They take thirty seconds to read.</Text>
          <Button label="Read the rules" onPress={() => router.push('/rules')} style={{ alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  if (done) return <Added done={done} width={width} onAgain={() => setDone(null)} />;

  if (!draft) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.intro}>
          <Label>Capture</Label>
          <Text style={[styles.headline, styles.centerText]}>
            Keep the one{'\n'}you’d <Text style={{ ...fonts.serifItalic, color: colors.stamp }}>never post.</Text>
          </Text>
          <Text style={[type.small, styles.centerText]}>A street, a window, the light right now. No faces, no selfies. Just the place.</Text>
          <Pressable onPress={() => pick('camera')} style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.95 }] }]} accessibilityRole="button" accessibilityLabel="Take a photo">
            <View style={styles.shutterInner} />
          </Pressable>
          <Button
            variant="outline"
            label="Choose from library"
            icon={<Ionicons name="images-outline" size={20} color={colors.ink} />}
            onPress={() => pick('library')}
            style={{ alignSelf: 'stretch' }}
          />
          <Pressable
            onPress={() => setJoinPrompt((v) => !v)}
            style={[styles.obsPill, joinPrompt && styles.obsPillOn]}
            accessibilityRole="switch"
            accessibilityState={{ checked: joinPrompt }}
          >
            <Text style={[styles.obsPillText, joinPrompt && { color: '#FFFFFF' }]}>
              {joinPrompt ? '✓ ' : '+ '}Today’s observation: {prompt.title}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const aspect = draft.width && draft.height ? draft.width / draft.height : 4 / 5;
  const time = localTimeOf(draft.takenAt);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.formHead}>
            <Text style={type.title}>New glimpse</Text>
            <Link label="Discard" color={colors.danger} onPress={reset} />
          </View>

          <View style={styles.print}>
            <Image source={draft.uri} style={[styles.preview, { aspectRatio: Math.min(Math.max(aspect, 0.72), 1.5) }]} contentFit="cover" />
            <View style={styles.labelRow}>
              <Label>No. — (assigned on arrival)</Label>
              <View style={styles.inline}>
                <HourSwatch localTime={time} />
                <Label>{[clock(time), seasonOf(draft.takenAt ?? new Date().toISOString(), draft.latitude)].filter(Boolean).join(' · ')}</Label>
              </View>
            </View>
            <TextInput
              value={placeName}
              onChangeText={onPlaceChange}
              placeholder="Name the place"
              placeholderTextColor={colors.faint}
              style={styles.placeInput}
              maxLength={80}
              accessibilityLabel="Place name"
            />
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="What made you stop? (optional)"
              placeholderTextColor={colors.faint}
              style={styles.captionInput}
              multiline
              maxLength={280}
            />
          </View>

          <PhotoChecks
            quality={quality}
            shareAnyway={shareAnyway}
            onShareAnyway={setShareAnyway}
            keepPrivate={keepPrivate}
            onKeepPrivate={setKeepPrivate}
          />

          <View style={styles.block}>
            <Label color={colors.ink}>City</Label>
            <TextInput value={city} onChangeText={setCity} placeholder="e.g. Lisbon" placeholderTextColor={colors.faint} style={styles.input} maxLength={60} />
            {city.trim() ? (
              <>
                <Text style={[type.body, { marginTop: space.sm }]}>
                  One word for <Text style={{ ...fonts.serifItalic, fontSize: 18 }}>{city.trim()}</Text>, if this glimpse had to define it:
                </Text>
                <View style={styles.chips}>
                  {suggestions.map((s) => (
                    <Chip key={s} label={s} selected={word.toLowerCase() === s.toLowerCase()} onPress={() => setWord(word === s ? '' : s)} />
                  ))}
                </View>
                <TextInput value={word} onChangeText={setWord} placeholder="your own word" placeholderTextColor={colors.faint} style={styles.input} maxLength={24} autoCapitalize="none" />
              </>
            ) : null}
          </View>

          <View style={styles.block}>
            <Label color={colors.ink}>Where it sits on the map</Label>
            <Segmented
              value={precision}
              onChange={setPrecision}
              options={[
                { value: 'approximate', label: 'About 1 km' },
                { value: 'exact', label: 'Exact' },
                { value: 'hidden', label: 'Off the map' },
              ]}
            />
            <Text style={type.small}>
              {precision === 'approximate'
                ? 'Rounded to about a kilometre, so nobody can find where you were standing.'
                : precision === 'exact'
                  ? 'The exact spot. Only use this for public places.'
                  : 'No coordinates and no place name are shared.'}
            </Text>
            {draft.latitude === null && precision !== 'hidden' ? (
              <Button variant="outline" small label="Use where I am" loading={locating} onPress={() => locateMe()} />
            ) : null}
          </View>

          <View style={styles.block}>
            <ToggleRow label={`Today’s observation: ${prompt.title}`} hint={prompt.description} value={joinPrompt} onChange={setJoinPrompt} />
          </View>

          <Text style={[type.small, { textAlign: 'center' }]}>
            {visibility === 'archive' ? 'No name is attached. Not even a hidden one that others can see.' : 'Only you will see this one, on your own map.'}
          </Text>
          <Button
            variant="stamp"
            label={!quality ? 'Checking the photo…' : visibility === 'archive' ? 'Add to the archive' : 'Add to your map'}
            onPress={submit}
            loading={busy}
            disabled={!quality || (precision !== 'hidden' && !placeName.trim())}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** The receipt: your catalogue number, which layer of the place you added, and your mosaic. */
function Added({ done, width, onAgain }: { done: { result: UploadResult; portrait: CityPortrait | null }; width: number; onAgain: () => void }) {
  const { photo, layerNumber, cityGlimpses } = done.result;
  const landmark = photo.city ? landmarkFor(photo.city) : null;
  const tiles = done.portrait ? [...done.portrait.photos].reverse().map((p) => p.imageUrl) : [];
  const progress = mosaicProgress(tiles.length);
  const mine = photo.visibility === 'private';
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.form, { alignItems: 'center' }]}>
        <Mark size={36} />
        <Label color={colors.stamp}>{mine ? 'Added to your map' : 'Added to the archive'}</Label>
        <Text style={styles.number}>{mine ? 'Your world' : catalogNumber(photo.catalogNo)}</Text>
        <Text style={[type.quote, styles.centerText]}>
          {mine
            ? `Only you can see it${photo.city ? `. It’s on your map and in your ${photo.city} mosaic.` : ', on your map.'}`
            : photo.placeName
              ? layerNumber > 1
                ? `You added the ${ordinal(layerNumber)} layer to ${photo.placeName}.`
                : `The first glimpse of ${photo.placeName}.`
              : 'Kept, off the map.'}
        </Text>
        {photo.city && !mine ? (
          <Label>
            {photo.city} now holds {cityGlimpses.toLocaleString('en-US')} glimpses
          </Label>
        ) : null}

        {landmark && tiles.length ? (
          <View style={styles.receiptMosaic}>
            <Mosaic landmark={landmark} tiles={tiles} width={Math.min(width - space.lg * 2, 220)} />
            <Label color={colors.ink} style={{ textAlign: 'center' }}>
              Tile {tiles.length} of {progress.current.tiles} · your {photo.city} {progress.current.name.toLowerCase()}
            </Label>
          </View>
        ) : null}

        <View style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.lg }}>
          <Button label={mine ? 'See it' : 'See it in the archive'} onPress={() => router.push({ pathname: '/photo/[id]', params: { id: photo.id } })} />
          <Button variant="outline" label="Capture another" onPress={onAgain} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** What gets stored with the glimpse about its checks (rounded; no pixels, nothing identifying). */
function summarize(q: QualityReport, override: boolean): QualitySummary {
  return {
    passed: q.passed,
    override,
    failed: q.checks.filter((c) => !c.ok).map((c) => c.key),
    shortSide: q.metrics.shortSide,
    sharpness: q.metrics.sharpness === null ? null : Math.round(q.metrics.sharpness),
    brightness: q.metrics.brightness === null ? null : Math.round(q.metrics.brightness),
  };
}

/** The photo checks, in plain words: what passed, what didn't and why, and what happens next. */
function PhotoChecks({
  quality,
  shareAnyway,
  onShareAnyway,
  keepPrivate,
  onKeepPrivate,
}: {
  quality: QualityReport | null;
  shareAnyway: boolean;
  onShareAnyway: (v: boolean) => void;
  keepPrivate: boolean;
  onKeepPrivate: (v: boolean) => void;
}) {
  if (!quality) {
    return (
      <View style={[styles.checks, styles.inline]}>
        <ActivityIndicator size="small" color={colors.pencil} />
        <Text style={type.small}>Checking the photo…</Text>
      </View>
    );
  }
  const failed = quality.checks.filter((c) => !c.ok);
  return (
    <View style={styles.checks}>
      <Label color={colors.ink}>{quality.passed ? 'Ready for the archive' : quality.blocked ? 'This one stays on your map' : 'This one may stay on your map'}</Label>
      <View style={styles.checkList}>
        {quality.checks.map((c) => (
          <View key={c.key} style={styles.checkRow}>
            <Ionicons name={c.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={c.ok ? colors.stamp : colors.danger} />
            <Text style={[styles.checkText, !c.ok && { color: colors.ink }]}>{c.label}</Text>
          </View>
        ))}
      </View>
      {failed.length ? <Text style={type.small}>{failed.map((c) => c.why).join(' ')}</Text> : null}
      {quality.blocked ? (
        <Text style={type.small}>It’s still yours: it goes on your own map and into your city mosaic. Only you can see it.</Text>
      ) : !quality.passed ? (
        <ToggleRow
          label="Share it with the archive anyway"
          hint="Fog and night photos can look soft or dark on purpose. It won’t be Featured unless an editor picks it."
          value={shareAnyway}
          onChange={onShareAnyway}
        />
      ) : null}
      {quality.passed || shareAnyway ? (
        <ToggleRow label="Keep it to myself" hint="Only on your map. Nobody else will see it." value={keepPrivate} onChange={onKeepPrivate} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  checks: { gap: space.sm, backgroundColor: colors.sunken, borderRadius: radius.lg, padding: space.md },
  checkList: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  checkText: { ...fonts.sans, fontSize: 13, color: colors.pencil },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  centerText: { textAlign: 'center', maxWidth: 330 },
  headline: { ...fonts.serif, fontSize: 30, lineHeight: 35, color: colors.ink, letterSpacing: -0.8 },
  shutter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 4,
    borderColor: colors.stampSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: space.lg,
  },
  shutterInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.stamp },
  obsPill: { marginTop: space.lg, backgroundColor: colors.stampSoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  obsPillOn: { backgroundColor: colors.stamp },
  obsPillText: { ...fonts.sansSemi, fontSize: 13, color: colors.stamp },
  form: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl, maxWidth: 640, width: '100%', alignSelf: 'center' },
  formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  print: { gap: 6 },
  preview: { width: '100%', backgroundColor: colors.sunken, borderRadius: radius.lg },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  placeInput: { ...fonts.serif, fontSize: 20, color: colors.ink, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.rule },
  captionInput: { ...fonts.sans, fontSize: 14, color: colors.ink, minHeight: 40, paddingVertical: 4, textAlignVertical: 'top' },
  block: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  input: {
    backgroundColor: colors.sunken,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    ...fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  number: { ...fonts.serif, fontSize: 40, lineHeight: 46, color: colors.ink, letterSpacing: -1 },
  receiptMosaic: { alignItems: 'center', gap: space.sm, marginTop: space.lg },
});
