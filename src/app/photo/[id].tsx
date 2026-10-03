import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { openCity } from '@/components/CityCard';
import { ModerationSheet, type ModerationTarget } from '@/components/ModerationSheet';
import { openPlace } from '@/components/Print';
import { Button, Empty, HourSwatch, Label, SectionHeader, Stamp } from '@/components/ui';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { bandFor } from '@/lib/hourLight';
import { checkText } from '@/lib/moderation';
import { catalogDate, catalogNumber, clock, seasonOf } from '@/lib/places';
import { promptDayLabel, promptFor } from '@/lib/prompts';
import { useApp } from '@/lib/store';
import type { Note, Photo } from '@/lib/types';
import { useCollect } from '@/lib/useCollect';
import { colors, fonts, radius, space, type } from '@/theme';

const approx = (lat: number, lng: number) =>
  `≈ ${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;

/**
 * One glimpse as an archive record: the print, its catalogue card, other layers of the same
 * place, and anonymous notes about the place. There's no author and no count of who kept it.
 */
export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, notify, refreshFeed } = useApp();
  const [photo, setPhoto] = useState<Photo | null | undefined>(undefined);
  const [notes, setNotes] = useState<Note[]>([]);
  const [layers, setLayers] = useState<Photo[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [target, setTarget] = useState<ModerationTarget | null>(null);

  const update = useCallback(
    (pid: string, patch: Partial<Photo>) => setPhoto((p) => (p && p.id === pid ? { ...p, ...patch } : p)),
    [],
  );
  const { keep, toggleBeenHere, share, keepSheet } = useCollect(update);

  useEffect(() => {
    let active = true;
    Promise.all([api.getPhoto(id), api.listNotes(id)]).then(
      async ([p, n]) => {
        if (!active) return;
        setPhoto(p);
        setNotes(n);
        if (p?.placeKey) {
          const list = await api.listGlimpses({ placeKey: p.placeKey, limit: 50 });
          if (active) setLayers(list.filter((l) => l.id !== p.id));
        }
      },
      () => active && setPhoto(null),
    );
    return () => {
      active = false;
    };
  }, [id]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    if (me && !me.acceptedTerms) {
      router.push('/rules');
      return;
    }
    const check = checkText(body);
    if (!check.ok) {
      notify(check.reason);
      return;
    }
    setSending(true);
    try {
      const note = await api.addNote(id, body);
      setNotes((prev) => [...prev, note]);
      setDraft('');
      refreshFeed();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Couldn’t add your note.');
    } finally {
      setSending(false);
    }
  };

  if (photo === undefined) return <ActivityIndicator style={{ marginTop: space.xxl }} color={colors.pencil} />;
  if (photo === null) return <Empty title="This glimpse isn’t in the archive" body="It may have been removed." />;

  const aspect = photo.width && photo.height ? photo.width / photo.height : 4 / 5;
  const taken = photo.takenAt ?? photo.createdAt;
  const rows: [string, string][] = [
    ['Taken', catalogDate(taken) ?? '—'],
    ['Local time', clock(photo.localTime) ?? '—'],
    ['Light', bandFor(photo.localTime).name],
    ['Season', seasonOf(taken, photo.latitude) ?? '—'],
    ['Where', photo.latitude !== null && photo.longitude !== null ? approx(photo.latitude, photo.longitude) : 'Off the map'],
    ...(photo.camera ? [['Camera', photo.camera] as [string, string]] : []),
    ...(photo.promptKey ? [['Observation', `${promptFor(photo.promptKey).title} · ${promptDayLabel(photo.promptKey)}`] as [string, string]] : []),
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <Stack.Screen
        options={{
          title: catalogNumber(photo.catalogNo),
          headerTitleStyle: { ...fonts.monoMedium, fontSize: 13, color: colors.ink },
          headerRight: () => (
            <Pressable onPress={() => setTarget({ kind: 'photo', id: photo.id, isMine: photo.isMine })} hitSlop={10} accessibilityRole="button" accessibilityLabel="More options">
              <Text style={styles.more}>•••</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
        <View style={styles.printWrap}>
          <Image source={photo.imageUrl} style={[styles.image, { aspectRatio: Math.min(Math.max(aspect, 0.66), 1.6) }]} contentFit="cover" transition={250} />
        </View>

        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Label>{catalogNumber(photo.catalogNo)}</Label>
            {photo.visibility === 'private' ? (
              <Label color={colors.stamp}>Private · only on your map</Label>
            ) : photo.isMine ? (
              <Label color={colors.stamp}>Yours · only you see this</Label>
            ) : null}
          </View>
          <Pressable onPress={() => photo.placeKey && openPlace(photo.placeKey)} disabled={!photo.placeKey} accessibilityRole="link">
            <Text style={type.display}>{photo.placeName ?? 'Somewhere, unnamed'}</Text>
          </Pressable>
          {photo.city ? (
            <Pressable onPress={() => openCity(photo.city!)} accessibilityRole="link" hitSlop={6}>
              <Label color={colors.ink}>
                {photo.city} (n.){photo.word ? <Text style={{ color: colors.pencil }}> · defined here as </Text> : null}
                {photo.word ? <Text style={{ color: colors.stamp }}>“{photo.word}”</Text> : null} →
              </Label>
            </Pressable>
          ) : null}
          {photo.caption ? <Text style={[type.quote, { marginTop: space.sm }]}>“{photo.caption}”</Text> : null}

          <View style={styles.table}>
            {rows.map(([k, v]) => (
              <View key={k} style={styles.tr}>
                <Label style={styles.th}>{k}</Label>
                <View style={styles.td}>
                  {k === 'Light' ? <HourSwatch localTime={photo.localTime} size={9} /> : null}
                  <Text style={styles.tdText}>{v}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Stamp label={photo.keptByMe ? 'Kept' : 'Keep'} active={photo.keptByMe} onPress={() => keep(photo)} style={{ paddingVertical: 9, paddingHorizontal: 14 }} />
            <Pressable onPress={() => toggleBeenHere(photo)} style={[styles.ghost, photo.beenHereByMe && styles.ghostOn]} accessibilityRole="button" accessibilityState={{ selected: photo.beenHereByMe }}>
              <Text style={[styles.ghostText, photo.beenHereByMe && { color: '#FFFFFF' }]}>{photo.beenHereByMe ? '✓ I’ve been here' : 'I’ve been here'}</Text>
            </Pressable>
            <Pressable onPress={() => share(photo)} style={styles.ghost} accessibilityRole="button">
              <Text style={styles.ghostText}>Share</Text>
            </Pressable>
            {photo.latitude !== null ? (
              <Pressable onPress={() => router.navigate({ pathname: '/', params: { focus: photo.id } })} style={styles.ghost} accessibilityRole="button">
                <Text style={styles.ghostText}>Map</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={type.small}>Keeping is private. Nobody, including whoever took this, sees who kept it.</Text>

          {me?.isEditor && photo.visibility === 'archive' ? (
            <View style={styles.editor}>
              <Label>Editor</Label>
              <Pressable
                onPress={() => {
                  const next = !photo.featured;
                  api
                    .setFeatured(photo.id, next)
                    .then(() => {
                      update(photo.id, { featured: next });
                      refreshFeed();
                      notify(next ? 'Featured on everyone’s home screen.' : 'Removed from Featured.');
                    })
                    .catch((e) => notify(e instanceof Error ? e.message : 'Couldn’t change Featured.'));
                }}
                style={[styles.ghost, photo.featured && styles.ghostOn]}
                accessibilityRole="switch"
                accessibilityState={{ checked: photo.featured }}
              >
                <Text style={[styles.ghostText, photo.featured && { color: '#FFFFFF' }]}>{photo.featured ? '★ Featured on the home screen' : 'Feature on the home screen'}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {layers.length ? (
          <View style={styles.section}>
            <SectionHeader title={`More layers of this place · ${layers.length}`} action="Layers" onAction={() => photo.placeKey && openPlace(photo.placeKey)} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: 8 }}>
              {layers.map((l) => (
                <Pressable key={l.id} onPress={() => router.push({ pathname: '/photo/[id]', params: { id: l.id } })} accessibilityRole="imagebutton" accessibilityLabel={catalogDate(l.takenAt ?? l.createdAt) ?? 'Layer'}>
                  <Image source={l.imageUrl} style={styles.layer} contentFit="cover" />
                  <Label style={{ marginTop: 4, fontSize: 9 }}>{new Date(l.takenAt ?? l.createdAt).getFullYear()}</Label>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title={`Notes about the place · ${notes.length}`} />
          {notes.length === 0 ? <Text style={type.small}>No notes yet. Know something about this corner? Leave it for the next person.</Text> : null}
          {notes.map((n) => (
            <View key={n.id} style={styles.note}>
              <View style={styles.noteHead}>
                <Label>{n.isMine ? 'Your note' : 'Note'} · {timeAgo(n.createdAt)}</Label>
                {!n.isMine ? (
                  <Pressable onPress={() => setTarget({ kind: 'note', id: n.id })} hitSlop={10} accessibilityRole="button" accessibilityLabel="Report note">
                    <Text style={styles.more}>•••</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={type.body}>{n.body}</Text>
            </View>
          ))}
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="A note about the place, not the photo"
              placeholderTextColor={colors.faint}
              style={styles.input}
              multiline
              maxLength={300}
            />
            <Button small label="Add" onPress={send} loading={sending} disabled={!draft.trim()} />
          </View>
          <Label>Notes are anonymous and factual: history, tips, what changed.</Label>
        </View>

        {photo.credit ? <Text style={[type.small, styles.credit]}>Sample photo: {photo.credit} (Unsplash License)</Text> : null}
      </ScrollView>

      {keepSheet}
      <ModerationSheet
        target={target}
        onClose={() => setTarget(null)}
        notify={notify}
        onDone={(result) => {
          refreshFeed();
          if (result === 'reported') return;
          if (target?.kind === 'note' && result === 'blocked') setNotes((prev) => prev.filter((n) => n.id !== target.id));
          else if (router.canGoBack()) router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  editor: { marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.rule, gap: space.sm, alignItems: 'flex-start' },
  printWrap: {},
  image: { width: '100%', backgroundColor: colors.sunken },
  card: { padding: space.lg, gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  table: { marginTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.rule },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.rule },
  th: { width: 104 },
  td: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tdText: { ...fonts.sans, fontSize: 14, color: colors.ink, flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.lg, marginBottom: space.xs },
  ghost: { backgroundColor: colors.sunken, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  ghostOn: { backgroundColor: colors.stamp },
  ghostText: { ...fonts.sansSemi, fontSize: 13, color: colors.ink },
  section: { paddingHorizontal: space.lg, marginTop: space.xl, gap: space.sm },
  layer: { width: 84, height: 84, backgroundColor: colors.sunken, borderRadius: 10 },
  note: { paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.rule, gap: 4 },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  more: { ...fonts.mono, fontSize: 13, color: colors.pencil, letterSpacing: 1, paddingHorizontal: 4 },
  composer: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-end', marginTop: space.sm },
  input: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.sunken,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    ...fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  credit: { textAlign: 'center', padding: space.lg },
});
