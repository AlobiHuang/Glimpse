import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Sheet } from '@/components/Sheet';
import { Button, Chip, Label } from '@/components/ui';
import { api } from './api';
import { mosaicProgress } from './landmarks';
import { checkText } from './moderation';
import { sharePhoto } from './share';
import { useApp } from './store';
import type { Photo } from './types';
import { colors, fonts, radius, space, type } from '@/theme';

type Update = (id: string, patch: Partial<Photo>) => void;

/**
 * Collecting a glimpse: Keep (privately, optionally adding your word for the city),
 * "I've been here", and share. Changes show instantly and roll back if saving fails.
 * Keeping adds a tile to your mosaic of that city, so we tell you where you are.
 */
export function useCollect(update: Update) {
  const { notify, refreshFeed } = useApp();
  const [target, setTarget] = useState<Photo | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setTarget(null);
    setWord('');
  };

  const keep = useCallback(
    (photo: Photo) => {
      if (photo.keptByMe) {
        update(photo.id, { keptByMe: false });
        api.setKept(photo.id, false).then(
          () => {
            notify('Removed from your collection');
            refreshFeed();
          },
          () => {
            update(photo.id, { keptByMe: true });
            notify('Couldn’t update your collection.');
          },
        );
        return;
      }
      setTarget(photo);
      setWord('');
      setSuggestions(photo.word ? [photo.word] : []);
      if (photo.city) {
        api
          .getCity(photo.city)
          .then((c) => {
            const words = c?.words.map((w) => w.word) ?? [];
            setSuggestions([...new Set([...(photo.word ? [photo.word] : []), ...words])].slice(0, 7));
          })
          .catch(() => {});
      }
    },
    [update, notify, refreshFeed],
  );

  const confirmKeep = async (withWord: boolean) => {
    if (!target) return;
    const chosen = withWord ? word.trim() : '';
    if (chosen) {
      const check = checkText(chosen);
      if (!check.ok) {
        notify(check.reason);
        return;
      }
    }
    const photo = target;
    setBusy(true);
    update(photo.id, { keptByMe: true });
    try {
      await api.setKept(photo.id, true, chosen || null);
      close();
      refreshFeed();
      if (photo.city) {
        const portrait = await api.getMyCity(photo.city);
        const n = portrait?.photos.length ?? 1;
        const { current, completed } = mosaicProgress(n);
        if (completed && completed.tiles === n) {
          notify(`Your ${photo.city} ${completed.name.toLowerCase()} is complete: ${n} tiles.`);
        } else {
          notify(`Kept. Tile ${n} of ${current.tiles} in your ${photo.city} mosaic.`);
        }
      } else {
        notify('Kept in your collection.');
      }
    } catch {
      update(photo.id, { keptByMe: false });
      notify('Couldn’t keep this glimpse.');
    } finally {
      setBusy(false);
    }
  };

  const toggleBeenHere = useCallback(
    (photo: Photo) => {
      const next = !photo.beenHereByMe;
      update(photo.id, { beenHereByMe: next });
      api.setBeenHere(photo.id, next).then(
        () => notify(next ? 'Noted: you’ve stood here too.' : 'Removed'),
        () => {
          update(photo.id, { beenHereByMe: !next });
          notify('Couldn’t save that.');
        },
      );
    },
    [update, notify],
  );

  const share = useCallback(
    (photo: Photo) => {
      sharePhoto(photo)
        .then((result) => {
          if (result === 'copied') notify('Link copied');
          else if (typeof result === 'object') notify(`Link: ${result.link}`);
        })
        .catch(() => notify('Couldn’t share this glimpse.'));
    },
    [notify],
  );

  const city = target?.city;
  const keepSheet = (
    <Sheet visible={!!target} onClose={close}>
      <Label>Keep this glimpse</Label>
      <Text style={type.title}>{target?.placeName ?? 'Somewhere'}</Text>
      <Text style={type.small}>
        Kept glimpses are private.{city ? ` Each one becomes a tile in your mosaic of ${city}.` : ''}
      </Text>
      {city ? (
        <View style={styles.words}>
          <Text style={[type.bodyStrong, { marginTop: space.sm }]}>
            Add your word for <Text style={{ ...fonts.serifItalic, fontSize: 18 }}>{city}</Text>?
          </Text>
          <View style={styles.chips}>
            {suggestions.map((s) => (
              <Chip key={s} label={s} selected={word.toLowerCase() === s.toLowerCase()} onPress={() => setWord(word === s ? '' : s)} />
            ))}
          </View>
          <TextInput
            value={word}
            onChangeText={setWord}
            placeholder="or your own word"
            placeholderTextColor={colors.faint}
            maxLength={24}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>
      ) : null}
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <Button
          variant="stamp"
          label={word.trim() ? `Keep with “${word.trim()}”` : 'Keep'}
          loading={busy}
          onPress={() => confirmKeep(true)}
        />
        {city && word.trim() ? <Button variant="outline" label="Keep without a word" onPress={() => confirmKeep(false)} /> : null}
      </View>
    </Sheet>
  );

  return { keep, toggleBeenHere, share, keepSheet };
}

const styles = StyleSheet.create({
  words: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  input: {
    backgroundColor: colors.sunken,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 11,
    ...fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
});
